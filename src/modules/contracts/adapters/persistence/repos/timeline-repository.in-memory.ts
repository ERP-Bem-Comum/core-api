import { ok } from '../../../../../shared/primitives/result.ts';
import type { ContractId, AmendmentId } from '../../../domain/shared/ids.ts';
import type { TimelineEntry } from '../../../domain/timeline/types.ts';
import type { TimelineRepository } from '../../../domain/timeline/repository.ts';

// Adapter InMemory do read-model da Timeline. Idempotência por `eventId`; índice
// amendmentId→contractId populado do primeiro marco que vincula os dois (AmendmentCreated).
export const InMemoryTimelineRepository = (): TimelineRepository => {
  const entries: TimelineEntry[] = [];
  const seen = new Set<string>();
  const amendmentIndex = new Map<AmendmentId, ContractId>();

  return {
    append: async (entry) => {
      if (!seen.has(entry.eventId)) {
        seen.add(entry.eventId);
        entries.push(entry);
        if (entry.subjectAmendmentId !== null && !amendmentIndex.has(entry.subjectAmendmentId)) {
          amendmentIndex.set(entry.subjectAmendmentId, entry.contractId);
        }
      }
      return ok(undefined);
    },
    listByContract: async (contractId) =>
      ok(
        entries
          .filter((e) => e.contractId === contractId)
          .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime()),
      ),
    findContractIdByAmendment: async (amendmentId) => ok(amendmentIndex.get(amendmentId) ?? null),
  };
};
