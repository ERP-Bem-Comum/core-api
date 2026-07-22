/**
 * #297 (FIN-SUBMIT-APPROVER-CASCADE) — W0 RED.
 * A cascata de alçada (US3/#289) deve operar também no submit Draft→Open, não só no create.
 * Espelha save-document-cascade.test.ts (assertions de cascata) + submit-draft-approver-limit.test.ts (seed).
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
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import type { DocumentRepository } from '#src/modules/financial/domain/document/repository.ts';
import { submitDraft } from '#src/modules/financial/application/use-cases/submit-draft.ts';
import type { ApproverAuthority } from '#src/modules/financial/domain/document/approval-policy.ts';
import type { ApproverAuthorityReader } from '#src/modules/financial/application/ports/approver-authority-reader.ts';

const SUP = '11111111-1111-4111-8111-111111111111';
const A = '33333333-3333-4333-8333-333333333333'; // indicado
const B = '44444444-4444-4444-8444-444444444444'; // suficiente
const D = '55555555-5555-4555-8555-555555555555'; // outro insuficiente
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
const userRef = (id: string): UserRef.UserRef => {
  const r = UserRef.rehydrate(id);
  if (!r.ok) throw new Error('test setup: userRef');
  return r.value;
};
const cand = (id: string, canApprove: boolean, limitCents: number | null): ApproverAuthority => ({
  userId: id,
  canApprove,
  limit: limitCents === null ? null : cents(limitCents),
});
const cascadeReader = (byId: ReadonlyMap<string, ApproverAuthority>): ApproverAuthorityReader => ({
  get: (userId) => Promise.resolve(ok(byId.get(userId) ?? null)),
  list: () => Promise.resolve(ok([...byId.values()])),
});

// Boleto sem retenções/descontos: líquido = bruto = 100000.
const seedDraft = async (repo: DocumentRepository, approverId: string): Promise<string> => {
  const d = Document.saveDraft({
    id: DocumentId.generate(),
    documentNumber: 'BOL-CASCADE-1',
    type: 'Boleto',
    supplier: supplier(),
    paymentMethod: 'PIX',
    grossValue: cents(100000),
    dueDate: new Date('2026-07-01'),
    approverRef: userRef(approverId),
  });
  if (!d.ok) throw new Error('test setup: draft');
  await repo.save({ document: d.value.document, payables: null }, []);
  return d.value.document.id;
};

type EscEvent = Readonly<{
  type: string;
  indicatedApproverRef: unknown;
  effectiveApproverRef: unknown;
}>;
const escalatedEvent = (outbox: ReturnType<typeof createInMemoryOutbox>): EscEvent | undefined =>
  (outbox.all() as readonly EscEvent[]).find((e) => e.type === 'ApproverEscalated');

describe('financial/application — submitDraft cascata de alçada (#297)', () => {
  it('CA1: indicado insuficiente + outro suficiente → submete c/ efetivo + ApproverEscalated', async () => {
    const outbox = createInMemoryOutbox();
    const repo = createInMemoryDocumentRepository(undefined, undefined, outbox.port);
    const id = await seedDraft(repo, A);
    const reader = cascadeReader(
      new Map([
        [A, cand(A, true, 50000)], // indicado: 50000 < 100000
        [B, cand(B, true, 200000)], // suficiente
      ]),
    );

    const result = await submitDraft({ repo, clock: CLOCK, approverAuthorityReader: reader })({
      documentId: id,
    });

    assert.equal(isOk(result), true);
    const found = await repo.findById(id as never);
    if (found.ok && found.value.document.status === 'Open') {
      assert.equal(String(found.value.document.approverRef), B); // efetivo, não o indicado
    }
    const esc = escalatedEvent(outbox);
    assert.ok(esc, 'esperava evento ApproverEscalated no outbox');
    assert.equal(String(esc.indicatedApproverRef), A);
    assert.equal(String(esc.effectiveApproverRef), B);
  });

  it('CA2: nenhum apto (>1 candidato) → no-approver-with-sufficient-limit; permanece Draft', async () => {
    const outbox = createInMemoryOutbox();
    const repo = createInMemoryDocumentRepository(undefined, undefined, outbox.port);
    const id = await seedDraft(repo, A);
    const reader = cascadeReader(
      new Map([
        [A, cand(A, true, 50000)],
        [D, cand(D, true, 60000)], // ambos < 100000
      ]),
    );

    const result = await submitDraft({ repo, clock: CLOCK, approverAuthorityReader: reader })({
      documentId: id,
    });

    assert.equal(isErr(result), true);
    if (!result.ok) assert.equal(result.error, 'no-approver-with-sufficient-limit');
    const found = await repo.findById(id as never);
    if (found.ok) assert.equal(found.value.document.status, 'Draft');
    assert.equal(escalatedEvent(outbox), undefined);
  });

  it('CA3: indicado já suficiente → submete sem escalar (sem ApproverEscalated)', async () => {
    const outbox = createInMemoryOutbox();
    const repo = createInMemoryDocumentRepository(undefined, undefined, outbox.port);
    const id = await seedDraft(repo, A);
    const reader = cascadeReader(new Map([[A, cand(A, true, 200000)]]));

    const result = await submitDraft({ repo, clock: CLOCK, approverAuthorityReader: reader })({
      documentId: id,
    });

    assert.equal(isOk(result), true);
    const found = await repo.findById(id as never);
    if (found.ok && found.value.document.status === 'Open') {
      assert.equal(String(found.value.document.approverRef), A);
    }
    assert.equal(escalatedEvent(outbox), undefined);
  });
});
