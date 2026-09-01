import type { Money } from '../../../../shared/kernel/money.ts';
import type { UserRef } from '../../../../shared/kernel/user-ref.ts';
import type { Document } from '../document/types.ts';
import type { DocumentId } from '../shared/document-id.ts';
import type { PayableId } from '../shared/payable-id.ts';
import type { DocumentEvent } from '../document/events.ts';
import type { DocumentTaxonomy } from '../document/document.ts';
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
  // #273: complemento da forma de pagamento — auditado before/after no timeline (CA6.5).
  paymentDetail: d.paymentDetail ?? null,
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

// ─── M2: trilha da reclassificação (RN-M2-07) ────────────────────────────────

const taxonomySnapshot = (t: DocumentTaxonomy): Readonly<Record<string, string | null>> => ({
  programRef: t.programRef,
  budgetPlanRef: t.budgetPlanRef,
  costCenterRef: t.costCenterRef,
  categoryRef: t.categoryRef,
  subcategoryRef: t.subcategoryRef,
});

export type ProjectReclassificationInput = Readonly<{
  eventId: string;
  documentId: DocumentId;
  before: DocumentTaxonomy;
  after: DocumentTaxonomy;
  // Pai + filhos de retenção: TODOS registram o de→para, porque a classificação de todos mudou.
  payableIds: readonly PayableId[];
  actor: UserRef | null;
  occurredAt: Date;
}>;

// M2/RN-M2-07: quem, quando, de→para — no pai e nos filhos afetados.
//
// Projetor PRÓPRIO, e não um campo a mais em `documentSnapshot`, por uma razão de leitura: a
// taxonomia é do documento, mas a pergunta que a auditoria faz é "por que ESTE imposto está sob
// ESTE projeto?". A resposta tem de estar na trilha DO TÍTULO de retenção, senão quem abre o filho
// vê a classificação ter mudado e nenhum registro do ato. Emitir uma entry por título é o que torna
// a cascata auditável do lado em que ela é observada.
//
// `changes` vazio → nenhuma entry (invariante 6: reclassificar para o mesmo valor não deixa rastro
// de mudança que não houve). Quem chama não precisa checar antes.
export const projectReclassification = (
  input: ProjectReclassificationInput,
): readonly FinancialTimelineEntry[] => {
  const changes = diffSnapshots(taxonomySnapshot(input.before), taxonomySnapshot(input.after));
  if (changes.length === 0) return [];

  const base = {
    eventId: input.eventId,
    documentId: input.documentId,
    // `DocumentSaved` é o marco honesto: a reclassificação É um save do documento, e é o literal que
    // o CHECK `ck_fin_tl_event_type` já aceita. Um tipo novo custaria migration e não diria mais.
    eventType: 'DocumentSaved' as const,
    occurredAt: input.occurredAt,
    actor: input.actor,
    changes,
  };

  return [
    { ...base, target: { kind: 'Document' as const, id: input.documentId } },
    ...input.payableIds.map((id) => ({ ...base, target: { kind: 'Payable' as const, id } })),
  ];
};

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
  // `ApproverEscalated` (#289/CASCADE) também não é marco de estado do Document — vai só pro
  // outbox (ver `TimelineEventType` em events.ts). O guard narrowa `eventType` para o
  // subconjunto `TimelineEventType` (sem cancelamento nem escalonamento).
  //
  // `PayableTransmitted` e `PayableTransmissionDiscarded` (ADR-0065 §§2,4) saem por um motivo
  // DIFERENTE dos outros dois, e a diferença importa: os dois são marcos de estado do título e vão à
  // trilha um dia — a #823 os quer no drawer, com o NSA e o nome do arquivo. Não passam por aqui
  // hoje porque não CHEGAM aqui: quem os emite é o `save` da remessa, que não monta `Payables` nem
  // chama esta projeção. Quando a #823 os trouxer, o caminho a construir é esse, não este `if`.
  const eventType = input.event.type;
  if (
    eventType === 'DocumentCancelled' ||
    eventType === 'ApproverEscalated' ||
    eventType === 'PayableTransmitted' ||
    eventType === 'PayableTransmissionDiscarded'
  ) {
    return [];
  }

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
