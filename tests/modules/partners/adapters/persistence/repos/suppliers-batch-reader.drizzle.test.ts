// Integração e2e do batch reader (#356, CA7): par_suppliers → createDrizzleSuppliersBatchReader →
// getSuppliersView(refs) resolve N refs em 1 query (`WHERE id IN (...)`, anti-N+1) contra MySQL real.
// items = refs existentes (só id/name/cnpj/service_category — minimização); missing = ausentes.
// GATE: só com MYSQL_INTEGRATION=1.

import { describe, before, after, it } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { openPartnersMysql } from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import type { PartnersMysqlHandle } from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleSuppliersBatchReader } from '#src/modules/partners/adapters/persistence/repos/suppliers-batch-reader.drizzle.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[suppliers-batch-reader:e2e] MYSQL_INTEGRATION nao definido — pulando.\n');
} else {
  const connectionString =
    process.env['PARTNERS_DATABASE_URL'] ??
    'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

  const A = 'aa000000-0000-4000-8000-0000000000a1';
  const B = 'bb000000-0000-4000-8000-0000000000b1';
  const MISSING = 'cc000000-0000-4000-8000-0000000000ff';
  const NOW = new Date('2026-01-10T08:00:00.000Z');

  describe('suppliers-batch-reader — e2e par_suppliers (CA7 WHERE IN)', () => {
    let handle: PartnersMysqlHandle;

    before(async () => {
      const r = await openPartnersMysql({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[suppliers-batch-reader:e2e] partners: ${r.error}`);
      handle = r.value;
      const t = handle.schema.parSuppliers;
      // Limpa na ENTRADA por tabela, não por id: um irmão da suíte (supplier-repository, sem afterEach)
      // deixa resíduo com o MESMO CNPJ e id distinto — delete por id não o pega e colide na UNIQUE
      // par_suppliers_cnpj_idx (#521). Contrato de isolamento intra-suíte do #535.
      await handle.db.delete(t);
      const row = (id: string, name: string, cnpj: string, cat: string) => ({
        id,
        name,
        email: `${name.toLowerCase()}@fornecedor.com.br`,
        cnpj,
        corporateName: `${name} LTDA`,
        fantasyName: name,
        serviceCategory: cat,
        // Alvo de pagamento obrigatório (CHECK par_suppliers_payment_target_chk). Também prova o CA5:
        // o batch reader NÃO expõe estes campos mesmo estando persistidos.
        bankAccountBank: '001',
        bankAccountAgency: '0001-2',
        bankAccountNumber: '123456',
        bankAccountCheckDigit: '7',
        active: true,
        createdAt: NOW,
        updatedAt: NOW,
      });
      await handle.db
        .insert(t)
        .values([
          row(A, 'Alpha', '11222333000181', 'INFORMATICA'),
          row(B, 'Beta', '11444777000161', 'AGUA'),
        ]);
    });

    after(async () => {
      await handle?.close();
    });

    it('CA7/CA1/CA2 — resolve N refs em 1 query (WHERE IN): existentes→items, ausente→missing', async () => {
      const reader = createDrizzleSuppliersBatchReader(handle);
      const r = await reader.getSuppliersView([A, B, MISSING]);
      assert.equal(r.ok, true);
      if (!r.ok) return;

      assert.equal(r.value.items.length, 2);
      assert.deepEqual([...r.value.missing], [MISSING]);

      const alpha = r.value.items.find((i) => i.ref === A);
      assert.ok(alpha, 'esperava Alpha resolvido');
      assert.equal(alpha.name, 'Alpha');
      assert.equal(alpha.taxId, '11222333000181');
      assert.equal(alpha.serviceCategory, 'INFORMATICA');

      // CA5 — minimização: o item carrega SÓ os 4 campos mínimos (nada de bancário/PIX/email).
      assert.deepEqual(Object.keys(alpha).sort(), ['name', 'ref', 'serviceCategory', 'taxId']);
    });
  });
}
