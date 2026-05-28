/**
 * Formata `PayableStatus` em label PT-BR.
 *
 * Lookup table substitui `switch + throw unreachable`. Tipagem
 * `Record<PayableStatus, string>` força exaustividade em compile-time —
 * novo status no domínio quebra o build aqui.
 *
 * Pattern **estrutural** espelha `src/modules/contracts/cli/formatters/status.ts`
 * (Record<Status, string> com lookup-only). Conteúdo é específico ao agregado
 * Payable (7 status vs 3 do Contract).
 */

import type { PayableStatus } from '#src/modules/financial/domain/payable/types.ts';

const STATUS_LABELS: Readonly<Record<PayableStatus, string>> = {
  Open: 'Aberto',
  Approved: 'Aprovado',
  Transmitted: 'Transmitido',
  Rejected: 'Rejeitado',
  Overdue: 'Atrasado',
  Paid: 'Pago',
  Settled: 'Liquidado',
};

export const formatStatus = (s: PayableStatus): string => STATUS_LABELS[s];
