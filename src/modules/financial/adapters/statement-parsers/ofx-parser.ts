import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { isValidDate } from '../../../../shared/utils/date.ts';
import type {
  ParseError,
  ParsedStatement,
  ParsedTransaction,
} from '../../application/ports/bank-statement-parser.ts';
import { parseAmountCents } from './amount.ts';

const tag = (block: string, name: string): string | null => {
  const m = new RegExp(`<${name}>([^<\\r\\n]*)`, 'i').exec(block);
  return m === null ? null : (m[1] ?? '').trim();
};

const parseOfxDate = (raw: string): Date => {
  const y = Number(raw.slice(0, 4));
  const mo = Number(raw.slice(4, 6));
  const d = Number(raw.slice(6, 8));
  return new Date(Date.UTC(y, mo - 1, d));
};

export const parseOfx = (content: string): Result<ParsedStatement, ParseError> => {
  if (content.trim().length === 0) return err('empty-content');

  const blocks = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi);
  if (blocks === null || blocks.length === 0) return err('malformed-statement');

  const transactions: ParsedTransaction[] = [];
  for (const block of blocks) {
    const amountRaw = tag(block, 'TRNAMT');
    const posted = tag(block, 'DTPOSTED');
    if (amountRaw === null || posted === null) return err('malformed-statement');

    const signed = parseAmountCents(amountRaw);
    if (signed === null) return err('malformed-statement');

    const date = parseOfxDate(posted);
    if (!isValidDate(date)) return err('malformed-statement');

    const trnType = (tag(block, 'TRNTYPE') ?? '').toUpperCase();
    const movement: 'Debit' | 'Credit' =
      trnType === 'CREDIT' || (trnType.length === 0 && signed > 0) ? 'Credit' : 'Debit';

    transactions.push({
      fitid: tag(block, 'FITID'),
      date,
      movement,
      entryType: trnType.length > 0 ? trnType : 'Other',
      payeeName: tag(block, 'NAME') ?? '',
      memo: tag(block, 'MEMO') ?? '',
      valueCents: Math.abs(signed),
      balanceAfterCents: 0,
    });
  }

  const startRaw = tag(content, 'DTSTART');
  const endRaw = tag(content, 'DTEND');
  const ledgerRaw = tag(content, 'BALAMT');
  const first = transactions[0];
  const last = transactions[transactions.length - 1];

  return ok({
    periodStart:
      startRaw === null ? (first !== undefined ? first.date : new Date(0)) : parseOfxDate(startRaw),
    periodEnd:
      endRaw === null ? (last !== undefined ? last.date : new Date(0)) : parseOfxDate(endRaw),
    openingBalanceCents: 0,
    closingBalanceCents: ledgerRaw === null ? 0 : (parseAmountCents(ledgerRaw) ?? 0),
    transactions,
  });
};
