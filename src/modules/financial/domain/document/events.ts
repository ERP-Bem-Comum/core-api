import type { DocumentId } from '../shared/document-id.ts';
import type { PayableId } from '../shared/payable-id.ts';
import type { UserRef } from '../../../../shared/kernel/user-ref.ts';
import { exhaustiveStringUnion } from '../../../../shared/primitives/exhaustive.ts';

// Eventos de domínio (EN passado). `occurredAt`/actor são carimbados na borda/use case
// (Functional Core síncrono não conhece relógio).
export type DocumentSaved = Readonly<{
  type: 'DocumentSaved';
  documentId: DocumentId;
  payableIds: readonly PayableId[];
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

export type DocumentEvent =
  | DocumentSaved
  | PayableApproved
  | ApprovalUndone
  | DocumentDraftSaved
  | DocumentCancelled;

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
] as const);

/**
 * Subconjunto dos tipos que aparecem NA TRILHA (#56b): exclui `DocumentCancelled`, inalcançável
 * na leitura — cancelar faz hard-delete + cascade, a trilha some junto. Consumido pelo response
 * schema (`z.enum`) e pelo CHECK da tabela de trilha. `Exclude<...>` preserva a exaustividade:
 * adicionar um evento novo à union sem listá-lo aqui QUEBRA `pnpm run typecheck`.
 */
export type TimelineEventType = Exclude<DocumentEvent['type'], 'DocumentCancelled'>;

export const TIMELINE_EVENT_TYPES = exhaustiveStringUnion<TimelineEventType>()([
  'DocumentSaved',
  'PayableApproved',
  'ApprovalUndone',
  'DocumentDraftSaved',
] as const);
