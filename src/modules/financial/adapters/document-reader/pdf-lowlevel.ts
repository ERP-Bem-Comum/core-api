import { inflateSync, inflateRawSync, constants as zlibConstants } from 'node:zlib';
import { ok, err } from '../../../../shared/primitives/result.ts';
import type { Result } from '../../../../shared/primitives/result.ts';

// Primitivas de baixo nível de PDF sobre node:zlib (FIN-DOC-READER-NATIVE). Escopo empírico
// (research.md §3.1): apenas xref CLÁSSICO + content-stream FlateDecode. Estruturas modernas
// (xref-stream, /ObjStm, /Encrypt) são explicitamente recusadas — fora do v1.

/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types -- modulo de parsing de bytes: Uint8Array nao tem variant readonly no TS 6 */

export type PdfStructureError = 'unsupported-pdf-structure' | 'malformed-document';
export type InflateError = 'decompression-limit-exceeded' | 'malformed-document';

// Tetos anti-DoS (exportados p/ os testes de regressão casarem com os guards).
export const MAX_BYTES = 8 * 1024 * 1024; // tamanho máx. do PDF de entrada
export const MAX_INFLATE = 8 * 1024 * 1024; // por stream (anti-bomb, Zlib.md:837)
export const MAX_TOTAL_INFLATE = 16 * 1024 * 1024; // soma de todos os streams (anti-amplificação)
export const MAX_STREAMS = 512; // teto de streams varridos/inflados
const DICT_WINDOW = 2048; // janela p/ localizar o dict antes de `stream` (evita O(n²))

const latin1 = (b: Uint8Array): string => Buffer.from(b).toString('latin1');

export type PdfStream = Readonly<{ dict: string; data: Uint8Array }>;

// Aceita apenas estrutura clássica suportada; recusa cifra/objstm/xref-stream com erro explícito.
export const detectStructure = (bytes: Uint8Array): Result<true, PdfStructureError> => {
  const full = latin1(bytes);
  if (!full.startsWith('%PDF-')) return err('malformed-document');
  if (full.includes('/Encrypt')) return err('unsupported-pdf-structure');
  if (full.includes('/ObjStm')) return err('unsupported-pdf-structure');
  if (/\/Type\s*\/XRef/.test(full)) return err('unsupported-pdf-structure');
  if (!/(^|\s)xref(\s|$)/.test(full)) return err('unsupported-pdf-structure');
  return ok(true);
};

// Infla um bloco FlateDecode com guarda de tamanho. Distingue LIMITE (ERR_BUFFER_TOO_LARGE, anti-bomb)
// de corrupção de dados; tenta zlib e, se for formato raw, inflateRaw.
export const inflateGuarded = (data: Uint8Array): Result<Uint8Array, InflateError> => {
  const attempt = (
    fn: (d: Uint8Array, o: { maxOutputLength: number; finishFlush?: number }) => Buffer,
    opts: { finishFlush?: number } = {},
  ): Result<Uint8Array, InflateError> | 'format-error' => {
    try {
      return ok(new Uint8Array(fn(data, { maxOutputLength: MAX_INFLATE, ...opts })));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ERR_BUFFER_TOO_LARGE') {
        return err('decompression-limit-exceeded');
      }
      return 'format-error';
    }
  };
  const asZlib = attempt(inflateSync);
  if (asZlib !== 'format-error') return asZlib;
  const asRaw = attempt(inflateRawSync);
  if (asRaw !== 'format-error') return asRaw;
  // 3º fallback (#388 2a): stream FlateDecode com `/Length` declarado curto (ex.: PDFsharp) — o fim do
  // fluxo é cortado por `extractStreams`, então inflateSync/Raw dão 'unexpected end of file'. `finishFlush:
  // Z_SYNC_FLUSH` infla os blocos completos sem exigir o marcador de fim (Zlib.md:415-437). Aceita só
  // resultado NÃO-VAZIO (Zlib.md:439-443 — validar dado truncado); vazio → corrupção real, fail-closed.
  const asSyncFlush = attempt(inflateSync, { finishFlush: zlibConstants.Z_SYNC_FLUSH });
  if (asSyncFlush !== 'format-error') {
    if (asSyncFlush.ok && asSyncFlush.value.length === 0) return err('malformed-document');
    return asSyncFlush;
  }
  return err('malformed-document');
};

// Extrai os streams (dict + bytes crus) do PDF por varredura de PROGRESSÃO ÚNICA. O dict é buscado
// numa JANELA fixa antes de `stream` (não `lastIndexOf` retroativo sobre todo o buffer → O(n), não
// O(n²)); a varredura para em `MAX_STREAMS`. latin1 → índice = offset de byte.
export const extractStreams = (bytes: Uint8Array): readonly PdfStream[] => {
  const text = latin1(bytes);
  const streams: PdfStream[] = [];
  let i = 0;
  while (streams.length < MAX_STREAMS && (i = text.indexOf('stream', i)) !== -1) {
    if (text.slice(i - 3, i) === 'end') {
      i += 6;
      continue;
    }
    const win = text.slice(Math.max(0, i - DICT_WINDOW), i);
    const dictEndRel = win.lastIndexOf('>>');
    const dictStartRel = dictEndRel >= 0 ? win.lastIndexOf('<<', dictEndRel) : -1;
    const dict = dictStartRel >= 0 ? win.slice(dictStartRel, dictEndRel + 2) : '';
    let dataStart = i + 6;
    if (text[dataStart] === '\r') dataStart += 1;
    if (text[dataStart] === '\n') dataStart += 1;
    const lenMatch = /\/Length\s+(\d+)/.exec(dict);
    const len = lenMatch?.[1] !== undefined ? Number(lenMatch[1]) : -1;
    // #388 2a: o `/Length` declarado pode estar ERRADO (pdf.js parser.js `#findStreamLength`: "the Length
    // entry can be completely wrong, e.g. zero for non-empty streams"). Fonte de verdade = keyword
    // `endstream`. Confia no `/Length` só quando ele termina exatamente em `endstream`; senão faz recovery
    // buscando o `endstream` real (recupera o deflate COMPLETO — inflateSync valida o checksum normalmente).
    const endsAtLen =
      len >= 0 && /^\s*endstream/.test(text.slice(dataStart + len, dataStart + len + 16));
    if (endsAtLen) {
      streams.push({ dict, data: bytes.subarray(dataStart, dataStart + len) });
      i = dataStart + len;
    } else {
      const end = text.indexOf('endstream', dataStart);
      const stop = end >= 0 ? end : text.length;
      streams.push({ dict, data: bytes.subarray(dataStart, stop) });
      i = stop + 9;
    }
  }
  return streams;
};

export const isFlate = (s: PdfStream): boolean => s.dict.includes('/FlateDecode');
