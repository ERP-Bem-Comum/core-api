import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create, close } from '#src/modules/financial/domain/cedente/cedente-account.ts';

// Comportamento do port, sem banco. A ATOMICIDADE não se prova aqui — só contra MySQL, em
// `nsa-allocation.drizzle-mysql.test.ts`. Este arquivo cobra o contrato observável; aquele cobra a
// garantia. Tratar este como suficiente seria confundir "o fake concorda" com "o lock funciona".
const seed = async (nextNsa?: number, status: 'Active' | 'Closed' = 'Active') => {
  const store = createInMemoryCedenteAccountStore();
  const r = create({
    id: CedenteAccountId.generate(),
    bankCode: '237',
    agency: '1234',
    accountNumber: '567890',
    accountDigit: '1',
    convenio: '9999999',
    document: '12345678000190',
    ...(nextNsa !== undefined ? { nextNsa } : {}),
  });
  assert.ok(isOk(r));

  const account = status === 'Closed' ? close(r.value) : r;
  assert.ok(isOk(account));
  await store.save(account.value);

  return { store, id: account.value.id };
};

describe('allocateNsa (in-memory) — contrato do port', () => {
  it('devolve o número corrente e avança o contador persistido', async () => {
    const { store, id } = await seed(5);

    const first = await store.allocateNsa(id);
    assert.ok(isOk(first));
    assert.equal(first.value, 5);

    const reloaded = await store.findById(id);
    assert.ok(isOk(reloaded) && reloaded.value !== null);
    assert.equal(reloaded.value.nextNsa, 6);
  });

  it('chamadas sucessivas nunca repetem o número', async () => {
    const { store, id } = await seed(1);
    const allocated: number[] = [];

    for (let i = 0; i < 5; i += 1) {
      const r = await store.allocateNsa(id);
      assert.ok(isOk(r));
      allocated.push(r.value);
    }

    assert.deepEqual(allocated, [1, 2, 3, 4, 5]);
    assert.equal(new Set(allocated).size, 5);
  });

  it('conta inexistente devolve not-found, não zero', async () => {
    const { store } = await seed();
    const r = await store.allocateNsa(CedenteAccountId.generate());
    assert.ok(isErr(r));
    assert.equal(r.error, 'cedente-account-not-found');
  });

  it('conta encerrada não aloca e não move o contador', async () => {
    const { store, id } = await seed(3, 'Closed');

    const r = await store.allocateNsa(id);
    assert.ok(isErr(r));
    assert.equal(r.error, 'cedente-account-not-active');

    const reloaded = await store.findById(id);
    assert.ok(isOk(reloaded) && reloaded.value !== null);
    assert.equal(reloaded.value.nextNsa, 3);
  });
});
