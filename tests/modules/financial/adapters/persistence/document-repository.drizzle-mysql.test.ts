// Teste de integração: DocumentRepository (Drizzle + MySQL real).
//
// Consome a CONTRACT SUITE `document-repository.suite.ts` contra MySQL de verdade.
//
// GATEAMENTO (test-pyramid-engineer SKILL.md + .claude/rules/testing.md):
//   Este teste SÓ roda quando `MYSQL_INTEGRATION=1` estiver no ambiente.
//   `pnpm test` puro NÃO sobe MySQL → gate protege o pipeline offline.
//   Comando canônico: `pnpm run test:integration:financial`
//   (a ser adicionado em package.json quando CI for configurado para o módulo).
//
// Como espelha o padrão de contracts:
//   - Mesmo opt-in `MYSQL_INTEGRATION=1` (ver `package.json §test:integration`).
//   - Abre handle via `openMysqlFinancial({ applyMigrations: true })`.
//   - Passa `createDrizzleDocumentRepository(handle)` para a suite.
//   - Fecha o handle no `after()`.
//
// Referência: `tests/modules/contracts/adapters/persistence/drizzle-mysql.test.ts`.

import { describe, before, after, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import { projectEntry } from '#src/modules/financial/domain/timeline/projection.ts';
import { documentRepositoryContract } from './document-repository.suite.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts';
import { createDrizzleTimelineRepository } from '#src/modules/financial/adapters/persistence/repos/timeline-repository.drizzle.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';

// Gate de integração: sem a env var, o describe() não é registrado e o runner
// Node 24 não reporta nenhum teste — sem falso negativo nem skip explícito.
if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:drizzle-mysql] MYSQL_INTEGRATION não definido — pulando testes de integração.\n',
  );
} else {
  // Migrations exigem DDL (CREATE TABLE) → conecta como root, como contracts/programs.
  // O usuário de aplicação do compose é `core_app` (sem grant de DDL); `app` nem existe.
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

  describe('DocumentRepository — Drizzle + MySQL (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({
        connectionString,
        applyMigrations: true,
        poolLimit: 3,
      });
      if (!r.ok) {
        throw new Error(
          `[financial:drizzle-mysql] Falha ao conectar ao MySQL: ${r.error}\n` +
            `  connection string: ${connectionString}`,
        );
      }
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    // A suite parametrizada cria um repo novo a cada chamada de `makeRepo()`
    // para garantir isolamento entre testes (cada teste inicia com estado limpo
    // porque opera no próprio ID gerado — sem shared state entre casos).
    documentRepositoryContract(() => createDrizzleDocumentRepository(handle));

    // Trilha (Time Travel) gravada na MESMA transação do save + lida via timeline repo + cascade no delete.
    describe('FinancialTimelineRepository — Drizzle + MySQL', () => {
      const TL_SUP = '5a000000-0000-4000-8000-0000000000a1';

      it('save grava a trilha na tx; findByDocument a lê; delete cascateia', async () => {
        const repo = createDrizzleDocumentRepository(handle);
        const timelineRepo = createDrizzleTimelineRepository(handle);

        const supplierR = SupplierRef.rehydrate(TL_SUP);
        if (!supplierR.ok) throw new Error('test setup: supplier');
        const grossR = Money.fromCents(100000);
        if (!grossR.ok) throw new Error('test setup: money');
        const created = Document.create({
          id: DocumentId.generate(),
          documentNumber: 'NFS-TL-INT',
          type: 'NFS-e',
          supplier: supplierR.value,
          paymentMethod: 'TED',
          grossValue: grossR.value,
          sourceDiscounts: Money.ZERO,
          discounts: Money.ZERO,
          penalty: Money.ZERO,
          interest: Money.ZERO,
          retentions: [],
          registeredTaxes: [],
          dueDate: new Date('2026-07-01'),
        });
        if (!created.ok) throw new Error('test setup: create');

        const event = created.value.events[0];
        if (event === undefined) throw new Error('test setup: event');
        const entries = projectEntry({
          eventId: newUuid(),
          event,
          before: null,
          after: created.value.document,
          payablesBefore: null,
          payablesAfter: created.value.payables,
          actor: null,
          occurredAt: new Date('2026-06-15T12:00:00.000Z'),
        });
        assert.ok(entries.length > 0, 'projeção deve gerar ao menos 1 entry');

        const saved = await repo.save(
          { document: created.value.document, payables: created.value.payables },
          entries,
        );
        assert.equal(isOk(saved), true);

        const found = await timelineRepo.findByDocument(created.value.document.id);
        assert.equal(isOk(found), true);
        if (found.ok) {
          assert.ok(found.value.length >= 1, 'trilha persistida e lida do MySQL');
          const docEntry = found.value.find((e) => e.target.kind === 'Document');
          assert.ok(docEntry, 'há entrada com alvo Document');
          assert.ok(
            docEntry.changes.some((c) => c.field === 'grossValue'),
            'changes inclui grossValue da criação',
          );
        }

        // Cascade: hard delete do documento remove a trilha (FK ON DELETE CASCADE — SC-006).
        const del = await repo.delete(created.value.document.id);
        assert.equal(isOk(del), true);
        const afterDelete = await timelineRepo.findByDocument(created.value.document.id);
        assert.equal(isOk(afterDelete), true);
        if (afterDelete.ok) assert.equal(afterDelete.value.length, 0);
      });
    });
  });
}
