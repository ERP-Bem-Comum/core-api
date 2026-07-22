/**
 * Adapter `PaymentPositionReadPort` sobre a agregação do `financial` (ACL — ADR-0006/0014).
 * Nunca importa `financial/domain` ou `financial/adapters` — só a public-api.
 *
 * Recebe o `list` de um reader **já aberto no boot** (`openPaymentPositionReader`), nunca uma
 * connection-string — pool singleton de composição, fechado no `shutdown()`.
 */
import { ok, err } from '#src/shared/primitives/result.ts';
import type { PaymentPositionReader } from '#src/modules/financial/public-api/index.ts';
import type {
  PaymentPositionReadPort,
  PaymentPositionReadError,
} from '../../application/ports/payment-position-read.ts';

export const PaymentPositionReadFromFinancial = (
  listAggregation: PaymentPositionReader['list'],
): PaymentPositionReadPort => ({
  list: async () => {
    const listed = await listAggregation();
    if (!listed.ok) return err<PaymentPositionReadError>('payment-position-read-unavailable');
    return ok(listed.value);
  },
});
