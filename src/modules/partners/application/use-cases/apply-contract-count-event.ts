/**
 * Use case `applyContractCountEvent` (US6b) — aplica um evento de ciclo de vida do `contracts`
 * (lido do `ctr_outbox`) no read-model de contagem do `partners`.
 *
 * Decodifica via `contracts/public-api` (`decodeContractContractorRefV1`, US6a) — NUNCA lê as
 * tabelas do `contracts` (ADR-0006). `ContractCreated → +1`, `ContractEnded`/`ContractCancelled →
 * −1`; sem contraparte (ex.: amendment/document) → no-op. Idempotência por `eventId` no store.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { decodeContractContractorRefV1 } from '#src/modules/contracts/public-api/events.ts';
import type { ContractCountStore, ContractCountStoreError } from '../ports/contract-count-store.ts';

export type ContractCountMessage = Readonly<{
  eventId: string;
  eventType: string;
  schemaVersion: number;
  payload: string;
  occurredAt: Date;
}>;

export type ApplyContractCountEventError = 'contract-count-decode-failed' | ContractCountStoreError;

const deltaFor = (eventType: string): number => {
  switch (eventType) {
    case 'ContractCreated':
      return 1;
    case 'ContractEnded':
    case 'ContractCancelled':
      return -1;
    default:
      return 0;
  }
};

export const applyContractCountEvent =
  (deps: Readonly<{ store: ContractCountStore }>) =>
  async (message: ContractCountMessage): Promise<Result<void, ApplyContractCountEventError>> => {
    const decoded = decodeContractContractorRefV1(message);
    if (!decoded.ok) return err('contract-count-decode-failed');
    if (decoded.value === null) return ok(undefined); // evento sem contraparte → no-op
    const delta = deltaFor(message.eventType);
    if (delta === 0) return ok(undefined);
    return deps.store.applyDelta({
      contractorRef: decoded.value.contractorRef.id,
      delta,
      eventId: message.eventId,
    });
  };
