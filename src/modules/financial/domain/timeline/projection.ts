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
    reason: null,
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

// ─── #823: trilha da geração de remessa ──────────────────────────────────────

export type ProjectTransmissionInput = Readonly<{
  eventId: string;
  documentId: DocumentId;
  payableId: PayableId;
  // Atributo da REMESSA (P.O. na #823) — viaja na entry do título porque é por ele que o operador
  // procura o pagamento no banco.
  nsa: number;
  // Por TÍTULO naquela remessa: a chave que casa o retorno do banco com o título (#752).
  yourNumber: string;
  actor: UserRef | null;
  occurredAt: Date;
}>;

// Uma entry por título, sem entry de Documento: a remessa sai por título — uma nota pode ter saído
// em parte (o pai no arquivo, a retenção ainda aberta), e uma entry no documento diria que ela saiu
// inteira.
//
// `before` do status é `Approved` por CONSTRUÇÃO, não por suposição: a transição é um CAS
// `WHERE status = 'Approved'` com veredito por contagem, e qualquer título fora disso desfaz a
// transação inteira — esta entry nunca é gravada sobre outro estado anterior.
//
// Título em duas remessas (a primeira descartada) ganha duas entries, cada uma com o NSA e o
// `your_number` da sua — é trilha, não campo (#823).
export const projectTransmission = (input: ProjectTransmissionInput): FinancialTimelineEntry => ({
  eventId: input.eventId,
  documentId: input.documentId,
  target: { kind: 'Payable', id: input.payableId },
  eventType: 'PayableTransmitted',
  occurredAt: input.occurredAt,
  actor: input.actor,
  reason: null,
  changes: [
    { field: 'status', before: 'Approved', after: 'Transmitted' },
    { field: 'remittanceNsa', before: null, after: String(input.nsa) },
    { field: 'remittanceYourNumber', before: null, after: input.yourNumber },
  ],
});

// ─── #406: trilha da conciliação ─────────────────────────────────────────────

export type ProjectReconciliationStatusInput = Readonly<{
  eventType: 'PayableReconciled' | 'ReconciliationUndone';
  eventId: string;
  documentId: DocumentId;
  payableId: PayableId;
  // Lidos NA transação que muda o status — o anterior não é presumido: um segundo parcial parte de
  // `PartiallyReconciled`, e desfazer uma de duas conciliações pode manter o título conciliado.
  statusBefore: string;
  statusAfter: string;
  actor: UserRef | null;
  reason: string | null;
  occurredAt: Date;
}>;

// Uma entry por título. O marco é gravado mesmo quando o status não muda (2º parcial que não fecha,
// desfazer uma de duas conciliações): o ato aconteceu e a auditoria o procura — só a mudança de
// campo é que fica de fora, porque não houve.
export const projectReconciliationStatus = (
  input: ProjectReconciliationStatusInput,
): FinancialTimelineEntry => ({
  eventId: input.eventId,
  documentId: input.documentId,
  target: { kind: 'Payable', id: input.payableId },
  eventType: input.eventType,
  occurredAt: input.occurredAt,
  actor: input.actor,
  reason: input.reason,
  changes:
    input.statusBefore === input.statusAfter
      ? []
      : [{ field: 'status', before: input.statusBefore, after: input.statusAfter }],
});

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
  // DIFERENTE dos outros dois: não CHEGAM aqui, porque quem os emite é o `save` da remessa, que não
  // monta `Payables`. A transmissão vai à trilha por `projectTransmission` (#823), gravada pelo
  // próprio repositório da remessa; o descarte segue fora (decisão pendente da P.O.).
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
  // #61: o motivo vem do PAYLOAD do evento — é o único dado da trilha que não sai do diff de estado.
  const reason = 'reason' in input.event ? (input.event.reason ?? null) : null;
  const entries: FinancialTimelineEntry[] = [
    {
      eventId: input.eventId,
      documentId,
      target: { kind: 'Document', id: documentId },
      eventType,
      occurredAt: input.occurredAt,
      actor: input.actor,
      reason,
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
      reason,
      changes,
    });
  }

  return entries;
};
