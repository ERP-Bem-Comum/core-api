/**
 * FIN-APPROVER-LIMIT-POLICY (#289) — CA7: a validação de alçada também incide na submissão
 * (Draft → Open, #91), não só na criação (CA6, `save-document-approver-limit.test.ts`). Espelha
 * o mesmo fake `ApproverAuthorityReader` daquele teste. Driver memory, gate opt-in (CA8: sem
 * reader injetado, a submissão segue sem validar — mesma semântica do `saveDocument`).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, isErr, isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import { createInMemoryDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.in-memory.ts';
import type { DocumentRepository } from '#src/modules/financial/domain/document/repository.ts';
import { submitDraft } from '#src/modules/financial/application/use-cases/submit-draft.ts';
import type { ApproverAuthority } from '#src/modules/financial/domain/document/approval-policy.ts';
import type { ApproverAuthorityReader } from '#src/modules/financial/application/ports/approver-authority-reader.ts';

const SUP = '11111111-1111-4111-8111-111111111111';
const APPROVER = '33333333-3333-4333-8333-333333333333';
const CLOCK = ClockFixed(new Date('2026-06-15T12:00:00Z'));

const cents = (n: number): Money.Money => {
  const r = Money.fromCents(n);
  if (!r.ok) throw new Error('test setup: money');
  return r.value;
};
const supplier = (): SupplierRef => {
  const r = SupplierRef.rehydrate(SUP);
  if (!r.ok) throw new Error('test setup: supplier');
  return r.value;
};
const approver = (): UserRef.UserRef => {
  const r = UserRef.rehydrate(APPROVER);
  if (!r.ok) throw new Error('test setup: approver');
  return r.value;
};

// Fake do reader: devolve sempre a authority configurada (ou null).
const fakeReader = (auth: ApproverAuthority | null): ApproverAuthorityReader => ({
  get: () => Promise.resolve(ok(auth)),
  list: () => Promise.resolve(ok(auth === null ? [] : [auth])),
});

// Boleto sem retenções/descontos: líquido = bruto = 100000.
const seedDraftWithApprover = async (repo: DocumentRepository): Promise<string> => {
  const d = Document.saveDraft({
    id: DocumentId.generate(),
    documentNumber: 'BOL-APPROVER-1',
    type: 'Boleto',
    supplier: supplier(),
    paymentMethod: 'PIX',
    grossValue: cents(100000),
    dueDate: new Date('2026-07-01'),
    approverRef: approver(),
  });
  if (!d.ok) throw new Error('test setup: draft');
  await repo.save({ document: d.value.document, payables: null }, []);
  return d.value.document.id;
};

describe('financial/application — submitDraft valida alçada do aprovador (CA7)', () => {
  it('CA7: alçada insuficiente (50000 < 100000) → recusa a submissão, documento permanece Draft', async () => {
    const repo = createInMemoryDocumentRepository();
    const id = await seedDraftWithApprover(repo);
    const reader = fakeReader({ userId: APPROVER, canApprove: true, limit: cents(50000) });

    const result = await submitDraft({ repo, clock: CLOCK, approverAuthorityReader: reader })({
      documentId: id,
    });

    assert.equal(isErr(result), true);
    if (!result.ok) assert.equal(result.error, 'approver-limit-exceeded');
    const found = await repo.findById(id as never);
    if (found.ok) assert.equal(found.value.document.status, 'Draft');
  });

  it('CA7: alçada suficiente (100000 >= 100000) → submete (Draft → Open)', async () => {
    const repo = createInMemoryDocumentRepository();
    const id = await seedDraftWithApprover(repo);
    const reader = fakeReader({ userId: APPROVER, canApprove: true, limit: cents(100000) });

    const result = await submitDraft({ repo, clock: CLOCK, approverAuthorityReader: reader })({
      documentId: id,
    });

    assert.equal(isOk(result), true);
    const found = await repo.findById(id as never);
    if (found.ok) assert.equal(found.value.document.status, 'Open');
  });

  it('CA8: reader não injetado (opt-in ausente) → submissão não valida alçada', async () => {
    const repo = createInMemoryDocumentRepository();
    const id = await seedDraftWithApprover(repo);

    const result = await submitDraft({ repo, clock: CLOCK })({ documentId: id });

    assert.equal(isOk(result), true);
  });
});
