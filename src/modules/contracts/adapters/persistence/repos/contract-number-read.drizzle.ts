// Read store Drizzle do NÚMERO do contrato (REP-6 · #442 · Slice D). Batch:
//
//   SELECT id, sequential_number FROM ctr_contracts WHERE id IN (:ids)
//
// via `inArray(ctrContracts.id, ids)` — 1 query por página. Dedup dos ids antes do IN; `ids` vazio →
// Map vazio sem tocar o banco. Monta o Map `id → sequential_number`. Aproveita a PK/UNIQUE já
// existentes (nenhuma migration — `sequential_number` é varchar(16) NOT NULL UNIQUE). Read-only;
// zero throw cruzando a borda (try/catch → Result na borda).

import { inArray } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  ContractNumberReadError,
  ContractNumberReadPort,
} from '../../../application/ports/contract-number-read.ts';
import type { MysqlHandle } from '../drivers/mysql-driver.ts';

const logRead = (scope: string, cause: unknown): void => {
  process.stderr.write(`[contract-number-read:${scope}] ${String(cause)}\n`);
};

export const createDrizzleContractNumberReadStore = (
  handle: MysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): ContractNumberReadPort => ({
  resolveContractNumbers: async (
    ids: readonly string[],
  ): Promise<Result<ReadonlyMap<string, string>, ContractNumberReadError>> => {
    // `ids` vazio → Map vazio SEM tocar o banco (contrato do port; evita `IN ()` inválido).
    if (ids.length === 0) return ok(new Map());
    try {
      // Dedup antes do IN: ids repetidos numa página não inflam a lista do `WHERE ... IN`.
      const distinctIds = [...new Set(ids)];
      const rows = await handle.db
        .select({
          id: handle.schema.contracts.id,
          sequentialNumber: handle.schema.contracts.sequentialNumber,
        })
        .from(handle.schema.contracts)
        .where(inArray(handle.schema.contracts.id, distinctIds));

      const out = new Map<string, string>();
      for (const row of rows) out.set(row.id, row.sequentialNumber);
      return ok(out);
    } catch (cause) {
      logRead('resolveContractNumbers', cause);
      return err('contract-number-read-unavailable');
    }
  },
});
