import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create } from '#src/modules/financial/domain/cedente/cedente-account.ts';
// W0 RED: o adapter in-memory ainda não existe.
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';

const buildAccount = () => {
  const r = create({
    id: CedenteAccountId.generate(),
    bankCode: '237',
    agency: '1234',
    accountNumber: '567890',
    accountDigit: '1',
    convenio: '9999999',
    document: '12345678000190',
  });
  if (!r.ok) throw new Error('test setup: cedente');
  return r.value;
};

// CA6: contrato do store in-memory (save + findById).
describe('financial/adapters/persistence/repos/cedente-account-store.in-memory', () => {
  it('CA6: save + findById retorna a conta; id inexistente → null', async () => {
    const store = createInMemoryCedenteAccountStore();
    const account = buildAccount();

    const saved = await store.save(account);
    assert.equal(saved.ok, true);

    const found = await store.findById(account.id);
    assert.equal(found.ok, true);
    if (found.ok) assert.notEqual(found.value, null);

    const miss = await store.findById(CedenteAccountId.generate());
    assert.equal(miss.ok, true);
    if (miss.ok) assert.equal(miss.value, null);
  });
});
