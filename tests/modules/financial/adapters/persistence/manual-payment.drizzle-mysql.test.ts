// Integração (#223): baixa manual de título via Drizzle + MySQL real. Prova que a coluna por-payable
// persiste o `Pago` (irmãos seguem `Aprovado`) E que a trilha aceita `PayableManuallyPaid` (CHECK
// relaxado pela migration 0020). GATE: MYSQL_INTEGRATION=1 (na lista do runner financial).

import { describe, before, after, it } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts';
import { registerManualPayment } from '#src/modules/financial/application/use-cases/register-manual-payment.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[financial:manual-payment] MYSQL_INTEGRATION nao definido — pulando.\n');
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  const must = <T>(r: { ok: true; value: T } | { ok: false }): T => {
    if (!r.ok) throw new Error('setup');
    return r.value;
  };

  describe('#223 — baixa manual de titulo (Drizzle + MySQL)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[manual-payment] conexao: ${r.error}`);
      handle = r.value;
    });
    after(async () => {
      await handle?.close();
    });

    it('paga UM titulo (Aprovado->Pago); persiste por-payable + trilha PayableManuallyPaid', async () => {
      const created = must(
        Document.create({
          id: DocumentId.generate(),
          documentNumber: `NFS-${newUuid().slice(0, 8)}`,
          type: 'NFS-e',
          supplier: must(SupplierRef.rehydrate(newUuid())),
          paymentMethod: 'TED',
          grossValue: must(Money.fromCents(1000000)),
          sourceDiscounts: Money.ZERO,
          discounts: Money.ZERO,
          penalty: Money.ZERO,
          interest: Money.ZERO,
          retentions: [
            must(
              Retention.create({
                type: 'ISS',
                baseCents: 350000,
                rateBps: 1000,
                valueCents: 35000,
              }),
            ),
          ],
          registeredTaxes: [],
          dueDate: new Date('2026-07-01T00:00:00.000Z'),
        }),
      );
      const approved = must(
        Document.approve({
          document: created.document,
          payables: created.payables,
          by: must(UserRef.rehydrate(newUuid())),
          at: new Date('2026-07-10T00:00:00.000Z'),
        }),
      );

      const repo = createDrizzleDocumentRepository(handle);
      const seeded = await repo.save(
        { document: approved.document, payables: approved.payables },
        [],
      );
      assert.equal(seeded.ok, true, JSON.stringify(seeded));

      const pay = registerManualPayment({ repo, clock: ClockReal() });
      const r = await pay({
        documentId: String(approved.document.id),
        payableId: String(approved.payables.parent.id),
        paidBy: newUuid(),
        expectedVersion: 0,
        reason: 'pago no caixa',
      });
      assert.equal(r.ok, true, JSON.stringify(r));

      const found = await repo.findById(approved.document.id);
      assert.equal(found.ok, true);
      if (found.ok && found.value.payables !== null) {
        assert.equal(found.value.payables.parent.status, 'Paid');
        assert.ok(found.value.payables.children.every((c) => c.status === 'Approved'));
      } else {
        assert.fail('documento nao encontrado apos baixa');
      }
    });
  });
}
