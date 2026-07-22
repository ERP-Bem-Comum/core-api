/**
 * Reader boot-scoped da agregação "Fornecedores sem Contrato" (REPORTS-SUPPLIERS-NO-CONTRACT ·
 * #240 REP-2) — public-api do financial.
 *
 * Devolve os **CANDIDATOS** do relatório, não a resposta final: agrega o read-model
 * `fin_payable_view` (#235) por fornecedor, somando `value_cents` e contando os títulos com
 * `contract_ref IS NULL`, `supplier_ref IS NOT NULL` e `kind = 'Parent'` (#437), em **todos os
 * status** (inclusive Cancelled). LEFT JOIN `fin_supplier_view` (#47) para o nome — `name` fica
 * `null` enquanto o fornecedor não foi projetado (consistência eventual, ADR-0043).
 *
 * `contract_ref IS NULL` é filtro de LINHA (barato, reduz o conjunto) — não decide se o fornecedor
 * tem contrato. Essa pergunta vive em `ctr_contracts` e é respondida pelo `reports`, que subtrai os
 * contratantes com contrato Active EM MEMÓRIA: o JOIN `fin_*` × `ctr_*` é proibido (ADR-0006
 * `:150`/`:154`, ADR-0014 `:130`).
 *
 * **Boot-scoped:** pool aberto uma vez, reusado, fechado no `close()` — nunca por requisição
 * (F1 do W2 do #238 / incidente RDS 0001). Molde: `openCollaboratorProjectionReader`.
 *
 * ADR-0020 §"Features permitidas": GROUP BY/agregação, LEFT JOIN, `is null`. ADR-0006/0014.
 */
import { and, eq, isNull, isNotNull, sql } from 'drizzle-orm';
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

  return ok({
    list: async () => {
      try {
        const rows = await db
          .select({
            supplierRef: finPayableView.supplierRef,
            name: finSupplierView.name,
            // mysql2 devolve SUM (DECIMAL) como string; COUNT(*) como number.
            totalCents: sql<string>`sum(${finPayableView.valueCents})`,
            payableCount: sql<number>`count(*)`,
          })
          .from(finPayableView)
          .leftJoin(finSupplierView, eq(finPayableView.supplierRef, finSupplierView.supplierRef))
          .where(
            and(
              isNull(finPayableView.contractRef),
              isNotNull(finPayableView.supplierRef),
              // Filhos de retenção (ISS/IRRF/INSS/CSRF) carregam o supplier_ref do fornecedor
              // (`apply-payable-event.ts`), então inflariam soma e contagem. Só o pai representa o
              // documento: 1 NFS-e = 1, e `totalCents` = líquido ao fornecedor.
              eq(finPayableView.kind, 'Parent'),
            ),
          )
          .groupBy(finPayableView.supplierRef, finSupplierView.name);

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
        return ok(items);
      } catch (cause) {
        process.stderr.write(`[fin-suppliers-without-contract:list] ${String(cause)}\n`);
        return err('suppliers-without-contract-read-failure');
      }
    },
    close: async () => handle.close(),
  });
};
