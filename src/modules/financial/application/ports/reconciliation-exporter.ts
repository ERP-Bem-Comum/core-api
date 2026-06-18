import type { Result } from '../../../../shared/primitives/result.ts';
import type { StatementTransaction } from '../../domain/statement/types.ts';

// Exportador da conciliação de um período (US6) em OFX/CSV — texto, Node puro sem lib (D-FORMATS).
export type ReconciliationExportFormat = 'ofx' | 'csv';
export type ReconciliationExportError = 'unsupported-export-format';

export type ReconciliationExportData = Readonly<{
  debitAccountRef: string;
  periodStart: Date;
  periodEnd: Date;
  transactions: readonly StatementTransaction[];
}>;

export type ReconciliationExporter = Readonly<{
  export: (
    format: ReconciliationExportFormat,
    data: ReconciliationExportData,
  ) => Result<string, ReconciliationExportError>;
}>;
