/**
 * Reader boot-scoped do "Relatório Geral" (REP-6 · #442 — Slice A) — public-api do financial.
 *
 * Linhas PLANAS PAGINADAS de títulos a-pagar (`fin_payable_view`), grão = 1 linha por payable.
 * Diferente do REP-4 (que AGREGA em baldes), aqui NÃO há GROUP BY: cada payable vira uma linha
 * do grid, com as colunas SERVÍVEIS localmente resolvidas por LEFT JOIN same-module (ADR-0014):
 *  - `code` ← fin_documents.document_number (JOIN por document_id);
 *  - `supplierName` ← fin_supplier_view.name (event-loaded → nullable, degradação graciosa);
 *  - `costCenterName` ← fin_cost_centers.name;
 *  - `categoryName` ← fin_categories.name (por category_ref);
 *  - `subcategoryName` ← fin_categories.name (SELF-JOIN por subcategory_ref; taxonomia é
 *    auto-referente via parent_id, #147 F3).
 * `tipo` é a constante `'a-pagar'` (v1 só a-pagar). `contractRef` é apenas a ref/UUID — o NÚMERO
 * do contrato é cross-módulo (Slice D). Financiador/Colaborador/PIX/Bancários ficam para Slices B/C.
 *
 * **Boot-scoped:** pool aberto uma vez, fechado no `close()` (incidente RDS 0001).
 *
 * Filtros (todos opcionais, AND, ausente = sem restrição), no molde do #588 (REP-4):
 *  - refs em `fin_payable_view` (program/budget-plan/debit-account/cost-center/category/subcategory/
 *    supplier) + janela half-open [dueFrom, dueTo) sobre `due_date`;
 *  - `status` (1 dos 6 granulares) filtra o status VIVO em `fin_documents` via LEFT JOIN — o
 *    status do payable-view é reduzido a 4 e não distingue Transmitted/PartiallyReconciled/Reconciled;
 *  - `search` (LIKE contains, case-insensitive) em document_number + fin_supplier_view.name.
 * `Cancelled` é sempre excluído (exclusão padrão dos REPs).
 *
 * ADR-0020 §"Features permitidas": LEFT JOIN, LIMIT/OFFSET, COUNT(*), ORDER BY.
 */
import { and, asc, desc, eq, gte, like, lt, ne, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Page } from '../domain/document/query.ts';
import { openMysqlFinancial } from '../adapters/persistence/drivers/mysql-driver.ts';
import {
  finPayableView,
  finSupplierView,
  finCostCenters,
  finCategories,
  finDocuments,
} from '../adapters/persistence/schemas/mysql.ts';

// Ordenação servível no Slice A: só por vencimento (o grid ordena por dueDate). `sort:direção`.
export type GeneralReportOrder = 'dueDate:asc' | 'dueDate:desc';

// Filtro OPCIONAL do Relatório Geral — refs 1:1 com `fin_payable_view`; `status` via JOIN em
// `fin_documents`. Ausente = sem restrição, combinação = AND. Validação (uuid/data/enum) na borda.
export type GeneralReportFilter = Readonly<{
  programRef?: string;
  budgetPlanRef?: string;
  dueFrom?: string; // 'YYYY-MM-DD' inclusivo (half-open [dueFrom, dueTo))
  dueTo?: string; // 'YYYY-MM-DD' exclusivo
  debitAccountRef?: string; // → fin_payable_view.debit_account_ref
  costCenterRef?: string;
  categoryRef?: string;
  subcategoryRef?: string;
  supplierRef?: string;
  status?: string; // 1 dos 6 DocumentStatus granulares → fin_documents.status
  search?: string; // LIKE contains em document_number + fin_supplier_view.name
  order?: GeneralReportOrder; // default 'dueDate:desc'
}>;

export type GeneralReportPagination = Readonly<{ page: number; limit: number }>;

// Linha PLANA do grid (colunas servíveis no Slice A). As cross-módulo (Financiador/Colaborador/PIX/
// Bancários/Número do Contrato) NÃO entram — Slices B/C/D.
// Tipo do favorecido (#90) — CHECK em fin_documents.payee_kind. `payeeKind` guia a costura
// cross-módulo do nome (Financiador/Colaborador) na borda (Slice B); aqui só o classificador viaja.
export type GeneralReportPayeeKind = 'supplier' | 'financier' | 'act' | 'collaborator';

// COALESCE(payee_kind, 'supplier') no SQL cobre o NULL (pré-#90); esta guarda cobre o valor fora do
// enum (não deve ocorrer — há CHECK) com fallback gracioso para 'supplier'.
const toPayeeKind = (raw: string | null): GeneralReportPayeeKind =>
  raw === 'financier' || raw === 'act' || raw === 'collaborator' ? raw : 'supplier';

export type GeneralReportRow = Readonly<{
  payableId: string;
  documentId: string;
  code: string | null; // fin_documents.document_number
  tipo: 'a-pagar'; // constante (v1 só a-pagar)
  dueDate: string; // 'YYYY-MM-DD'
  // Slice B (#442): tipo do favorecido (COALESCE de fin_documents.payee_kind). O NOME de
  // Financiador/Colaborador é cross-módulo (partners) e NÃO é resolvido aqui — Slice B costura na borda.
  payeeKind: GeneralReportPayeeKind;
  supplierRef: string | null; // ref do favorecido (genérica p/ todos os kinds, apesar do nome)
  supplierName: string | null; // só ≠ null para supplier real (fin_supplier_view, same-module)
  costCenterRef: string | null;
  costCenterName: string | null;
  categoryRef: string | null;
  categoryName: string | null;
  subcategoryRef: string | null;
  subcategoryName: string | null;
  valueCents: number;
  contractRef: string | null; // só a ref/UUID (o NÚMERO é Slice D)
}>;

export type GeneralReportReader = Readonly<{
  list: (
    filter: GeneralReportFilter,
    pagination: GeneralReportPagination,
  ) => Promise<Result<Page<GeneralReportRow>, string>>;
  close: () => Promise<void>;
}>;

// Escapa curingas de LIKE (\, %, _) — mysql2 já parametriza o valor (sem SQLi); isto evita que
// `%`/`_` do usuário virem curinga. Molde do `likeContains` do document-repository (#167).
const likeContains = (term: string): string => `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export const openGeneralReportReader = async (
  opts: Readonly<{ connectionString: string }>,
): Promise<Result<GeneralReportReader, string>> => {
  const handleR = await openMysqlFinancial({
    connectionString: opts.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;
  const { db } = handle;

  // Self-join da taxonomia (subcategoria = folha auto-referente por parent_id — #147 F3).
  const subcategory = alias(finCategories, 'fin_subcategories');

  const buildWhere = (f: GeneralReportFilter): SQL | undefined =>
    and(
      // Exclusão padrão dos REPs (Cancelled fora).
      ne(finPayableView.status, 'Cancelled'),
      f.programRef !== undefined ? eq(finPayableView.programRef, f.programRef) : undefined,
      f.budgetPlanRef !== undefined ? eq(finPayableView.budgetPlanRef, f.budgetPlanRef) : undefined,
      f.dueFrom !== undefined ? gte(finPayableView.dueDate, f.dueFrom) : undefined,
      f.dueTo !== undefined ? lt(finPayableView.dueDate, f.dueTo) : undefined,
      f.debitAccountRef !== undefined
        ? eq(finPayableView.debitAccountRef, f.debitAccountRef)
        : undefined,
      f.costCenterRef !== undefined ? eq(finPayableView.costCenterRef, f.costCenterRef) : undefined,
      f.categoryRef !== undefined ? eq(finPayableView.categoryRef, f.categoryRef) : undefined,
      f.subcategoryRef !== undefined
        ? eq(finPayableView.subcategoryRef, f.subcategoryRef)
        : undefined,
      f.supplierRef !== undefined ? eq(finPayableView.supplierRef, f.supplierRef) : undefined,
      // 6 granulares → status vivo do documento (o payable-view não os distingue).
      f.status !== undefined ? eq(finDocuments.status, f.status) : undefined,
      // Busca textual: contains (case-insensitive pela collation) em número do doc OU nome do fornecedor.
      f.search !== undefined
        ? or(
            like(finDocuments.documentNumber, likeContains(f.search)),
            like(finSupplierView.name, likeContains(f.search)),
          )
        : undefined,
    );

  return ok({
    list: async (filter, pagination) => {
      try {
        const where = buildWhere(filter);
        const page = pagination.page;
        const pageSize = pagination.limit;

        // Total com o MESMO WHERE (COUNT(*)). Os LEFT JOIN são 1:1 (PKs) — não alteram a contagem;
        // fin_documents/fin_supplier_view são necessários porque o WHERE (status/search) os referencia.
        const totalRows = await db
          .select({ n: sql<number>`count(*)` })
          .from(finPayableView)
          .leftJoin(finDocuments, eq(finPayableView.documentId, finDocuments.id))
          .leftJoin(finSupplierView, eq(finPayableView.supplierRef, finSupplierView.supplierRef))
          .where(where);
        const total = totalRows[0]?.n ?? 0;

        // Ordenação: default dueDate DESC; desempate por payable_id (estável entre páginas).
        const direction = filter.order === 'dueDate:asc' ? asc : desc;

        const rows = await db
          .select({
            payableId: finPayableView.payableId,
            documentId: finPayableView.documentId,
            code: finDocuments.documentNumber,
            dueDate: finPayableView.dueDate,
            // Cru (nullable) — normalizado por `toPayeeKind` no map (NULL/valor fora do enum → 'supplier').
            payeeKind: finDocuments.payeeKind,
            supplierRef: finPayableView.supplierRef,
            supplierName: finSupplierView.name,
            costCenterRef: finPayableView.costCenterRef,
            costCenterName: finCostCenters.name,
            categoryRef: finPayableView.categoryRef,
            categoryName: finCategories.name,
            subcategoryRef: finPayableView.subcategoryRef,
            subcategoryName: subcategory.name,
            valueCents: finPayableView.valueCents,
            contractRef: finPayableView.contractRef,
          })
          .from(finPayableView)
          .leftJoin(finDocuments, eq(finPayableView.documentId, finDocuments.id))
          .leftJoin(finSupplierView, eq(finPayableView.supplierRef, finSupplierView.supplierRef))
          .leftJoin(finCostCenters, eq(finPayableView.costCenterRef, finCostCenters.id))
          .leftJoin(finCategories, eq(finPayableView.categoryRef, finCategories.id))
          .leftJoin(subcategory, eq(finPayableView.subcategoryRef, subcategory.id))
          .where(where)
          .orderBy(direction(finPayableView.dueDate), direction(finPayableView.payableId))
          .limit(pageSize)
          .offset((page - 1) * pageSize);

        const items: GeneralReportRow[] = rows.map((row) => ({
          payableId: row.payableId,
          documentId: row.documentId,
          code: row.code,
          tipo: 'a-pagar',
          dueDate: row.dueDate,
          payeeKind: toPayeeKind(row.payeeKind),
          supplierRef: row.supplierRef,
          supplierName: row.supplierName,
          costCenterRef: row.costCenterRef,
          costCenterName: row.costCenterName,
          categoryRef: row.categoryRef,
          categoryName: row.categoryName,
          subcategoryRef: row.subcategoryRef,
          subcategoryName: row.subcategoryName,
          valueCents: row.valueCents,
          contractRef: row.contractRef,
        }));

        return ok({ items, page, pageSize, total });
      } catch (cause) {
        process.stderr.write(`[fin-general-report:list] ${String(cause)}\n`);
        return err('general-report-read-failure');
      }
    },
    close: async () => handle.close(),
  });
};
