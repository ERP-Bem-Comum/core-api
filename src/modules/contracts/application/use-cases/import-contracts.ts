import { type Result, ok } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import { isValidCnpj } from '#src/shared/kernel/cnpj.ts';
import { buildContract } from './create-contract.ts';
import type { BuildContractError, BuildContractInput } from './create-contract.ts';
import type {
  ContractRepository,
  ContractRepositoryError,
} from '../../domain/contract/repository.ts';
import {
  parseSequentialNumber,
  formatSequentialNumber,
} from '../../domain/contract/sequential-number.ts';

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

// issue #425: o número é derivado (ano de `YEAR(original_period_start)`), NÃO mais o
// `row.numero` verbatim. `sequentialNumber` é resolvido no laço antes do build.
const toCreateCommand = (row: ImportContractRow, sequentialNumber: string): BuildContractInput => ({
  sequentialNumber,
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

      // Build inicial com o número legado: valida formato/valor/período/contratado exatamente
      // como antes (preserva a precedência de erro do import). O número é RE-derivado abaixo.
      const builtInitial = buildContract(toCreateCommand(row, row.numero));
      if (!builtInitial.ok) {
        failures.push({ index, numero: row.numero, error: builtInitial.error });
        continue;
      }

      // Dry-run valida sem persistir nem mutar o contador (NFR-4: determinismo dry-run =
      // persistente no VEREDITO — toda linha que passa no build também persistiria).
      if (cmd.dryRun) {
        succeeded += 1;
        continue;
      }

      // issue #425: grava o número pelo ano de `YEAR(original_period_start)` (criação = vigência
      // inicial), NÃO o `/YYYY` verbatim do legado — guarda contra a recorrência do bug. O número
      // derivado é DETERMINÍSTICO (seq legado + ano de vigência): re-importar deriva o MESMO número
      // → encontra no repo → rejeita (idempotente). Sem `legacy_id`, o `sequential_number` é a única
      // chave de dedup — a colisão vira falha reportada, NUNCA reatribuição/duplicata.
      const targetYear = builtInitial.value.contract.originalPeriod.start.year;
      const parsed = parseSequentialNumber(row.numero);

      // `parsed` nunca é null aqui (o build validou o formato NNN/AAAA); a guarda defensiva mantém
      // o número original caso o formato escape.
      const finalNumber =
        parsed !== null ? formatSequentialNumber(parsed.seq, targetYear) : row.numero;

      // Duplicidade intra-arquivo (FR-4a) — dedup pelo número DERIVADO.
      if (seen.has(finalNumber)) {
        failures.push({
          index,
          numero: row.numero,
          error: 'contract-sequential-number-duplicated',
        });
        continue;
      }

      // Duplicidade vs repositório (FR-4b) — dedup pelo número DERIVADO. Erro de infra aborta o lote.
      const existing = await deps.contractRepo.findBySequentialNumber(finalNumber);
      if (!existing.ok) return existing;
      if (existing.value !== null) {
        failures.push({
          index,
          numero: row.numero,
          error: 'contract-sequential-number-duplicated',
        });
        continue;
      }

      // Reusa o build inicial quando o número não mudou; senão reconstrói com o número final
      // (mesmos dados, número válido → o rebuild sempre passa).
      const built =
        finalNumber === row.numero
          ? builtInitial
          : buildContract(toCreateCommand(row, finalNumber));
      if (!built.ok) {
        failures.push({ index, numero: row.numero, error: built.error });
        continue;
      }

      seen.add(finalNumber);

      const saved = await deps.contractRepo.save(built.value.contract, [built.value.event]);
      if (!saved.ok) return saved;

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
