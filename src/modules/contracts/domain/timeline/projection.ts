import type { ContractId, AmendmentId } from '../shared/ids.ts';
import type { TimelineEntry, TimelineSourceEvent } from './types.ts';

// `parentId` é `ContractId | AmendmentId` sem discriminação por `parentType` no tipo —
// o cast é seguro sob a guarda `parentType === 'Amendment'`.
const amendmentOfDoc = (
  e: Readonly<{ parentType: 'Contract' | 'Amendment'; parentId: ContractId | AmendmentId }>,
): AmendmentId | null => (e.parentType === 'Amendment' ? (e.parentId as AmendmentId) : null);

/**
 * Mapeamento PURO evento de domínio → TimelineEntry (ADR-0022). `contractId` é
 * resolvido pelo projetor (alguns eventos não o carregam) e passado aqui.
 * Switch exaustivo sobre os 9 tipos de evento — sem `default`.
 */
export const toTimelineEntry = (
  event: TimelineSourceEvent,
  eventId: string,
  contractId: ContractId,
): TimelineEntry => {
  const base = { eventId, contractId, kind: event.type, occurredAt: event.occurredAt } as const;

  switch (event.type) {
    case 'ContractCreated':
    case 'ContractEnded':
      return { ...base, actor: null, subjectAmendmentId: null };
    case 'ContractStateUpdated':
      return { ...base, actor: null, subjectAmendmentId: event.amendmentId };
    case 'AmendmentCreated':
    case 'AmendmentDocumentAttached':
      return { ...base, actor: null, subjectAmendmentId: event.amendmentId };
    case 'AmendmentHomologated':
      return { ...base, actor: event.homologatedBy, subjectAmendmentId: event.amendmentId };
    case 'ContractDocumentAttached':
      return { ...base, actor: event.uploadedBy, subjectAmendmentId: amendmentOfDoc(event) };
    case 'ContractDocumentDeleted':
      return { ...base, actor: event.deletedBy, subjectAmendmentId: amendmentOfDoc(event) };
    case 'ContractDocumentSuperseded':
      return { ...base, actor: event.supersededBy, subjectAmendmentId: amendmentOfDoc(event) };
  }
};
