// Parser de extrato bancário em PDF (layout Bradesco conta-corrente) — opera sobre o TEXTO já extraído
// do PDF (a extração via `unpdf` é do dispatcher, async). Produz o MESMO `ParsedStatement` do OFX, para a
// conciliação consumir de forma idêntica (spec "Leitura de Extrato por Gabarito").
//
// Layout tabular: `Data Lançamento Documento Crédito(R$) Débito(R$) Saldo(R$)`. Só a folha 1
// (Conta-corrente) entra; a folha 2 (Investimentos) é outro produto (fora do v1). O texto do `unpdf` é
// linearizado (perde a coluna), então o SINAL vem do DELTA de saldo (`saldo − saldo_anterior`), validado
// pela continuidade (`saldo_ant + valor == saldo`). `documento` = FITID (chave de conciliação, == OFX).

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type {
  ParseError,
  ParsedStatement,
  ParsedTransaction,
} from '../../application/ports/bank-statement-parser.ts';

const MONEY_RE = /\d{1,3}(?:\.\d{3})*,\d{2}/g;
const DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
// Corta a folha de Investimentos (folha 2) — só a conta-corrente concilia contra títulos.
const INVESTMENT_MARKER = 'Extrato de Investimentos';
// Fim do cabeçalho da tabela — as transações vêm depois.
const TABLE_HEADER_END = 'Saldo (R$)';

// "28.640,75" → 2864075 (centavos; sem float — parte inteira × 100 + 2 casas, como `amount.ts`).
const toCents = (raw: string): number => {
  const [intPart = '0', fracPart = ''] = raw.replace(/\./g, '').split(',');
  return Number(intPart) * 100 + Number(`${fracPart}00`.slice(0, 2));
};

const toDate = (dd: string, mm: string, yyyy: string): Date =>
  new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));

// Quebra a seção de transações em linhas: cada linha começa por `DD/MM/YYYY`.
const splitRows = (section: string): string[] =>
  section
    .split(/(?=\b\d{2}\/\d{2}\/\d{4}\b)/)
    .map((r) => r.trim())
    .filter((r) => r.length > 0);

export const parsePdf = (content: string): Result<ParsedStatement, ParseError> => {
  if (content.trim().length === 0) return err('empty-content');

  // Folha 1 (conta-corrente): tudo antes do marcador de investimentos.
  const contaCorrente = content.split(INVESTMENT_MARKER)[0] ?? content;

  const headerAt = contaCorrente.indexOf(TABLE_HEADER_END);
  if (headerAt === -1) return err('malformed-statement');
  const section = contaCorrente.slice(headerAt + TABLE_HEADER_END.length);

  const periodMatch =
    /Per[íi]odo:\s*(\d{2})\/(\d{2})\/(\d{4})\s*a\s*(\d{2})\/(\d{2})\/(\d{4})/.exec(contaCorrente);

  let openingBalanceCents: number | null = null;
  let prevBalance: number | null = null;
  const transactions: ParsedTransaction[] = [];

  for (const row of splitRows(section)) {
    const tokens = row.split(/\s+/);
    const dateMatch = DATE_RE.exec(tokens[0] ?? '');
    if (dateMatch === null) continue;

    const monies = row.match(MONEY_RE) ?? [];

    // "SALDO ANTERIOR": data + 1 valor (saldo inicial). Guarda e segue.
    if (/SALDO ANTERIOR/i.test(row) && monies.length === 1) {
      openingBalanceCents = toCents(monies[0] as string);
      prevBalance = openingBalanceCents;
      continue;
    }
    // Linha de transação: valor + saldo (≥ 2 valores). Rodapés/lixo (< 2) são ignorados.
    if (monies.length < 2) continue;
    if (prevBalance === null) return err('malformed-statement'); // sem SALDO ANTERIOR âncora

    const valueCents = toCents(monies[0] ?? '0');
    const balanceAfterCents = toCents(monies[monies.length - 1] ?? '0');
    const movement: 'Debit' | 'Credit' = balanceAfterCents >= prevBalance ? 'Credit' : 'Debit';

    // Validação de continuidade (integridade da extração linha a linha).
    const signed: number = movement === 'Credit' ? valueCents : -valueCents;
    if (prevBalance + signed !== balanceAfterCents) return err('malformed-statement');

    // `documento` (= FITID): token imediatamente antes do 1º valor. `historico`: entre a data e o documento.
    const firstMoneyIdx = tokens.findIndex((t) => new RegExp(`^${MONEY_RE.source}$`).test(t));
    const documento = firstMoneyIdx > 0 ? (tokens[firstMoneyIdx - 1] ?? '') : '';
    const payeeName = tokens.slice(1, Math.max(1, firstMoneyIdx - 1)).join(' ');

    const [, dd = '', mm = '', yyyy = ''] = dateMatch;
    transactions.push({
      fitid: documento.length > 0 ? documento : null,
      date: toDate(dd, mm, yyyy),
      movement,
      entryType: 'Other',
      payeeName,
      memo: '',
      valueCents,
      balanceAfterCents,
    });
    prevBalance = balanceAfterCents;
  }

  if (transactions.length === 0) return err('malformed-statement');

  const first = transactions[0];
  const last = transactions[transactions.length - 1];
  const periodStart =
    periodMatch !== null
      ? toDate(periodMatch[1] ?? '', periodMatch[2] ?? '', periodMatch[3] ?? '')
      : (first?.date ?? new Date(0));
  const periodEnd =
    periodMatch !== null
      ? toDate(periodMatch[4] ?? '', periodMatch[5] ?? '', periodMatch[6] ?? '')
      : (last?.date ?? new Date(0));

  return ok({
    periodStart,
    periodEnd,
    openingBalanceCents: openingBalanceCents ?? 0,
    closingBalanceCents: last?.balanceAfterCents ?? 0,
    transactions,
  });
};
