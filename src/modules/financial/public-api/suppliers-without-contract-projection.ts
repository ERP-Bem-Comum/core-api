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
import { and, asc, desc, eq, isNull, isNotNull, sql } from 'drizzle-orm';
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

export type SuppliersWithoutContractReader = Readonly<{
  list: () => Promise<Result<readonly SupplierWithoutContractRow[], string>>;
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
    list: async () => {
      try {
        const rows = await db
          .select(selectShape)
          .from(finPayableView)
          .leftJoin(finSupplierView, eq(finPayableView.supplierRef, finSupplierView.supplierRef))
          .where(whereClause)
          .groupBy(finPayableView.supplierRef, finSupplierView.name);
        return ok(toRows(rows));
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
