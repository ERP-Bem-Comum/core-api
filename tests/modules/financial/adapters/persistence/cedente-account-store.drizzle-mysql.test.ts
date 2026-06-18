// Teste de integração: CedenteAccountStore (Drizzle + MySQL real) — fundação conta-cedente (D-CEDENTE).
//
// Valida o upsert (ON DUPLICATE KEY UPDATE) + SELECT por id contra a migration 0004 (fin_cedente_accounts).
//
// GATE: só roda com `MYSQL_INTEGRATION=1` (ver `package.json §test:integration:financial`).
// Espelha `supplier-view-store.drizzle-mysql.test.ts`. CA5 do 000-request.

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.drizzle.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create, close } from '#src/modules/financial/domain/cedente/cedente-account.ts';

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

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:cedente-account-store] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

  describe('CedenteAccountStore — Drizzle + MySQL (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) {
        throw new Error(`[financial:cedente-account-store] Falha ao conectar ao MySQL: ${r.error}`);
      }
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    it('CA5: save + findById round-trip; findById inexistente → null', async () => {
      const store = createDrizzleCedenteAccountStore(handle);
      const account = buildAccount();

      const saved = await store.save(account);
      assert.equal(saved.ok, true);

      const found = await store.findById(account.id);
      assert.equal(found.ok, true);
      if (found.ok && found.value !== null) {
        assert.equal(found.value.id, account.id);
        assert.equal(found.value.bankCode, account.bankCode);
        assert.equal(found.value.status, 'Active');
        assert.equal(found.value.nextNsa, account.nextNsa);
      } else {
        assert.fail('conta não encontrada após save');
      }

      const miss = await store.findById(CedenteAccountId.generate());
      assert.equal(miss.ok, true);
      if (miss.ok) assert.equal(miss.value, null);
    });

    it('CA5: save em id existente atualiza (upsert)', async () => {
      const store = createDrizzleCedenteAccountStore(handle);
      const account = buildAccount();
      await store.save(account);

      const closed = close(account);
      assert.equal(closed.ok, true);
      if (closed.ok) {
        await store.save(closed.value);
        const found = await store.findById(account.id);
        if (found.ok && found.value !== null) {
          assert.equal(found.value.status, 'Closed');
        } else {
          assert.fail('conta não encontrada após upsert');
        }
      }
    });
  });
}
