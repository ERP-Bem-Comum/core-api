// Fixtures compartilhados pelas suites de contrato.
// Toda implementação de ContractRepository/AmendmentRepository é validada
// contra os mesmos dados — round-trip garantido a partir destes builders.

import { Money } from '#src/modules/contracts/domain/shared/money.ts';
import { Period } from '#src/modules/contracts/domain/shared/period.ts';
import {
  AmendmentId,
  ContractId,
  DocumentId,
  UserRef,
} from '#src/modules/contracts/domain/shared/ids.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import { Amendment } from '#src/modules/contracts/domain/amendment/amendment.ts';
import type { Contract as ContractEntity } from '#src/modules/contracts/domain/contract/types.ts';
import type { Amendment as AmendmentEntity } from '#src/modules/contracts/domain/amendment/types.ts';

const unwrap = <T>(label: string, r: { ok: true; value: T } | { ok: false; error: string }): T => {
  if (!r.ok) throw new Error(`fixture broken (${label}): ${r.error}`);
  return r.value;
};

export const someMoney = (cents: number) => unwrap('Money', Money.fromCents(cents));

export const someFixedPeriod = (startISO: string, endISO: string) =>
  unwrap('Period.Fixed', Period.create(new Date(startISO), new Date(endISO)));

export const someIndefinitePeriod = (startISO: string) =>
  unwrap('Period.Indefinite', Period.createIndefinite(new Date(startISO)));

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

export const buildContract = (overrides: ContractOverrides = {}): ContractEntity => {
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

const buildPendingAmendment = (overrides: AmendmentOverrides = {}): AmendmentEntity => {
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
      ? { ...baseInput, kind, impactValue: someMoney(overrides.impactValueCents ?? 500_000) }
      : kind === 'TermChange'
        ? {
            ...baseInput,
            kind,
            newEndDate: new Date(overrides.newEndDateISO ?? '2027-12-31'),
          }
        : { ...baseInput, kind };
  return unwrap('Amendment.create', Amendment.create(input)).amendment;
};

export const buildAmendment = buildPendingAmendment;

export const buildHomologatedAmendment = (
  overrides: AmendmentOverrides & Partial<{ documentId: string; userRef: string }> = {},
): AmendmentEntity => {
  const pending = buildPendingAmendment(overrides);
  const docId = unwrap(
    'DocumentId',
    DocumentId.rehydrate(overrides.documentId ?? '33333333-3333-4333-8333-333333333333'),
  );
  const attached = unwrap(
    'attachSignedDocument',
    Amendment.attachSignedDocument(pending, docId),
  ).amendment;
  const userRef = unwrap(
    'UserRef',
    UserRef.rehydrate(overrides.userRef ?? '44444444-4444-4444-8444-444444444444'),
  );
  return unwrap('homologate', Amendment.homologate(attached, userRef, new Date('2026-03-20')))
    .amendment;
};
