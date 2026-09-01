import type { DocumentId } from '../shared/document-id.ts';
import type { PayableId } from '../shared/payable-id.ts';
import type { RemittanceId } from '../remittance/remittance-id.ts';
import type { DocumentStatus } from './types.ts';
import type { UserRef } from '../../../../shared/kernel/user-ref.ts';
import { exhaustiveStringUnion } from '../../../../shared/primitives/exhaustive.ts';

// Eventos de domínio (EN passado). `occurredAt`/actor são carimbados na borda/use case
// (Functional Core síncrono não conhece relógio).

// #235: snapshot projetável de um título — valores JSON-safe (cents string, dueDate ISO) para
// alimentar a projeção do read-model fin_payable_view (ADR-0022 — projeção evento-carregada).
export type PayableSnapshot = Readonly<{
  payableId: string;
  kind: 'Parent' | 'Child';
  retentionType: string | null;
  valueCents: string;
  dueDate: string;
  status: DocumentStatus;
}>;

export type DocumentSaved = Readonly<{
  type: 'DocumentSaved';
  documentId: DocumentId;
  payableIds: readonly PayableId[];
  // #235: refs do documento (uma vez) + snapshot por título — enriquecimento aditivo p/ a projeção.
  supplierRef: string;
  contractRef: string | null;
  categoryRef: string | null;
  // #446 (REP-3 / Slice B): Plano Orçamentário carimbado no documento (#502) — flui até fin_payable_view.
  budgetPlanRef: string | null;
  // M2/RN-M2-12: a folha da árvore (#502) viaja com as outras quatro. A coluna
  // `fin_payable_view.subcategory_ref` e o índice dela existem desde o #502, mas o evento não a
  // carregava — a projeção gravava `null` em toda linha, e o relatório agrupado por subcategoria
  // via um balde vazio. É o mesmo descarte do #505, um nível acima: no contrato do evento.
  subcategoryRef: string | null;
  costCenterRef: string | null;
  programRef: string | null;
  // #239: conta-débito (de qual conta cedente o pagamento sai) — p/ o widget "Últimos pagamentos".
  debitAccountRef: string | null;
  payables: readonly PayableSnapshot[];
}>;

export type PayableApproved = Readonly<{
  type: 'PayableApproved';
  documentId: DocumentId;
  payableId: PayableId;
  approvedBy: UserRef;
  approvedAt: Date;
}>;

export type ApprovalUndone = Readonly<{
  type: 'ApprovalUndone';
  documentId: DocumentId;
  // #235: os títulos que voltam a `Open` — a projeção reverte o status no read-model.
  payableIds: readonly PayableId[];
}>;

export type DocumentDraftSaved = Readonly<{
  type: 'DocumentDraftSaved';
  documentId: DocumentId;
}>;

export type DocumentCancelled = Readonly<{
  type: 'DocumentCancelled';
  documentId: DocumentId;
  payableIds: readonly PayableId[];
}>;

// #223: baixa manual de um título (Aprovado→Pago), por título (#201). `reason` opcional (a trilha
// captura quem+quando; o motivo é contexto). Carve-out do #59 (sem CNAB).
export type PayableManuallyPaid = Readonly<{
  type: 'PayableManuallyPaid';
  documentId: DocumentId;
  payableId: PayableId;
  paidBy: UserRef;
  paidAt: Date;
  reason?: string;
}>;

// #792 / ADR-0065 §2: o título saiu da alçada do core-api. Emitido POR TÍTULO na mesma transação em
// que a remessa é registrada e os títulos reservados — o evento existe se e somente se a transição
// `Approved → Transmitted` foi persistida.
//
// ⚠️ Não é "o banco recebeu". `Transmitted` do TÍTULO significa "entregue à VAN"; `Transmitted` da
// REMESSA (`fin_remittances.status`) significa "o agente transmitiu, e o `status/` confirmou". São
// dois fatos, e o ADR-0065 §3 existe porque tratá-los como um só foi o defeito original.
//
// `documentId` viaja junto e NÃO é redundância: é ele que faz o outbox classificar este evento como
// `aggregateType: 'Document'` (`fin-outbox-helpers.ts`, ramo `'documentId' in e`), que é onde a
// trilha do título o procura (#823). Sem ele o evento cairia no ramo da remessa e a nota nunca o
// veria. `nsa` e `fileName` respondem "em qual remessa o título foi" sem obrigar o consumidor a
// voltar ao banco — o mesmo motivo pelo qual `payableIds` viaja nos eventos da remessa.
// ⚠️ `documentId`/`payableId` são `string` aqui, e não os branded do resto deste arquivo. É o grão da
// fronteira, não descuido: este evento nasce do agregado `Remittance`, cujo `RemittancePayable` já
// guarda os dois como id opaco (`domain/remittance/types.ts`) — a remessa referencia título e nota
// por identidade, sem conhecer os agregados deles. Rebrandeá-los aqui exigiria `rehydrate` de dado
// que a remessa nunca validou, e um `Result` a tratar no meio da emissão. `ApproverEscalated` já
// usa a mesma forma pelo mesmo motivo.
export type PayableTransmitted = Readonly<{
  type: 'PayableTransmitted';
  documentId: string;
  payableId: string;
  remittanceId: RemittanceId;
  nsa: number;
  fileName: string;
  occurredAt: Date;
}>;

// #792 / ADR-0065 §4: o título VOLTOU da VAN por decisão humana — o inverso exato de
// `PayableTransmitted`, emitido na mesma transação em que a remessa vira `Discarded`.
//
// `reason` é obrigatório e vem da decisão, não do sistema: descartar libera o título para entrar
// noutra remessa, e é a única operação do fluxo que pode levar ao mesmo pagamento sair duas vezes se
// a decisão for errada. Sem o porquê registrado, a auditoria não tem por onde começar.
//
// Mesma forma do irmão pelos mesmos motivos: `documentId` faz o outbox classificá-lo no agregado
// `Document` (é a trilha da nota que o exibe), e os ids são `string` porque nascem do agregado
// `Remittance`, que referencia título e nota por identidade opaca.
export type PayableTransmissionDiscarded = Readonly<{
  type: 'PayableTransmissionDiscarded';
  documentId: string;
  payableId: string;
  remittanceId: RemittanceId;
  reason: string;
  occurredAt: Date;
}>;

// #289 (CASCADE/US3): a cascata escalou o aprovador indicado p/ outro com alçada suficiente.
// Não compõe a trilha (não há marco de estado do Document) — vai só pro outbox.
export type ApproverEscalated = Readonly<{
  type: 'ApproverEscalated';
  documentId: string;
  indicatedApproverRef: UserRef;
  effectiveApproverRef: UserRef;
}>;

export type DocumentEvent =
  | DocumentSaved
  | PayableApproved
  | ApprovalUndone
  | DocumentDraftSaved
  | DocumentCancelled
  | PayableManuallyPaid
  | PayableTransmitted
  | PayableTransmissionDiscarded
  | ApproverEscalated;

/**
 * Fonte única dos literais de `DocumentEvent['type']` (anti-drift) — consumida pelos
 * adapters (schema HTTP do `z.enum`, guard de reidratação do timeline mapper).
 *
 * `exhaustiveStringUnion` força cobertura EXATA da union em tempo de compilação:
 *   - no extra: um literal fora de `DocumentEvent['type']` não compila;
 *   - no missing: adicionar um novo membro à union sem listá-lo aqui QUEBRA `pnpm run typecheck`.
 *
 * O tipo preserva os literais (`as const`), portanto serve direto a `z.enum([...])`,
 * que exige `readonly [string, ...string[]]`.
 */
export const DOCUMENT_EVENT_TYPES = exhaustiveStringUnion<DocumentEvent['type']>()([
  'DocumentSaved',
  'PayableApproved',
  'ApprovalUndone',
  'DocumentDraftSaved',
  'DocumentCancelled',
  'PayableManuallyPaid',
  'PayableTransmitted',
  'PayableTransmissionDiscarded',
  'ApproverEscalated',
] as const);

/**
 * Subconjunto dos tipos que aparecem NA TRILHA (#56b): exclui `DocumentCancelled`, inalcançável
 * na leitura — cancelar faz hard-delete + cascade, a trilha some junto. Exclui também
 * `ApproverEscalated` (#289/CASCADE) — não é marco de estado do Document, vai só pro outbox
 * (sem migration nova: o CHECK `ck_fin_tl_event_type` permanece intocado). Consumido pelo response
 * schema (`z.enum`) e pelo CHECK da tabela de trilha. `Exclude<...>` preserva a exaustividade:
 * adicionar um evento novo à union sem listá-lo aqui QUEBRA `pnpm run typecheck`.
 *
 * ⚠️ `PayableTransmitted` está FORA por ora, e a exclusão é dívida declarada, não desenho: o
 * ADR-0065 §2 diz que ele é projetado na trilha, e a #823 é quem o exibe no drawer ("em qual remessa
 * o título foi"). Entrar aqui custa mais que uma linha — a trilha é gravada SÍNCRONA, na transação
 * de quem escreve (`timeline-recording.ts` → `payable-repository.drizzle.ts`), e o repositório da
 * remessa hoje não escreve trilha nenhuma; além disso o CHECK `ck_fin_tl_event_type` teria de ganhar
 * o literal por migration. O evento JÁ vai ao outbox nesta fatia, que é o que o ADR exige como marco
 * durável; a projeção na trilha é consumo, e é da #823.
 */
export type TimelineEventType = Exclude<
  DocumentEvent['type'],
  'DocumentCancelled' | 'ApproverEscalated' | 'PayableTransmitted' | 'PayableTransmissionDiscarded'
>;

export const TIMELINE_EVENT_TYPES = exhaustiveStringUnion<TimelineEventType>()([
  'DocumentSaved',
  'PayableApproved',
  'ApprovalUndone',
  'DocumentDraftSaved',
  'PayableManuallyPaid',
] as const);
