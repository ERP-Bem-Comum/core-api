// Integração (#383): CHECK de consistência status='Paid' ⇒ paid_at NOT NULL em fin_payables.
// Prova que o MySQL rejeita a linha inconsistente (defesa em profundidade — o invariante já vale no
// domínio, reafirmado no banco contra ETL/UPDATE manual). GATE: MYSQL_INTEGRATION=1 (runner financial).
// O domínio nunca cria 'Paid' sem paid_at, então o estado inconsistente é forjado via UPDATE cru.

import { describe, before, after, it } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { sql } from 'drizzle-orm';

import { newUuid } from '#src/shared/utils/id.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[financial:paid-at-check] MYSQL_INTEGRATION nao definido — pulando.\n');
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

  const must = <T>(r: { ok: true; value: T } | { ok: false }): T => {
    if (!r.ok) throw new Error('setup');
    return r.value;
  };

  // Semeia um payable Approved (paid_at NULL, status <> 'Paid' — satisfaz o CHECK) e devolve o id do
  // parent para os UPDATEs crus. Sem retentions → só o parent (mais simples de exercitar a constraint).
  const seedApprovedPayable = async (handle: FinancialMysqlHandle): Promise<string> => {
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
        retentions: [],
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
    const saved = await repo.save({ document: approved.document, payables: approved.payables }, []);
    assert.equal(saved.ok, true, JSON.stringify(saved));
    return String(approved.payables.parent.id);
  };

  describe('#383 — CHECK status=Paid ⇒ paid_at NOT NULL (Drizzle + MySQL)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[paid-at-check] conexao: ${r.error}`);
      handle = r.value;
    });
    after(async () => {
      await handle?.close();
    });

    it('UPDATE status=Paid com paid_at=NULL → rejeitado pelo CHECK (errno 3819)', async () => {
      const id = await seedApprovedPayable(handle);
      await assert.rejects(
        () =>
          handle.db.execute(
            sql`UPDATE fin_payables SET status = 'Paid', paid_at = NULL WHERE id = ${id}`,
          ),
        (e: unknown) => {
          // drizzle envolve o erro do mysql2 em DrizzleQueryError; o errno real fica em `cause`.
          const cause = (e as { cause?: { errno?: number } }).cause;
          assert.equal(cause?.errno, 3819); // ER_CHECK_CONSTRAINT_VIOLATED (MySQL 8.x)
          return true;
        },
      );
    });

    it('UPDATE status=Paid com paid_at preenchido → aceito', async () => {
      const id = await seedApprovedPayable(handle);
      await handle.db.execute(
        sql`UPDATE fin_payables SET status = 'Paid', paid_at = '2026-07-10' WHERE id = ${id}`,
      );
      // ausência de throw = operação aceita
    });

    it('UPDATE status=Open com paid_at=NULL → aceito (CHECK só vincula quando Paid)', async () => {
      const id = await seedApprovedPayable(handle);
      await handle.db.execute(
        sql`UPDATE fin_payables SET status = 'Open', paid_at = NULL WHERE id = ${id}`,
      );
      // ausência de throw = operação aceita
    });
  });
}
