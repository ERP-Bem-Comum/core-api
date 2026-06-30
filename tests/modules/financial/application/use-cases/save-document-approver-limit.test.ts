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
// W0 RED (FIN-APPROVER-LIMIT-POLICY #289): port + tipo ainda não existem.
import type { ApproverAuthority } from '#src/modules/financial/domain/document/approval-policy.ts';
import type { ApproverAuthorityReader } from '#src/modules/financial/application/ports/approver-authority-reader.ts';

const SUP = '11111111-1111-4111-8111-111111111111';
const APPROVER = '33333333-3333-4333-8333-333333333333';
const CLOCK = ClockFixed(new Date('2026-06-15T12:00:00Z'));
const emptyReader = createInMemoryContractCategorizationReadStore();
const emptyCedente = createInMemoryCedenteAccountStore();

const cents = (n: number): Money.Money => {
  const r = Money.fromCents(n);
  if (!r.ok) throw new Error('test setup: money');
  return r.value;
};

// nfseCommand: líquido = 100000 − 5000 (fonte) − 17500 (ISS+IRRF+INSS) = 77500.
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

// Fake do reader: devolve sempre a authority configurada (ou null).
const fakeReader = (auth: ApproverAuthority | null): ApproverAuthorityReader => ({
  get: () => Promise.resolve(ok(auth)),
  list: () => Promise.resolve(ok(auth === null ? [] : [auth])),
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

describe('financial/application — saveDocument valida alçada do aprovador (US1)', () => {
  it('CA6: aprovador com alçada < líquido (50000 < 77500) → recusa, não persiste', async () => {
    const outbox = createInMemoryOutbox();
    const reader = fakeReader({ userId: APPROVER, canApprove: true, limit: cents(50000) });
    const result = await saveDocument(deps(reader, outbox.port))({
      ...nfseCommand(),
      approverRef: APPROVER,
    });
    assert.equal(isErr(result), true);
    if (!result.ok) assert.equal(result.error, 'approver-limit-exceeded');
    assert.equal(outbox.all().length, 0);
  });

  it('CA6: aprovador com alçada >= líquido (100000 >= 77500) → cria o documento', async () => {
    const outbox = createInMemoryOutbox();
    const reader = fakeReader({ userId: APPROVER, canApprove: true, limit: cents(100000) });
    const result = await saveDocument(deps(reader, outbox.port))({
      ...nfseCommand(),
      approverRef: APPROVER,
    });
    assert.equal(isOk(result), true);
  });

  it('CA8: sem approverRef → não valida alçada (reader bloqueante é ignorado)', async () => {
    const outbox = createInMemoryOutbox();
    // reader que bloquearia (sem alçada), mas o comando não tem approverRef.
    const reader = fakeReader({ userId: APPROVER, canApprove: true, limit: null });
    const result = await saveDocument(deps(reader, outbox.port))(nfseCommand());
    assert.equal(isOk(result), true);
  });
});
