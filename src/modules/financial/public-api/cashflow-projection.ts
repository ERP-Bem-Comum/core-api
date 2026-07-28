/**
 * Reader boot-scoped do "Fluxo de Caixa" (REP · #590 — Slice A) — public-api do financial.
 *
 * Agrega `fin_payable_view` (#235) na grão Categoria × Subcategoria em 2 baldes (decisão da P.O.,
 * #590), derivados direto do status REDUZIDO do payable-view (sem join no `fin_documents` para os
 * baldes — a redução 8→4 já implementa a intenção):
 *  - EXPECTED (Previsto)  = Σ(value_cents) WHERE status IN ('Open','Approved')
 *  - REALIZED (Realizado) = Σ(value_cents) WHERE status = 'Paid'
 * `Cancelled` é sempre excluído (WHERE `status != 'Cancelled'`); como os CASE só somam
 * Open/Approved/Paid, ele naturalmente não conta — o `ne` fica por clareza/consistência com os REPs.
 *
 * Agrupamento por `category_ref` × `subcategory_ref` (subcategoria = folha auto-referente da
 * taxonomia — SELF-JOIN `fin_categories AS fin_subcategories`, molde do Relatório Geral #442).
 * Categoria via LEFT JOIN `fin_categories` por `category_ref`. SEM eixo de Centro de Custo (CA6):
 * CC não entra no GROUP BY nem no shape — mas o `costCenterRef` do filtro RESTRINGE a população.
 *
 * **Boot-scoped:** pool aberto uma vez, fechado no `close()` (incidente RDS 0001).
 *
 * Filtros (todos opcionais, AND, ausente = sem restrição), no molde do #588/#442:
 *  - refs em `fin_payable_view` (program/budget-plan/debit-account/cost-center/category/subcategory/
 *    supplier) + janela half-open [dueFrom, dueTo) sobre `due_date`;
 *  - `status` (1 dos 6 granulares) filtra o status VIVO em `fin_documents` via LEFT JOIN — o status
 *    do payable-view é reduzido a 4 e não distingue Transmitted/PartiallyReconciled/Reconciled.
 *    Restringe a POPULAÇÃO antes dos CASE. Validação dos 6 valores é feita na borda HTTP.
 *
 * ADR-0020 §"Features permitidas": GROUP BY/agregação, LEFT JOIN, CASE.
 */
import { and, eq, gte, lt, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { openMysqlFinancial } from '../adapters/persistence/drivers/mysql-driver.ts';
import {
  finPayableView,
  finCategories,
  finDocuments,
} from '../adapters/persistence/schemas/mysql.ts';

// Filtro OPCIONAL do Fluxo de Caixa — refs 1:1 com `fin_payable_view`; `status` via JOIN em
// `fin_documents`. Ausente = sem restrição, combinação = AND. Validação (uuid/data/enum) na borda.
export type CashflowFilter = Readonly<{
  programRef?: string;
  budgetPlanRef?: string;
  dueFrom?: string; // 'YYYY-MM-DD' inclusivo (half-open [dueFrom, dueTo))
  dueTo?: string; // 'YYYY-MM-DD' exclusivo
  debitAccountRef?: string; // → fin_payable_view.debit_account_ref
  costCenterRef?: string; // restringe a população (CC NÃO é eixo do relatório — CA6)
  categoryRef?: string;
  subcategoryRef?: string;
  supplierRef?: string;
  status?: string; // 1 dos 6 DocumentStatus granulares → fin_documents.status
}>;

// Linha AGREGADA por (categoria, subcategoria). Refs/nomes podem ser null (payable sem
// categoria/subcategoria; nome ainda não projetado — degradação graciosa).
export type CashflowRow = Readonly<{
  categoryRef: string | null;
  categoryName: string | null;
  subcategoryRef: string | null;
  subcategoryName: string | null;
  realizedCents: number;
  expectedCents: number;
}>;

export type CashflowReader = Readonly<{
  list: (filter?: CashflowFilter) => Promise<Result<readonly CashflowRow[], string>>;
  close: () => Promise<void>;
}>;

export const openCashflowReader = async (
  opts: Readonly<{ connectionString: string }>,
): Promise<Result<CashflowReader, string>> => {
  const handleR = await openMysqlFinancial({
    connectionString: opts.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;
  const { db } = handle;

  // Self-join da taxonomia (subcategoria = folha auto-referente por parent_id — #147 F3).
  const subcategory = alias(finCategories, 'fin_subcategories');

  return ok({
    list: async (filter) => {
      try {
        const f = filter ?? {};
        const rows = await db
          .select({
            categoryRef: finPayableView.categoryRef,
            categoryName: finCategories.name,
            subcategoryRef: finPayableView.subcategoryRef,
            subcategoryName: subcategory.name,
            // mysql2 devolve SUM (DECIMAL) como string → Number() no mapper.
            expectedCents: sql<string>`sum(case when ${finPayableView.status} in ('Open','Approved') then ${finPayableView.valueCents} else 0 end)`,
            realizedCents: sql<string>`sum(case when ${finPayableView.status} = 'Paid' then ${finPayableView.valueCents} else 0 end)`,
          })
          .from(finPayableView)
          .leftJoin(finCategories, eq(finPayableView.categoryRef, finCategories.id))
          .leftJoin(subcategory, eq(finPayableView.subcategoryRef, subcategory.id))
          // JOIN 1:1 same-module (documentId NOT NULL → id PK) — não faz fan-out nem altera a
          // agregação; só habilita o filtro por status VIVO. Sem filtro de status, é neutro.
          .leftJoin(finDocuments, eq(finPayableView.documentId, finDocuments.id))
          .where(
            and(
              // Exclusão padrão dos REPs (Cancelled fora).
              ne(finPayableView.status, 'Cancelled'),
              f.programRef !== undefined ? eq(finPayableView.programRef, f.programRef) : undefined,
              f.budgetPlanRef !== undefined
                ? eq(finPayableView.budgetPlanRef, f.budgetPlanRef)
                : undefined,
              f.dueFrom !== undefined ? gte(finPayableView.dueDate, f.dueFrom) : undefined,
              f.dueTo !== undefined ? lt(finPayableView.dueDate, f.dueTo) : undefined,
              f.debitAccountRef !== undefined
                ? eq(finPayableView.debitAccountRef, f.debitAccountRef)
                : undefined,
              f.costCenterRef !== undefined
                ? eq(finPayableView.costCenterRef, f.costCenterRef)
                : undefined,
              f.categoryRef !== undefined
                ? eq(finPayableView.categoryRef, f.categoryRef)
                : undefined,
              f.subcategoryRef !== undefined
                ? eq(finPayableView.subcategoryRef, f.subcategoryRef)
                : undefined,
              f.supplierRef !== undefined
                ? eq(finPayableView.supplierRef, f.supplierRef)
                : undefined,
              // 6 granulares → status vivo do documento (o payable-view não os distingue).
              f.status !== undefined ? eq(finDocuments.status, f.status) : undefined,
            ),
          )
          .groupBy(
            finPayableView.categoryRef,
            finCategories.name,
            finPayableView.subcategoryRef,
            subcategory.name,
          );

        return ok(
          rows.map((row) => ({
            categoryRef: row.categoryRef,
            categoryName: row.categoryName,
            subcategoryRef: row.subcategoryRef,
            subcategoryName: row.subcategoryName,
            realizedCents: Number(row.realizedCents),
            expectedCents: Number(row.expectedCents),
          })),
        );
      } catch (cause) {
        process.stderr.write(`[fin-cashflow:list] ${String(cause)}\n`);
        return err('cashflow-read-failure');
      }
    },
    close: async () => handle.close(),
  });
};
