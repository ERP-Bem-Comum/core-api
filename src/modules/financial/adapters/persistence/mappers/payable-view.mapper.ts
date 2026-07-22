import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  PayableView,
  PayableViewStatus,
} from '#src/modules/financial/domain/payable-view/types.ts';
import type { PayableViewRow } from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';

// Mapper do read-model de payables (#235): row de `fin_payable_view` → `PayableView`. Valida os
// enums vindos do banco (`kind`, `status`) — o read-model REJEITA estado inválido em vez de
// reclassificar silenciosamente (.claude/rules/adapters.md). Complementa o CHECK do schema
// (defesa em profundidade: schema barra na escrita, mapper barra na leitura).

export type PayableViewMapperError = 'payable-view-row-invalid';

const KINDS: readonly PayableView['kind'][] = ['Parent', 'Child'];
const STATUSES: readonly PayableViewStatus[] = ['Open', 'Approved', 'Paid', 'Cancelled'];

const isKind = (v: string): v is PayableView['kind'] => (KINDS as readonly string[]).includes(v);
const isStatus = (v: string): v is PayableViewStatus => (STATUSES as readonly string[]).includes(v);

export const rowToPayableView = (
  row: Readonly<PayableViewRow>,
): Result<PayableView, PayableViewMapperError> => {
  if (!isKind(row.kind)) return err('payable-view-row-invalid');
  if (!isStatus(row.status)) return err('payable-view-row-invalid');
  return ok({
    payableId: row.payableId,
    documentId: row.documentId,
    kind: row.kind,
    retentionType: row.retentionType,
    supplierRef: row.supplierRef,
    contractRef: row.contractRef,
    categoryRef: row.categoryRef,
    costCenterRef: row.costCenterRef,
    programRef: row.programRef,
    valueCents: row.valueCents,
    dueDate: row.dueDate,
    status: row.status,
    debitAccountRef: row.debitAccountRef,
    paidAt: row.paidAt,
  });
};
