import { type Result, err } from '../../../../shared/primitives/result.ts';
import type {
  BankStatementParser,
  ParseError,
  ParsedStatement,
} from '../../application/ports/bank-statement-parser.ts';
import { parseOfx } from './ofx-parser.ts';
import { parseCsv } from './csv-parser.ts';

// Dispatcher do port: delega por formato. Formato fora de {OFX,CSV} → unsupported-format.
export const bankStatementParser: BankStatementParser = {
  parse: (format, content): Result<ParsedStatement, ParseError> => {
    switch (format) {
      case 'OFX':
        return parseOfx(content);
      case 'CSV':
        return parseCsv(content);
      default: {
        const _exhaustive: never = format;
        void _exhaustive;
        return err('unsupported-format');
      }
    }
  },
};
