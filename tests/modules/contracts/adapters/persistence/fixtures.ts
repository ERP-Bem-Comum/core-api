// Fixtures compartilhados pelas suites de contrato.
// Toda implementação de ContractRepository/AmendmentRepository é validada
// contra os mesmos dados — round-trip garantido a partir destes builders.

import * as Money from '#src/shared/kernel/money.ts';
import * as NonZeroMoney from '#src/shared/kernel/non-zero-money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as AmendmentId from '#src/modules/contracts/domain/shared/amendment-id.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import { Amendment } from '#src/modules/contracts/domain/amendment/amendment.ts';
import type {
  ActiveContract,
  PendingContract,
  ExpiredContract,
  TerminatedContract,
} from '#src/modules/contracts/domain/contract/types.ts';
import type {
  PendingWithoutDocumentAmendment,
  PendingWithDocumentAmendment,
  HomologatedAmendment,
} from '#src/modules/contracts/domain/amendment/types.ts';

// CTR-DOMAIN-TAGGED-ERRORS — `error` pode ser string literal (VOs folha,
// mappers, repos) OU tagged record `{ tag, ...payload }` (ContractError /
// AmendmentError após Padrão D). `unknown` cobre ambos; o stringify diferencia.
const unwrap = <T>(label: string, r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) {
    const e = r.error;
    const detail =
      typeof e === 'object' && e !== null && 'tag' in e
        ? String((e as { tag: unknown }).tag)
        : String(e);
    throw new Error(`fixture broken (${label}): ${detail}`);
  }
  return r.value;
};

export const someMoney = (cents: number) => unwrap('Money', Money.fromCents(cents));

/** Produz `NonZeroMoney` para fixtures de Addition/Suppression. Falha se cents = 0. */
export const someNonZeroMoney = (cents: number) => {
  const m = unwrap('Money', Money.fromCents(cents));
  return unwrap('NonZeroMoney', NonZeroMoney.from(m));
};

// Helper de teste: aceita 'YYYY-MM-DD' ou ISO datetime (usa só a parte de data).
export const somePlainDate = (iso: string) => unwrap('PlainDate', PlainDate.from(iso.slice(0, 10)));

export const someFixedPeriod = (startISO: string, endISO: string) =>
  unwrap('Period.Fixed', Period.create(somePlainDate(startISO), somePlainDate(endISO)));

export const someIndefinitePeriod = (startISO: string) =>
  Period.createIndefinite(somePlainDate(startISO));

export type ContractOverrides = Partial<{
  id: string;
  sequentialNumber: string;
  title: string;
  objective: string;
  signedAtISO: string;
  originalValueCents: number;
  periodKind: 'Fixed' | 'Indefinite';
  periodStartISO: string;
  periodEndISO: string;
}>;

export const buildContract = (overrides: ContractOverrides = {}): ActiveContract => {
  const id = unwrap(
    'ContractId',
    ContractId.rehydrate(overrides.id ?? '11111111-1111-4111-8111-111111111111'),
  );
  const period =
    overrides.periodKind === 'Indefinite'
      ? someIndefinitePeriod(overrides.periodStartISO ?? '2026-02-01')
      : someFixedPeriod(
          overrides.periodStartISO ?? '2026-02-01',
          overrides.periodEndISO ?? '2026-12-31',
        );
  const r = Contract.create({
    id,
    sequentialNumber: overrides.sequentialNumber ?? '001/2026',
    title: overrides.title ?? 'Contrato Fixture',
    objective: overrides.objective ?? 'Validar round-trip de persistência',
    signedAt: new Date(overrides.signedAtISO ?? '2026-01-15'),
    originalValue: someMoney(overrides.originalValueCents ?? 10_000_000),
    originalPeriod: period,
  });
  return unwrap('Contract.create', r).contract;
};

// CTR-DOMAIN-CONTRACT-PENDING-PERSISTENCE — contrato `Pendente` (sem vigência).
export const buildPendingContract = (overrides: ContractOverrides = {}): PendingContract => {
  const id = unwrap(
    'ContractId',
    ContractId.rehydrate(overrides.id ?? '99999999-9999-4999-8999-999999999999'),
  );
  const period =
    overrides.periodKind === 'Indefinite'
      ? someIndefinitePeriod(overrides.periodStartISO ?? '2026-02-01')
      : someFixedPeriod(
          overrides.periodStartISO ?? '2026-02-01',
          overrides.periodEndISO ?? '2026-12-31',
        );
  const r = Contract.createPending({
    id,
    sequentialNumber: overrides.sequentialNumber ?? '900/2026',
    title: overrides.title ?? 'Contrato Pendente Fixture',
    objective: overrides.objective ?? 'Aguardando documento assinado',
    originalValue: someMoney(overrides.originalValueCents ?? 10_000_000),
    originalPeriod: period,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
  });
  return unwrap('Contract.createPending', r).contract;
};

// ─── CTR-DOMAIN-STATE-MACHINE-CONTRACT — builders de subtipos refinados ──────
//
// `buildContract` retorna `ActiveContract` (todo contrato novo é Active).
// `buildExpiredContract` e `buildTerminatedContract` retornam os subtipos
// refinados nativamente após W1 (DO D§20).

export const buildExpiredContract = (
  overrides: ContractOverrides & Partial<{ endedAtISO: string }> = {},
): ExpiredContract => {
  const active = buildContract(overrides);
  // endedAt deve ser >= period.end (período default termina em 2026-12-31)
  const endedAt = new Date(overrides.endedAtISO ?? '2027-01-01T00:00:00.000Z');
  const r = Contract.expire(active, endedAt);
  return unwrap('Contract.expire', r).contract;
};

export const buildTerminatedContract = (
  overrides: ContractOverrides & Partial<{ endedAtISO: string }> = {},
): TerminatedContract => {
  const active = buildContract(overrides);
  const endedAt = new Date(overrides.endedAtISO ?? '2026-06-15T00:00:00.000Z');
  const r = Contract.terminate(active, endedAt);
  return unwrap('Contract.terminate', r).contract;
};

export type AmendmentOverrides = Partial<{
  id: string;
  contractId: string;
  amendmentNumber: string;
  description: string;
  createdAtISO: string;
  kind: 'Addition' | 'Suppression' | 'TermChange' | 'Misc';
  impactValueCents: number;
  newEndDateISO: string;
}>;

const buildPendingAmendment = (
  overrides: AmendmentOverrides = {},
): PendingWithoutDocumentAmendment => {
  const id = unwrap(
    'AmendmentId',
    AmendmentId.rehydrate(overrides.id ?? '22222222-2222-4222-8222-222222222222'),
  );
  const contractId = unwrap(
    'ContractId',
    ContractId.rehydrate(overrides.contractId ?? '11111111-1111-4111-8111-111111111111'),
  );
  const kind = overrides.kind ?? 'Addition';
  const baseInput = {
    id,
    contractId,
    amendmentNumber: overrides.amendmentNumber ?? 'AD 01-001/2026',
    description: overrides.description ?? 'Aditivo fixture',
    createdAt: new Date(overrides.createdAtISO ?? '2026-03-01'),
  };
  const input =
    kind === 'Addition' || kind === 'Suppression'
      ? {
          ...baseInput,
          kind,
          // NonZeroMoney exigido por CreateAmendmentInput após CTR-DOMAIN-INVARIANT-CONTEXTUAL.
          impactValue: someNonZeroMoney(overrides.impactValueCents ?? 500_000),
        }
      : kind === 'TermChange'
        ? {
            ...baseInput,
            kind,
            newEndDate: somePlainDate(overrides.newEndDateISO ?? '2027-12-31'),
          }
        : { ...baseInput, kind };
  return unwrap('Amendment.create', Amendment.create(input)).amendment;
};

export const buildAmendment = buildPendingAmendment;

export const buildHomologatedAmendment = (
  overrides: AmendmentOverrides & Partial<{ documentId: string; userRef: string }> = {},
): HomologatedAmendment => {
  const pending = buildPendingAmendment(overrides);
  const docId = unwrap(
    'DocumentId',
    DocumentId.rehydrate(overrides.documentId ?? '33333333-3333-4333-8333-333333333333'),
  );
  const attached = unwrap(
    'attachSignedDocument',
    Amendment.attachSignedDocument(pending, docId),
  ).amendment;
  const ref = unwrap(
    'UserRef',
    UserRef.rehydrate(overrides.userRef ?? '44444444-4444-4444-8444-444444444444'),
  );
  return unwrap('homologate', Amendment.homologate(attached, ref, new Date('2026-03-20')))
    .amendment;
};

// ─── CTR-DOMAIN-STATE-MACHINE-AMENDMENT — builders de subtipos refinados ─────
//
// Retornam os tipos refinados nativamente após W1 (DO D§20).
// Em W0 RED: estes builders falham em compilação porque os tipos
// `PendingWithoutDocumentAmendment`, `PendingWithDocumentAmendment` e
// `HomologatedAmendment` ainda não existem em `types.ts`.
// Em W1 GREEN: `types.ts` exporta os 3 subtipos → builders tipam corretamente.

export const buildPendingAmendmentWithoutDoc = (
  overrides: AmendmentOverrides = {},
): PendingWithoutDocumentAmendment => {
  // buildPendingAmendment retorna PendingWithoutDocumentAmendment — tipo flui sem cast.
  return buildPendingAmendment(overrides);
};

export const buildPendingAmendmentWithDoc = (
  overrides: AmendmentOverrides & Partial<{ documentId: string }> = {},
): PendingWithDocumentAmendment => {
  const pending = buildPendingAmendment(overrides);
  const docId = unwrap(
    'DocumentId',
    DocumentId.rehydrate(overrides.documentId ?? '33333333-3333-4333-8333-333333333333'),
  );
  const attached = unwrap(
    'attachSignedDocument',
    Amendment.attachSignedDocument(pending, docId),
  ).amendment;
  // attachSignedDocument retorna PendingWithDocumentAmendment após W1 —
  // o tipo flui naturalmente sem cast inseguro.
  return attached;
};

export const buildHomologatedAmendmentRefined = (
  overrides: AmendmentOverrides & Partial<{ documentId: string; userRef: string }> = {},
): HomologatedAmendment => {
  // buildHomologatedAmendment retorna HomologatedAmendment — tipo flui sem cast.
  return buildHomologatedAmendment(overrides);
};
