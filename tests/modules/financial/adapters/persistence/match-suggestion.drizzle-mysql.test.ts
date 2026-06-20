// Integração (#121) — SuggestionView (JOIN fin_payables×fin_documents×fin_supplier_view) +
// RejectedSuggestionRepository (save/list/idempotência) contra MySQL real (migration 0006).
//
// GATE: só roda com `MYSQL_INTEGRATION=1` (ver `package.json §test:integration:financial`).

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { eq } from 'drizzle-orm';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import { createInMemoryContractCategorizationReadStore } from '#src/modules/contracts/public-api/index.ts';
import { createDrizzleDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts';
import { createDrizzleSuggestionView } from '#src/modules/financial/adapters/persistence/repos/suggestion-view.drizzle.ts';
import { createDrizzleRejectedSuggestionRepository } from '#src/modules/financial/adapters/persistence/repos/rejected-suggestion-repository.drizzle.ts';
import { finPayables } from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import { saveDocument } from '#src/modules/financial/application/use-cases/save-document.ts';
import { newUuid } from '#src/shared/utils/id.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:match-suggestion] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

  describe('Match/Suggestion — Drizzle + MySQL (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[financial:match-suggestion] conexão: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    const seedPaidPayable = async (): Promise<{ payableId: string; documentNumber: string }> => {
      const documentNumber = `NF-${newUuid().slice(0, 8)}`;
      const save = saveDocument({
        repo: createDrizzleDocumentRepository(handle),
        outbox: createInMemoryOutbox().port,
        clock: ClockReal(),
        contractCategorizationReader: createInMemoryContractCategorizationReadStore(),
      });
      const created = await save({
        documentNumber,
        type: 'NFS-e',
        supplierRef: newUuid(),
        paymentMethod: 'PIX',
        grossValueCents: 1000,
        retentions: [],
        registeredTaxes: [],
        dueDate: new Date('2026-12-31T00:00:00.000Z'),
        description: null,
      });
      if (!created.ok) throw new Error(`setup: saveDocument ${created.error}`);
      const payableId = String(created.value.payableIds[0]);
      await handle.db
        .update(finPayables)
        .set({ status: 'Paid' })
        .where(eq(finPayables.id, payableId));
      return { payableId, documentNumber };
    };

    it('SuggestionView.listCandidates traz o título Paid com nº do documento (JOIN)', async () => {
      const { payableId, documentNumber } = await seedPaidPayable();
      const view = createDrizzleSuggestionView(handle);
      const r = await view.listCandidates();
      assert.equal(r.ok, true);
      if (!r.ok) return;
      const found = r.value.find((c) => c.payableId === payableId);
      assert.ok(found, 'candidato Paid deve aparecer');
      assert.equal(found?.valueCents, 1000);
      assert.equal(found?.documentNumber, documentNumber);
      assert.equal(found?.supplierName, null); // fin_supplier_view vazio (sem worker nesta suíte)
    });

    it('RejectedSuggestionRepository: save + listByTransaction + idempotência', async () => {
      const { payableId } = await seedPaidPayable();
      const transactionId = newUuid();
      const repo = createDrizzleRejectedSuggestionRepository(handle);

      const first = await repo.save({
        transactionId,
        payableId,
        rejectedBy: '99999999-9999-4999-8999-999999999999',
        occurredAt: new Date('2024-05-20T12:00:00.000Z'),
      });
      assert.equal(first.ok, true);

      // Idempotente: 2ª rejeição da mesma dupla não duplica (UNIQUE + ON DUPLICATE KEY UPDATE).
      const second = await repo.save({
        transactionId,
        payableId,
        rejectedBy: '99999999-9999-4999-8999-999999999999',
        occurredAt: new Date('2024-05-21T12:00:00.000Z'),
      });
      assert.equal(second.ok, true);

      const listed = await repo.listByTransaction(transactionId);
      assert.equal(listed.ok, true);
      if (listed.ok) {
        assert.equal(listed.value.has(payableId), true);
        assert.equal(listed.value.size, 1);
      }
    });
  });
}
