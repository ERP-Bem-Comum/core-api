import type { DocumentId } from '../shared/document-id.ts';
import type { PayableId } from '../shared/payable-id.ts';
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
  status: string;
}>;

export type DocumentSaved = Readonly<{
  type: 'DocumentSaved';
  documentId: DocumentId;
  payableIds: readonly PayableId[];
  // #235: refs do documento (uma vez) + snapshot por título — enriquecimento aditivo p/ a projeção.
  supplierRef: string;
  contractRef: string | null;
  categoryRef: string | null;
  costCenterRef: string | null;
  programRef: string | null;
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
  'ApproverEscalated',
] as const);

/**
 * Subconjunto dos tipos que aparecem NA TRILHA (#56b): exclui `DocumentCancelled`, inalcançável
 * na leitura — cancelar faz hard-delete + cascade, a trilha some junto. Exclui também
 * `ApproverEscalated` (#289/CASCADE) — não é marco de estado do Document, vai só pro outbox
 * (sem migration nova: o CHECK `ck_fin_tl_event_type` permanece intocado). Consumido pelo response
 * schema (`z.enum`) e pelo CHECK da tabela de trilha. `Exclude<...>` preserva a exaustividade:
 * adicionar um evento novo à union sem listá-lo aqui QUEBRA `pnpm run typecheck`.
 */
export type TimelineEventType = Exclude<
  DocumentEvent['type'],
  'DocumentCancelled' | 'ApproverEscalated'
>;

export const TIMELINE_EVENT_TYPES = exhaustiveStringUnion<TimelineEventType>()([
  'DocumentSaved',
  'PayableApproved',
  'ApprovalUndone',
  'DocumentDraftSaved',
  'PayableManuallyPaid',
] as const);
