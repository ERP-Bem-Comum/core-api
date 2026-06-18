// Exportador da conciliação (US6) — OFX/CSV em texto, Node puro sem lib (D-FORMATS). CSV via util
// compartilhado (RFC 4180 + anti-injeção). Pure: Result<string, 'unsupported-export-format'>.

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { toCsv } from '#src/shared/utils/csv.ts';
import type {
  ReconciliationExportData,
  ReconciliationExportFormat,
  ReconciliationExporter,
  ReconciliationExportError,
} from '#src/modules/financial/application/ports/reconciliation-exporter.ts';

const isoDate = (d: Date): string => d.toISOString().slice(0, 10);
const ofxDate = (d: Date): string => d.toISOString().slice(0, 10).replace(/-/g, '');

const toCsvExport = (data: ReconciliationExportData): string => {
  const headers = ['data', 'fitid', 'movimento', 'valor_cents', 'favorecido', 'memo', 'status'];
  const rows = data.transactions.map((t) => [
    isoDate(t.date),
    String(t.fitid),
    t.movement,
    String(t.valueCents),
    t.payeeName,
    t.memo,
    t.reconciliationStatus,
  ]);
  const total = data.transactions.reduce((acc, t) => acc + t.valueCents, 0);
  // Linha de totalização (D-EXPORT): nº de transações + soma dos valores em centavos.
  rows.push([
    'TOTAL',
    '',
    '',
    String(total),
    '',
    '',
    `${String(data.transactions.length)} transacoes`,
  ]);
  return toCsv(headers, rows, ';');
};

const toOfxExport = (data: ReconciliationExportData): string => {
  const total = data.transactions.reduce((acc, t) => acc + t.valueCents, 0);
  const trns = data.transactions
    .map((t) => {
      const amount = (t.movement === 'Debit' ? -t.valueCents : t.valueCents) / 100;
      return [
        '<STMTTRN>',
        `<TRNTYPE>${t.movement === 'Debit' ? 'DEBIT' : 'CREDIT'}`,
        `<DTPOSTED>${ofxDate(t.date)}`,
        `<TRNAMT>${amount.toFixed(2)}`,
        `<FITID>${String(t.fitid)}`,
        `<NAME>${t.payeeName}`,
        `<MEMO>${t.memo}`,
        '</STMTTRN>',
      ].join('\n');
    })
    .join('\n');
  return [
    'OFXHEADER:100 DATA:OFXSGML VERSION:102',
    '<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS>',
    `<ACCTID>${data.debitAccountRef}`,
    `<BANKTRANLIST><DTSTART>${ofxDate(data.periodStart)}<DTEND>${ofxDate(data.periodEnd)}`,
    trns,
    '</BANKTRANLIST>',
    `<LEDGERBAL><BALAMT>${(total / 100).toFixed(2)}</LEDGERBAL>`,
    '</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>',
  ].join('\n');
};

export const reconciliationExporter: ReconciliationExporter = {
  export: (
    format: ReconciliationExportFormat,
    data: ReconciliationExportData,
  ): Result<string, ReconciliationExportError> => {
    switch (format) {
      case 'csv':
        return ok(toCsvExport(data));
      case 'ofx':
        return ok(toOfxExport(data));
      default: {
        const _exhaustive: never = format;
        void _exhaustive;
        return err('unsupported-export-format');
      }
    }
  },
};
