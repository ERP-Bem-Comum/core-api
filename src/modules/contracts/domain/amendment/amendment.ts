import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { isValidDate } from '../../../../shared/utils/date.ts';
import { isBlank } from '../../../../shared/utils/string.ts';
import type { DocumentId } from '../shared/ids.ts';
import type { UserRef } from '../../../../shared/kernel/user-ref.ts';
import type {
  Amendment as AmendmentEntity,
  PendingWithoutDocumentAmendment,
  PendingWithDocumentAmendment,
  HomologatedAmendment,
  CreateAmendmentInput,
} from './types.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import type { AmendmentEvent } from './events.ts';
import * as AmendmentError from './errors.ts';

// ─── Refinement constructors (substituem assertPending — DON'T D§19/§23) ──────

/**
 * Narrowa para qualquer variante Pending (com ou sem documento).
 *
 * DO D§21: `parsePending` em vez de `assertPending` (imperativo).
 * DON'T D§19: não devolve `AmendmentEntity` cru — refina para a sub-union Pending.
 */
const parsePending = (
  a: AmendmentEntity,
): Result<
  PendingWithoutDocumentAmendment | PendingWithDocumentAmendment,
  AmendmentError.AmendmentNotPending
> => (a.status === 'Pending' ? ok(a) : err(AmendmentError.amendmentNotPending(a.status)));

/**
 * Narrowa para `PendingWithoutDocumentAmendment` — estado correto para
 * `attachSignedDocument`. Retorna erro se Homologated ou se já tem documento.
 */
const parsePendingWithoutDocument = (
  a: AmendmentEntity,
): Result<
  PendingWithoutDocumentAmendment,
  AmendmentError.AmendmentNotPending | AmendmentError.AmendmentDocumentAlreadyAttached
> => {
  if (a.status !== 'Pending') return err(AmendmentError.amendmentNotPending(a.status));
  if (a.signedDocumentRef !== null) return err(AmendmentError.amendmentDocumentAlreadyAttached());
  return ok(a);
};

/**
 * Narrowa para `PendingWithDocumentAmendment` — estado correto para `homologate`.
 * Retorna erro se Homologated ou se ainda não tem documento.
 */
const parsePendingWithDocument = (
  a: AmendmentEntity,
): Result<
  PendingWithDocumentAmendment,
  AmendmentError.AmendmentNotPending | AmendmentError.AmendmentWithoutSignedDocument
> => {
  if (a.status !== 'Pending') return err(AmendmentError.amendmentNotPending(a.status));
  if (a.signedDocumentRef === null) return err(AmendmentError.amendmentWithoutSignedDocument());
  return ok(a);
};

// ─── Helpers internos ─────────────────────────────────────────────────────────

const assertValidEventDate = (at: Date): Result<Date, AmendmentError.AmendmentInvalidEventDate> =>
  isValidDate(at) ? ok(at) : err(AmendmentError.amendmentInvalidEventDate());

const validateCommonInput = (
  input: CreateAmendmentInput,
): Result<true, AmendmentError.AmendmentError> => {
  if (isBlank(input.amendmentNumber)) {
    return err(AmendmentError.amendmentNumberRequired());
  }
  if (isBlank(input.description)) return err(AmendmentError.amendmentDescriptionRequired());
  if (!isValidDate(input.createdAt)) return err(AmendmentError.amendmentInvalidCreatedAt());
  return ok(true);
};

const validateVariantInput = (
  input: CreateAmendmentInput,
): Result<true, AmendmentError.AmendmentError> => {
  switch (input.kind) {
    case 'Addition':
    case 'Suppression':
      // Sem check de cents === 0 — `NonZeroMoney` é garantia estática (DO D§25 + DON'T D§24).
      // A invariante "impacto não-zero" é codificada no tipo de `input.impactValue`,
      // não como runtime guard aqui. O caso de uso (rota γ, DO D§26) é o ponto de refinamento.
      return ok(true);
    case 'TermChange':
      // `newEndDate` é `PlainDate` — validade da data garantida na construção (VO).
      return ok(true);
    case 'Misc':
      return ok(true);
  }
  // Exhaustive: TS valida em compile time todas as variantes.
};

// ─── Transições — funções totais sobre tipos refinados (DO D§20) ──────────────

/**
 * Cria um novo aditivo no estado inicial `PendingWithoutDocumentAmendment`.
 *
 * Todo aditivo nasce sem documento assinado — DO D§20 (tipo refinado por estado).
 * O cast estreito `as PendingWithoutDocumentAmendment` é necessário porque
 * o spread sobre a if-chain de 4 branches perde o narrowing da variante. O TS
 * infere o tipo achatado mais largo; o cast reafirma o invariante já garantido
 * em runtime: exatamente um branch é executado, `status`/`signedDocumentRef`/
 * `homologatedAt`/`homologatedBy` são fixados como literais `'Pending'`/`null`.
 */
const create = (
  input: CreateAmendmentInput,
): Result<
  { amendment: PendingWithoutDocumentAmendment; event: AmendmentEvent },
  AmendmentError.AmendmentError
> => {
  const common = validateCommonInput(input);
  if (!common.ok) return common;
  const variant = validateVariantInput(input);
  if (!variant.ok) return variant;

  const base = {
    id: input.id,
    contractId: input.contractId,
    amendmentNumber: input.amendmentNumber,
    description: input.description,
    createdAt: input.createdAt,
    status: 'Pending' as const,
    signedDocumentRef: null as null,
    homologatedAt: null as null,
    homologatedBy: null as null,
  };

  // Cast estreito `as PendingWithoutDocumentAmendment` (NÃO `as unknown as`):
  // a if-chain garante em runtime exatamente um dos quatro variants. O TS perde
  // o narrowing porque o tipo "achatado" do `?:` é a união dos branches —
  // estruturalmente igual a `PendingWithoutDocumentAmendment` mas o compilador
  // exige a reafirmação. `immutable()` aplica `Object.freeze` shallow (DO B§10).
  const amendment = immutable(
    input.kind === 'Addition'
      ? { ...base, kind: 'Addition' as const, impactValue: input.impactValue }
      : input.kind === 'Suppression'
        ? { ...base, kind: 'Suppression' as const, impactValue: input.impactValue }
        : input.kind === 'TermChange'
          ? { ...base, kind: 'TermChange' as const, newEndDate: input.newEndDate }
          : { ...base, kind: 'Misc' as const },
  ) as PendingWithoutDocumentAmendment;

  const event: AmendmentEvent = {
    type: 'AmendmentCreated',
    amendmentId: input.id,
    contractId: input.contractId,
    occurredAt: input.createdAt,
  };

  return ok({ amendment, event });
};

/**
 * Anexa documento assinado a um aditivo `PendingWithoutDocumentAmendment`.
 *
 * Assinatura refinada — sem runtime check de status (garantido pelo tipo).
 * Sem runtime check de `signedDocumentRef` (garantido por `null` no tipo).
 * Retorna `PendingWithDocumentAmendment` — próximo subtipo na state machine.
 */
const attachSignedDocument = (
  amendment: PendingWithoutDocumentAmendment,
  signedDocumentRef: DocumentId,
  signedAt: Date,
): Result<
  { amendment: PendingWithDocumentAmendment; event: AmendmentEvent },
  AmendmentError.AmendmentError
> => {
  // CTR-AMENDMENT-SIGNEDAT-AND-NUMBER (G2): `signedAt` é data de negócio fornecida
  // pelo operador no attach. Rejeita data inválida (espelha as transições de Contract).
  const atCheck = assertValidEventDate(signedAt);
  if (!atCheck.ok) return atCheck;

  // Cast estreito: spread sobre PendingWithoutDocumentAmendment perde o literal
  // `null` de `signedDocumentRef`. Os campos substituídos (`signedDocumentRef: DocumentId`
  // + `signedAt: Date`) constroem estruturalmente um `PendingWithDocumentAmendment`.
  const next = immutable({
    ...amendment,
    signedDocumentRef,
    signedAt,
  }) as PendingWithDocumentAmendment;

  const event: AmendmentEvent = {
    type: 'AmendmentDocumentAttached',
    amendmentId: amendment.id,
    signedDocumentRef,
    occurredAt: amendment.createdAt,
  };

  return ok({ amendment: next, event });
};

/**
 * Homologa um aditivo `PendingWithDocumentAmendment`.
 *
 * Assinatura refinada — sem runtime check de status nem de `signedDocumentRef`
 * (ambos garantidos pelo tipo `PendingWithDocumentAmendment`). Apenas valida
 * a data do evento (`at`). Retorna `HomologatedAmendment` (estado terminal).
 */
const homologate = (
  amendment: PendingWithDocumentAmendment,
  by: UserRef,
  at: Date,
): Result<
  { amendment: HomologatedAmendment; event: AmendmentEvent },
  AmendmentError.AmendmentError
> => {
  const atCheck = assertValidEventDate(at);
  if (!atCheck.ok) return atCheck;

  // Cast estreito: constrói HomologatedAmendment diretamente via spread.
  // `signedDocumentRef` já é `DocumentId` (não null) em PendingWithDocumentAmendment.
  const next = immutable({
    ...amendment,
    status: 'Homologated' as const,
    homologatedAt: at,
    homologatedBy: by,
  }) as HomologatedAmendment;

  const event: AmendmentEvent = {
    type: 'AmendmentHomologated',
    amendmentId: amendment.id,
    homologatedBy: by,
    occurredAt: at,
  };

  return ok({ amendment: next, event });
};

export const Amendment = {
  create,
  parsePending,
  parsePendingWithoutDocument,
  parsePendingWithDocument,
  attachSignedDocument,
  homologate,
};
