/**
 * Serialização CSV genérica — RFC 4180 + hardening anti-fórmula. Agnóstica de domínio.
 *
 * Cada módulo achata seu próprio agregado em `readonly string[]` (a projeção conhece o domínio);
 * este util só conhece a mecânica de formato. Não há `Result`: a entrada já é `string`.
 *
 * Escape:
 *  - Anti-fórmula (CSV injection): célula iniciando em `= + - @ \t \r` recebe prefixo `'` —
 *    senão Excel/Sheets executam a fórmula (security MUST).
 *  - RFC 4180: célula com `,` `"` `\n` `\r` é envolta em aspas; `"` interno vira `""`.
 */

export const BOM = '﻿';
export const SEPARATOR = ',';
export const LINE_TERMINATOR = '\r\n';

const FORMULA_TRIGGERS: ReadonlySet<string> = new Set(['=', '+', '-', '@', '\t', '\r']);
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
