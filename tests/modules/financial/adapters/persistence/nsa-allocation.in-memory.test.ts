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

  // Regressão do lost update em produção: `edit-cedente-account.ts` lê a conta, monta `updated`
  // por spread de `found.value` (sem tocar `nextNsa`) e chama `save`. Se uma alocação concorrente
  // completar ENTRE a leitura e o `save`, o snapshot em mãos do use case carrega o `nextNsa`
  // OBSOLETO — e um `save` que o gravasse apagaria o avanço, fazendo o contador RETROCEDER e
  // abrindo caminho para reemitir um NSA já usado (o banco trata NSA repetido como retransmissão,
  // não como remessa nova). A correção tira `nextNsa` do path de update do `save`: só `allocateNsa`
  // escreve o contador.
  it('save com snapshot anterior a uma alocação concorrente não retrocede o contador (lost update)', async () => {
    const { store, id } = await seed(1);

    // Snapshot que o use case teria em mãos ANTES de qualquer alocação concorrente.
    const beforeAllocation = await store.findById(id);
    assert.ok(isOk(beforeAllocation) && beforeAllocation.value !== null);
    const staleSnapshot = beforeAllocation.value;
    assert.equal(staleSnapshot.nextNsa, 1);

    // Alocação concorrente avança o contador persistido para 2.
    const allocated = await store.allocateNsa(id);
    assert.ok(isOk(allocated));
    assert.equal(allocated.value, 1);

    // `save` chega DEPOIS, mas carrega o snapshot obsoleto (nextNsa: 1) — como faria
    // `edit-cedente-account.ts` ao editar outro campo (ex.: `nickname`) sem saber da alocação.
    const editedButStale = { ...staleSnapshot, nickname: 'apelido novo' };
    const saved = await store.save(editedButStale);
    assert.ok(isOk(saved));

    const reloaded = await store.findById(id);
    assert.ok(isOk(reloaded) && reloaded.value !== null);
    // O contador NÃO retrocede para 1: o `save` preserva o valor avançado pela alocação.
    assert.equal(reloaded.value.nextNsa, 2);
    // A edição em si (campo que não é o contador) foi persistida normalmente.
    assert.equal(reloaded.value.nickname, 'apelido novo');

    // E o próximo NSA continua de onde a alocação concorrente deixou — nunca repete o 1 já emitido.
    const next = await store.allocateNsa(id);
    assert.ok(isOk(next));
    assert.equal(next.value, 2);
  });
});
