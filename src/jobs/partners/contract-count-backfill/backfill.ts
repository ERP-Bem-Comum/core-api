/**
 * Lógica pura do backfill do read-model de contagem de contratos (#110). Recompõe `activeCount`
 * ABSOLUTO por contraparte a partir dos contratos vivos existentes, via `setCount` (não `applyDelta`):
 * re-execução é idempotente (CA2) e reconcilia drift (#129) — a recomputação é a fonte da verdade.
 * Testável sem DB (store in-memory).
 */
import { type Result, ok } from '#src/shared/primitives/result.ts';
import type { ContractCountStore } from '#src/modules/partners/application/ports/contract-count-store.ts';

export type ContractCountRecord = Readonly<{ contractorRef: string; activeCount: number }>;

export type BackfillResult = Readonly<{ applied: number; failed: number }>;

export const backfillContractCounts = async (
  records: readonly ContractCountRecord[],
  store: ContractCountStore,
): Promise<Result<BackfillResult, never>> => {
  let applied = 0;
  let failed = 0;
  for (const record of records) {
    const result = await store.setCount({
      contractorRef: record.contractorRef,
      activeCount: record.activeCount,
    });
    if (result.ok) applied += 1;
    else failed += 1;
  }
  return ok({ applied, failed });
};
