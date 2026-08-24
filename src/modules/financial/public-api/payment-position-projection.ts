/**
 * Reader boot-scoped da "Posição de Pagamentos" (REPORTS-PAYMENT-POSITION · #243 REP-4) —
 * public-api do financial.
 *
 * Agrega `fin_payable_view` (#235) na grão Fornecedor × Centro de Custo × Categoria em 3 baldes:
 *  - PENDENTE = status IN ('Open','Approved','Transmitted')
 *  - PAGO     = status = 'Paid'
 *  - ATRASADO = status IN ('Open','Approved','Transmitted') AND due_date < hoje (derivado na
 *    leitura; SPIKE-233 Mapa C)
 *
 * ⚠️ `Transmitted` entrou nos baldes de PENDENTE e ATRASADO com o ADR-0065 §5 (#792), e a inclusão
 * é **correção de regressão, não mudança de escopo**. Até a #792 o read-model colapsava
 * `Transmitted` em `Approved`, então o título transmitido já caía em PENDENTE — por acidente do
 * mapa, e ninguém precisou decidir. Quando o colapso saiu, ele deixaria de casar com os três CASE e
 * **sumiria das três medidas**: nem pendente, nem pago, nem atrasado — o total do relatório
 * encolhendo em silêncio, justamente sobre os títulos cujo pagamento está a caminho do banco.
 *
 * Que ele seja PENDENTE não é convenção: "transmitido" é entregue à VAN, e a P.O. decidiu na #59 que
 * `Pago` continua sendo baixa manual conferida no site do banco. Enquanto essa baixa não acontece, o
 * dinheiro não saiu e o compromisso é pendente. Vencido e não pago segue ATRASADO pela mesma razão —
 * ter ido ao banco não paga a conta.
 * `Cancelled` é excluído. Nomes via LEFT JOIN: `fin_supplier_view` (event-loaded → nullable),
 * `fin_cost_centers`, `fin_categories` (referência local). Método de pagamento (cartão) não vive no
 * read-model e não filtra a agregação — incluído sem tratamento especial.
 *
 * **Boot-scoped:** pool aberto uma vez, fechado no `close()` (F1 do #238 / incidente RDS 0001).
 * `hoje` vem de `clock.today()` (PlainDate → 'YYYY-MM-DD'), testável via ClockFixed — nunca `new Date()`.
 *
 * ADR-0020 §"Features permitidas": GROUP BY/agregação, LEFT JOIN, CASE.
 */
import { and, eq, gte, lt, ne, sql } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import { toISOString as plainDateToISO } from '#src/shared/kernel/plain-date.ts';
import { openMysqlFinancial } from '../adapters/persistence/drivers/mysql-driver.ts';
import {
  finPayableView,
  finSupplierView,
  finCostCenters,
  finCategories,
  finDocuments,
} from '../adapters/persistence/schemas/mysql.ts';

// #588: filtro OPCIONAL da Posição de Pagamentos — todos os campos opcionais, ausente = sem
// restrição, combinação = AND. Aplicado no WHERE ANTES dos CASE WHEN (só restringe a população;
// as 3 medidas seguem derivadas do status reduzido do payable-view). `status` (6 granulares) filtra
// o status VIVO em `fin_documents` via LEFT JOIN — o payable-view reduz 8→5 e não distingue
// `PartiallyReconciled`/`Reconciled`, ambos colapsados em `Paid`. Validação dos 6 valores na borda.
//
// ⚠️ O `Transmitted` desta lista de 6 NÃO casa com nada, e é defeito pré-existente, não consequência
// do #792: o filtro compara `fin_documents.status`, e o DOCUMENTO nunca transiciona para
// `Transmitted` — quem transiciona é o TÍTULO (`fin_payables.status`), e o ADR-0065 §2 manteve o
// valor do documento reservado de propósito. Filtrar por `Transmitted` aqui devolve vazio hoje e
// devolvia vazio antes. O read-model agora TEM o valor (`fin_payable_view.status`), então a correção
// é alcançável — mas pertence ao épico de relatórios (#114), que está congelado. Registrado na #845.
export type PaymentPositionFilter = Readonly<{
  budgetPlanRef?: string;
  dueFrom?: string; // 'YYYY-MM-DD' inclusivo (half-open [dueFrom, dueTo))
  dueTo?: string; // 'YYYY-MM-DD' exclusivo
  cedenteAccountRef?: string; // → fin_payable_view.debit_account_ref
  status?: string; // → fin_documents.status (status vivo, 8 valores)
  costCenterRef?: string;
  categoryRef?: string;
  subcategoryRef?: string;
  supplierRef?: string;
}>;

export type PaymentPositionRow = Readonly<{
  supplierRef: string | null;
  supplierName: string | null;
  costCenterRef: string | null;
  costCenterName: string | null;
  categoryRef: string | null;
  categoryName: string | null;
  pendingCents: number;
  paidCents: number;
  overdueCents: number;
}>;

export type PaymentPositionReader = Readonly<{
  list: (filter?: PaymentPositionFilter) => Promise<Result<readonly PaymentPositionRow[], string>>;
  close: () => Promise<void>;
}>;

export const openPaymentPositionReader = async (
  opts: Readonly<{ connectionString: string; clock: Clock }>,
): Promise<Result<PaymentPositionReader, string>> => {
  const handleR = await openMysqlFinancial({
    connectionString: opts.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;
  const { db } = handle;

  return ok({
    list: async (filter) => {
      try {
        const today = plainDateToISO(opts.clock.today());
        const f = filter ?? {};
        const rows = await db
          .select({
            supplierRef: finPayableView.supplierRef,
            supplierName: finSupplierView.name,
            costCenterRef: finPayableView.costCenterRef,
            costCenterName: finCostCenters.name,
            categoryRef: finPayableView.categoryRef,
            categoryName: finCategories.name,
            // mysql2 devolve SUM (DECIMAL) como string → Number() no mapper.
            // `'Transmitted'` nos dois baldes de não-pago (ADR-0065 §5): sem ele o título que já foi
            // ao banco sai das três somas e o relatório encolhe em silêncio. Ver o cabeçalho.
            pendingCents: sql<string>`sum(case when ${finPayableView.status} in ('Open','Approved','Transmitted') then ${finPayableView.valueCents} else 0 end)`,
            paidCents: sql<string>`sum(case when ${finPayableView.status} = 'Paid' then ${finPayableView.valueCents} else 0 end)`,
            overdueCents: sql<string>`sum(case when ${finPayableView.status} in ('Open','Approved','Transmitted') and ${finPayableView.dueDate} < ${today} then ${finPayableView.valueCents} else 0 end)`,
          })
          .from(finPayableView)
          .leftJoin(finSupplierView, eq(finPayableView.supplierRef, finSupplierView.supplierRef))
          .leftJoin(finCostCenters, eq(finPayableView.costCenterRef, finCostCenters.id))
          .leftJoin(finCategories, eq(finPayableView.categoryRef, finCategories.id))
          // #588: JOIN 1:1 same-module (documentId NOT NULL → id PK) — não faz fan-out nem altera a
          // agregação; só habilita o filtro por status VIVO. Sem filtro de status, é neutro.
          .leftJoin(finDocuments, eq(finPayableView.documentId, finDocuments.id))
          .where(
            and(
              // Mantém a exclusão padrão (Refused→Cancelled não é oferecido no filtro — #588).
              ne(finPayableView.status, 'Cancelled'),
              f.budgetPlanRef !== undefined
                ? eq(finPayableView.budgetPlanRef, f.budgetPlanRef)
                : undefined,
              f.dueFrom !== undefined ? gte(finPayableView.dueDate, f.dueFrom) : undefined,
              f.dueTo !== undefined ? lt(finPayableView.dueDate, f.dueTo) : undefined,
              f.cedenteAccountRef !== undefined
                ? eq(finPayableView.debitAccountRef, f.cedenteAccountRef)
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
            finPayableView.supplierRef,
            finSupplierView.name,
            finPayableView.costCenterRef,
            finCostCenters.name,
            finPayableView.categoryRef,
            finCategories.name,
          );

        return ok(
          rows.map((row) => ({
            supplierRef: row.supplierRef,
            supplierName: row.supplierName,
            costCenterRef: row.costCenterRef,
            costCenterName: row.costCenterName,
            categoryRef: row.categoryRef,
            categoryName: row.categoryName,
            pendingCents: Number(row.pendingCents),
            paidCents: Number(row.paidCents),
            overdueCents: Number(row.overdueCents),
          })),
        );
      } catch (cause) {
        process.stderr.write(`[fin-payment-position:list] ${String(cause)}\n`);
        return err('payment-position-read-failure');
      }
    },
    close: async () => handle.close(),
  });
};
