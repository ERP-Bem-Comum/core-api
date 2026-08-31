/**
 * M2 — reclassificação da taxonomia na conciliação, contra MySQL real.
 *
 * As três propriedades que só o banco de verdade prova:
 *
 *   RN-M2-06  — ATOMICIDADE: a taxonomia do documento, a trilha, o outbox e o flip de status da
 *               conciliação vivem na MESMA transação. Falha em qualquer ponto e nada fica gravado.
 *   RN-M2-03  — os 5 refs realmente aterrissam nas colunas de `fin_documents` (o `subcategory_ref`
 *               inclusive — o par que o #505 descartava no caminho vizinho).
 *   RN-M2-04/05 — a CASCATA chega ao read-model: o `DocumentSaved` reemitido, aplicado pela projeção,
 *               reescreve a linha do pai E a de cada filho de retenção no `fin_payable_view`.
 *
 * Molde: `reconciliation-repository.drizzle-mysql.test.ts` (mesma montagem e mesmos seeds).
 *
 * ⚠️ Limpeza na ENTRADA e por TABELA (`.claude/rules/testing.md`): estes casos escrevem em
 * `fin_documents`/`fin_payables`/`fin_payable_view`, e o resíduo de um arquivo irmão é visível aqui.
 * `fin_payable_view` NÃO tem seed de migration — pode ser limpa inteira.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { and, eq } from 'drizzle-orm';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import {
  openMysqlFinancial,
  type FinancialMysqlHandle,
} from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import {
  finDocuments,
  finPayables,
  finPayableView,
  finDocumentTimeline,
  finTimelineFieldChanges,
  finOutbox,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import { createDrizzleDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts';
import { createDrizzlePayableDocumentView } from '#src/modules/financial/adapters/persistence/repos/payable-document-view.drizzle.ts';
import { createDrizzleReconciliationRepository } from '#src/modules/financial/adapters/persistence/repos/reconciliation-repository.drizzle.ts';
import { createDrizzlePayableReconciliationView } from '#src/modules/financial/adapters/persistence/repos/payable-reconciliation-view.drizzle.ts';
import { createDrizzleBankStatementRepository } from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.drizzle.ts';
import { createDrizzleCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.drizzle.ts';
import { createDrizzleReconciliationPeriodStore } from '#src/modules/financial/adapters/persistence/repos/reconciliation-period-store.drizzle.ts';
import { createDrizzlePayableViewStore } from '#src/modules/financial/adapters/persistence/repos/payable-view-store.drizzle.ts';
import { createInMemoryContractCategorizationReadStore } from '#src/modules/contracts/public-api/index.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { createInMemoryTaxonomyPathRead } from '#src/modules/financial/adapters/persistence/repos/taxonomy-path-read.in-memory.ts';
import { saveDocument } from '#src/modules/financial/application/use-cases/save-document.ts';
import { confirmReconciliation } from '#src/modules/financial/application/use-cases/confirm-reconciliation.ts';
import { applyPayableEvent } from '#src/modules/financial/application/use-cases/apply-payable-event.ts';
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create as createCedente } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

// #894: instante do evento — o guard de recência do read-model o exige. Valor fixo: estes casos
// não exercitam ordenação, e um `new Date()` por chamada tornaria o teste dependente do relógio.
const OCCURRED_AT = new Date('2026-01-01T00:00:00.000Z');

const PROGRAM = '11111111-1111-4111-8111-1111111111a1';
const PLAN = '22222222-2222-4222-8222-2222222222a2';
const COST_CENTER = '33333333-3333-4333-8333-3333333333a3';
const CATEGORY = '44444444-4444-4444-8444-4444444444a4';
const SUBCATEGORY = '55555555-5555-4555-8555-5555555555a5';
const USER = '99999999-9999-4999-8999-999999999999';

const TAXONOMY = {
  programRef: PROGRAM,
  budgetPlanRef: PLAN,
  costCenterRef: COST_CENTER,
  categoryRef: CATEGORY,
  subcategoryRef: SUBCATEGORY,
};

const fitidOf = (raw: string) => {
  const f = Fitid.fromNative(raw);
  if (!f.ok) throw new Error('setup: fitid');
  return f.value;
};

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:reconciliation-reclassify] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('M2 — reclassificação na conciliação (Drizzle + MySQL)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[financial:reconciliation-reclassify] conexão: ${r.error}`);
      handle = r.value;
    });

    beforeEach(async () => {
      // Read-model é derivado e truncável (ADR-0022) — limpa inteiro, sem seed a preservar.
      await handle.db.delete(finPayableView);
    });

    after(async () => {
      await handle?.close();
    });

    // Documento NFS-e com UMA retenção de ISS → 1 título pai (líquido) + 1 filho. É o arranjo mínimo
    // em que a cascata pai→filho é observável.
    const seedDocumentWithRetention = async (): Promise<{
      documentId: string;
      parentId: string;
      childId: string;
    }> => {
      const save = saveDocument({
        repo: createDrizzleDocumentRepository(handle),
        clock: ClockReal(),
        contractCategorizationReader: createInMemoryContractCategorizationReadStore(),
        cedenteAccountStore: createInMemoryCedenteAccountStore(),
      });
      const created = await save({
        documentNumber: `NFS-M2-${newUuid().slice(0, 8)}`,
        type: 'NFS-e',
        supplierRef: newUuid(),
        paymentMethod: 'PIX',
        grossValueCents: 100_000,
        retentions: [{ type: 'ISS', baseCents: 100_000, rateBps: 500, valueCents: 5_000 }],
        registeredTaxes: [],
        dueDate: new Date('2026-12-31T00:00:00.000Z'),
        description: null,
      });
      if (!created.ok) throw new Error(`setup: saveDocument ${created.error}`);

      const documentId = String(created.value.documentId);
      const rows = await handle.db
        .select({ id: finPayables.id, kind: finPayables.kind })
        .from(finPayables)
        .where(eq(finPayables.documentId, documentId));

      const parentId = rows.find((r) => r.kind === 'Parent')?.id;
      const childId = rows.find((r) => r.kind === 'Child')?.id;
      if (parentId === undefined || childId === undefined) throw new Error('setup: payables');

      // Título líquido conciliável: `Paid` + paid_at (CHECK fin_payables_paid_at_chk, #383).
      await handle.db
        .update(finPayables)
        .set({ status: 'Paid', paidAt: new Date('2026-07-01T00:00:00.000Z') })
        .where(eq(finPayables.id, parentId));

      return { documentId, parentId, childId };
    };

    const seedTransaction = async (cedenteId: string, valueCents: number): Promise<string> => {
      const imported = importStatement(
        {
          debitAccountRef: cedenteId,
          period: {
            start: new Date('2024-05-01T00:00:00.000Z'),
            end: new Date('2024-05-31T00:00:00.000Z'),
          },
          file: { name: 'e.ofx', format: 'OFX', hash: `h-${newUuid().slice(0, 8)}` },
          openingBalanceCents: 0,
          closingBalanceCents: valueCents,
          transactions: [
            {
              fitid: fitidOf(`f-${newUuid().slice(0, 12)}`),
              date: new Date('2024-05-18T00:00:00.000Z'),
              movement: 'Debit',
              entryType: 'TED',
              payeeName: 'FORNECEDOR X',
              memo: 'pagamento',
              valueCents,
              balanceAfterCents: 0,
            },
          ],
          occurredAt: new Date('2024-05-19T09:00:00.000Z'),
        },
        new Set(),
      );
      if (!imported.ok) throw new Error('setup: importStatement');
      const saved = await createDrizzleBankStatementRepository(handle).save(
        imported.value.statement,
      );
      if (!saved.ok) throw new Error('setup: statement save');
      const tx = imported.value.statement.transactions[0];
      if (tx === undefined) throw new Error('setup: tx');
      return String(tx.id);
    };

    const seedActiveAccount = async (): Promise<string> => {
      const id = CedenteAccountId.generate();
      const account = createCedente({
        id,
        bankCode: '237',
        agency: '1234',
        accountNumber: newUuid().slice(0, 6),
        accountDigit: '1',
        convenio: '9999999',
        document: '12345678000190',
      });
      if (!account.ok) throw new Error('setup: cedente');
      const saved = await createDrizzleCedenteAccountStore(handle).save(account.value);
      if (!saved.ok) throw new Error('setup: cedente save');
      return String(id);
    };

    const deps = (paths = [{ ...TAXONOMY, active: true }]) => ({
      reconciliationRepo: createDrizzleReconciliationRepository(handle),
      payables: createDrizzlePayableReconciliationView(handle),
      statements: createDrizzleBankStatementRepository(handle),
      cedenteStore: createDrizzleCedenteAccountStore(handle),
      periods: createDrizzleReconciliationPeriodStore(handle),
      clock: ClockReal(),
      documents: createDrizzleDocumentRepository(handle),
      payableDocs: createDrizzlePayableDocumentView(handle),
      taxonomyPaths: createInMemoryTaxonomyPathRead(paths),
    });

    it('RN-M2-03/12: os 5 refs aterrissam em fin_documents na transação da conciliação', async () => {
      const cedenteId = await seedActiveAccount();
      const { documentId, parentId } = await seedDocumentWithRetention();
      const txId = await seedTransaction(cedenteId, 95_000);

      const r = await confirmReconciliation(deps())({
        transactionId: txId,
        payableIds: [parentId],
        taxonomy: TAXONOMY,
        reconciledBy: USER,
      });
      assert.equal(r.ok, true, JSON.stringify(r));

      const [doc] = await handle.db
        .select({
          programRef: finDocuments.programRef,
          budgetPlanRef: finDocuments.budgetPlanRef,
          costCenterRef: finDocuments.costCenterRef,
          categoryRef: finDocuments.categoryRef,
          subcategoryRef: finDocuments.subcategoryRef,
        })
        .from(finDocuments)
        .where(eq(finDocuments.id, documentId));

      assert.equal(doc?.programRef, PROGRAM);
      assert.equal(doc?.budgetPlanRef, PLAN);
      assert.equal(doc?.costCenterRef, COST_CENTER);
      assert.equal(doc?.categoryRef, CATEGORY);
      // O par do #505 — se algum dia voltar a sumir, some AQUI primeiro.
      assert.equal(doc?.subcategoryRef, SUBCATEGORY);
    });

    it('RN-M2-04/05: aplicada a projeção, PAI e FILHO carregam a mesma classificação no fin_payable_view', async () => {
      const cedenteId = await seedActiveAccount();
      const { documentId, parentId, childId } = await seedDocumentWithRetention();
      const txId = await seedTransaction(cedenteId, 95_000);

      // ⚠️ O SEED já gravou um `DocumentSaved` (o `saveDocument` emite um), e ele carrega taxonomia
      // NULA. Limpar o outbox do documento AQUI deixa exatamente UM evento a projetar — o que a
      // reclassificação vai emitir — e é o que torna este caso determinístico.
      //
      // A primeira versão deste teste pegava `.find(e => e.eventType === 'DocumentSaved')` sobre uma
      // consulta SEM `ORDER BY`, com os dois eventos no banco: escolhia um arbitrário. Passou na
      // máquina local e falhou no CI, que devolveu o do seed e projetou nulos. Ordenar por
      // `enqueued_at` não resolveria de verdade — os dois INSERTs distam poucos milissegundos e a
      // coluna tem `fsp: 3`, então o empate é possível e a escolha voltaria a ser arbitrária.
      await handle.db.delete(finOutbox).where(eq(finOutbox.aggregateId, documentId));

      const r = await confirmReconciliation(deps())({
        transactionId: txId,
        payableIds: [parentId],
        taxonomy: TAXONOMY,
        reconciledBy: USER,
      });
      assert.equal(r.ok, true, JSON.stringify(r));

      // O worker de projeção roda fora do processo (ADR-0022 — consistência eventual). Aqui aplicamos
      // o MESMO use case que ele aplica, sobre o evento que a conciliação gravou no outbox.
      //
      // `select` explícito, e não `db.query.…().catch(() => [])`: o `catch` que existia aqui
      // transformava falha de consulta em lista vazia, e uma falha de infraestrutura teria virado
      // "evento não encontrado" — diagnóstico que aponta para o lugar errado.
      const saved = await handle.db
        .select({ eventType: finOutbox.eventType, payload: finOutbox.payload })
        .from(finOutbox)
        .where(
          and(eq(finOutbox.aggregateId, documentId), eq(finOutbox.eventType, 'DocumentSaved')),
        );

      assert.equal(saved.length, 1, 'a conciliação grava UM DocumentSaved (o do seed foi limpo)');
      const documentSaved = saved[0];
      assert.ok(documentSaved !== undefined);

      const applied = await applyPayableEvent({
        store: createDrizzlePayableViewStore(handle, ClockReal()),
      })({ eventType: 'DocumentSaved', occurredAt: OCCURRED_AT, payload: documentSaved.payload });
      assert.equal(applied.ok, true, JSON.stringify(applied));

      const rows = await handle.db
        .select({
          payableId: finPayableView.payableId,
          kind: finPayableView.kind,
          programRef: finPayableView.programRef,
          budgetPlanRef: finPayableView.budgetPlanRef,
          costCenterRef: finPayableView.costCenterRef,
          categoryRef: finPayableView.categoryRef,
          subcategoryRef: finPayableView.subcategoryRef,
        })
        .from(finPayableView)
        .where(eq(finPayableView.documentId, documentId));

      assert.equal(rows.length, 2, 'pai + filho de retenção');
      const parent = rows.find((x) => x.payableId === parentId);
      const child = rows.find((x) => x.payableId === childId);
      assert.ok(parent !== undefined && child !== undefined);

      // A razão de a cascata ser FÍSICA: os relatórios somam POR TÍTULO, cada um sob a SUA categoria.
      // Sem esta linha do filho carregando a classificação do pai, o imposto não cai sob o projeto do
      // gasto original — que é a decisão A da P.O.
      for (const row of [parent, child]) {
        assert.equal(row?.programRef, PROGRAM);
        assert.equal(row?.budgetPlanRef, PLAN);
        assert.equal(row?.costCenterRef, COST_CENTER);
        assert.equal(row?.categoryRef, CATEGORY);
        assert.equal(row?.subcategoryRef, SUBCATEGORY);
      }
      assert.equal(child?.kind, 'Child');
    });

    it('RN-M2-07: a trilha grava o de→para no documento e em cada título', async () => {
      const cedenteId = await seedActiveAccount();
      const { documentId, parentId, childId } = await seedDocumentWithRetention();
      const txId = await seedTransaction(cedenteId, 95_000);

      const r = await confirmReconciliation(deps())({
        transactionId: txId,
        payableIds: [parentId],
        taxonomy: TAXONOMY,
        reconciledBy: USER,
      });
      // Sem esta linha um `err` passaria: a trilha da reclassificação estaria vazia com razão, e o
      // teste leria isso como "não gravou" em vez de "não conciliou".
      assert.equal(r.ok, true, JSON.stringify(r));

      // ⚠️ NÃO contar entries do documento: o `saveDocument` do seed já grava 3 sozinho (1 do
      // documento + 1 por título), então `length >= 3` fica verde mesmo com o bloco de trilha do
      // adapter apagado — o teste não distinguiria código certo de errado.
      //
      // O discriminador é o CONTEÚDO: só a reclassificação escreve uma mudança de `programRef` cujo
      // `after` é o programa novo (o documento do seed nasce com os 5 refs nulos). Casar por ele
      // isola exatamente as entries desta operação.
      const changed = await handle.db
        .select({
          targetKind: finDocumentTimeline.targetKind,
          targetId: finDocumentTimeline.targetId,
          field: finTimelineFieldChanges.field,
          beforeValue: finTimelineFieldChanges.beforeValue,
          afterValue: finTimelineFieldChanges.afterValue,
        })
        .from(finDocumentTimeline)
        .innerJoin(
          finTimelineFieldChanges,
          eq(finTimelineFieldChanges.timelineEntryId, finDocumentTimeline.id),
        )
        .where(
          and(
            eq(finDocumentTimeline.documentId, documentId),
            eq(finTimelineFieldChanges.field, 'programRef'),
            eq(finTimelineFieldChanges.afterValue, PROGRAM),
          ),
        );

      // 1 do documento + 1 do pai + 1 do filho. O filho é o que importa auditar: a pergunta real é
      // "por que ESTE imposto está sob ESTE projeto?", e ela se responde na trilha do título de
      // retenção — que ninguém selecionou, e que mudou por cascata.
      const targets = changed.map((c) => `${c.targetKind}:${c.targetId}`).sort();
      assert.deepEqual(
        targets,
        [`Document:${documentId}`, `Payable:${parentId}`, `Payable:${childId}`].sort(),
      );

      // O de→para tem de carregar o ANTES, senão a trilha responde "está sob este projeto" sem
      // responder "e antes estava sob qual".
      for (const change of changed) assert.equal(change.beforeValue, null);
    });

    it('RN-M2-06: caminho inválido NÃO concilia e NÃO reclassifica — nada é gravado pela metade', async () => {
      const cedenteId = await seedActiveAccount();
      const { documentId, parentId } = await seedDocumentWithRetention();
      const txId = await seedTransaction(cedenteId, 95_000);

      const r = await confirmReconciliation(deps([{ ...TAXONOMY, active: false }]))({
        transactionId: txId,
        payableIds: [parentId],
        taxonomy: TAXONOMY,
        reconciledBy: USER,
      });

      assert.equal(r.ok, false);
      if (r.ok) return;
      assert.equal(r.error, 'taxonomy-path-invalid');

      // Documento intocado.
      const [doc] = await handle.db
        .select({ categoryRef: finDocuments.categoryRef })
        .from(finDocuments)
        .where(eq(finDocuments.id, documentId));
      assert.equal(doc?.categoryRef, null);

      // Título ainda `Paid` (não virou `Reconciled`) — a conciliação também não aconteceu.
      const [pay] = await handle.db
        .select({ status: finPayables.status })
        .from(finPayables)
        .where(eq(finPayables.id, parentId));
      assert.equal(pay?.status, 'Paid');
    });

    // #893 — o optimistic lock. Testado no REPOSITÓRIO, e não pelo use case, porque o use case lê a
    // versão e escreve na mesma chamada: por fora não há janela onde enfiar o editor concorrente. O
    // que se prova aqui é o contrato do adapter — versão velha na mão, escrita recusada.
    it('#893: reclassificar com versão VELHA é recusado, e nada é gravado', async () => {
      const cedenteId = await seedActiveAccount();
      const { documentId, parentId } = await seedDocumentWithRetention();
      const txId = await seedTransaction(cedenteId, 95_000);

      const [beforeRow] = await handle.db
        .select({ version: finDocuments.version })
        .from(finDocuments)
        .where(eq(finDocuments.id, documentId));
      const current = beforeRow?.version;
      assert.equal(typeof current, 'number');
      if (typeof current !== 'number') return;

      // Simula o editor concorrente pelo único ponto onde ele é observável: a versão que o use case
      // LEU já não é a vigente quando ele vai escrever. Envelopar a leitura é mais honesto que
      // chamar o repositório na mão — assim o teste exercita o caminho inteiro, do use case ao SQL.
      const base = deps();
      const staleRead = {
        ...base,
        documents: {
          findById: async (id: Parameters<typeof base.documents.findById>[0]) => {
            const r = await base.documents.findById(id);
            return r.ok ? { ...r, value: { ...r.value, version: r.value.version - 1 } } : r;
          },
        },
      };

      const stale = await confirmReconciliation(staleRead)({
        transactionId: txId,
        payableIds: [parentId],
        taxonomy: TAXONOMY,
        reconciledBy: USER,
      });

      assert.equal(stale.ok, false, 'versão velha tem de ser RECUSADA');
      if (stale.ok) return;
      // 409, não 500: o pedido não está malformado — está velho, e refazê-lo sobre o estado atual
      // volta a valer.
      assert.equal(stale.error, 'document-version-conflict');

      // E o resto da unit-of-work reverteu junto: sem isto, a recusa teria deixado a conciliação
      // gravada e só a taxonomia de fora — exatamente o "pela metade" que a RN-M2-06 proíbe.
      const [doc] = await handle.db
        .select({ categoryRef: finDocuments.categoryRef, version: finDocuments.version })
        .from(finDocuments)
        .where(eq(finDocuments.id, documentId));
      assert.equal(doc?.categoryRef, null);
      assert.equal(doc?.version, current, 'versão não pode ter avançado numa escrita recusada');

      const [pay] = await handle.db
        .select({ status: finPayables.status })
        .from(finPayables)
        .where(eq(finPayables.id, parentId));
      assert.equal(pay?.status, 'Paid');
    });

    // #894 — o guard de recência do read-model. É o cenário que o vermelho do CI destapou: existem
    // DOIS `DocumentSaved` do mesmo documento com taxonomias diferentes, e a entrega é at-least-once.
    it('#894: reentregar o DocumentSaved ANTIGO não apaga a reclassificação no read-model', async () => {
      const cedenteId = await seedActiveAccount();
      const { documentId, parentId, childId } = await seedDocumentWithRetention();
      const txId = await seedTransaction(cedenteId, 95_000);

      // O evento do seed (taxonomia NULA) — guardado ANTES de conciliar, que é o que o outbox teria
      // devolvido à fila num `markFailed`.
      const [older] = await handle.db
        .select({ payload: finOutbox.payload, occurredAt: finOutbox.occurredAt })
        .from(finOutbox)
        .where(
          and(eq(finOutbox.aggregateId, documentId), eq(finOutbox.eventType, 'DocumentSaved')),
        );
      assert.ok(older !== undefined, 'o seed grava um DocumentSaved');

      await handle.db.delete(finOutbox).where(eq(finOutbox.aggregateId, documentId));

      const r = await confirmReconciliation(deps())({
        transactionId: txId,
        payableIds: [parentId],
        taxonomy: TAXONOMY,
        reconciledBy: USER,
      });
      assert.equal(r.ok, true, JSON.stringify(r));

      const [newer] = await handle.db
        .select({ payload: finOutbox.payload, occurredAt: finOutbox.occurredAt })
        .from(finOutbox)
        .where(
          and(eq(finOutbox.aggregateId, documentId), eq(finOutbox.eventType, 'DocumentSaved')),
        );
      assert.ok(newer !== undefined);

      const store = createDrizzlePayableViewStore(handle, ClockReal());
      // 1. a projeção aplica o evento da reclassificação (o mundo em ordem).
      const first = await applyPayableEvent({ store })({
        eventType: 'DocumentSaved',
        payload: newer.payload,
        occurredAt: newer.occurredAt,
      });
      assert.equal(first.ok, true, JSON.stringify(first));

      // 2. e então o worker reentrega o ANTIGO. Sem o guard, este passo apagaria os 5 refs — sem
      // erro, sem log, e só o relatório mostraria depois.
      const replay = await applyPayableEvent({ store })({
        eventType: 'DocumentSaved',
        payload: older.payload,
        occurredAt: older.occurredAt,
      });
      assert.equal(replay.ok, true, 'a reentrega não é erro — ela apenas não pode retroceder');

      const rows = await handle.db
        .select({
          payableId: finPayableView.payableId,
          programRef: finPayableView.programRef,
          subcategoryRef: finPayableView.subcategoryRef,
        })
        .from(finPayableView)
        .where(eq(finPayableView.documentId, documentId));

      assert.equal(rows.length, 2, 'pai + filho');
      for (const row of rows) {
        assert.equal(row.programRef, PROGRAM, `linha ${row.payableId} regrediu`);
        assert.equal(row.subcategoryRef, SUBCATEGORY, `linha ${row.payableId} regrediu`);
      }
      assert.ok(rows.some((x) => x.payableId === childId));
    });
  });
}
