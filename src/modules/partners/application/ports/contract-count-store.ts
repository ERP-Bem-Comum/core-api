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
}>;
