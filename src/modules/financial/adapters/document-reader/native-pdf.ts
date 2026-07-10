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
// #386 F1 (anti-amplificação, CWE-400/789): teto de operandos acumulados entre dois flushes
// (Tj/TJ/posição). Sem isso, um content-stream com milhões de `()`/`<>` sem mostrar texto faria
// `pending` crescer sem limite (KB de payload → centenas de MB de heap). Nenhuma linha fiscal real
// tem tantos runs entre flushes; operandos acima do teto são descartados (o excedente não é texto útil).
const MAX_PENDING_OPERANDS = 2048;

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
      // #389 (CWE-248): guarda de faixa — um codepoint > 0x10FFFF faria String.fromCodePoint lançar
      // RangeError não capturado, vazando pela borda do port. Fail-closed: ignora o mapeamento inválido
      // (o `?? ''` do decodeHex trata o código sem entrada como vazio, coerente com o resto do arquivo).
      const cp = Number.parseInt(p[2], 16);
      if (cp > 0x10ffff) continue;
      map.set(Number.parseInt(p[1], 16), String.fromCodePoint(cp));
    }
  }
  return map;
};

// Tokenizer char-a-char O(n) — SEM regex de backtracking (anti-ReDoS, F1). Coleta operandos de string
// (`(...)` literal balanceado ou `<...>` hex, cada um ≤ MAX_OPERAND) em `pending` e os aplica no operador
// de mostrar texto: `Tj` (1 operando) e **`TJ`** (array `[ ... ]`, N operandos + kerning numérico ignorado).
// Reconstrução de linha (#386): operadores de posição (`Td`/`TD`/`T*`/`Tm`) e `BT`/`ET` fecham a linha
// corrente; runs de texto entre eles são CONCATENADOS na mesma linha (desfaz a fragmentação 1-linha-por-Tj).
interface Operand {
  readonly kind: 'lit' | 'hex';
  readonly value: string;
}
const extractText = (content: string, toUnicode: ReadonlyMap<number, string> | null): string => {
  const lines: string[] = [];
  let line = '';
  const pending: Operand[] = [];
  const n = content.length;

  const decode = (op: Operand): string =>
    op.kind === 'lit'
      ? decodeLiteral(op.value)
      : toUnicode !== null
        ? decodeHex(op.value, toUnicode)
        : '';
  const show = (): void => {
    for (const op of pending) line += decode(op);
    pending.length = 0;
  };
  const flushLine = (): void => {
    pending.length = 0;
    if (line !== '') {
      lines.push(line);
      line = '';
    }
  };

  let i = 0;
  let lastNum = 0; // #388 2b: último operando numérico visto (o ty do próximo Td/TD)
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
      if (pending.length < MAX_PENDING_OPERANDS) pending.push({ kind: 'lit', value: buf });
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
      if (pending.length < MAX_PENDING_OPERANDS) pending.push({ kind: 'hex', value: buf });
      i = j + 1;
    } else if (ch === 'T' && (content[i + 1] === 'j' || content[i + 1] === 'J')) {
      show(); // Tj (1 operando) | TJ (N operandos do array [...])
      i += 2;
    } else if (ch === 'T' && (content[i + 1] === 'd' || content[i + 1] === 'D')) {
      // #388 2b: Td/TD movem o cursor por (tx, ty) = (n1, n2). ty≈0 → mesmo baseline (avanço
      // horizontal): separa palavras com um espaço mas NÃO fecha a linha — preserva token hifenizado
      // e mantém rótulo+valor na mesma linha (os regexes de campo usam `[^:\n]`). ty≠0 → nova linha.
      if (Math.abs(lastNum) < 0.01) {
        if (line !== '') line += ' ';
      } else {
        flushLine();
      }
      i += 2;
    } else if (ch === 'T' && (content[i + 1] === '*' || content[i + 1] === 'm')) {
      flushLine(); // T* (próxima linha) | Tm (reset da matriz de texto) → fronteira de linha
      i += 2;
    } else if ((ch === 'B' || ch === 'E') && content[i + 1] === 'T') {
      flushLine(); // BT/ET → fronteira de bloco de texto
      i += 2;
    } else if (
      ch === '-' ||
      ch === '+' ||
      ch === '.' ||
      (ch !== undefined && ch >= '0' && ch <= '9')
    ) {
      // #388 2b: coleta operando numérico (fora de string) p/ tx/ty do próximo Td. Mantém só os 2
      // últimos (n1=penúltimo, n2=último); operandos de outros operadores são empurrados para fora.
      let j = i;
      let buf = '';
      while (j < n) {
        const c = content[j];
        if (c === undefined || !(c === '-' || c === '+' || c === '.' || (c >= '0' && c <= '9')))
          break;
        buf += c;
        j += 1;
      }
      const v = Number.parseFloat(buf);
      if (!Number.isNaN(v)) lastNum = v;
      i = j > i ? j : i + 1;
    } else {
      i += 1;
    }
  }
  flushLine();
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
  // #386: NF-e/NFC-e/NFCom (DANFE/DANFCOM) — documento auxiliar da nota fiscal eletrônica.
  if (/DANFE|DANFCOM|DOCUMENTO AUXILIAR DA NOTA FISCAL|NOTA FISCAL ELETR|\bNFC?-?e\b/i.test(text))
    return 'DANFE';
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
  // #386: classifica sobre texto com whitespace normalizado — PDFs reais fragmentam por posição
  // (palavra-por-`Td`), então a reconstrução de linha não garante âncoras contíguas. Colapsar
  // espaços/quebras torna `detectType` robusto à fragmentação sem depender de layout perfeito.
  // #388 2b: cola o token quando um hífen fica seguido de espaço espúrio — a fragmentação `NFS-`|`e`
  // (Td entre eles) vira "NFS- e" após o colapso, e `detectType /NFS-e/` não casaria.
  const normalized = text.replace(/\s+/g, ' ').replace(/-\s+/g, '-');
  const type = detectType(normalized);
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
