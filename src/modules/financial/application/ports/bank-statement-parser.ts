import type { Result } from '../../../../shared/primitives/result.ts';

// Port do tradutor de extrato (D-FORMATS). Parsing é puro/sync — o conteúdo já chega como string.
// `fitid` é BRUTO aqui (null no CSV sem FITID nativo); a síntese determinística é do domínio (#118).

export type ParseError = 'malformed-statement' | 'unsupported-format' | 'empty-content';

export type ParsedTransaction = Readonly<{
  fitid: string | null;
  date: Date;
  movement: 'Debit' | 'Credit';
  entryType: string;
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
  parse: (format: 'OFX' | 'CSV', content: string) => Result<ParsedStatement, ParseError>;
}>;
