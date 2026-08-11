// Teste de integração: alocação de NSA sob CONCORRÊNCIA REAL (Drizzle + MySQL).
//
// A garantia que este arquivo existe para provar não é "aloca e incrementa" — isso o fake já
// mostra. É que DUAS TRANSAÇÕES CONCORRENTES nunca recebem o mesmo NSA. Sem o `SELECT ... FOR
// UPDATE`, ambas leem o mesmo valor, ambas gravam o mesmo incremento, e saem dois arquivos de
// remessa com NSA idêntico — que o banco trata como RETRANSMISSÃO, não como remessa nova.
//
// O teste não controla timing: dispara N alocações em paralelo sobre um pool com várias conexões e
// cobra que os N números sejam distintos. Sob lock correto isso é determinístico; sem lock, colide.
//
// GATE: só roda com `MYSQL_INTEGRATION=1` (ver `package.json §test:integration:financial`).

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.drizzle.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create, close } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import * as Nsa from '#src/modules/financial/domain/cedente/nsa.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

// Chave natural distinta por conta: o UNIQUE da migration 0009 colide se dois casos reusarem
// 237/1234/567890/1.
let naturalKeySeq = 0;
const buildAccount = (nextNsa?: number) => {
  naturalKeySeq += 1;
  const r = create({
    id: CedenteAccountId.generate(),
    bankCode: '237',
    agency: '4321',
    accountNumber: `9900${String(naturalKeySeq).padStart(2, '0')}`,
    accountDigit: '7',
    convenio: '9999999',
    document: '12345678000190',
    ...(nextNsa !== undefined ? { nextNsa } : {}),
  });
  if (!r.ok) throw new Error(`test setup: cedente (${r.error})`);
  return r.value;
};

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[financial:nsa-allocation] MYSQL_INTEGRATION não definido — pulando.\n');
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('Alocação de NSA — Drizzle + MySQL (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      // poolLimit > 1 é ESSENCIAL: com uma conexão só, as "concorrentes" seriam serializadas pelo
      // pool e o teste passaria mesmo sem lock nenhum — verde vazio.
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 8 });
      if (!r.ok) throw new Error(`[financial:nsa-allocation] Falha ao conectar: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    it('aloca em sequência e persiste o avanço', async () => {
      const store = createDrizzleCedenteAccountStore(handle);
      const account = buildAccount();
      assert.equal((await store.save(account)).ok, true);

      const first = await store.allocateNsa(account.id);
      const second = await store.allocateNsa(account.id);

      assert.ok(first.ok && second.ok);
      assert.equal(first.value, 1);
      assert.equal(second.value, 2);

      const reloaded = await store.findById(account.id);
      assert.ok(reloaded.ok && reloaded.value !== null);
      assert.equal(reloaded.value.nextNsa, 3);
    });

    // O caso que justifica o arquivo.
    it('DEZ alocações concorrentes produzem dez números DISTINTOS', async () => {
      const store = createDrizzleCedenteAccountStore(handle);
      const account = buildAccount();
      assert.equal((await store.save(account)).ok, true);

      const results = await Promise.all(
        Array.from({ length: 10 }, async () => store.allocateNsa(account.id)),
      );

      const allocated = results.map((r) => {
        assert.ok(r.ok, `alocação falhou: ${r.ok ? '' : r.error}`);
        return r.value as number;
      });

      const distinct = new Set(allocated);
      assert.equal(distinct.size, 10, `NSA repetido entre concorrentes: ${allocated.join(',')}`);
      assert.deepEqual(
        [...allocated].sort((a, b) => a - b),
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      );

      const reloaded = await store.findById(account.id);
      assert.ok(reloaded.ok && reloaded.value !== null);
      assert.equal(reloaded.value.nextNsa, 11);
    });

    it('conta inexistente não aloca', async () => {
      const store = createDrizzleCedenteAccountStore(handle);
      const r = await store.allocateNsa(CedenteAccountId.generate());
      assert.ok(!r.ok);
      assert.equal(r.error, 'cedente-account-not-found');
    });

    it('conta encerrada não aloca, e o contador não se move', async () => {
      const store = createDrizzleCedenteAccountStore(handle);
      const closed = close(buildAccount());
      assert.ok(closed.ok);
      assert.equal((await store.save(closed.value)).ok, true);

      const r = await store.allocateNsa(closed.value.id);
      assert.ok(!r.ok);
      assert.equal(r.error, 'cedente-account-not-active');

      const reloaded = await store.findById(closed.value.id);
      assert.ok(reloaded.ok && reloaded.value !== null);
      assert.equal(reloaded.value.nextNsa, 1);
    });

    it('faixa esgotada falha sem gravar número fora do campo', async () => {
      const store = createDrizzleCedenteAccountStore(handle);
      const account = buildAccount(Nsa.MAX);
      assert.equal((await store.save(account)).ok, true);

      const last = await store.allocateNsa(account.id);
      assert.ok(last.ok);
      assert.equal(last.value, Nsa.MAX);

      const beyond = await store.allocateNsa(account.id);
      assert.ok(!beyond.ok);
      assert.equal(beyond.error, 'nsa-exhausted');
    });
  });
}
