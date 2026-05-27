import type { Result } from '../../../../shared/primitives/result.ts';
import type { ContractId } from '../shared/ids.ts';
import type { Contract } from './types.ts';
import type { OutboxAppendError } from '../../application/ports/outbox.ts';
import type { ContractsModuleEvent } from '../../application/ports/event-bus.ts';

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
  list: () => Promise<Result<readonly Contract[], ContractRepositoryError>>;
  // CA-1: 2º argumento `events` — adapter persiste state + outbox atomicamente (D2).
  // Use case não conhece tx; apenas passa os eventos produzidos pela operação de domínio.
  //
  // ADR-0023: aceita `Contract` (inclusive `Pending`) — a migration tornou as colunas
  // de vigência/assinatura nuláveis (CTR-DOMAIN-CONTRACT-PENDING-PERSISTENCE).
  save: (
    contract: Contract,
    events: readonly ContractsModuleEvent[],
  ) => Promise<Result<void, ContractRepositoryError>>;
}>;
