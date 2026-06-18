import { type Result, ok } from '../../../../shared/primitives/result.ts';
import type {
  BankStatementParser,
  ParsedStatement,
  ParseError,
} from '../../application/ports/bank-statement-parser.ts';

// Double de teste para camadas que dependem do parser (use-case/borda — #120), sem ler arquivo real.
const CANNED: ParsedStatement = {
  periodStart: new Date('2024-05-01T00:00:00.000Z'),
  periodEnd: new Date('2024-05-31T00:00:00.000Z'),
  openingBalanceCents: 0,
  closingBalanceCents: 50000,
  transactions: [
    {
      fitid: 'FAKE-1',
      date: new Date('2024-05-18T00:00:00.000Z'),
      movement: 'Debit',
      entryType: 'TED',
      payeeName: 'FORNECEDOR X',
      memo: 'pagamento',
      valueCents: 84500,
      balanceAfterCents: 50000,
    },
  ],
};

export const makeFakeParser = (statement: ParsedStatement = CANNED): BankStatementParser => ({
  parse: (): Result<ParsedStatement, ParseError> => ok(statement),
});
