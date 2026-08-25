// FIN-DOC-PAYMENT-DETAIL (feature 027 / #273) — W0 RED da persistência (Drizzle + MySQL real).
//
// Prova que a coluna nova `payment_detail varchar(255) NULL` em `fin_documents`:
//   - faz round-trip insert→select preservando o valor (CA1);
//   - lê `null` para uma linha que nunca setou a coluna (CA4 — back-compat por nullable).
//
// GATEAMENTO (test-pyramid-engineer SKILL.md + .claude/rules/testing.md):
//   SÓ roda com `MYSQL_INTEGRATION=1` no ambiente. `pnpm test` puro NÃO sobe MySQL → o
//   describe() não é registrado (sem falso negativo nem skip). Comando canônico:
//   `pnpm run test:integration:financial`. Mesmo opt-in de `document-repository.drizzle-mysql.test.ts`.
//
// RED esperado: o domínio/mapper/schema ainda não conhecem `paymentDetail`/`payment_detail`
//   - tsc: excess-property no `Document.create({ ..., paymentDetail })` + acesso a `.paymentDetail`.
//   - runtime (sob Docker): a coluna não existe → save/findById não preservam o valor.

import { describe, before, after, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:payment-detail] MYSQL_INTEGRATION não definido — pulando testes de integração.\n',
  );
} else {
  // Migrations exigem DDL → conecta como root (mesmo padrão de document-repository.drizzle-mysql.test.ts).
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  const PD_SUP = '5a000000-0000-4000-8000-0000000000d1';

  const supplier = (): SupplierRef => {
    const r = SupplierRef.rehydrate(PD_SUP);
    if (!r.ok) throw new Error('test setup: supplier');
    return r.value;
  };
  const money = (n: number): Money.Money => {
    const r = Money.fromCents(n);
    if (!r.ok) throw new Error('test setup: money');
    return r.value;
  };

  // Cria um documento Open. `paymentDetail` é opcional: passado quando o teste exige (W0 RED — excess-property).
  const build = (documentNumber: string, paymentDetail?: string): Document.CreateDocumentOutput => {
    const r = Document.create({
      id: DocumentId.generate(),
      documentNumber,
      type: 'NFS-e',
      supplier: supplier(),
      paymentMethod: 'TED',
      grossValue: money(100000),
      sourceDiscounts: Money.ZERO,
      discounts: Money.ZERO,
      penalty: Money.ZERO,
      interest: Money.ZERO,
      retentions: [],
      registeredTaxes: [],
      dueDate: new Date('2026-07-01'),
      ...(paymentDetail !== undefined ? { paymentDetail } : {}),
    });
    if (!r.ok) throw new Error('test setup: create');
    return r.value;
  };

  describe('DocumentRepository — paymentDetail (Drizzle + MySQL / integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({
        connectionString,
        applyMigrations: true,
        poolLimit: 3,
      });
      if (!r.ok) {
        throw new Error(
          `[financial:payment-detail] Falha ao conectar ao MySQL: ${r.error}\n` +
            `  connection string: ${connectionString}`,
        );
      }
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    it('CA1: round-trip insert→select preserva paymentDetail', async () => {
      const repo = createDrizzleDocumentRepository(handle);
      const detail = '34191.79001 01043.510047 91020.150008 9 12345678901234';
      const created = build('NFS-PD-ROUNDTRIP', detail);

      const saved = await repo.save({ document: created.document, payables: created.payables }, []);
      assert.equal(isOk(saved), true);

      const found = await repo.findById(created.document.id);
      assert.equal(isOk(found), true);
      if (found.ok) {
        assert.equal(found.value.document.paymentDetail, detail);
      }

      await repo.delete(created.document.id, 0);
    });

    it('CA4: linha sem paymentDetail (coluna nova nullable) lê null, sem erro de mapper', async () => {
      const repo = createDrizzleDocumentRepository(handle);
      // Documento criado SEM paymentDetail → a coluna nunca é setada (NULL) → leitura back-compat.
      const created = build('NFS-PD-LEGACY');

      const saved = await repo.save({ document: created.document, payables: created.payables }, []);
      assert.equal(isOk(saved), true);

      const found = await repo.findById(created.document.id);
      assert.equal(isOk(found), true);
      if (found.ok) {
        assert.equal(found.value.document.paymentDetail, null);
      }

      await repo.delete(created.document.id, 0);
    });
  });
}
