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
import { sql } from 'drizzle-orm';

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
import { bulkUpdateDueDate } from '#src/modules/financial/application/use-cases/bulk-update-due-date.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { finSupplierView } from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
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
        const del = await repo.delete(created.value.document.id, 0);
        assert.equal(isOk(del), true);
        const afterDelete = await timelineRepo.findByDocument(created.value.document.id);
        assert.equal(isOk(afterDelete), true);
        if (afterDelete.ok) assert.equal(afterDelete.value.length, 0);
      });

      it('CHECK ck_fin_tl_event_type rejeita DocumentCancelled na trilha (#56b)', async () => {
        const repo = createDrizzleDocumentRepository(handle);
        const supplierR = SupplierRef.rehydrate(TL_SUP);
        if (!supplierR.ok) throw new Error('test setup: supplier');
        const grossR = Money.fromCents(100000);
        if (!grossR.ok) throw new Error('test setup: money');
        const created = Document.create({
          id: DocumentId.generate(),
          documentNumber: 'NFS-TL-CHK',
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
        const saved = await repo.save(
          { document: created.value.document, payables: created.value.payables },
          [],
        );
        assert.equal(isOk(saved), true);

        // document_id válido (FK satisfeita) + target_kind/colunas válidos → a ÚNICA violação
        // possível é o ck_fin_tl_event_type. O Drizzle envelopa o erro mysql2 (code/errno em .cause),
        // então provamos a rejeição via try/catch e inspecionamos a cadeia de causas por garantia.
        const docId = created.value.document.id as unknown as string;
        let rejected = false;
        let mentionsCheck = false;
        try {
          await handle.db.execute(
            sql`INSERT INTO fin_document_timeline
                  (id, event_id, document_id, target_kind, target_id, event_type, occurred_at)
                VALUES (${newUuid()}, ${newUuid()}, ${docId}, 'Document', ${docId}, 'DocumentCancelled', NOW(3))`,
          );
        } catch (caught) {
          rejected = true;
          for (let e: unknown = caught; e !== null && e !== undefined; ) {
            const node = e as { code?: string; errno?: number; message?: string; cause?: unknown };
            if (
              node.code === 'ER_CHECK_CONSTRAINT_VIOLATED' ||
              node.errno === 3819 ||
              /ck_fin_tl_event_type|check constraint/i.test(node.message ?? '')
            ) {
              mentionsCheck = true;
              break;
            }
            e = node.cause;
          }
        }
        assert.ok(
          rejected,
          'INSERT com event_type=DocumentCancelled deve ser rejeitado pelo CHECK',
        );
        assert.ok(mentionsCheck, 'a rejeição deve vir do CHECK ck_fin_tl_event_type');
      });
    });

    // Optimistic lock (FR-009/ADR-0002) contra MySQL real: UPDATE WHERE version=expectedVersion.
    describe('Optimistic lock — Drizzle + MySQL', () => {
      const OL_SUP = '5a000000-0000-4000-8000-0000000000b1';
      const build = (): Document.CreateDocumentOutput => {
        const supplierR = SupplierRef.rehydrate(OL_SUP);
        if (!supplierR.ok) throw new Error('test setup: supplier');
        const grossR = Money.fromCents(100000);
        if (!grossR.ok) throw new Error('test setup: money');
        const r = Document.create({
          id: DocumentId.generate(),
          documentNumber: 'NFS-OL-INT',
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
        if (!r.ok) throw new Error('test setup: create');
        return r.value;
      };

      it('expectedVersion casa → grava; versão stale → document-version-conflict', async () => {
        const repo = createDrizzleDocumentRepository(handle);
        const created = build();
        const agg = { document: created.document, payables: created.payables };

        // Criação (sem expectedVersion) → version 0.
        const v0 = await repo.save(agg, []);
        assert.equal(isOk(v0), true);

        // Update com expectedVersion=0 (casa) → version 1.
        const v1 = await repo.save(agg, [], 0);
        assert.equal(isOk(v1), true);

        // Update com expectedVersion=0 de novo (atual é 1) → conflito.
        const stale = await repo.save(agg, [], 0);
        assert.equal(stale.ok, false);
        if (!stale.ok) assert.equal(stale.error, 'document-version-conflict');

        await repo.delete(created.document.id, 1); // versão corrente após o update bem-sucedido
      });
    });

    // #204 — CONCILIADO derivado no grid (read-time sobre fin_payables, sem escrita em fin_documents).
    // Promove documentos a 'Paid' (simula CNAB/016) e flipa títulos para 'Reconciled' (conciliação),
    // depois valida que findPaged reflete/filtra o estado derivado (FR-001/003/004/SC-001/003/004).
    describe('#204 — status Conciliado derivado em findPaged', () => {
      const REC_SUP = '5a000000-0000-4000-8000-0000000000c1';

      const build = (numero: string): Document.CreateDocumentOutput => {
        const supplierR = SupplierRef.rehydrate(REC_SUP);
        if (!supplierR.ok) throw new Error('test setup: supplier');
        const grossR = Money.fromCents(100000);
        if (!grossR.ok) throw new Error('test setup: money');
        const r = Document.create({
          id: DocumentId.generate(),
          documentNumber: numero,
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
        if (!r.ok) throw new Error('test setup: create');
        return r.value;
      };

      it('Pago + TODOS os títulos Reconciled → grid Reconciled; parcial/sem → Pago; filtro Paid/Reconciled', async () => {
        const repo = createDrizzleDocumentRepository(handle);

        const full = build('NFS-204-FULL');
        const partial = build('NFS-204-PART');
        const paidOnly = build('NFS-204-PAID');
        for (const d of [full, partial, paidOnly]) {
          const s = await repo.save({ document: d.document, payables: d.payables }, []);
          assert.equal(isOk(s), true);
        }

        const idFull = full.document.id as unknown as string;
        const idPart = partial.document.id as unknown as string;
        const idPaid = paidOnly.document.id as unknown as string;

        // Promove os 3 a 'Paid' (simula CNAB/016 — não há rota que o faça no domínio).
        await handle.db.execute(
          sql`UPDATE fin_documents SET status='Paid' WHERE id IN (${idFull}, ${idPart}, ${idPaid})`,
        );
        // full: TODOS os títulos Reconciled.
        await handle.db.execute(
          sql`UPDATE fin_payables SET status='Reconciled' WHERE document_id = ${idFull}`,
        );
        // partial: garante ≥2 títulos (Document.create gera 1 pai) inserindo 1 filho; todos Paid,
        // depois exatamente 1 Reconciled → estado PARCIAL (nem todos reconciliados).
        await handle.db.execute(
          sql`UPDATE fin_payables SET status='Paid' WHERE document_id = ${idPart}`,
        );
        await handle.db.execute(
          sql`INSERT INTO fin_payables
                (id, document_id, kind, retention_type, status, value, due_date, payment_method, created_at)
              VALUES (${newUuid()}, ${idPart}, 'Child', 'ISS', 'Paid', 100, '2026-07-01', 'TED', NOW(3))`,
        );
        await handle.db.execute(
          sql`UPDATE fin_payables SET status='Reconciled' WHERE document_id = ${idPart} ORDER BY id LIMIT 1`,
        );
        // paidOnly: títulos Paid, nenhum reconciliado.
        await handle.db.execute(
          sql`UPDATE fin_payables SET status='Paid' WHERE document_id = ${idPaid}`,
        );

        // Sem filtro de status: full reflete 'Reconciled'; os demais 'Paid'.
        const all = await repo.findPaged({ supplierRef: REC_SUP }, 1, 50);
        assert.equal(isOk(all), true);
        if (all.ok) {
          const byId = new Map(all.value.items.map((i) => [i.id, i.status]));
          assert.equal(byId.get(idFull), 'Reconciled', 'full (todos reconciliados) → Reconciled');
          assert.equal(byId.get(idPart), 'Paid', 'parcial → Paid (FR-004)');
          assert.equal(byId.get(idPaid), 'Paid', 'sem conciliação → Paid');
        }

        // Filtro Reconciled → só o full.
        const recPage = await repo.findPaged({ supplierRef: REC_SUP, status: 'Reconciled' }, 1, 50);
        assert.equal(isOk(recPage), true);
        if (recPage.ok) {
          assert.equal(recPage.value.total, 1);
          assert.equal(recPage.value.items[0]?.id, idFull);
        }

        // Filtro Paid → os dois NÃO totalmente reconciliados (exclui o full).
        const paidPage = await repo.findPaged({ supplierRef: REC_SUP, status: 'Paid' }, 1, 50);
        assert.equal(isOk(paidPage), true);
        if (paidPage.ok) {
          assert.equal(paidPage.value.total, 2);
          const ids = new Set(paidPage.value.items.map((i) => i.id));
          assert.equal(ids.has(idFull), false, 'full (Reconciled) não aparece em Paid');
          assert.equal(ids.has(idPart), true);
          assert.equal(ids.has(idPaid), true);
        }

        // cleanup
        for (const id of [idFull, idPart, idPaid]) {
          await handle.db.execute(sql`DELETE FROM fin_payables WHERE document_id = ${id}`);
          await handle.db.execute(sql`DELETE FROM fin_documents WHERE id = ${id}`);
        }
      });
    });

    // #167 — busca textual `q` (LEFT JOIN fin_supplier_view): nome do fornecedor + CNPJ + documentNumber.
    describe('#167 — busca textual q (nome/CNPJ/documentNumber) em findPaged', () => {
      const Q_SUP = '5a000000-0000-4000-8000-0000000000d1';

      it('CA4: q casa por nome do fornecedor, CNPJ e documentNumber; LEFT JOIN não duplica count', async () => {
        const repo = createDrizzleDocumentRepository(handle);
        const supplierR = SupplierRef.rehydrate(Q_SUP);
        if (!supplierR.ok) throw new Error('test setup: supplier');
        const grossR = Money.fromCents(500000);
        if (!grossR.ok) throw new Error('test setup: money');
        const documentNumber = `NF-QSRCH-${newUuid().slice(0, 6)}`;
        const created = Document.create({
          id: DocumentId.generate(),
          documentNumber,
          type: 'NFS-e',
          supplier: supplierR.value,
          paymentMethod: 'PIX',
          grossValue: grossR.value,
          sourceDiscounts: Money.ZERO,
          discounts: Money.ZERO,
          penalty: Money.ZERO,
          interest: Money.ZERO,
          retentions: [],
          registeredTaxes: [],
          dueDate: new Date('2026-11-30'),
        });
        if (!created.ok) throw new Error('test setup: create');
        const docId = created.value.document.id as unknown as string;
        const saved = await repo.save(
          { document: created.value.document, payables: created.value.payables },
          [],
        );
        assert.equal(isOk(saved), true);

        // Semeia o read-model de fornecedor (normalmente populado pelo worker) p/ exercitar o LEFT JOIN.
        const now = new Date();
        await handle.db.insert(finSupplierView).values({
          supplierRef: Q_SUP,
          name: 'Padaria Bartolomeu LTDA',
          document: '12345678000199',
          occurredAt: now,
          updatedAt: now,
        });

        const byName = await repo.findPaged({ q: 'bartolomeu' }, 1, 100);
        assert.equal(isOk(byName), true, JSON.stringify(byName));
        if (byName.ok) {
          const mine = byName.value.items.filter((i) => i.id === docId);
          assert.equal(
            mine.length,
            1,
            'q por nome deve achar o documento sem duplicar (count/JOIN)',
          );
          assert.equal(mine[0]?.supplierName, 'Padaria Bartolomeu LTDA');
        }

        const byCnpj = await repo.findPaged({ q: '12345678' }, 1, 100);
        assert.equal(isOk(byCnpj), true);
        if (byCnpj.ok)
          assert.ok(
            byCnpj.value.items.some((i) => i.id === docId),
            'q por CNPJ deve achar',
          );

        const byNumber = await repo.findPaged({ q: documentNumber.slice(3) }, 1, 100);
        assert.equal(isOk(byNumber), true);
        if (byNumber.ok)
          assert.ok(
            byNumber.value.items.some((i) => i.id === docId),
            'q por documentNumber deve achar',
          );

        const none = await repo.findPaged({ q: `zzz-nao-existe-${docId.slice(0, 8)}` }, 1, 100);
        assert.equal(isOk(none), true);
        if (none.ok)
          assert.ok(!none.value.items.some((i) => i.id === docId), 'termo ausente não deve achar');

        // cleanup
        await handle.db.execute(sql`DELETE FROM fin_supplier_view WHERE supplier_ref = ${Q_SUP}`);
        await handle.db.execute(sql`DELETE FROM fin_payables WHERE document_id = ${docId}`);
        await handle.db.execute(sql`DELETE FROM fin_documents WHERE id = ${docId}`);
      });

      it('CA3 (x99): wildcard `%` no termo é literal (escapado) contra o motor MySQL real', async () => {
        const repo = createDrizzleDocumentRepository(handle);
        const supplierR = SupplierRef.rehydrate(Q_SUP);
        if (!supplierR.ok) throw new Error('test setup: supplier');
        const grossR = Money.fromCents(500000);
        if (!grossR.ok) throw new Error('test setup: money');
        // documentNumber com `%` literal — só deve casar busca que contenha esse literal, não `q='%'` coringa.
        const documentNumber = `NF-PCT-50%-${newUuid().slice(0, 6)}`;
        const created = Document.create({
          id: DocumentId.generate(),
          documentNumber,
          type: 'NFS-e',
          supplier: supplierR.value,
          paymentMethod: 'PIX',
          grossValue: grossR.value,
          sourceDiscounts: Money.ZERO,
          discounts: Money.ZERO,
          penalty: Money.ZERO,
          interest: Money.ZERO,
          retentions: [],
          registeredTaxes: [],
          dueDate: new Date('2026-11-30'),
        });
        if (!created.ok) throw new Error('test setup: create');
        const docId = created.value.document.id as unknown as string;
        const saved = await repo.save(
          { document: created.value.document, payables: created.value.payables },
          [],
        );
        assert.equal(isOk(saved), true);

        // Busca pelo literal "50%" → acha (contains real).
        const literal = await repo.findPaged({ q: '50%' }, 1, 100);
        assert.equal(isOk(literal), true);
        if (literal.ok)
          assert.ok(
            literal.value.items.some((i) => i.id === docId),
            'q="50%" deve casar pelo literal',
          );

        // Busca por "%" isolado → NÃO deve virar coringa (senão casaria todo documentNumber).
        const wildcard = await repo.findPaged({ q: '%' }, 1, 100);
        assert.equal(isOk(wildcard), true);
        if (wildcard.ok)
          assert.ok(
            wildcard.value.items.every((i) => (i.documentNumber ?? '').includes('%')),
            'q="%" deve ser literal: só casa documentNumber que realmente contém "%"',
          );

        await handle.db.execute(sql`DELETE FROM fin_payables WHERE document_id = ${docId}`);
        await handle.db.execute(sql`DELETE FROM fin_documents WHERE id = ${docId}`);
      });
    });

    // #164 — filtros (valor/contrato/programa) + ordenação por supplierName (LEFT JOIN fin_supplier_view).
    describe('#164 — filtros avançados + ordenação em findPaged', () => {
      const F_SUP_A = '5a000000-0000-4000-8000-0000000000e1';
      const F_SUP_B = '5a000000-0000-4000-8000-0000000000e2';

      const buildDoc = (
        num: string,
        sup: string,
        grossCents: number,
      ): Document.CreateDocumentOutput => {
        const supplierR = SupplierRef.rehydrate(sup);
        if (!supplierR.ok) throw new Error('setup: supplier');
        const grossR = Money.fromCents(grossCents);
        if (!grossR.ok) throw new Error('setup: money');
        const r = Document.create({
          id: DocumentId.generate(),
          documentNumber: num,
          type: 'NFS-e',
          supplier: supplierR.value,
          paymentMethod: 'PIX',
          grossValue: grossR.value,
          sourceDiscounts: Money.ZERO,
          discounts: Money.ZERO,
          penalty: Money.ZERO,
          interest: Money.ZERO,
          retentions: [],
          registeredTaxes: [],
          dueDate: new Date('2026-10-31'),
        });
        if (!r.ok) throw new Error('setup: create');
        return r.value;
      };

      it('CA5: netValue range + sort=supplierName; LEFT JOIN não duplica count/paginação', async () => {
        const repo = createDrizzleDocumentRepository(handle);
        const now = new Date();
        // Fornecedores no read-model: "Alpha" (SUP_A) e "Zeta" (SUP_B) — testam sort por nome.
        await handle.db.insert(finSupplierView).values([
          {
            supplierRef: F_SUP_A,
            name: 'Alpha Comercio',
            document: '11111111000191',
            occurredAt: now,
            updatedAt: now,
          },
          {
            supplierRef: F_SUP_B,
            name: 'Zeta Servicos',
            document: '22222222000192',
            occurredAt: now,
            updatedAt: now,
          },
        ]);
        const docs = [
          buildDoc('F164-A1', F_SUP_A, 300000),
          buildDoc('F164-Z1', F_SUP_B, 700000),
          buildDoc('F164-A2', F_SUP_A, 1500000), // fora da faixa
        ];
        for (const d of docs) {
          const s = await repo.save({ document: d.document, payables: d.payables }, []);
          assert.equal(isOk(s), true);
        }
        const ids = docs.map((d) => d.document.id as unknown as string);

        // Faixa 200k–800k → só A1 (300k) e Z1 (700k); A2 (1.5M) fora.
        const ranged = await repo.findPaged(
          { valorMin: 200000, valorMax: 800000, sort: 'supplierName', order: 'asc' },
          1,
          100,
        );
        assert.equal(isOk(ranged), true, JSON.stringify(ranged));
        if (ranged.ok) {
          const mine = ranged.value.items.filter((i) => ids.includes(i.id));
          assert.equal(mine.length, 2, 'faixa 200k–800k traz A1 e Z1 (sem duplicar pelo JOIN)');
          // sort=supplierName asc → Alpha antes de Zeta.
          assert.equal(mine[0]?.supplierName, 'Alpha Comercio');
          assert.equal(mine[1]?.supplierName, 'Zeta Servicos');
        }

        // inArray (multi-valor) + sort=netValue desc contra MySQL real (SQL não coberto pelo in-memory).
        const multi = await repo.findPaged(
          { supplierRefs: [F_SUP_A, F_SUP_B], types: ['NFS-e'], sort: 'netValue', order: 'desc' },
          1,
          100,
        );
        assert.equal(isOk(multi), true, JSON.stringify(multi));
        if (multi.ok) {
          const mine = multi.value.items.filter((i) => ids.includes(i.id));
          assert.equal(mine.length, 3, 'supplierRefs (inArray) traz os 3 dos dois fornecedores');
          const nets = mine.map((i) => i.netValue?.cents ?? 0);
          assert.deepEqual(
            nets,
            [...nets].sort((a, b) => b - a),
            'sort=netValue desc contra MySQL',
          );
        }

        // cleanup
        for (const id of ids) {
          await handle.db.execute(sql`DELETE FROM fin_payables WHERE document_id = ${id}`);
          await handle.db.execute(sql`DELETE FROM fin_documents WHERE id = ${id}`);
        }
        await handle.db.execute(
          sql`DELETE FROM fin_supplier_view WHERE supplier_ref IN (${F_SUP_A}, ${F_SUP_B})`,
        );
      });
    });

    // #162 — vencimento em lote (falha parcial por item) contra MySQL real.
    describe('#162 — bulkUpdateDueDate (lote misto ok+conflito)', () => {
      const B_SUP = '5a000000-0000-4000-8000-0000000000f1';

      const buildDoc = (num: string): Document.CreateDocumentOutput => {
        const supplierR = SupplierRef.rehydrate(B_SUP);
        if (!supplierR.ok) throw new Error('setup: supplier');
        const grossR = Money.fromCents(200000);
        if (!grossR.ok) throw new Error('setup: money');
        const r = Document.create({
          id: DocumentId.generate(),
          documentNumber: num,
          type: 'NFS-e',
          supplier: supplierR.value,
          paymentMethod: 'PIX',
          grossValue: grossR.value,
          sourceDiscounts: Money.ZERO,
          discounts: Money.ZERO,
          penalty: Money.ZERO,
          interest: Money.ZERO,
          retentions: [],
          registeredTaxes: [],
          dueDate: new Date('2026-09-30'),
        });
        if (!r.ok) throw new Error('setup: create');
        return r.value;
      };

      it('CA5: lote misto — item stale → version-conflict; válido → aplicado (real MySQL)', async () => {
        const repo = createDrizzleDocumentRepository(handle);
        const run = bulkUpdateDueDate({ repo, clock: ClockReal() });
        const a = buildDoc('BULK-X-A');
        const b = buildDoc('BULK-X-B');
        for (const d of [a, b]) {
          const s = await repo.save({ document: d.document, payables: d.payables }, []);
          assert.equal(isOk(s), true);
        }
        const idA = a.document.id as unknown as string;
        const idB = b.document.id as unknown as string;

        // Bump de A (0→1) via um lote isolado.
        const first = await run({
          items: [{ documentId: idA, expectedVersion: 0 }],
          dueDate: new Date('2027-02-02'),
        });
        assert.equal(isOk(first), true);

        // Lote misto: A com v0 (stale) + B com v0 (válido) + id fantasma.
        const ghost = '00000000-0000-4000-8000-0000000000ff';
        const mixed = await run({
          items: [
            { documentId: idA, expectedVersion: 0 },
            { documentId: idB, expectedVersion: 0 },
            { documentId: ghost, expectedVersion: 0 },
          ],
          dueDate: new Date('2027-05-05'),
        });
        assert.equal(isOk(mixed), true);
        if (mixed.ok) {
          const byId = new Map(mixed.value.map((r) => [r.documentId, r.outcome]));
          assert.equal(byId.get(idA), 'version-conflict', 'A stale → conflito');
          assert.equal(byId.get(idB), 'ok', 'B válido → aplicado');
          assert.equal(byId.get(ghost), 'not-found', 'fantasma → not-found');
        }

        // B mudou para 2027-05-05; A permaneceu em 2027-02-02 (conflito não aplica).
        const listed = await repo.findPaged({ supplierRef: B_SUP }, 1, 100);
        assert.equal(isOk(listed), true);
        if (listed.ok) {
          const dueById = new Map(
            listed.value.items.map((i) => [i.id, i.dueDate?.toISOString().slice(0, 10)]),
          );
          assert.equal(dueById.get(idB), '2027-05-05');
          assert.equal(dueById.get(idA), '2027-02-02');
        }

        // cleanup
        for (const id of [idA, idB]) {
          await handle.db.execute(sql`DELETE FROM fin_payables WHERE document_id = ${id}`);
          await handle.db.execute(sql`DELETE FROM fin_documents WHERE id = ${id}`);
        }
      });
    });
  });
}
