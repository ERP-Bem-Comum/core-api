import type { Money } from '../../../../shared/kernel/money.ts';
import type { UserRef } from '../../../../shared/kernel/user-ref.ts';
import type { Document } from '../document/types.ts';
import type { DocumentEvent } from '../document/events.ts';
import type { Payable, Payables } from '../payable/types.ts';
import type { FieldChange, FinancialTimelineEntry } from './types.ts';

// Projeção/diff PUROS (ADR-0001): a trilha é derivada do estado do agregado (before→after),
// não do payload do evento. Serialização atômica (1FN, sem JSON — ADR-0020).

const fromMoney = (m: Money | null): string | null => (m === null ? null : String(m.cents));
const fromDate = (d: Date | null): string | null => (d === null ? null : d.toISOString());

const documentSnapshot = (d: Document): Readonly<Record<string, string | null>> => ({
  documentNumber: d.documentNumber ?? null,
  type: d.type ?? null,
  status: d.status,
  supplierRef: d.supplier === null ? null : String(d.supplier),
  paymentMethod: d.paymentMethod ?? null,
  grossValue: fromMoney(d.grossValue),
  netValue: d.status === 'Draft' ? null : fromMoney(d.netValue),
  dueDate: fromDate(d.dueDate),
  description: d.description ?? null,
});

const payableSnapshot = (p: Payable): Readonly<Record<string, string | null>> => ({
  status: p.status,
  value: fromMoney(p.value),
  retentionType: p.retentionType,
});

const diffSnapshots = (
  before: Readonly<Record<string, string | null>> | null,
  after: Readonly<Record<string, string | null>>,
): readonly FieldChange[] => {
  const changes: FieldChange[] = [];
  for (const field of Object.keys(after)) {
    const beforeV = before === null ? null : (before[field] ?? null);
    const afterV = after[field] ?? null;
    if (beforeV !== afterV) changes.push({ field, before: beforeV, after: afterV });
  }
  return changes;
};

export const diffDocument = (before: Document | null, after: Document): readonly FieldChange[] =>
  diffSnapshots(before === null ? null : documentSnapshot(before), documentSnapshot(after));

const allPayables = (p: Payables | null): readonly Payable[] =>
  p === null ? [] : [p.parent, ...p.children];

export type ProjectEntryInput = Readonly<{
  eventId: string;
  event: DocumentEvent;
  before: Document | null;
  after: Document;
  payablesBefore: Payables | null;
  payablesAfter: Payables | null;
  actor: UserRef | null;
  occurredAt: Date;
}>;

// Gera as entradas do marco: 1 para o Documento + 1 por título alterado/criado.
export const projectEntry = (input: ProjectEntryInput): readonly FinancialTimelineEntry[] => {
  // Cancelar faz hard-delete + cascade — não há marco de trilha para `DocumentCancelled`.
  // O guard também narrowa `eventType` para o subconjunto `TimelineEventType` (sem o cancelamento).
  const eventType = input.event.type;
  if (eventType === 'DocumentCancelled') return [];

  const documentId = input.after.id;
  const entries: FinancialTimelineEntry[] = [
    {
      eventId: input.eventId,
      documentId,
      target: { kind: 'Document', id: documentId },
      eventType,
      occurredAt: input.occurredAt,
      actor: input.actor,
      changes: diffDocument(input.before, input.after),
    },
  ];

  const beforeById = new Map<string, Payable>(
    allPayables(input.payablesBefore).map((p) => [p.id, p]),
  );
  for (const after of allPayables(input.payablesAfter)) {
    const before = beforeById.get(after.id) ?? null;
    const changes = diffSnapshots(
      before === null ? null : payableSnapshot(before),
      payableSnapshot(after),
    );
    if (changes.length === 0) continue;
    entries.push({
      eventId: input.eventId,
      documentId,
      target: { kind: 'Payable', id: after.id },
      eventType,
      occurredAt: input.occurredAt,
      actor: input.actor,
      changes,
    });
  }

  return entries;
};
