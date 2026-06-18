import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { isValidDate } from '../../../../shared/utils/date.ts';
import type {
  ParseError,
  ParsedStatement,
  ParsedTransaction,
} from '../../application/ports/bank-statement-parser.ts';
import { parseAmountCents } from './amount.ts';

// Extrato CSV de banco BR: delimitador `;`, header + linhas
// `data;tipo;valor;nome;descricao;saldo`. Sem FITID nativo → `fitid: null` (síntese é do domínio).
export const parseCsv = (content: string): Result<ParsedStatement, ParseError> => {
  if (content.trim().length === 0) return err('empty-content');

  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) return err('malformed-statement');

  const transactions: ParsedTransaction[] = [];
  for (const row of lines.slice(1)) {
    const cells = row.split(';');
    if (cells.length < 6) return err('malformed-statement');

    const date = new Date(`${(cells[0] ?? '').trim()}T00:00:00.000Z`);
    if (!isValidDate(date)) return err('malformed-statement');

    const signed = parseAmountCents(cells[2] ?? '');
    const balance = parseAmountCents(cells[5] ?? '');
    if (signed === null || balance === null) return err('malformed-statement');

    const tipo = (cells[1] ?? '').trim().toUpperCase();
    const movement: 'Debit' | 'Credit' =
      tipo === 'CREDITO' || (tipo !== 'DEBITO' && signed > 0) ? 'Credit' : 'Debit';

    transactions.push({
      fitid: null,
      date,
      movement,
      entryType: tipo.length > 0 ? tipo : 'Other',
      payeeName: (cells[3] ?? '').trim(),
      memo: (cells[4] ?? '').trim(),
      valueCents: Math.abs(signed),
      balanceAfterCents: balance,
    });
  }

  const first = transactions[0];
  const last = transactions[transactions.length - 1];
  return ok({
    periodStart: first !== undefined ? first.date : new Date(0),
    periodEnd: last !== undefined ? last.date : new Date(0),
    openingBalanceCents: 0,
    closingBalanceCents: last !== undefined ? last.balanceAfterCents : 0,
    transactions,
  });
};
