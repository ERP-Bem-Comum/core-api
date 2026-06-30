import type { DocumentId } from '../shared/document-id.ts';
import type { PayableId } from '../shared/payable-id.ts';
import type { UserRef } from '../../../../shared/kernel/user-ref.ts';
import type { TimelineEventType } from '../document/events.ts';

// Read-model da trilha (Time Travel por-campo) — NÃO é agregado. Projeção derivada do
// estado do agregado Document (ADR-0001). `kind` em EN (discriminador); rótulo PT no formatter.

export type FieldChange = Readonly<{
  field: string;
  before: string | null;
  after: string | null;
}>;

export type TimelineTarget =
  | Readonly<{ kind: 'Document'; id: DocumentId }>
  | Readonly<{ kind: 'Payable'; id: PayableId }>;

export type FinancialTimelineEntry = Readonly<{
  eventId: string;
  documentId: DocumentId;
  target: TimelineTarget;
  // Discriminador do evento de domínio que originou a entry (convenção: `eventType` p/ eventos,
  // `kind` p/ variantes de entidade como TimelineTarget.kind). Exclui `DocumentCancelled` —
  // cancelar faz hard-delete + cascade, a trilha nunca carrega esse tipo. Mapeado direto ao DTO.
  eventType: TimelineEventType;
  occurredAt: Date;
  actor: UserRef | null;
  changes: readonly FieldChange[];
}>;
