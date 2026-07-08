/**
 * `ContractCountStore` — driven port do read-model de contagem de contratos por contraparte (US6b).
 *
 * `applyDelta` soma `+1`/`−1` à contagem do `contractorRef`, **idempotente por `eventId`** — o
 * receiver registra os eventIds já aplicados e recusa duplicatas (at-least-once; Vernon, IDDD,
 * p.412). Diferente do read-model de fornecedor (snapshot com recency-guard): contagem é delta,
 * não idempotente sob recência. `getCount` resolve a contagem corrente (0 quando ausente).
 */

import type { Result } from '#src/shared/primitives/result.ts';

export type ContractCountStoreError = 'contract-count-store-unavailable';

export type ContractCountStore = Readonly<{
  applyDelta: (
    input: Readonly<{ contractorRef: string; delta: number; eventId: string }>,
  ) => Promise<Result<void, ContractCountStoreError>>;
  getCount: (contractorRef: string) => Promise<Result<number, ContractCountStoreError>>;
  /**
   * Define a contagem **absoluta** de um `contractorRef` (recomputada da fonte da verdade). Idempotente
   * por natureza — re-executar com o mesmo valor converge ao mesmo estado (≠ `applyDelta`, que soma).
   * Usado pelo backfill/reconciliação (#110/#129); não registra `eventId` (não é um evento de domínio).
   */
  setCount: (
    input: Readonly<{ contractorRef: string; activeCount: number }>,
  ) => Promise<Result<void, ContractCountStoreError>>;
  /**
   * Batch: contagem de vários refs numa única leitura (anti-N+1 nos grids paginados). O map só
   * traz os refs presentes no read-model; ausentes resolvem a `0` no chamador (CA2 da #105).
   */
  getCounts: (
    contractorRefs: readonly string[],
  ) => Promise<Result<ReadonlyMap<string, number>, ContractCountStoreError>>;
}>;
