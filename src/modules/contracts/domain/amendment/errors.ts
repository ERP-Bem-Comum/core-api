// CTR-DOMAIN-TAGGED-ERRORS — Bloco D do refactor funcional do domínio.
//
// Análogo a `contract/errors.ts` (ver doc completa lá).
//
// Decisão de payload (D23): apenas `AmendmentNotPending` carrega payload de
// evidência (`currentStatus`) — é o único invariante runtime que confronta
// estado atual vs tentativa. Os demais são validações simples (input vazio,
// data inválida, valor zero, etc).

import type { AmendmentStatus } from './types.ts';

// ─── Variants (tagged records, PascalCase adjetival/factual — DO D§24) ─────

export type AmendmentNumberRequired = Readonly<{ tag: 'AmendmentNumberRequired' }>;

export type AmendmentDescriptionRequired = Readonly<{ tag: 'AmendmentDescriptionRequired' }>;

export type AmendmentInvalidCreatedAt = Readonly<{ tag: 'AmendmentInvalidCreatedAt' }>;

export type AmendmentInvalidNewEndDate = Readonly<{ tag: 'AmendmentInvalidNewEndDate' }>;

export type AmendmentImpactValueZero = Readonly<{ tag: 'AmendmentImpactValueZero' }>;

export type AmendmentInvalidEventDate = Readonly<{ tag: 'AmendmentInvalidEventDate' }>;

export type AmendmentNotPending = Readonly<{
  tag: 'AmendmentNotPending';
  currentStatus: AmendmentStatus;
}>;

export type AmendmentDocumentAlreadyAttached = Readonly<{
  tag: 'AmendmentDocumentAlreadyAttached';
}>;

export type AmendmentWithoutSignedDocument = Readonly<{ tag: 'AmendmentWithoutSignedDocument' }>;

// ─── Union ─────────────────────────────────────────────────────────────────

export type AmendmentError =
  | AmendmentNumberRequired
  | AmendmentDescriptionRequired
  | AmendmentInvalidCreatedAt
  | AmendmentInvalidNewEndDate
  | AmendmentImpactValueZero
  | AmendmentInvalidEventDate
  | AmendmentNotPending
  | AmendmentDocumentAlreadyAttached
  | AmendmentWithoutSignedDocument;

// ─── Case constructors (Padrão D — free functions, DO D§22) ────────────────

export const amendmentNumberRequired = (): AmendmentNumberRequired => ({
  tag: 'AmendmentNumberRequired',
});

export const amendmentDescriptionRequired = (): AmendmentDescriptionRequired => ({
  tag: 'AmendmentDescriptionRequired',
});

export const amendmentInvalidCreatedAt = (): AmendmentInvalidCreatedAt => ({
  tag: 'AmendmentInvalidCreatedAt',
});

export const amendmentInvalidNewEndDate = (): AmendmentInvalidNewEndDate => ({
  tag: 'AmendmentInvalidNewEndDate',
});

export const amendmentImpactValueZero = (): AmendmentImpactValueZero => ({
  tag: 'AmendmentImpactValueZero',
});

export const amendmentInvalidEventDate = (): AmendmentInvalidEventDate => ({
  tag: 'AmendmentInvalidEventDate',
});

export const amendmentNotPending = (currentStatus: AmendmentStatus): AmendmentNotPending => ({
  tag: 'AmendmentNotPending',
  currentStatus,
});

export const amendmentDocumentAlreadyAttached = (): AmendmentDocumentAlreadyAttached => ({
  tag: 'AmendmentDocumentAlreadyAttached',
});

export const amendmentWithoutSignedDocument = (): AmendmentWithoutSignedDocument => ({
  tag: 'AmendmentWithoutSignedDocument',
});
