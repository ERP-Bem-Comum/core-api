import type { Result } from '../../../../shared/primitives/result.ts';
import type { EntryType } from '../../domain/statement/entry-type.ts';

// Port do tradutor de extrato (D-FORMATS). OFX/CSV chegam como texto; PDF chega em base64 (binário) e o
// adapter extrai o texto via `unpdf` — por isso `parse` é ASYNC. `fitid` é BRUTO aqui (null no CSV sem
// FITID nativo); a síntese determinística é do domínio (#118). `entryType` normalizado (#159).

export type ParseError = 'malformed-statement' | 'unsupported-format' | 'empty-content';

export type StatementFormat = 'OFX' | 'CSV' | 'PDF';

export type ParsedTransaction = Readonly<{
  fitid: string | null;
  date: Date;
  movement: 'Debit' | 'Credit';
  entryType: EntryType;
  payeeName: string;
  memo: string;
  valueCents: number;
  balanceAfterCents: number;
}>;

export type ParsedStatement = Readonly<{
  periodStart: Date;
  periodEnd: Date;
  openingBalanceCents: number;
  closingBalanceCents: number;
  transactions: readonly ParsedTransaction[];
}>;

export type BankStatementParser = Readonly<{
  parse: (format: StatementFormat, content: string) => Promise<Result<ParsedStatement, ParseError>>;
}>;
