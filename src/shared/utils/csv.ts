/**
 * CSV genérico — RFC 4180 + hardening anti-fórmula. Agnóstico de domínio (ADR-0002 da feature
 * partners-http-gaps: serialização/parsing é borda, util puro, não porta genérica).
 *
 * Cada módulo achata seu próprio agregado em `readonly string[]` (a projeção conhece o domínio);
 * este util só conhece a mecânica de formato.
 *
 * Serialização (`toCsv`): entrada já é `string`, sem `Result`.
 *  - Anti-fórmula (CSV injection — OWASP): célula iniciando em `= + - @`, tab/CR/LF ou as
 *    variantes full-width `＝ ＋ － ＠` recebe prefixo `'` — senão Excel/Sheets executam a
 *    fórmula (security MUST).
 *  - RFC 4180: célula com `,` `"` `\n` `\r` é envolta em aspas; `"` interno vira `""`.
 *
 * Parsing (`parseCsv`/`tokenizeCsv`): texto → `Table`. Retorna `Result` (entrada externa pode
 * estar vazia/malformada).
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';

export const BOM = '﻿';
export const SEPARATOR = ',';
export const LINE_TERMINATOR = '\r\n';

// Gatilhos de fórmula (OWASP CSV Injection): ASCII `= + - @`, tab/CR/LF, e as variantes
// full-width `＝ ＋ － ＠` (interpretadas por Excel/Sheets em alguns locales).
const FORMULA_TRIGGERS: ReadonlySet<string> = new Set([
  '=',
  '+',
  '-',
  '@',
  '\t',
  '\r',
  '\n',
  '＝',
  '＋',
  '－',
  '＠',
]);
const RFC4180_SPECIAL = /[",\n\r]/;

const neutralizeFormula = (value: string): string => {
  const first = value[0];
  return first !== undefined && FORMULA_TRIGGERS.has(first) ? `'${value}` : value;
};

export const escapeCsvCell = (raw: string): string => {
  const neutralized = neutralizeFormula(raw);
  return RFC4180_SPECIAL.test(neutralized) ? `"${neutralized.replaceAll('"', '""')}"` : neutralized;
};

export const toCsvLine = (cells: readonly string[]): string =>
  cells.map(escapeCsvCell).join(SEPARATOR);

export const toCsv = (headers: readonly string[], rows: readonly (readonly string[])[]): string => {
  const lines = [toCsvLine(headers), ...rows.map(toCsvLine)];
  return BOM + lines.join(LINE_TERMINATOR) + LINE_TERMINATOR;
};

// ─── Parsing (RFC 4180) ──────────────────────────────────────────────────────

/** Tabela plana: cabeçalho + linhas de dados (cada célula já desescapada). */
export type Table = Readonly<{
  headers: readonly string[];
  rows: readonly (readonly string[])[];
}>;

export type CsvParseError = 'csv-empty' | 'csv-malformed';

type TokenizeResult = Readonly<{
  records: readonly (readonly string[])[];
  /** true se o conteúdo terminou dentro de aspas (campo não fechado → malformado). */
  unterminatedQuote: boolean;
}>;

const tokenize = (content: string): TokenizeResult => {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content.charAt(i);

    if (inQuotes) {
      if (ch === '"') {
        if (content.charAt(i + 1) === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === SEPARATOR) {
      record.push(field);
      field = '';
    } else if (ch === '\r') {
      // ignora CR — quebra de linha tratada no \n (CRLF/LF)
    } else if (ch === '\n') {
      record.push(field);
      records.push(record);
      field = '';
      record = [];
    } else {
      field += ch;
    }
  }

  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return { records, unterminatedQuote: inQuotes };
};

/** Tokeniza CSV em registros (RFC 4180: aspas, vírgula interna, `""`→`"`, CRLF/LF). */
export const tokenizeCsv = (content: string): readonly (readonly string[])[] =>
  tokenize(content).records;

/**
 * Parseia CSV em `Table` (1ª linha = cabeçalho). Linhas de dados totalmente em branco são
 * descartadas. Conteúdo vazio/só-espaços → `csv-empty`; aspas não fechadas → `csv-malformed`.
 */
export const parseCsv = (content: string): Result<Table, CsvParseError> => {
  if (content.trim() === '') return err('csv-empty');

  const { records, unterminatedQuote } = tokenize(content);
  if (unterminatedQuote) return err('csv-malformed');

  const [header, ...dataRecords] = records;
  if (header === undefined) return err('csv-empty');

  const rows = dataRecords.filter((rec) => rec.some((cell) => cell.trim() !== ''));
  return ok({ headers: header, rows });
};
