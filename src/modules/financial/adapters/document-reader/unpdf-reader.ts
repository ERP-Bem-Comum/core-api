import { extractText } from 'unpdf';
import { err } from '../../../../shared/primitives/result.ts';
import { structureText } from './native-pdf.ts';
import { MAX_BYTES } from './pdf-lowlevel.ts';
import type {
  DocumentReaderPort,
  DocumentReaderInput,
} from '../../application/ports/document-reader.ts';

const UNPDF_TIMEOUT_MS = 5000; // #396 F1: teto de tempo do parser externo (defesa em profundidade).

// #396 — fallback gated (ADR-0050 §"unpdf entra só se o in-house não bater a métrica"). Quando o reader
// NATIVO in-house classifica mas NÃO extrai os campos (layouts fiscais reais são tabulares — DANFSe v1.0,
// NFS-e SP — rótulo e valor em colunas distintas), o `unpdf` (MIT, pdf.js serverless) extrai o texto na
// ORDEM DE LEITURA (rótulo e valor adjacentes), e a MESMA `structureText()` casa os campos por regex
// linear. Só é consultado ATRÁS do nativo na cascata. Adapter: converte qualquer exceção do pdf.js em
// `Result` (regra `.claude/rules/adapters.md` — nunca vazar Error para application/domain).
export const createUnpdfDocumentReader = (): DocumentReaderPort => ({
  // `bytes: Uint8Array` não tem variant readonly nativo no TS 6 (ver port document-reader.ts).
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  read: async (input: DocumentReaderInput) => {
    if (input.bytes.length === 0) return err('empty-input');
    if (input.bytes.length > MAX_BYTES) return err('source-too-large');
    try {
      // #396 F1 (CWE-400/834): teto de tempo — o pdf.js/unpdf não expõe `signal`/timeout e é um parser
      // de propósito geral (sem os guards O(n) do reader in-house). Limita hangs ASSÍNCRONOS (a maioria);
      // hang SÍNCRONO de CPU exige `worker_threads.terminate()` (risco residual → follow-up).
      const { text } = await Promise.race([
        extractText(input.bytes, { mergePages: true }),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('unpdf-timeout'));
          }, UNPDF_TIMEOUT_MS).unref();
        }),
      ]);
      if (text.trim() === '') return err('scanned-unsupported');
      return structureText(text, 'unpdf');
    } catch {
      return err('malformed-document');
    }
  },
});
