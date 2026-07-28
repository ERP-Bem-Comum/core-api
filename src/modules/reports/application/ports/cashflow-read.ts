/**
 * CASHFLOW-READ — Port de LEITURA (read-only) do relatório "Fluxo de Caixa" (REP · #590 · Slice A).
 *
 * Tabela de Saídas (Payables) agregada por Categoria × Subcategoria em 2 baldes (REALIZED/EXPECTED),
 * lida da agregação de `fin_payable_view` do financial via ACL. Refs/nomes podem ser `null` (payable
 * sem categoria/subcategoria; nome ainda não projetado). Consumido pela borda HTTP
 * (`GET /reports/cashflow`).
 *
 * O port entrega APENAS as linhas de Payables — o envelope legado `{ Receivables: [], Payables }` é
 * montado no mapper de DTO da borda (Receivables é SEMPRE `[]` neste modelo payables-centric, #179).
 *
 * `list` aceita um FILTRO opcional (todos os campos opcionais, ausente = sem restrição,
 * combinação = AND). Os filtros só RESTRINGEM a população antes dos CASE WHEN — as 2 medidas seguem
 * derivadas do status (reduzido) do payable-view. `costCenterRef` restringe a população mesmo sem
 * ser eixo do relatório (CA6). `status` (6 granulares) filtra o status vivo em `fin_documents` no
 * adapter do financial; aqui é apenas repassado como string opaca.
 */
import type { Result } from '#src/shared/primitives/result.ts';

export type CashflowFilter = Readonly<{
  programRef?: string;
  budgetPlanRef?: string;
  dueFrom?: string; // 'YYYY-MM-DD' inclusivo (half-open [dueFrom, dueTo) sobre due_date)
  dueTo?: string; // 'YYYY-MM-DD' exclusivo
  debitAccountRef?: string; // → fin_payable_view.debit_account_ref
  costCenterRef?: string; // restringe a população (CC NÃO é eixo — CA6)
  categoryRef?: string;
  subcategoryRef?: string;
  supplierRef?: string;
  status?: string; // 1 dos 6 DocumentStatus granulares (validado na borda) → fin_documents.status
}>;

export type CashflowRow = Readonly<{
  categoryRef: string | null;
  categoryName: string | null;
  subcategoryRef: string | null;
  subcategoryName: string | null;
  realizedCents: number;
  expectedCents: number;
}>;

export type CashflowReadError = 'cashflow-read-unavailable';

export type CashflowReadPort = Readonly<{
  list: (filter?: CashflowFilter) => Promise<Result<readonly CashflowRow[], CashflowReadError>>;
}>;
