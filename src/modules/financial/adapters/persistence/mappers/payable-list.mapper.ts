import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { DocumentStatus, DocumentType } from '#src/modules/financial/domain/document/types.ts';
import type { PayableKind } from '#src/modules/financial/domain/payable/types.ts';
import type { RetentionType } from '#src/modules/financial/domain/shared/retention.ts';
import type { PayableListItem } from '#src/modules/financial/domain/payable/query.ts';

// Mapper do read path payable-centric (#221): linha plana do JOIN `fin_payables ⋈ fin_documents`
// (ou derivada do agregado in-memory) → `PayableListItem`. Valida os enums vindos do banco (`kind`,
// `status`) — o read-model rejeita estado inválido (.claude/rules/adapters.md).

export type PayableListRow = Readonly<{
  payableId: string;
  documentId: string;
  kind: string;
  retentionType: string | null;
  valueCents: number;
  dueDate: Date;
  status: string;
  documentNumber: string | null;
  series: string | null;
  documentType: string | null;
  supplierRef: string | null;
  contractRef: string | null;
  issueDate: Date | null;
  paymentMethod: string | null;
  version: number;
  grossValueCents: number | null;
  netValueCents: number | null;
}>;

export type PayableListMapperError = 'invalid-payable-kind' | 'invalid-payable-status';

const KINDS: readonly PayableKind[] = ['Parent', 'Child'];
const STATUSES: readonly DocumentStatus[] = [
  'Draft',
  'Open',
  'Approved',
  'Transmitted',
  'Refused',
  'Paid',
  'Reconciled',
];
const RETENTIONS: readonly RetentionType[] = ['ISS', 'IRRF', 'INSS', 'CSRF'];
const DOC_TYPES: readonly DocumentType[] = [
  'NFS-e',
  'DANFE',
  'RPA',
  'Fatura',
  'Boleto',
  'Recibo',
  'Imposto',
];

const toKind = (raw: string): PayableKind | null =>
  KINDS.includes(raw as PayableKind) ? (raw as PayableKind) : null;
const toStatus = (raw: string): DocumentStatus | null =>
  STATUSES.includes(raw as DocumentStatus) ? (raw as DocumentStatus) : null;
// Display fields lenientes: valor fora do enum vira null (a coluna já tem CHECK; null não quebra o grid).
const toRetention = (raw: string | null): RetentionType | null =>
  raw !== null && RETENTIONS.includes(raw as RetentionType) ? (raw as RetentionType) : null;
const toDocType = (raw: string | null): DocumentType | null =>
  raw !== null && DOC_TYPES.includes(raw as DocumentType) ? (raw as DocumentType) : null;

export const rowToPayableListItem = (
  row: PayableListRow,
): Result<PayableListItem, PayableListMapperError> => {
  const kind = toKind(row.kind);
  if (kind === null) return err('invalid-payable-kind');
  const status = toStatus(row.status);
  if (status === null) return err('invalid-payable-status');

  return ok({
    payableId: row.payableId,
    documentId: row.documentId,
    documentNumber: row.documentNumber,
    series: row.series,
    documentType: toDocType(row.documentType),
    kind,
    retentionType: toRetention(row.retentionType),
    valueCents: row.valueCents,
    dueDate: row.dueDate,
    status,
    supplierRef: row.supplierRef,
    contractRef: row.contractRef,
    issueDate: row.issueDate,
    paymentMethod: row.paymentMethod,
    version: row.version,
    grossValueCents: row.grossValueCents,
    netValueCents: row.netValueCents,
  });
};
