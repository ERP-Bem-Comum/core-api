/**
 * Barrel dos formatters da CLI do módulo Financial.
 *
 * Exporta:
 *   - `formatErrorCode` — dicionário PT-BR de erros.
 *   - `formatPayable` — bloco multilinhas do agregado Payable (FIN-CLI-MOSTRAR-TITULO).
 *   - `formatStatus` — label PT-BR do PayableStatus.
 *   - `formatMoney` — BRL formatado.
 *   - `formatDate` — DD/MM/YYYY UTC.
 *
 * Formatters específicos de outros agregados (e.g., FiscalDocument) entrarão
 * com tickets respectivos.
 */

export * from './error.ts';
export * from './payable.ts';
export * from './status.ts';
export * from './money.ts';
export * from './date.ts';
