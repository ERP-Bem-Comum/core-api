import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, isErr, isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { createInMemoryDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.in-memory.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import { saveDocument } from '#src/modules/financial/application/use-cases/save-document.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { createInMemoryContractCategorizationReadStore } from '#src/modules/contracts/public-api/index.ts';
import type { ApproverAuthority } from '#src/modules/financial/domain/document/approval-policy.ts';
import type { ApproverAuthorityReader } from '#src/modules/financial/application/ports/approver-authority-reader.ts';

const A = '11111111-1111-4111-8111-111111111111'; // indicado
const B = '22222222-2222-4222-8222-222222222222'; // suficiente
const D = '55555555-5555-4555-8555-555555555555'; // outro insuficiente
const SUP = '99999999-9999-4999-8999-999999999999';
const CLOCK = ClockFixed(new Date('2026-06-15T12:00:00Z'));
const emptyReader = createInMemoryContractCategorizationReadStore();
const emptyCedente = createInMemoryCedenteAccountStore();

const cents = (n: number): Money.Money => {
  const r = Money.fromCents(n);
  if (!r.ok) throw new Error('test setup: money');
  return r.value;
};
const cand = (id: string, canApprove: boolean, limitCents: number | null): ApproverAuthority => ({
  userId: id,
  canApprove,
  limit: limitCents === null ? null : cents(limitCents),
});

// Reader da cascata: get(userId) e list() consistentes a partir do mesmo Map.
const cascadeReader = (byId: ReadonlyMap<string, ApproverAuthority>): ApproverAuthorityReader => ({
  get: (userId) => Promise.resolve(ok(byId.get(userId) ?? null)),
  list: () => Promise.resolve(ok([...byId.values()])),
});

// nfseCommand: líquido = 100000 − 5000 (fonte) − 17500 (retenções) = 77500.
const nfseCommand = () => ({
  documentNumber: 'NFS-1',
  type: 'NFS-e' as const,
  supplierRef: SUP,
  paymentMethod: 'TED' as const,
  grossValueCents: 100000,
  sourceDiscountsCents: 5000,
  retentions: [
    { type: 'ISS', baseCents: 50000, rateBps: 1000, valueCents: 5000 },
    { type: 'IRRF', baseCents: 15000, rateBps: 1000, valueCents: 1500 },
    { type: 'INSS', baseCents: 110000, rateBps: 1000, valueCents: 11000 },
  ],
  dueDate: new Date('2026-07-01'),
});

const deps = (
  reader: ApproverAuthorityReader,
  outboxPort: ReturnType<typeof createInMemoryOutbox>['port'],
) => ({
  repo: createInMemoryDocumentRepository(undefined, undefined, outboxPort),
  clock: CLOCK,
  contractCategorizationReader: emptyReader,
  cedenteAccountStore: emptyCedente,
  approverAuthorityReader: reader,
});

type EscEvent = Readonly<{
  type: string;
  indicatedApproverRef: unknown;
  effectiveApproverRef: unknown;
}>;
const escalatedEvent = (outbox: ReturnType<typeof createInMemoryOutbox>): EscEvent | undefined =>
  (outbox.all() as readonly EscEvent[]).find((e) => e.type === 'ApproverEscalated');

// W0 RED (CASCADE #289): saveDocument ainda bloqueia (POLICY); não escala nem emite ApproverEscalated.
describe('financial/application — saveDocument cascata de alçada (US3)', () => {
  it('CA6: indicado insuficiente + outro suficiente → encaminha (approverRef efetivo) + evento ApproverEscalated', async () => {
    const outbox = createInMemoryOutbox();
    const reader = cascadeReader(
      new Map([
        [A, cand(A, true, 50000)], // indicado: 50000 < 77500
        [B, cand(B, true, 100000)], // suficiente
      ]),
    );
    const repo = createInMemoryDocumentRepository(undefined, undefined, outbox.port);
    const result = await saveDocument({
      repo,
      clock: CLOCK,
      contractCategorizationReader: emptyReader,
      cedenteAccountStore: emptyCedente,
      approverAuthorityReader: reader,
    })({ ...nfseCommand(), approverRef: A });

    assert.equal(isOk(result), true);
    if (result.ok) {
      const found = await repo.findById(result.value.documentId);
      if (found.ok && found.value.document.status === 'Open') {
        assert.equal(String(found.value.document.approverRef), B); // efetivo, não o indicado
      }
      const esc = escalatedEvent(outbox);
      assert.ok(esc, 'esperava evento ApproverEscalated no outbox');
      assert.equal(String(esc.indicatedApproverRef), A);
      assert.equal(String(esc.effectiveApproverRef), B);
    }
  });

  it('CA7: indicado insuficiente + nenhum outro suficiente (>1 candidato) → no-approver-with-sufficient-limit', async () => {
    const outbox = createInMemoryOutbox();
    const reader = cascadeReader(
      new Map([
        [A, cand(A, true, 50000)],
        [D, cand(D, true, 60000)], // ambos < 77500
      ]),
    );
    const result = await saveDocument(deps(reader, outbox.port))({
      ...nfseCommand(),
      approverRef: A,
    });
    assert.equal(isErr(result), true);
    if (!result.ok) assert.equal(result.error, 'no-approver-with-sufficient-limit');
    assert.equal(outbox.all().length, 0);
  });

  it('CA8: indicado suficiente → não escala (sem evento ApproverEscalated)', async () => {
    const outbox = createInMemoryOutbox();
    const reader = cascadeReader(new Map([[A, cand(A, true, 100000)]]));
    const repo = createInMemoryDocumentRepository(undefined, undefined, outbox.port);
    const result = await saveDocument({
      repo,
      clock: CLOCK,
      contractCategorizationReader: emptyReader,
      cedenteAccountStore: emptyCedente,
      approverAuthorityReader: reader,
    })({ ...nfseCommand(), approverRef: A });

    assert.equal(isOk(result), true);
    if (result.ok) {
      const found = await repo.findById(result.value.documentId);
      if (found.ok && found.value.document.status === 'Open') {
        assert.equal(String(found.value.document.approverRef), A);
      }
      assert.equal(escalatedEvent(outbox), undefined);
    }
  });
});
