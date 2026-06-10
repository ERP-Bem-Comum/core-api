// CTR-DOMAIN-TAGGED-ERRORS — Bloco D do refactor funcional do domínio.
//
// Origem: handbook/interviews/0001-functional-ddd-domain-refresh.md, Bloco D.
//
// Padrão D — Tagged Errors:
//
//   - DO D§22: "Tagged error shape **flat** (`{ tag, …payload }`). Case
//     constructors como **free functions** em `errors.ts` por agregado
//     (consistente com o Padrão D do Bloco B). Consumo via
//     `import * as ContractError from './errors.ts'`."
//
//   - DO D§23: "Payload de erro de invariante carrega **as duas peças de
//     evidência que colidiram** (estado atual + tentativa)."
//
//   - DO D§24: "Erros: **PascalCase adjetival/factual** (`ContractNotActive`).
//     Eventos: PascalCase passado (`ContractCreated`)."
//
//   - DON'T D§21: "`export const ContractError = { … } as const` ao lado de
//     `export type ContractError` — declaration merging informal, viola o
//     Padrão D do Bloco B."
//
//   - DON'T D§22: "Erro de invariante carregando primitivo cru sem ser
//     evidência da colisão."
//
// Decisão de payload (D23 — pragmatismo): apenas erros de invariante runtime
// que comparam estado atual vs tentativa carregam payload de evidência. Erros
// de validação simples (`*Required`, `*Zero`, `*InvalidEventDate`) ficam sem
// payload — não há "duas peças que colidiram", apenas falha binária.

import type { ContractStatus } from './types.ts';
import type { Money } from '../../../../shared/kernel/money.ts';
import type { PlainDate } from '../../../../shared/kernel/plain-date.ts';
import type { AmendmentId } from '../shared/ids.ts';

// ─── Variants (tagged records, PascalCase adjetival/factual — DO D§24) ─────

export type ContractSequentialNumberRequired = Readonly<{
  tag: 'ContractSequentialNumberRequired';
}>;

export type ContractSequentialNumberInvalidFormat = Readonly<{
  tag: 'ContractSequentialNumberInvalidFormat';
  attempted: string;
}>;

export type ContractTitleRequired = Readonly<{ tag: 'ContractTitleRequired' }>;

export type ContractObjectiveRequired = Readonly<{ tag: 'ContractObjectiveRequired' }>;

export type ContractInvalidSignedAt = Readonly<{ tag: 'ContractInvalidSignedAt' }>;

export type ContractOriginalValueZero = Readonly<{ tag: 'ContractOriginalValueZero' }>;

// CTR-NUMBER-PROGRAM: classificação fora de CT|OS.
export type ContractClassificationInvalid = Readonly<{
  tag: 'ContractClassificationInvalid';
  attempted: string;
}>;

export type ContractInvalidEventDate = Readonly<{ tag: 'ContractInvalidEventDate' }>;

export type ContractNotActive = Readonly<{
  tag: 'ContractNotActive';
  currentStatus: ContractStatus;
}>;

// ADR-0039: só `Pending` é cancelável. Carrega o estado atual como evidência (D23).
export type ContractNotPending = Readonly<{
  tag: 'ContractNotPending';
  currentStatus: ContractStatus;
}>;

export type ContractCannotExpireYet = Readonly<{
  tag: 'ContractCannotExpireYet';
  currentEnd: PlainDate;
  attemptedAt: PlainDate;
}>;

export type ContractCannotExpireIndefinitePeriod = Readonly<{
  tag: 'ContractCannotExpireIndefinitePeriod';
}>;

export type ContractCannotExtendIndefinitePeriod = Readonly<{
  tag: 'ContractCannotExtendIndefinitePeriod';
}>;

export type ContractValueWouldGoNegative = Readonly<{
  tag: 'ContractValueWouldGoNegative';
  currentValue: Money;
  attemptedDecrease: Money;
}>;

export type ContractPeriodExtensionNotAfterCurrentEnd = Readonly<{
  tag: 'ContractPeriodExtensionNotAfterCurrentEnd';
  currentEnd: PlainDate;
  attemptedEnd: PlainDate;
}>;

export type ContractAmendmentAlreadyApplied = Readonly<{
  tag: 'ContractAmendmentAlreadyApplied';
  amendmentId: AmendmentId;
}>;

// ─── Union ─────────────────────────────────────────────────────────────────

export type ContractError =
  | ContractSequentialNumberRequired
  | ContractSequentialNumberInvalidFormat
  | ContractTitleRequired
  | ContractObjectiveRequired
  | ContractInvalidSignedAt
  | ContractOriginalValueZero
  | ContractClassificationInvalid
  | ContractInvalidEventDate
  | ContractNotActive
  | ContractNotPending
  | ContractCannotExpireYet
  | ContractCannotExpireIndefinitePeriod
  | ContractCannotExtendIndefinitePeriod
  | ContractValueWouldGoNegative
  | ContractPeriodExtensionNotAfterCurrentEnd
  | ContractAmendmentAlreadyApplied;

// ─── Case constructors (Padrão D — free functions, DO D§22) ────────────────
//
// Cada constructor declara o **subtipo exato** que produz (DO D§24), permitindo
// que callers façam narrowing via `r.error.tag === 'ContractNotActive'` e
// acessem o payload sem cast. Erros de invariante recebem payload de evidência
// (D23); validações simples são nulários.

export const contractSequentialNumberRequired = (): ContractSequentialNumberRequired => ({
  tag: 'ContractSequentialNumberRequired',
});

export const contractSequentialNumberInvalidFormat = (
  attempted: string,
): ContractSequentialNumberInvalidFormat => ({
  tag: 'ContractSequentialNumberInvalidFormat',
  attempted,
});

export const contractTitleRequired = (): ContractTitleRequired => ({
  tag: 'ContractTitleRequired',
});

export const contractObjectiveRequired = (): ContractObjectiveRequired => ({
  tag: 'ContractObjectiveRequired',
});

export const contractInvalidSignedAt = (): ContractInvalidSignedAt => ({
  tag: 'ContractInvalidSignedAt',
});

export const contractOriginalValueZero = (): ContractOriginalValueZero => ({
  tag: 'ContractOriginalValueZero',
});

export const contractClassificationInvalid = (
  attempted: string,
): ContractClassificationInvalid => ({
  tag: 'ContractClassificationInvalid',
  attempted,
});

export const contractInvalidEventDate = (): ContractInvalidEventDate => ({
  tag: 'ContractInvalidEventDate',
});

export const contractNotActive = (currentStatus: ContractStatus): ContractNotActive => ({
  tag: 'ContractNotActive',
  currentStatus,
});

export const contractNotPending = (currentStatus: ContractStatus): ContractNotPending => ({
  tag: 'ContractNotPending',
  currentStatus,
});

export const contractCannotExpireYet = (
  currentEnd: PlainDate,
  attemptedAt: PlainDate,
): ContractCannotExpireYet => ({
  tag: 'ContractCannotExpireYet',
  currentEnd,
  attemptedAt,
});

export const contractCannotExpireIndefinitePeriod = (): ContractCannotExpireIndefinitePeriod => ({
  tag: 'ContractCannotExpireIndefinitePeriod',
});

export const contractCannotExtendIndefinitePeriod = (): ContractCannotExtendIndefinitePeriod => ({
  tag: 'ContractCannotExtendIndefinitePeriod',
});

export const contractValueWouldGoNegative = (
  currentValue: Money,
  attemptedDecrease: Money,
): ContractValueWouldGoNegative => ({
  tag: 'ContractValueWouldGoNegative',
  currentValue,
  attemptedDecrease,
});

export const contractPeriodExtensionNotAfterCurrentEnd = (
  currentEnd: PlainDate,
  attemptedEnd: PlainDate,
): ContractPeriodExtensionNotAfterCurrentEnd => ({
  tag: 'ContractPeriodExtensionNotAfterCurrentEnd',
  currentEnd,
  attemptedEnd,
});

export const contractAmendmentAlreadyApplied = (
  amendmentId: AmendmentId,
): ContractAmendmentAlreadyApplied => ({
  tag: 'ContractAmendmentAlreadyApplied',
  amendmentId,
});
