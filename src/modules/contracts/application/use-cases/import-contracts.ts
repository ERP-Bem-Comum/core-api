import { type Result, ok } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import { isValidCnpj } from '#src/shared/kernel/cnpj.ts';
import { buildContract } from './create-contract.ts';
import type { BuildContractError, BuildContractInput } from './create-contract.ts';
import type {
  ContractRepository,
  ContractRepositoryError,
} from '../../domain/contract/repository.ts';

// UC-11 v1 (CTR-IMPORT-LEGACY): use case `importContracts`.
// Agnóstico de formato — recebe linhas já decodificadas (parser CSV/JSON vive no
// adapter/CLI, NFR-5). Decisões: D1 só Contratos Mãe; D2 CNPJ validado e descartado;
// D3 atomicidade por linha. Falha de DADO vira entrada no relatório (lote continua);
// falha de INFRA (repo) aborta o lote com Result.err.

export type ImportContractRow = Readonly<{
  numero: string;
  titulo: string;
  objetivo: string;
  assinadoEm: string;
  valorCentavos: string;
  inicio: string;
  fim: string | null;
  cnpj?: string;
  // Contratado (FR-001) — obrigatório por linha. Ausência → falha de DADO na linha
  // (modelo row-level D3). O mapeamento do contratado a partir do legado v1
  // (contractType + supplierId/financierId/collaboratorId) é escopo do ticket de import.
  contractorType?: string;
  contractorId?: string;
}>;

export type ImportRowError =
  | BuildContractError
  | 'contract-sequential-number-duplicated'
  | 'import-cnpj-invalid';

export type ImportContractFailure = Readonly<{
  index: number; // 1-based, posição entre as linhas de dados
  numero: string;
  error: ImportRowError;
}>;

export type ImportContractsReport = Readonly<{
  total: number;
  succeeded: number;
  failed: number;
  dryRun: boolean;
  failures: readonly ImportContractFailure[];
}>;

export type ImportContractsCommand = Readonly<{
  rows: readonly ImportContractRow[];
  dryRun: boolean;
}>;

type Deps = Readonly<{
  contractRepo: ContractRepository;
  clock: Clock;
}>;

// Import PRESERVA o número legado (`row.numero`) — `BuildContractInput` exige o número
// já resolvido (o import nunca gera; só `createContract` gera quando ausente).
const toCreateCommand = (row: ImportContractRow): BuildContractInput => ({
  sequentialNumber: row.numero,
  title: row.titulo,
  objective: row.objetivo,
  signedAt: row.assinadoEm,
  originalValueCents: Number(row.valorCentavos),
  originalPeriodStart: row.inicio,
  originalPeriodEnd: row.fim,
  // Ausente → string vazia → ContractorRef.make falha → linha vira falha (D3).
  contractorType: row.contractorType ?? '',
  contractorId: row.contractorId ?? '',
});

export const importContracts =
  (deps: Deps) =>
  async (
    cmd: ImportContractsCommand,
  ): Promise<Result<ImportContractsReport, ContractRepositoryError>> => {
    const failures: ImportContractFailure[] = [];
    const seen = new Set<string>();
    let succeeded = 0;

    for (const [i, row] of cmd.rows.entries()) {
      const index = i + 1;

      // D2: CNPJ validado e descartado — só rejeita formato inválido quando presente.
      if (row.cnpj !== undefined && row.cnpj !== '' && !isValidCnpj(row.cnpj)) {
        failures.push({ index, numero: row.numero, error: 'import-cnpj-invalid' });
        continue;
      }

      const built = buildContract(toCreateCommand(row));
      if (!built.ok) {
        failures.push({ index, numero: row.numero, error: built.error });
        continue;
      }

      // Duplicidade intra-arquivo (FR-4a).
      if (seen.has(row.numero)) {
        failures.push({
          index,
          numero: row.numero,
          error: 'contract-sequential-number-duplicated',
        });
        continue;
      }

      // Duplicidade vs repositório (FR-4b). Erro de infra aborta o lote.
      const existing = await deps.contractRepo.findBySequentialNumber(row.numero);
      if (!existing.ok) return existing;
      if (existing.value !== null) {
        failures.push({
          index,
          numero: row.numero,
          error: 'contract-sequential-number-duplicated',
        });
        continue;
      }

      seen.add(row.numero);

      if (!cmd.dryRun) {
        const saved = await deps.contractRepo.save(built.value.contract, [built.value.event]);
        if (!saved.ok) return saved;
      }

      succeeded += 1;
    }

    return ok({
      total: cmd.rows.length,
      succeeded,
      failed: failures.length,
      dryRun: cmd.dryRun,
      failures,
    });
  };
