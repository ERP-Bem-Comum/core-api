import type { Result } from '../../../../shared/primitives/result.ts';
import type { ContractId } from '../shared/ids.ts';
import type { Contract, ContractStatus, ActiveContract } from './types.ts';
import type { PlainDate } from '../../../../shared/kernel/plain-date.ts';
import type { OutboxAppendError } from '../../application/ports/outbox.ts';
import type { ContractsModuleEvent } from '../../application/ports/event-bus.ts';

// CTR-HTTP-CONTRACT-LIST-FILTERS — consulta de listagem filtrada/paginada.
// A filtragem/ordenação/paginação acontece na implementação (SQL no Drizzle,
// memória no InMemory); o use case apenas repassa a query e calcula `meta`.
//
// `search`: casa (case-insensitive) em title OU objective OU sequentialNumber.
// `status`: restringe ao estado do agregado. `order`: ordena por sequentialNumber.
export type ListContractsQuery = Readonly<{
  page: number; // ≥ 1 (validado na borda Zod)
  limit: number; // teto aplicado na borda Zod
  order: 'ASC' | 'DESC';
  search?: string;
  status?: ContractStatus;
}>;

/** Resultado paginado: a página de itens + o total absoluto (para `meta`). */
export type ContractPage = Readonly<{
  items: readonly Contract[];
  total: number;
}>;

// Port do repositório de Contract — posicionado em domain/ pelo Critério H2 (§3.H.2 DO H§34):
// este port é ditado pelas invariâncias e ciclo-de-vida do agregado Contract.

// CA-1 (CTR-OUTBOX-INTEGRATION-IN-REPOS): OutboxAppendError integra o union de erros
// do repositório — quando o adapter persiste state + outbox na mesma tx, uma falha
// de append é indistinguível de uma falha de save do ponto de vista do use case.
export type ContractRepositoryError =
  | 'contract-repo-unavailable'
  | 'contract-repo-conflict'
  | OutboxAppendError;

export type ContractRepository = Readonly<{
  findById: (id: ContractId) => Promise<Result<Contract | null, ContractRepositoryError>>;
  // Defeito #5: necessário para garantir unicidade de sequentialNumber (regra R4 do handbook).
  // MySQL real exigirá UNIQUE INDEX na coluna; InMemory faz busca linear.
  findBySequentialNumber: (
    sequentialNumber: string,
  ) => Promise<Result<Contract | null, ContractRepositoryError>>;
  // CTR-CONTRACT-SEQUENTIAL-NUMBER: gera o próximo número sequencial do ano no formato
  // `NNNN/YYYY`. A geração é transacional no adapter real (tabela `ctr_contract_seq`,
  // SELECT ... FOR UPDATE — Refman §17.7.2.4); o InMemory usa um contador por ano.
  // Números são monotônicos por ano; gaps são aceitáveis (semântica de sequência).
  nextSequentialNumber: (year: number) => Promise<Result<string, ContractRepositoryError>>;
  list: () => Promise<Result<readonly Contract[], ContractRepositoryError>>;
  // CTR-HTTP-CONTRACT-LIST-FILTERS — leitura filtrada/paginada no banco
  // (WHERE/ORDER BY/LIMIT/OFFSET + COUNT). InMemory replica em memória.
  listPaged: (query: ListContractsQuery) => Promise<Result<ContractPage, ContractRepositoryError>>;
  // CA-1: 2º argumento `events` — adapter persiste state + outbox atomicamente (D2).
  // Use case não conhece tx; apenas passa os eventos produzidos pela operação de domínio.
  //
  // ADR-0023: aceita `Contract` (inclusive `Pending`) — a migration tornou as colunas
  // de vigência/assinatura nuláveis (CTR-DOMAIN-CONTRACT-PENDING-PERSISTENCE).
  save: (
    contract: Contract,
    events: readonly ContractsModuleEvent[],
  ) => Promise<Result<void, ContractRepositoryError>>;
  // CTR-AUTO-EXPIRE (issue #39 · ADR-0041): contratos `Active` com vigência `Fixed` encerrada
  // (`current_period_end < cutoff`). Os adapters (Drizzle + InMemory) usam `SELECT … LIMIT`
  // simples — **sem** `FOR UPDATE`: o lock não persistiria entre `findExpirable` (tx A) e `save`
  // (tx B), então coordenação multi-instância é F-Plus via `GET_LOCK`/`UNIQUE(job_name, run_date)`
  // (ADR-0041). `cutoff` = "hoje" na timezone do negócio (America/Sao_Paulo).
  findExpirable: (
    cutoff: PlainDate,
    limit: number,
  ) => Promise<Result<readonly ActiveContract[], ContractRepositoryError>>;
}>;
