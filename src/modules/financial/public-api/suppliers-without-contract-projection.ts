/**
 * Reader boot-scoped da agregação "Fornecedores sem Contrato" (REPORTS-SUPPLIERS-NO-CONTRACT ·
 * #240 REP-2) — public-api do financial.
 *
 * Agrega o read-model `fin_payable_view` (#235) por fornecedor: soma `value_cents` e conta os
 * títulos com `contract_ref IS NULL` (superset — inclui reembolso/distrato/etc., divergência
 * documentada) e `supplier_ref IS NOT NULL`, **todos os status** (inclusive Cancelled). LEFT JOIN
 * `fin_supplier_view` (#47) para o nome — `name` fica `null` enquanto o fornecedor não foi
 * projetado (consistência eventual, ADR-0043).
 *
 * **Boot-scoped:** pool aberto uma vez, reusado, fechado no `close()` — nunca por requisição
 * (F1 do W2 do #238 / incidente RDS 0001). Molde: `openCollaboratorProjectionReader`.
 *
 * ADR-0020 §"Features permitidas": GROUP BY/agregação, LEFT JOIN, `is null`. ADR-0006/0014.
 */
import { and, asc, desc, eq, gte, isNull, isNotNull, lt, sql } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { openMysqlFinancial } from '../adapters/persistence/drivers/mysql-driver.ts';
import { finPayableView, finSupplierView } from '../adapters/persistence/schemas/mysql.ts';

export type SupplierWithoutContractRow = Readonly<{
  supplierRef: string;
  name: string | null;
  totalCents: number;
  payableCount: number;
}>;

// #694: linha do RELATÓRIO (`list`), com quebra por Plano Orçamentário. O `listTop` (Dashboard) segue
// no grão por-fornecedor com `SupplierWithoutContractRow`.
export type SupplierWithoutContractPlanRow = SupplierWithoutContractRow &
  Readonly<{ budgetPlanRef: string | null }>;

// #694: filtros de servidor (paridade #588/#682). Refs opacos indexados na `fin_payable_view`; período
// half-open `[dueFrom, dueTo)` (como o /payment-position).
export type SuppliersWithoutContractFilter = Readonly<{
  programRef?: string;
  budgetPlanRef?: string;
  costCenterRef?: string;
  categoryRef?: string;
  subcategoryRef?: string;
  dueFrom?: string; // 'YYYY-MM-DD' inclusivo
  dueTo?: string; // 'YYYY-MM-DD' exclusivo (half-open)
}>;

export type SuppliersWithoutContractReader = Readonly<{
  // #694: `list` recorta por filtro e quebra por Plano Orçamentário (uma linha por fornecedor×plano).
  list: (
    filter?: SuppliersWithoutContractFilter,
  ) => Promise<Result<readonly SupplierWithoutContractPlanRow[], string>>;
  /**
   * Top-N por total decrescente — widget "Fornecedores sem Contrato" do Dashboard (DASH-F5 · #242).
   * Corte no SQL (`ORDER BY sum DESC, supplier_ref ASC LIMIT ?`), nunca em memória: `supplier_ref ASC`
   * é o desempate ESTÁVEL (resultado determinístico sob empate de total). Reusa a MESMA agregação/
   * WHERE/JOIN do `list()` (que segue intocado — contrato do `reports`/REP-2).
   */
  listTop: (limit: number) => Promise<Result<readonly SupplierWithoutContractRow[], string>>;
  close: () => Promise<void>;
}>;

export const openSuppliersWithoutContractReader = async (
  opts: Readonly<{ connectionString: string }>,
): Promise<Result<SuppliersWithoutContractReader, string>> => {
  const handleR = await openMysqlFinancial({
    connectionString: opts.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;
  const { db } = handle;

  // Agregação CANÔNICA dos candidatos (SUM value_cents, COUNT por fornecedor): SELECT/WHERE/`sumExpr`
  // são a única fonte de verdade reusada por `list()` e `listTop()` (não duplicar semântica). `sumExpr`
  // é reusado idêntico no SELECT e no ORDER BY do Top-N (mesma expressão agregada → MySQL feliz). Cada
  // método constrói o builder do zero (não reaproveitar a mesma instância de query entre execuções).
  const sumExpr = sql<string>`sum(${finPayableView.valueCents})`;
  const selectShape = {
    supplierRef: finPayableView.supplierRef,
    name: finSupplierView.name,
    // mysql2 devolve SUM (DECIMAL) como string; COUNT(*) como number.
    totalCents: sumExpr,
    payableCount: sql<number>`count(*)`,
  };
  const whereClause = and(
    isNull(finPayableView.contractRef),
    isNotNull(finPayableView.supplierRef),
    // #437 (decisão de auditoria da P.O.): por LANÇAMENTO e valor BRUTO — sem filtro `kind='Parent'`.
    // Os filhos de retenção (ISS/IRRF/INSS/CSRF) ENTRAM na soma e na contagem, refletindo fielmente o
    // valor do documento lançado (bruto). O anti-join de contrato ativo também não existe: todo título
    // com `contract_ref IS NULL` conta, mesmo que o fornecedor tenha contrato em outros títulos.
  );

  type AggregationRow = Readonly<{
    supplierRef: string | null;
    name: string | null;
    totalCents: string;
    payableCount: number;
  }>;
  const toRows = (rows: readonly AggregationRow[]): SupplierWithoutContractRow[] => {
    const items: SupplierWithoutContractRow[] = [];
    for (const row of rows) {
      if (row.supplierRef === null) continue; // defensivo (já filtrado no WHERE)
      items.push({
        supplierRef: row.supplierRef,
        name: row.name,
        totalCents: Number(row.totalCents),
        payableCount: row.payableCount,
      });
    }
    return items;
  };

  return ok({
    list: async (filter = {}) => {
      try {
        const rows = await db
          .select({ ...selectShape, budgetPlanRef: finPayableView.budgetPlanRef })
          .from(finPayableView)
          .leftJoin(finSupplierView, eq(finPayableView.supplierRef, finSupplierView.supplierRef))
          .where(
            and(
              whereClause,
              // #694: recortes opcionais (grão preservado no groupBy; refs indexados).
              filter.programRef !== undefined
                ? eq(finPayableView.programRef, filter.programRef)
                : undefined,
              filter.budgetPlanRef !== undefined
                ? eq(finPayableView.budgetPlanRef, filter.budgetPlanRef)
                : undefined,
              filter.costCenterRef !== undefined
                ? eq(finPayableView.costCenterRef, filter.costCenterRef)
                : undefined,
              filter.categoryRef !== undefined
                ? eq(finPayableView.categoryRef, filter.categoryRef)
                : undefined,
              filter.subcategoryRef !== undefined
                ? eq(finPayableView.subcategoryRef, filter.subcategoryRef)
                : undefined,
              filter.dueFrom !== undefined
                ? gte(finPayableView.dueDate, filter.dueFrom)
                : undefined,
              filter.dueTo !== undefined ? lt(finPayableView.dueDate, filter.dueTo) : undefined,
            ),
          )
          // #694: quebra por Plano Orçamentário — uma linha por fornecedor×plano (`supplierRef` repetido).
          .groupBy(finPayableView.supplierRef, finSupplierView.name, finPayableView.budgetPlanRef);
        return ok(
          rows
            .filter((row): row is typeof row & { supplierRef: string } => row.supplierRef !== null)
            .map((row) => ({
              supplierRef: row.supplierRef,
              name: row.name,
              totalCents: Number(row.totalCents),
              payableCount: row.payableCount,
              budgetPlanRef: row.budgetPlanRef,
            })),
        );
      } catch (cause) {
        process.stderr.write(`[fin-suppliers-without-contract:list] ${String(cause)}\n`);
        return err('suppliers-without-contract-read-failure');
      }
    },
    listTop: async (limit: number) => {
      try {
        const rows = await db
          .select(selectShape)
          .from(finPayableView)
          .leftJoin(finSupplierView, eq(finPayableView.supplierRef, finSupplierView.supplierRef))
          .where(whereClause)
          .groupBy(finPayableView.supplierRef, finSupplierView.name)
          // Corte no SQL (nunca em memória): total desc + desempate estável supplier_ref asc.
          .orderBy(desc(sumExpr), asc(finPayableView.supplierRef))
          .limit(limit);
        return ok(toRows(rows));
      } catch (cause) {
        process.stderr.write(`[fin-suppliers-without-contract:listTop] ${String(cause)}\n`);
        return err('suppliers-without-contract-read-failure');
      }
    },
    close: async () => handle.close(),
  });
};
