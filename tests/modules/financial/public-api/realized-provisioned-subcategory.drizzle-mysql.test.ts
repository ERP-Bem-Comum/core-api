/**
 * FIN-REALIZED-SUBCATEGORY-GRAIN (S5 do épico Taxonomia Planejável Unificada · #502) — W0 RED.
 *
 * Estende o reader `openRealizedProvisionedReader` (public-api do financial) em DOIS eixos:
 *
 *   Parte A — grão SUBCATEGORIA (documentos)
 *     `RealizedProvisionedRow` ganha `subcategoryRef: string | null`; realizado e provisionado dos
 *     DOCUMENTOS agrupam por `(budgetPlanRef, categoryRef, subcategoryRef, mês)`. Dois documentos na
 *     MESMA categoria mas subcategorias diferentes viram DUAS linhas (hoje colapsariam numa só).
 *
 *   Parte B — realizado dos TÍTULOS MANUAIS (regra da P.O., 2026-07-21)
 *     Terceira fonte, somada SÓ ao realizado (nunca ao provisionado — o manual já está conciliado):
 *       `fin_manual_entries → fin_reconciliations (status='Active')`,
 *       groupBy `(budget_plan_ref, subcategory_ref, mês = date_format(reconciled_at,'%Y-%m'))`,
 *       `SUM(value_cents)`.
 *     Regra de INCLUSÃO: soma SE, E SÓ SE, `budget_plan_ref IS NOT NULL`
 *       E `type NOT IN ('Transfer','Investment','Redemption')`.
 *     O manual NÃO tem `category_ref` → entra na costura com `categoryRef = null` (linha própria,
 *     distinta da linha do documento; o consumidor da S6 agrega por subcategoria).
 *
 * ── ESTRATÉGIA DE RED (duas partes, por decisão do ticket + #500) ─────────────────────────────────
 *   1) PURO / TIPO (roda em `pnpm test` e é checado por `pnpm run typecheck`):
 *      - Superfície runtime que JÁ passa hoje (regression guard: a função existe; conn malformada
 *        → Result err kebab). NÃO é o RED — é a rede de proteção.
 *      - Witnesses de TIPO do campo novo `subcategoryRef`. Sob `--experimental-strip-types` os tipos
 *        são apagados → NÃO falham em runtime, mas `pnpm run typecheck` fica VERMELHO até o W1
 *        adicionar `subcategoryRef` a `RealizedProvisionedRow`. Esse é o RED puro DEMONSTRÁVEL do
 *        campo/tipo.
 *   2) INTEGRAÇÃO (opt-in MYSQL_INTEGRATION=1) — CA1..CA7 + o exemplo-âncora da nota 10 contra MySQL
 *      real. RED-LÓGICO: semeia `fin_manual_entries`+`fin_reconciliations`+`fin_documents`+
 *      `fin_payables` e roda a query real; hoje o reader nem lê o manual nem desce ao grão de
 *      subcategoria → as asserções falhariam. NÃO é executado nesta janela (#500 destrói o dev);
 *      registrado no grupo `financial` do runner para o ritual manual.
 *
 * Não toca o arquivo `realized-provisioned.drizzle-mysql.test.ts` (fatia 2) — regressão zero.
 * ASCII puro nos identificadores. Código EN, comentários PT-BR.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import {
  openRealizedProvisionedReader,
  type RealizedProvisionedReader,
  type RealizedProvisionedRow,
} from '#src/modules/financial/public-api/realized-provisioned-projection.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import {
  finDocuments,
  finPayables,
  finReconciliations,
  finReconciliationItems,
  finManualEntries,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import { newUuid } from '#src/shared/utils/id.ts';

// ── Assinatura pinada pelo W0 (o W1 implementa EXATAMENTE isto) ──────────────────────────────────
//   RealizedProvisionedRow = Readonly<{
//     budgetPlanRef: string;
//     categoryRef: string | null;       // documento pode não ter categoria; manual entra sempre null
//     subcategoryRef: string | null;    // <- NOVO (S5): folha da árvore do plano
//     month: string;                    // 'YYYY-MM'
//     realizedCents: number;
//     provisionedCents: number;
//   }>
//   openRealizedProvisionedReader({ connectionString }):
//     Promise<Result<RealizedProvisionedReader, string>>
//   RealizedProvisionedReader = {
//     list(filter: { budgetPlanRef?: string; year?: number }):
//       Promise<Result<readonly RealizedProvisionedRow[], string>>;
//     close(): Promise<void>;
//   }

const connectionString =
  process.env['FINANCIAL_DATABASE_URL'] ??
  process.env['CONTRACTS_DATABASE_URL'] ??
  'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

const MALFORMED_CONN = 'not-a-mysql-url';

// UUID v4 válidos (versão=4, variante=8/9/a/b, só hex 0-9a-f). CUIDADO: nada de dígito não-hex
// (a S1 teve um typo `u`; não repetir). Conferidos char a char.
const P1 = '10000000-0000-4000-8000-000000000001';
const P2 = '20000000-0000-4000-8000-000000000002';
const CAT_A = 'aaaa0000-0000-4000-8000-00000000000a';
const SUB_A1 = '11110000-0000-4000-8000-0000000000a1';
const SUB_A2 = '22220000-0000-4000-8000-0000000000a2';
const SUB_B1 = '33330000-0000-4000-8000-0000000000b1';
const RECONCILED_BY = '99999999-9999-4999-8999-999999999999';

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// RED de TIPO (checado por `pnpm run typecheck`) — o campo novo `subcategoryRef`.
// Sob strip-types NÃO falha em runtime (tipos apagados), portanto `pnpm test` NÃO cai; mas o
// `typecheck` fica VERMELHO até o W1 acrescentar `subcategoryRef` a `RealizedProvisionedRow`.
// Esse é o RED puro demonstrável do campo. Removê-los é do W1 só quando o tipo existir.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Witness 1: literal com o campo novo → TS2353 (excess property) enquanto o tipo não o declara.
const _rowWitness = {
  budgetPlanRef: P1,
  categoryRef: null,
  subcategoryRef: null,
  month: '2026-01',
  realizedCents: 0,
  provisionedCents: 0,
} satisfies RealizedProvisionedRow;
void _rowWitness;

// Witness 2: leitura tipada do campo novo → TS2339 (property does not exist) enquanto não existir.
const _readSubcategory = (row: RealizedProvisionedRow): string | null => row.subcategoryRef;
void _readSubcategory;

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 1) SUPERFÍCIE (roda SEMPRE no `pnpm test` puro) — regression guard, NÃO é o RED.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
describe('FIN-REALIZED-SUBCATEGORY-GRAIN — superfície do reader (estrutural)', () => {
  it('exporta openRealizedProvisionedReader como função', () => {
    assert.equal(typeof openRealizedProvisionedReader, 'function');
  });

  it('conn malformada → Result err com slug kebab EN, nunca throw', async () => {
    const r = await openRealizedProvisionedReader({ connectionString: MALFORMED_CONN });
    assert.equal(r.ok, false, 'string malformada deve reprovar');
    if (r.ok) return;
    assert.match(
      r.error,
      /^[a-z][a-z0-9-]*$/,
      'erro deve ser slug kebab EN (sem espaço, sem caps)',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 2) INTEGRAÇÃO (opt-in MYSQL_INTEGRATION=1) — grão subcategoria + soma do manual + a nota 10.
//    RED-LÓGICO, NÃO executado nesta janela (#500). Registrado no grupo `financial` do runner.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:realized-provisioned-subcategory] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  describe('openRealizedProvisionedReader — grão subcategoria + títulos manuais (FIN-REALIZED-SUBCATEGORY-GRAIN)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok)
        throw new Error(`[financial:realized-provisioned-subcategory] conexão: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    beforeEach(async () => {
      // Agregação de estado absoluto → dona das próprias precondições (ordem FK-safe:
      // itens/manual entries antes das reconciliações; payables antes de documents).
      await handle.db.delete(finReconciliationItems);
      await handle.db.delete(finManualEntries);
      await handle.db.delete(finReconciliations);
      await handle.db.delete(finPayables);
      await handle.db.delete(finDocuments);
    });

    // Semeia um título CONCILIADO (realizado via documento): documento (plano+categoria+SUBCATEGORIA)
    // + payable + reconciliação (status/reconciled_at) + item (reconciled_value_cents). O mês do
    // realizado vem de reconciled_at.
    const seedReconciled = async (over: {
      planRef: string;
      categoryRef: string | null;
      subcategoryRef: string | null;
      payableValueCents: number;
      reconciledValueCents: number;
      reconStatus: 'Active' | 'Undone';
      reconciledAt: Date;
      dueDate: Date;
      payableStatus: 'Paid' | 'PartiallyReconciled' | 'Reconciled';
    }): Promise<void> => {
      const documentId = newUuid();
      const payableId = newUuid();
      const reconciliationId = newUuid();

      await handle.db.insert(finDocuments).values({
        id: documentId,
        status: 'Open',
        budgetPlanRef: over.planRef,
        categoryRef: over.categoryRef,
        subcategoryRef: over.subcategoryRef,
        createdAt: over.reconciledAt,
      });
      await handle.db.insert(finPayables).values({
        id: payableId,
        documentId,
        kind: 'Parent',
        status: over.payableStatus,
        value: over.payableValueCents,
        dueDate: over.dueDate,
        paymentMethod: 'PIX',
        paidAt: over.dueDate,
        createdAt: over.reconciledAt,
      });
      await handle.db.insert(finReconciliations).values({
        id: reconciliationId,
        transactionId: newUuid(),
        type: 'Individual',
        status: over.reconStatus,
        reconciledAt: over.reconciledAt,
        reconciledBy: RECONCILED_BY,
      });
      await handle.db.insert(finReconciliationItems).values({
        reconciliationId,
        payableId,
        reconciledValueCents: over.reconciledValueCents,
      });
    };

    // Semeia um título PROVISIONADO (documento): payable Approved SEM conciliação. Mês vem de due_date.
    const seedApproved = async (over: {
      planRef: string;
      categoryRef: string | null;
      subcategoryRef: string | null;
      valueCents: number;
      dueDate: Date;
    }): Promise<void> => {
      const documentId = newUuid();
      const payableId = newUuid();

      await handle.db.insert(finDocuments).values({
        id: documentId,
        status: 'Open',
        budgetPlanRef: over.planRef,
        categoryRef: over.categoryRef,
        subcategoryRef: over.subcategoryRef,
        createdAt: over.dueDate,
      });
      await handle.db.insert(finPayables).values({
        id: payableId,
        documentId,
        kind: 'Parent',
        status: 'Approved',
        value: over.valueCents,
        dueDate: over.dueDate,
        paymentMethod: 'PIX',
        paidAt: null,
        createdAt: over.dueDate,
      });
    };

    // Semeia um TÍTULO MANUAL: reconciliação (status/reconciled_at) + fin_manual_entries
    // (type, value, budget_plan_ref, subcategory_ref). SEM documento e SEM payable — é conciliação
    // avulsa. O mês do realizado do manual vem de reconciled_at. `categoryRef` do manual é sempre
    // null por design (o manual não tem category_ref).
    const seedManualEntry = async (over: {
      planRef: string | null;
      subcategoryRef: string | null;
      type: 'Payment' | 'Receipt' | 'Transfer' | 'FeePenaltyInterest' | 'Investment' | 'Redemption';
      valueCents: number;
      reconStatus: 'Active' | 'Undone';
      reconciledAt: Date;
    }): Promise<void> => {
      const reconciliationId = newUuid();
      await handle.db.insert(finReconciliations).values({
        id: reconciliationId,
        transactionId: newUuid(),
        type: 'ManualEntry',
        status: over.reconStatus,
        reconciledAt: over.reconciledAt,
        reconciledBy: RECONCILED_BY,
      });
      await handle.db.insert(finManualEntries).values({
        id: newUuid(),
        reconciliationId,
        type: over.type,
        valueCents: over.valueCents,
        budgetPlanRef: over.planRef,
        subcategoryRef: over.subcategoryRef,
        categoryRef: null,
      });
    };

    const listAll = async (
      filter: Readonly<{ budgetPlanRef?: string; year?: number }>,
    ): Promise<readonly RealizedProvisionedRow[]> => {
      const readerR = await openRealizedProvisionedReader({ connectionString });
      assert.equal(readerR.ok, true, JSON.stringify(readerR));
      if (!readerR.ok) throw new Error('reader não abriu');
      const reader: RealizedProvisionedReader = readerR.value;
      const r = await reader.list(filter);
      await reader.close();
      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) throw new Error('list falhou');
      return r.value;
    };

    // Match exato no grão pleno (plano, categoria, subcategoria, mês).
    const find = (
      rows: readonly RealizedProvisionedRow[],
      plan: string,
      cat: string | null,
      sub: string | null,
      month: string,
    ): RealizedProvisionedRow | undefined =>
      rows.find(
        (row) =>
          row.budgetPlanRef === plan &&
          row.categoryRef === cat &&
          row.subcategoryRef === sub &&
          row.month === month,
      );

    // Soma o realizado de TODAS as linhas de uma (plano, subcategoria, mês) — cruza categorias.
    // É como o consumidor da S6 lê a subcategoria: a linha do documento (categoryRef=CAT) e a do
    // manual (categoryRef=null) somam-se no mesmo nó de subcategoria.
    const realizedOfSubcategory = (
      rows: readonly RealizedProvisionedRow[],
      plan: string,
      sub: string | null,
      month: string,
    ): number =>
      rows
        .filter(
          (row) => row.budgetPlanRef === plan && row.subcategoryRef === sub && row.month === month,
        )
        .reduce((s, row) => s + row.realizedCents, 0);

    // ── Parte A — grão subcategoria (documentos) ────────────────────────────────────────────────

    it('CA1: dois documentos na MESMA categoria mas subcategorias distintas → DUAS linhas (não colapsam)', async () => {
      // P1/CAT_A, conciliados em 2026-03: um em SUB_A1 (R$100), outro em SUB_A2 (R$70).
      await seedReconciled({
        planRef: P1,
        categoryRef: CAT_A,
        subcategoryRef: SUB_A1,
        payableValueCents: 10000,
        reconciledValueCents: 10000,
        reconStatus: 'Active',
        reconciledAt: new Date('2026-03-10T12:00:00.000Z'),
        dueDate: new Date('2026-03-01T00:00:00.000Z'),
        payableStatus: 'Reconciled',
      });
      await seedReconciled({
        planRef: P1,
        categoryRef: CAT_A,
        subcategoryRef: SUB_A2,
        payableValueCents: 7000,
        reconciledValueCents: 7000,
        reconStatus: 'Active',
        reconciledAt: new Date('2026-03-12T12:00:00.000Z'),
        dueDate: new Date('2026-03-01T00:00:00.000Z'),
        payableStatus: 'Reconciled',
      });

      const rows = await listAll({});
      const rowA1 = find(rows, P1, CAT_A, SUB_A1, '2026-03');
      const rowA2 = find(rows, P1, CAT_A, SUB_A2, '2026-03');
      assert.ok(rowA1, 'esperava row (P1, CAT_A, SUB_A1, 2026-03)');
      assert.ok(
        rowA2,
        'esperava row (P1, CAT_A, SUB_A2, 2026-03) — subcategoria distinta NÃO colapsa',
      );
      assert.equal(rowA1.realizedCents, 10000, 'SUB_A1 realizado');
      assert.equal(rowA2.realizedCents, 7000, 'SUB_A2 realizado');
    });

    it('CA1: o provisionado também desce ao grão de subcategoria', async () => {
      // Dois Approved P1/CAT_A vencendo em 2026-05, subcategorias distintas (R$150 / R$250).
      await seedApproved({
        planRef: P1,
        categoryRef: CAT_A,
        subcategoryRef: SUB_A1,
        valueCents: 15000,
        dueDate: new Date('2026-05-10T00:00:00.000Z'),
      });
      await seedApproved({
        planRef: P1,
        categoryRef: CAT_A,
        subcategoryRef: SUB_A2,
        valueCents: 25000,
        dueDate: new Date('2026-05-20T00:00:00.000Z'),
      });

      const rows = await listAll({});
      const rowA1 = find(rows, P1, CAT_A, SUB_A1, '2026-05');
      const rowA2 = find(rows, P1, CAT_A, SUB_A2, '2026-05');
      assert.ok(rowA1, 'esperava provisionado (P1, CAT_A, SUB_A1, 2026-05)');
      assert.ok(rowA2, 'esperava provisionado (P1, CAT_A, SUB_A2, 2026-05)');
      assert.equal(rowA1.provisionedCents, 15000);
      assert.equal(rowA2.provisionedCents, 25000);
    });

    it('CA7: documento com subcategory_ref NULO continua aparecendo (grão desce, não some)', async () => {
      await seedReconciled({
        planRef: P1,
        categoryRef: CAT_A,
        subcategoryRef: null, // sem subcategoria carimbada — legado / draft
        payableValueCents: 3000,
        reconciledValueCents: 3000,
        reconStatus: 'Active',
        reconciledAt: new Date('2026-04-10T12:00:00.000Z'),
        dueDate: new Date('2026-04-01T00:00:00.000Z'),
        payableStatus: 'Reconciled',
      });

      const rows = await listAll({});
      const row = find(rows, P1, CAT_A, null, '2026-04');
      assert.ok(row, 'documento sem subcategoria deve continuar visível (subcategoryRef=null)');
      assert.equal(
        row.realizedCents,
        3000,
        'realizado preservado no grão categoria/subcategoria=null',
      );
    });

    // ── Parte B — realizado dos títulos manuais (regra da P.O.) ─────────────────────────────────

    it('CA2: título manual Payment/Receipt/FeePenaltyInterest COM plano soma no realizado (grão (plano, subcategoria, mês=reconciled_at)); categoryRef=null', async () => {
      // Três manuais Active em 2026-06, mesmo plano/subcategoria, tipos orçamentários (R$5 + R$8 + R$2).
      await seedManualEntry({
        planRef: P1,
        subcategoryRef: SUB_A1,
        type: 'FeePenaltyInterest',
        valueCents: 500,
        reconStatus: 'Active',
        reconciledAt: new Date('2026-06-05T12:00:00.000Z'),
      });
      await seedManualEntry({
        planRef: P1,
        subcategoryRef: SUB_A1,
        type: 'Payment',
        valueCents: 800,
        reconStatus: 'Active',
        reconciledAt: new Date('2026-06-08T12:00:00.000Z'),
      });
      await seedManualEntry({
        planRef: P1,
        subcategoryRef: SUB_A1,
        type: 'Receipt',
        valueCents: 200,
        reconStatus: 'Active',
        reconciledAt: new Date('2026-06-10T12:00:00.000Z'),
      });

      const rows = await listAll({});
      // O manual entra com categoryRef=null (não tem categoria) → linha própria.
      const row = find(rows, P1, null, SUB_A1, '2026-06');
      assert.ok(row, 'esperava linha do manual (P1, categoryRef=null, SUB_A1, 2026-06)');
      assert.equal(row.realizedCents, 1500, '500 + 800 + 200 (Fee + Payment + Receipt)');
      assert.equal(row.provisionedCents, 0, 'manual nunca provisiona (CA5)');
    });

    it('CA3: manual Transfer/Investment/Redemption COM plano NÃO soma (excluído por tipo)', async () => {
      await seedManualEntry({
        planRef: P1,
        subcategoryRef: SUB_A1,
        type: 'Transfer',
        valueCents: 100000,
        reconStatus: 'Active',
        reconciledAt: new Date('2026-07-05T12:00:00.000Z'),
      });
      await seedManualEntry({
        planRef: P1,
        subcategoryRef: SUB_A1,
        type: 'Investment',
        valueCents: 200000,
        reconStatus: 'Active',
        reconciledAt: new Date('2026-07-06T12:00:00.000Z'),
      });
      await seedManualEntry({
        planRef: P1,
        subcategoryRef: SUB_A1,
        type: 'Redemption',
        valueCents: 300000,
        reconStatus: 'Active',
        reconciledAt: new Date('2026-07-07T12:00:00.000Z'),
      });

      const rows = await listAll({});
      const row = find(rows, P1, null, SUB_A1, '2026-07');
      assert.equal(
        row?.realizedCents ?? 0,
        0,
        'tesouraria (Transfer/Investment/Redemption) nunca é título → fora do realizado',
      );
    });

    it('CA4: manual SEM budget_plan_ref (ex.: tarifa) NÃO soma', async () => {
      await seedManualEntry({
        planRef: null, // sem plano orçamentário — tarifa bancária
        subcategoryRef: SUB_A1,
        type: 'FeePenaltyInterest',
        valueCents: 990,
        reconStatus: 'Active',
        reconciledAt: new Date('2026-08-05T12:00:00.000Z'),
      });

      const rows = await listAll({});
      const total = rows.reduce((s, row) => s + row.realizedCents, 0);
      assert.equal(
        total,
        0,
        'manual sem budget_plan_ref fica fora do realizado (aparece em OUTROS relatórios)',
      );
    });

    it('CA5: manual NUNCA entra no provisionado (já está conciliado)', async () => {
      await seedManualEntry({
        planRef: P2,
        subcategoryRef: SUB_B1,
        type: 'Payment',
        valueCents: 4200,
        reconStatus: 'Active',
        reconciledAt: new Date('2026-09-05T12:00:00.000Z'),
      });

      const rows = await listAll({});
      const totalProvisioned = rows.reduce((s, row) => s + row.provisionedCents, 0);
      assert.equal(totalProvisioned, 0, 'nenhuma parcela do manual pode aparecer no provisionado');
      const row = find(rows, P2, null, SUB_B1, '2026-09');
      assert.equal(row?.realizedCents ?? 0, 4200, 'mas soma no realizado');
    });

    it('CA6: manual com reconciliação Undone NÃO conta', async () => {
      await seedManualEntry({
        planRef: P1,
        subcategoryRef: SUB_A1,
        type: 'Payment',
        valueCents: 5000,
        reconStatus: 'Undone', // desfeita → fora do realizado
        reconciledAt: new Date('2026-10-05T12:00:00.000Z'),
      });

      const rows = await listAll({});
      const row = find(rows, P1, null, SUB_A1, '2026-10');
      assert.equal(row?.realizedCents ?? 0, 0, 'Undone não conta (só reconciliação Active)');
    });

    // ── Exemplo-âncora da P.O. (nota 10 líquida R$50 paga atrasada; saída R$55) ──────────────────

    it('ANCORA (nota 10): documento R$50 conciliado + título manual R$5 de juros no MESMO plano/subcategoria → realizado da subcategoria/mês = R$55', async () => {
      // Documento (título gerador) R$50, conciliado em 2026-11, P1/CAT_A/SUB_A1.
      await seedReconciled({
        planRef: P1,
        categoryRef: CAT_A,
        subcategoryRef: SUB_A1,
        payableValueCents: 5000,
        reconciledValueCents: 5000,
        reconStatus: 'Active',
        reconciledAt: new Date('2026-11-10T12:00:00.000Z'),
        dueDate: new Date('2026-11-01T00:00:00.000Z'),
        payableStatus: 'Reconciled',
      });
      // Título manual R$5 de juros (FeePenaltyInterest com plano), MESMO plano/subcategoria, mesmo mês.
      await seedManualEntry({
        planRef: P1,
        subcategoryRef: SUB_A1,
        type: 'FeePenaltyInterest',
        valueCents: 500,
        reconStatus: 'Active',
        reconciledAt: new Date('2026-11-15T12:00:00.000Z'),
      });

      const rows = await listAll({});

      // O documento entra com categoryRef=CAT_A; o manual com categoryRef=null → DUAS linhas.
      const rowDoc = find(rows, P1, CAT_A, SUB_A1, '2026-11');
      const rowManual = find(rows, P1, null, SUB_A1, '2026-11');
      assert.ok(rowDoc, 'linha do documento (categoryRef=CAT_A)');
      assert.ok(rowManual, 'linha do manual (categoryRef=null)');
      assert.equal(rowDoc.realizedCents, 5000, 'documento = R$50');
      assert.equal(rowManual.realizedCents, 500, 'manual = R$5');

      // O realizado DAQUELA SUBCATEGORIA/mês (como a S6 lê o nó) = soma das duas linhas = R$55.
      assert.equal(
        realizedOfSubcategory(rows, P1, SUB_A1, '2026-11'),
        5500,
        '50 do documento + 5 do manual = R$55 (exemplo da P.O.)',
      );
    });
  });
}
