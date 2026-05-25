import type { AmendmentId, ContractId, DocumentId } from '../shared/ids.ts';
import type { UserRef } from '../../../../shared/kernel/user-ref.ts';
import type { NonZeroMoney } from '../../../../shared/kernel/non-zero-money.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';

/**
 * Eixo de kind do aditivo — INDEPENDENTE do status (DO C§28: aninhamento, NÃO
 * cross-product de 4 kinds × 3 status = 12 tipos).
 *
 * Origem: handbook/interviews/0001-functional-ddd-domain-refresh.md, Bloco C+D.
 *   - DO C§28: "Modelar 2 eixos discriminantes como aninhamento."
 *   - DON'T C§26: "Cross-product de 2 eixos discriminantes."
 */
/**
 * Eixo de kind do aditivo — INDEPENDENTE do status (DO C§28: aninhamento, NÃO
 * cross-product de 4 kinds × 3 status = 12 tipos).
 *
 * Addition e Suppression exigem `NonZeroMoney` em `impactValue` (rota α DO D§25):
 * invariante "aditivo financeiro com impacto zero não existe" codificada no tipo,
 * não como runtime check no agregado (DON'T D§24).
 *
 * Origem: handbook/interviews/0001-functional-ddd-domain-refresh.md, Bloco C+D.
 *   - DO C§28: "Modelar 2 eixos discriminantes como aninhamento."
 *   - DON'T C§26: "Cross-product de 2 eixos discriminantes."
 *   - DO D§25: "Rota α — invariante atemporal e reusável codificada como VO subtype."
 *   - DON'T D§24: "Não codificar invariante reusável como `if` no agregado."
 */
export type AmendmentVariant = Readonly<
  | { kind: 'Addition'; impactValue: NonZeroMoney }
  | { kind: 'Suppression'; impactValue: NonZeroMoney }
  | { kind: 'TermChange'; newEndDate: Date }
  | { kind: 'Misc' }
>;

/**
 * Campos comuns a todos os estados do agregado `Amendment`.
 *
 * Não inclui campos de estado (`status`, `signedDocumentRef`, `homologatedAt`,
 * `homologatedBy`) — esses pertencem aos tipos refinados por estado.
 */
type AmendmentCore = Readonly<{
  id: AmendmentId;
  contractId: ContractId;
  amendmentNumber: string;
  description: string;
  createdAt: Date;
}> &
  AmendmentVariant;

/**
 * Estado 1: Pending sem documento anexado (estado inicial de todo aditivo).
 *
 * `signedDocumentRef` é `null` (não `T | null`) — discrimina este subtipo de
 * `PendingWithDocumentAmendment`. `homologatedAt`/`homologatedBy` também `null`
 * obrigatório (DO C§29: estados eliminam null-as-state).
 */
export type PendingWithoutDocumentAmendment = AmendmentCore &
  Readonly<{
    status: 'Pending';
    signedDocumentRef: null;
    homologatedAt: null;
    homologatedBy: null;
  }>;

/**
 * Estado 2: Pending com documento anexado — única configuração que aceita
 * homologação (RN-12).
 *
 * `signedDocumentRef` é `DocumentId` (não `T | null`). Garantia estática:
 * `homologate(p: PendingWithDocumentAmendment)` não precisa de runtime check.
 */
export type PendingWithDocumentAmendment = AmendmentCore &
  Readonly<{
    status: 'Pending';
    signedDocumentRef: DocumentId;
    homologatedAt: null;
    homologatedBy: null;
  }>;

/**
 * Estado 3: Homologated (terminal). `signedDocumentRef`, `homologatedAt` e
 * `homologatedBy` são todos obrigatórios — a homologação exigiu cada um.
 */
export type HomologatedAmendment = AmendmentCore &
  Readonly<{
    status: 'Homologated';
    signedDocumentRef: DocumentId;
    homologatedAt: Date;
    homologatedBy: UserRef;
  }>;

/**
 * Union discriminada do agregado `Amendment` (tipo público).
 *
 * Discriminador composto: `status` ('Pending' vs 'Homologated') + presença de
 * `signedDocumentRef` dentro de Pending. TS narrowa naturalmente via
 * `signedDocumentRef === null` em Pending.
 *
 * Sem `Brand` — DON'T A§1: brandar agregados é redundante; o `kind` discrimina.
 */
export type Amendment =
  | PendingWithoutDocumentAmendment
  | PendingWithDocumentAmendment
  | HomologatedAmendment;

/** Status público — derivado da union (não declarado manualmente). */
export type AmendmentStatus = Amendment['status'];

/** Kind público — derivado da union (não declarado manualmente). */
export type AmendmentKind = Amendment['kind'];

/**
 * Patch parcial aceito por `updateAmendment`.
 *
 * Todos os campos do agregado `Amendment` são imutáveis (core + variant) ou
 * pertencem exclusivamente a transições refinadas (`status`, `signedDocumentRef`,
 * `homologatedAt`, `homologatedBy`). Por isso `AmendmentUpdate` é o tipo vazio
 * estrito — `Record<never, never>` — que bloqueia qualquer propriedade extra em
 * object literals (excess property check do TS).
 *
 * `updateAmendment` continua existindo como facade canônica (DO A§4): se no
 * futuro surgir um campo mutável "por patch" (ex: `notes: string`), basta
 * adicioná-lo aqui sem mudar a assinatura da função.
 *
 * Teste de evidência CA-SM-AMENDMENT: `@ts-expect-error` em
 * `updateAmendment(a, { status: 'Homologated' })` confirma que `status` é
 * barrado em compile time.
 */
export type AmendmentUpdate = Readonly<Record<never, never>>;

/**
 * Helper canônico de atualização (DO A§4 do master doc).
 *
 * Genérico `<T extends Amendment>` preserva o subtipo refinado do chamador —
 * `updateAmendment(prev: PendingWithoutDocumentAmendment, patch)` retorna
 * `PendingWithoutDocumentAmendment`, não a union `Amendment`.
 *
 * **Nota sobre o cast `as T`:** o spread sobre uma discriminated union perde o
 * narrowing da variante — o TS infere o tipo "achatado" mais largo. O cast
 * reafirma o invariante já garantido em runtime: `patch` nunca inclui `status`,
 * `signedDocumentRef`, `homologatedAt`, `homologatedBy` (excluídos de
 * `AmendmentUpdate`), então o subtipo de `prev` é preservado estruturalmente.
 * Cast estreito (NÃO `as unknown as`).
 *
 * `immutable()` aplica `Object.freeze` shallow (DO B§10 / DON'T B§5).
 */
export const updateAmendment = <T extends Amendment>(prev: T, patch: AmendmentUpdate): T =>
  // Cast estreito: spread sobre discriminated union perde narrowing por limitação
  // de inferência do TS. Variante preservada em runtime pelos campos imutáveis.
  immutable({ ...prev, ...patch }) as T;

type CreateAmendmentInputBase = Readonly<{
  id: AmendmentId;
  contractId: ContractId;
  amendmentNumber: string;
  description: string;
  createdAt: Date;
}>;

/**
 * Input de criação do aditivo — espelha `AmendmentVariant` em termos de
 * invariantes de tipo: Addition e Suppression exigem `NonZeroMoney` (rota γ,
 * DO D§26). O caso de uso é o orquestrador que refina `Money → NonZeroMoney`
 * antes de construir este input.
 */
export type CreateAmendmentInput = CreateAmendmentInputBase &
  Readonly<
    | { kind: 'Addition'; impactValue: NonZeroMoney }
    | { kind: 'Suppression'; impactValue: NonZeroMoney }
    | { kind: 'TermChange'; newEndDate: Date }
    | { kind: 'Misc' }
  >;
