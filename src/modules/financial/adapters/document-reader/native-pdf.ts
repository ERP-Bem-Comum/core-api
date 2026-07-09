import { ok, err } from '../../../../shared/primitives/result.ts';
import type { Result } from '../../../../shared/primitives/result.ts';
import * as Money from '../../../../shared/kernel/money.ts';
import * as Competencia from '../../domain/document/competencia.ts';
import * as Retention from '../../domain/shared/retention.ts';
import type { DocumentType } from '../../domain/document/types.ts';
import type { DocumentReaderResult, SupplierIdentity } from '../../domain/document-reader/types.ts';
import type { DocumentReaderError } from '../../domain/document-reader/errors.ts';
import type {
  DocumentReaderPort,
  DocumentReaderInput,
} from '../../application/ports/document-reader.ts';
import {
  detectStructure,
  inflateGuarded,
  extractStreams,
  isFlate,
  MAX_BYTES,
  MAX_TOTAL_INFLATE,
} from './pdf-lowlevel.ts';

const MAX_OPERAND = 4096; // teto por operando de texto (nenhum campo fiscal real passa disso)

// Reader nativo de PDF de texto (FIN-DOC-READER-NATIVE, ADR-0050). Caminho principal 100% `node:zlib`.
// Extrai texto do content-stream (WinAnsi direto; Identity-H via CMap `/ToUnicode`) e estrutura por
// tipo com âncoras. `resolvedVia:'native-text'`. Sem texto recuperável → `scanned-unsupported`.

// Módulo de parsing de BYTES: `Uint8Array` não tem variant readonly nativo no TS 6 (ver port).
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

const latin1 = (b: Uint8Array): string => Buffer.from(b).toString('latin1');

// --- Decodificação de texto ---------------------------------------------------

const decodeLiteral = (inner: string): string =>
  inner
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\([()\\])/g, '$1');

const decodeHex = (hex: string, toUnicode: ReadonlyMap<number, string>): string => {
  let out = '';
  for (let i = 0; i + 4 <= hex.length; i += 4) {
    out += toUnicode.get(Number.parseInt(hex.slice(i, i + 4), 16)) ?? '';
  }
  return out;
};

// CMap /ToUnicode → mapa código(2-byte)→char (bfchar). Suficiente p/ Identity-H fiscal.
const parseToUnicode = (cmap: string): ReadonlyMap<number, string> => {
  const map = new Map<number, string>();
  const blocks = /beginbfchar([^]*?)endbfchar/g;
  for (let block = blocks.exec(cmap); block !== null; block = blocks.exec(cmap)) {
    const pair = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
    const body = block[1] ?? '';
    for (let p = pair.exec(body); p !== null; p = pair.exec(body)) {
      if (p[1] === undefined || p[2] === undefined) continue;
      map.set(Number.parseInt(p[1], 16), String.fromCodePoint(Number.parseInt(p[2], 16)));
    }
  }
  return map;
};

// Tokenizer char-a-char O(n) — SEM regex de backtracking (anti-ReDoS, F1). Cada operando de string
// de um `Tj` vira uma linha: literal `(...)` (com escape + parênteses balanceados) ou hex `<...>`,
// cada um limitado a MAX_OPERAND.
const extractText = (content: string, toUnicode: ReadonlyMap<number, string> | null): string => {
  const lines: string[] = [];
  const n = content.length;
  let pending: { readonly kind: 'lit' | 'hex'; readonly value: string } | null = null;
  let i = 0;
  while (i < n) {
    const ch = content[i];
    if (ch === '(') {
      let j = i + 1;
      let depth = 1;
      let buf = '';
      while (j < n && depth > 0 && buf.length < MAX_OPERAND) {
        const c = content[j];
        if (c === undefined) break;
        if (c === '\\') {
          buf += content.slice(j, j + 2);
          j += 2;
          continue;
        }
        if (c === '(') depth += 1;
        else if (c === ')') {
          depth -= 1;
          if (depth === 0) {
            j += 1;
            break;
          }
        }
        buf += c;
        j += 1;
      }
      pending = { kind: 'lit', value: buf };
      i = j;
    } else if (ch === '<' && content[i + 1] !== '<') {
      let j = i + 1;
      let buf = '';
      for (
        let c = content[j];
        j < n && c !== undefined && c !== '>' && buf.length < MAX_OPERAND;
        c = content[j]
      ) {
        buf += c;
        j += 1;
      }
      pending = { kind: 'hex', value: buf };
      i = j + 1;
    } else if (ch === 'T' && content[i + 1] === 'j' && pending !== null) {
      if (pending.kind === 'lit') lines.push(decodeLiteral(pending.value));
      else if (toUnicode !== null) lines.push(decodeHex(pending.value, toUnicode));
      pending = null;
      i += 2;
    } else {
      i += 1;
    }
  }
  return lines.join('\n');
};

// --- Estruturação por tipo ----------------------------------------------------

const parseBrCents = (raw: string): number | undefined => {
  const m = /^(\d+)(?:,(\d{1,2}))?$/.exec(raw.trim().replace(/\./g, '')); // remove milhar '.'
  if (m?.[1] === undefined) return undefined;
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
};

const group1 = (text: string, re: RegExp): string | undefined => re.exec(text)?.[1];

const detectType = (text: string): DocumentType | undefined => {
  if (/NFS-e|NOTA FISCAL DE SERVI/i.test(text)) return 'NFS-e';
  if (/RECIBO DE PAGAMENTO A AUT|\bRPA\b/i.test(text)) return 'RPA';
  if (/BOLETO/i.test(text)) return 'Boleto';
  return undefined;
};

const parseCompetence = (text: string): Competencia.Competencia | undefined => {
  const m = /Compet[eê]ncia:\s*(\d{2})\/(\d{4})/i.exec(text);
  if (m?.[1] === undefined || m[2] === undefined) return undefined;
  const c = Competencia.fromString(`${m[2]}-${m[1]}`);
  return c.ok ? c.value : undefined;
};

const parseRetentions = (text: string, baseCents: number): readonly Retention.Retention[] => {
  const out: Retention.Retention[] = [];
  const re = /(ISS|INSS|IRRF)\s*\((\d+,\d+)%\)[^:\n]*:\s*R\$\s*([\d.,]+)/gi;
  for (let m = re.exec(text); m !== null; m = re.exec(text)) {
    const type = m[1]?.toUpperCase();
    const rateBps = m[2] !== undefined ? parseBrCents(m[2]) : undefined;
    const valueCents = m[3] !== undefined ? parseBrCents(m[3]) : undefined;
    if (type === undefined || rateBps === undefined || valueCents === undefined) continue;
    const r = Retention.create({ type, baseCents, rateBps, valueCents });
    if (r.ok) out.push(r.value);
  }
  return out;
};

const structure = (text: string): Result<DocumentReaderResult, DocumentReaderError> => {
  const type = detectType(text);
  if (type === undefined) return err('malformed-document');

  const documentNumber = group1(text, /N[uú]mero[^:\n]*:\s*(\S+)/i);
  const legalName = group1(text, /Prestador:\s*(.+)/i)?.trim();
  const taxId = group1(text, /CNPJ:\s*(\d+)/i) ?? group1(text, /CPF:\s*(\d+)/i);
  const supplier: SupplierIdentity | undefined =
    legalName !== undefined && taxId !== undefined ? { legalName, taxId } : undefined;
  const competence = parseCompetence(text);

  const grossRaw =
    group1(text, /Valor Total[^:\n]*:\s*R\$\s*([\d.,]+)/i) ??
    group1(text, /Valor Bruto:\s*R\$\s*([\d.,]+)/i) ??
    group1(text, /Valor do Documento:\s*R\$\s*([\d.,]+)/i);
  const grossCents = grossRaw !== undefined ? parseBrCents(grossRaw) : undefined;
  let grossValue: Money.Money | undefined = undefined;
  if (grossCents !== undefined) {
    const m = Money.fromCents(grossCents);
    if (!m.ok) return err('malformed-document');
    grossValue = m.value;
  }

  const retentions = grossCents !== undefined ? parseRetentions(text, grossCents) : [];

  return ok({
    resolvedVia: 'native-text',
    type,
    ...(documentNumber !== undefined ? { documentNumber } : {}),
    ...(competence !== undefined ? { competence } : {}),
    ...(supplier !== undefined ? { supplier } : {}),
    ...(grossValue !== undefined ? { grossValue } : {}),
    ...(retentions.length > 0 ? { retentions } : {}),
  });
};

// --- Port ---------------------------------------------------------------------

const readNative = (bytes: Uint8Array): Result<DocumentReaderResult, DocumentReaderError> => {
  if (bytes.length > MAX_BYTES) return err('source-too-large');
  const structural = detectStructure(bytes);
  if (!structural.ok) return err(structural.error);

  const inflated: string[] = [];
  let totalInflated = 0;
  for (const s of extractStreams(bytes).filter(isFlate)) {
    const r = inflateGuarded(s.data);
    if (!r.ok) return err(r.error);
    totalInflated += r.value.length;
    if (totalInflated > MAX_TOTAL_INFLATE) return err('decompression-limit-exceeded');
    inflated.push(latin1(r.value));
  }

  const cmap = inflated.find((t) => t.includes('beginbfchar'));
  const toUnicode = cmap !== undefined ? parseToUnicode(cmap) : null;
  const text = inflated
    .filter((t) => !t.includes('beginbfchar'))
    .map((c) => extractText(c, toUnicode))
    .join('\n')
    .trim();

  if (text === '') return err('scanned-unsupported');
  return structure(text);
};

export const createNativePdfDocumentReader = (): DocumentReaderPort => ({
  read: async (input: DocumentReaderInput) => {
    if (input.bytes.length === 0) return err('empty-input');
    return readNative(input.bytes);
  },
});
