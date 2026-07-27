/**
 * PAYMENT-POSITION-READ — Port de LEITURA (read-only) do relatório "Posição de Pagamentos"
 * (REP-4 · #243).
 *
 * Linhas na grão Fornecedor × Centro de Custo × Categoria com 3 baldes (PENDENTE/PAGO/ATRASADO),
 * lidas da agregação de `fin_payable_view` do financial via ACL. Refs/nomes podem ser `null`
 * (payable sem fornecedor/CC/categoria; nome ainda não projetado). Consumido pela borda HTTP
 * (`GET /reports/payment-position`).
 *
 * #588: `list` aceita um FILTRO opcional (todos os campos opcionais, ausente = sem restrição,
 * combinação = AND). Os filtros só RESTRINGEM a população antes dos CASE WHEN — as 3 medidas
 * seguem derivadas do status (reduzido) do payable-view. `status` (6 granulares) filtra o status
 * vivo em `fin_documents` no adapter do financial; aqui é apenas repassado como string opaca.
 */
import type { Result } from '#src/shared/primitives/result.ts';

export type PaymentPositionFilter = Readonly<{
  budgetPlanRef?: string;
  dueFrom?: string; // 'YYYY-MM-DD' inclusivo (half-open [dueFrom, dueTo) sobre due_date)
  dueTo?: string; // 'YYYY-MM-DD' exclusivo
  cedenteAccountRef?: string; // → fin_payable_view.debit_account_ref
  status?: string; // 1 dos 6 DocumentStatus granulares (validado na borda) → fin_documents.status
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

export type PaymentPositionReadError = 'payment-position-read-unavailable';

export type PaymentPositionReadPort = Readonly<{
  list: (
    filter?: PaymentPositionFilter,
  ) => Promise<Result<readonly PaymentPositionRow[], PaymentPositionReadError>>;
}>;
