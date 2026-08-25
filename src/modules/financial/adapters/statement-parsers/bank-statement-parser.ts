import { Buffer } from 'node:buffer';
import { extractText, getDocumentProxy } from 'unpdf';

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type {
  BankStatementParser,
  ParseError,
  ParsedStatement,
} from '../../application/ports/bank-statement-parser.ts';
import { parseOfx } from './ofx-parser.ts';
import { parseCsv } from './csv-parser.ts';
import { parsePdf } from './pdf-parser.ts';

// PDF chega em base64 (binário). Extrai a camada de texto via `unpdf` (mesma lib do leitor de documento
// fiscal, #388) — SEM OCR de imagem. Falha de decode/extração → `malformed-statement`.
const extractPdfText = async (base64: string): Promise<Result<string, ParseError>> => {
  try {
    const bytes = new Uint8Array(Buffer.from(base64, 'base64'));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- `unpdf` tipa o proxy de forma frouxa; handle opaco só repassado ao extractText.
    const pdf = await getDocumentProxy(bytes);
    // `mergePages: true` → `text` é string única. Cast estreita o retorno da lib (evita unsafe-assignment).
    const { text } = (await extractText(pdf, { mergePages: true })) as { text: string };
    return ok(text);
  } catch {
    return err('malformed-statement');
  }
};

// Dispatcher do port: delega por formato. OFX/CSV são síncronos por dentro; PDF extrai o texto (async)
// e reusa o `parsePdf`. Formato fora de {OFX,CSV,PDF} → unsupported-format.
export const bankStatementParser: BankStatementParser = {
  parse: async (format, content): Promise<Result<ParsedStatement, ParseError>> => {
    switch (format) {
      case 'OFX':
        return parseOfx(content);
      case 'CSV':
        return parseCsv(content);
      case 'PDF': {
        const text = await extractPdfText(content);
        if (!text.ok) return text;
        return parsePdf(text.value);
      }
      default: {
        const _exhaustive: never = format;
        void _exhaustive;
        return err('unsupported-format');
      }
    }
  },
};
