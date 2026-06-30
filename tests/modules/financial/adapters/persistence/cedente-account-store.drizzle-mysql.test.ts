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

// W1 (FR-016): cada chamada gera uma CHAVE NATURAL distinta (accountNumber via contador) — o
// UNIQUE INDEX da migration 0009 colidiria se dois testes reusassem 237/1234/567890/1.
let naturalKeySeq = 0;
const buildAccount = () => {
  naturalKeySeq += 1;
  const r = create({
    id: CedenteAccountId.generate(),
    bankCode: '237',
    agency: '1234',
    accountNumber: `5678${String(naturalKeySeq).padStart(2, '0')}`,
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

    // ─── Extensão conciliação (feature 019 / FIN-RECON-CEDENTE-ACCOUNT) ───
    // W1: `buildAccount()` agora gera chave natural distinta por chamada (contador) → os CA5
    // acima não colidem com o UNIQUE INDEX de FR-016 (migration 0009).

    it('019/round-trip: campos de conciliação persistem e retornam', async () => {
      const store = createDrizzleCedenteAccountStore(handle);
      const r = create({
        id: CedenteAccountId.generate(),
        bankCode: '341',
        agency: '4444',
        accountNumber: '111222',
        accountDigit: '3',
        convenio: '9999999',
        document: '98765432000100',
        type: 'poupanca',
        nickname: 'Conta poupança',
        bankName: 'Itaú',
        openingBalanceCents: 250000,
        openingBalanceDate: '2026-01-01',
      } as never);
      assert.equal(r.ok, true);
      if (!r.ok) return;

      const saved = await store.save(r.value);
      assert.equal(saved.ok, true);

      const found = await store.findById(r.value.id);
      assert.equal(found.ok, true);
      if (found.ok && found.value !== null) {
        const v = found.value as Record<string, unknown>;
        assert.equal(v['type'], 'poupanca');
        assert.equal(v['nickname'], 'Conta poupança');
        assert.equal(v['bankName'], 'Itaú');
        assert.equal(v['openingBalanceCents'], 250000);
      } else {
        assert.fail('conta não encontrada após save (campos de conciliação)');
      }
    });

    it('019/FR-016: UNIQUE (banco+agência+conta+dígito) impede 2ª conta com mesma chave natural', async () => {
      const store = createDrizzleCedenteAccountStore(handle);
      const naturalKey = {
        bankCode: '001',
        agency: '7777',
        accountNumber: '333444',
        accountDigit: '5',
        convenio: '9999999',
        document: '11122233000155',
      };

      const a = create({ id: CedenteAccountId.generate(), ...naturalKey });
      assert.equal(a.ok, true);
      if (!a.ok) return;
      await store.save(a.value);

      const b = create({ id: CedenteAccountId.generate(), ...naturalKey });
      assert.equal(b.ok, true);
      if (!b.ok) return;
      await store.save(b.value);

      // Com o UNIQUE INDEX, a 2ª conta (id diferente, mesma chave natural) NÃO gera linha nova:
      // o ON DUPLICATE KEY UPDATE colide na chave natural e atualiza a linha de A; o id de B nunca
      // é inserido. Sem o índice (estado atual) a linha de B existe → este assert falha (RED).
      const foundB = await store.findById(b.value.id);
      assert.equal(foundB.ok, true);
      if (foundB.ok) {
        assert.equal(
          foundB.value,
          null,
          'a 2ª conta com chave natural duplicada não deveria existir (UNIQUE FR-016)',
        );
      }
    });

    // ─── #206 — tipo estendido (cartao/outro) + typeLabel ───
    it('#206: conta type=cartao/outro com typeLabel persiste (CHECK relaxado + coluna type_label)', async () => {
      const store = createDrizzleCedenteAccountStore(handle);

      const card = create({
        id: CedenteAccountId.generate(),
        bankCode: '237',
        agency: '1234',
        accountNumber: '900111',
        accountDigit: '7',
        convenio: '9999999',
        document: '12345678000190',
        type: 'cartao',
        typeLabel: 'Cartão corporativo Visa',
      } as never);
      assert.equal(card.ok, true);
      if (!card.ok) return;
      assert.equal((await store.save(card.value)).ok, true);
      const foundCard = await store.findById(card.value.id);
      if (foundCard.ok && foundCard.value !== null) {
        const v = foundCard.value as Record<string, unknown>;
        assert.equal(v['type'], 'cartao');
        assert.equal(v['typeLabel'], 'Cartão corporativo Visa');
      } else {
        assert.fail('conta cartao não encontrada após save');
      }

      const other = create({
        id: CedenteAccountId.generate(),
        bankCode: '260',
        agency: '0001',
        accountNumber: '900222',
        accountDigit: '8',
        convenio: '9999999',
        document: '12345678000190',
        type: 'outro',
        typeLabel: 'Conta Mercado Pago',
      } as never);
      assert.equal(other.ok, true);
      if (!other.ok) return;
      assert.equal((await store.save(other.value)).ok, true);
      const foundOther = await store.findById(other.value.id);
      if (foundOther.ok && foundOther.value !== null) {
        const v = foundOther.value as Record<string, unknown>;
        assert.equal(v['type'], 'outro');
        assert.equal(v['typeLabel'], 'Conta Mercado Pago');
      } else {
        assert.fail('conta outro não encontrada após save');
      }
    });
  });
}
