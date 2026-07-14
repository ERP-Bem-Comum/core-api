/**
 * PAYMENT-POSITION-READ — Port de LEITURA (read-only) do relatório "Posição de Pagamentos"
 * (REP-4 · #243).
 *
 * Linhas na grão Fornecedor × Centro de Custo × Categoria com 3 baldes (PENDENTE/PAGO/ATRASADO),
 * lidas da agregação de `fin_payable_view` do financial via ACL. Refs/nomes podem ser `null`
 * (payable sem fornecedor/CC/categoria; nome ainda não projetado). Consumido pela borda HTTP
 * (`GET /reports/payment-position`).
 */
import type { Result } from '#src/shared/primitives/result.ts';

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
  list: () => Promise<Result<readonly PaymentPositionRow[], PaymentPositionReadError>>;
}>;
