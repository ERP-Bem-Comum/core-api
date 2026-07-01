/**
 * #293 (FIN-PAYABLE-ACCOUNT-ACTIVE) — W0 RED.
 * O lançamento não pode usar conta-débito encerrada: conta `Closed` → err('cedente-account-closed');
 * conta `Active` → segue normal. Driver memory; conta semeada via domínio.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { createInMemoryDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.in-memory.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { saveDocument } from '#src/modules/financial/application/use-cases/save-document.ts';
import { createInMemoryContractCategorizationReadStore } from '#src/modules/contracts/public-api/index.ts';
import * as CedenteAccount from '#src/modules/financial/domain/cedente/cedente-account.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import type { CedenteAccountStore } from '#src/modules/financial/application/ports/cedente-account-store.ts';
import type { CedenteAccountStatus } from '#src/modules/financial/domain/cedente/types.ts';

const SUP = '11111111-1111-4111-8111-111111111111';
const ACTIVE_ID = '22222222-2222-4222-8222-222222222222';
const CLOSED_ID = '33333333-3333-4333-8333-333333333333';
const CLOCK = ClockFixed(new Date('2026-06-15T12:00:00Z'));
const emptyReader = createInMemoryContractCategorizationReadStore();

const nfseCommand = (over: Record<string, unknown> = {}) => ({
  documentNumber: 'NFS-1',
  type: 'NFS-e' as const,
  supplierRef: SUP,
  paymentMethod: 'TED' as const,
  grossValueCents: 100000,
  sourceDiscountsCents: 0,
  retentions: [],
  dueDate: new Date('2026-07-01'),
  ...over,
});

const seedAccount = async (
  store: CedenteAccountStore,
  id: string,
  status: CedenteAccountStatus,
): Promise<void> => {
  const idR = CedenteAccountId.rehydrate(id);
  assert.equal(idR.ok, true);
  if (!idR.ok) return;
  const acc = CedenteAccount.create({
    id: idR.value,
    bankCode: '237',
    agency: '1234',
    accountNumber: '567890',
    accountDigit: '1',
    convenio: '0',
    document: '12345678000190',
    status,
  });
  assert.equal(acc.ok, true);
  if (acc.ok) await store.save(acc.value);
};

describe('financial/application — saveDocument · conta-débito ativa (#293)', () => {
  it('CA4: contaDebitoRef de conta Closed → err(cedente-account-closed); não persiste', async () => {
    const outbox = createInMemoryOutbox();
    const repo = createInMemoryDocumentRepository(undefined, undefined, outbox.port);
    const cedente = createInMemoryCedenteAccountStore();
    await seedAccount(cedente, CLOSED_ID, 'Closed');

    const result = await saveDocument({
      repo,
      clock: CLOCK,
      contractCategorizationReader: emptyReader,
      cedenteAccountStore: cedente,
    })(nfseCommand({ contaDebitoRef: CLOSED_ID }));

    assert.equal(isErr(result), true);
    if (!result.ok) assert.equal(result.error, 'cedente-account-closed');
    assert.equal(outbox.all().length, 0);
  });

  it('CA5: contaDebitoRef de conta Active → segue normal (persiste)', async () => {
    const outbox = createInMemoryOutbox();
    const repo = createInMemoryDocumentRepository(undefined, undefined, outbox.port);
    const cedente = createInMemoryCedenteAccountStore();
    await seedAccount(cedente, ACTIVE_ID, 'Active');

    const result = await saveDocument({
      repo,
      clock: CLOCK,
      contractCategorizationReader: emptyReader,
      cedenteAccountStore: cedente,
    })(nfseCommand({ contaDebitoRef: ACTIVE_ID }));

    assert.equal(isOk(result), true);
  });
});
