// Builder de PDFs SINTÉTICOS para FIN-DOC-READER-NATIVE — dados fiscais FALSOS, byte-exatos,
// determinísticos (sem timestamp/rand), sem PII. Monta classic-xref + content-stream FlateDecode.
// O reader nativo (native-pdf.ts) localiza objetos por varredura `N 0 obj` (não depende de offset
// byte-exato do xref); o xref clássico existe para a DETECÇÃO de estrutura (vs xref-stream/ObjStm).
import { deflateSync } from 'node:zlib';

const LATIN1 = 'latin1';

// Escapa uma string para literal PDF entre parênteses: '\', '(', ')'.
const escapePdfLiteral = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

// Content-stream (não-comprimido) que "desenha" as linhas via Tj (WinAnsi).
const winAnsiContent = (lines: readonly string[]): Buffer => {
  const ops: string[] = ['BT', '/F1 12 Tf', '72 760 Td'];
  lines.forEach((line, i) => {
    if (i > 0) ops.push('0 -18 Td');
    ops.push(`(${escapePdfLiteral(line)}) Tj`);
  });
  ops.push('ET');
  return Buffer.from(ops.join('\n'), LATIN1);
};

// Monta um PDF a partir dos CORPOS dos objetos 1..N (sem `N 0 obj`/`endobj`), com xref + trailer.
const assemblePdf = (bodies: readonly Buffer[]): Uint8Array => {
  const header = Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', LATIN1);
  const chunks: Buffer[] = [header];
  const offsets: number[] = [];
  let pos = header.length;
  bodies.forEach((body, i) => {
    offsets.push(pos);
    const obj = Buffer.concat([
      Buffer.from(`${i + 1} 0 obj\n`, LATIN1),
      body,
      Buffer.from('\nendobj\n', LATIN1),
    ]);
    chunks.push(obj);
    pos += obj.length;
  });
  const size = bodies.length + 1;
  let xref = `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (const off of offsets) xref += `${String(off).padStart(10, '0')} 00000 n \n`;
  const trailer = `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF\n`;
  chunks.push(Buffer.from(xref + trailer, LATIN1));
  return new Uint8Array(Buffer.concat(chunks));
};

// Objeto stream FlateDecode: `<< /Length N /Filter /FlateDecode [extra] >>\nstream\n<bytes>\nendstream`.
const streamObject = (compressed: Buffer, extraDict = ''): Buffer =>
  Buffer.concat([
    Buffer.from(
      `<< /Length ${compressed.length} /Filter /FlateDecode${extraDict} >>\nstream\n`,
      LATIN1,
    ),
    compressed,
    Buffer.from('\nendstream', LATIN1),
  ]);

// PDF nativo WinAnsi de texto (CA1 NFS-e, CA2 RPA). `lines` são as linhas visíveis do documento.
export const buildNativePdf = (lines: readonly string[]): Uint8Array => {
  const compressed = deflateSync(winAnsiContent(lines));
  return assemblePdf([
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', LATIN1),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>', LATIN1),
    Buffer.from(
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
      LATIN1,
    ),
    streamObject(compressed),
    Buffer.from(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
      LATIN1,
    ),
  ]);
};

// #388 2a — PDF com stream FlateDecode cujo `/Length` declarado é CURTO (corta os bytes finais do
// deflate — ex.: o adler32 do zlib). Gerador real: PDFsharp 6.2.2. O `extractStreams` fatia ao `/Length`
// curto → `inflateSync`/`inflateRawSync` falham ('unexpected end of file'). Só `finishFlush:
// Z_SYNC_FLUSH` (validando o resultado) recupera o texto. `shortBy` = bytes cortados no fim
// (4 → o deflate está completo, falta só o checksum → Z_SYNC_FLUSH recupera 100%).
export const buildShortLengthFlatePdf = (lines: readonly string[], shortBy: number): Uint8Array => {
  const compressed = deflateSync(winAnsiContent(lines));
  const declaredLen = Math.max(0, compressed.length - shortBy); // /Length MENTE (curto)
  const streamObj = Buffer.concat([
    Buffer.from(`<< /Length ${declaredLen} /Filter /FlateDecode >>\nstream\n`, LATIN1),
    compressed, // bytes completos no arquivo; extractStreams corta ao declaredLen
    Buffer.from('\nendstream', LATIN1),
  ]);
  return assemblePdf([
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', LATIN1),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>', LATIN1),
    Buffer.from(
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
      LATIN1,
    ),
    streamObj,
    Buffer.from(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
      LATIN1,
    ),
  ]);
};

// #388 2a — deflate GENUINAMENTE truncado no ARQUIVO (o gerador escreveu bytes incompletos, não só um
// `/Length` errado): o recovery por `endstream` não alcança mais bytes; só `finishFlush: Z_SYNC_FLUSH`
// recupera. `/Length` declarado = tamanho do deflate truncado (bate com `endstream`). `cut` = bytes
// cortados do fim (4 → falta só o checksum → recupera 100%).
export const buildTruncatedDeflatePdf = (lines: readonly string[], cut: number): Uint8Array => {
  const compressed = deflateSync(winAnsiContent(lines));
  const truncated = compressed.subarray(0, Math.max(1, compressed.length - cut));
  const streamObj = Buffer.concat([
    Buffer.from(`<< /Length ${truncated.length} /Filter /FlateDecode >>\nstream\n`, LATIN1),
    truncated,
    Buffer.from('\nendstream', LATIN1),
  ]);
  return assemblePdf([
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', LATIN1),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>', LATIN1),
    Buffer.from(
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
      LATIN1,
    ),
    streamObj,
    Buffer.from(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
      LATIN1,
    ),
  ]);
};

// PDF cifrado (CA4): trailer com /Encrypt → estrutura não-suportada (fora do v1).
export const buildEncryptedPdf = (): Uint8Array => {
  const pdf = buildNativePdf(['documento cifrado']);
  // injeta /Encrypt no trailer (o reader detecta o marcador e rejeita)
  const text = Buffer.from(pdf)
    .toString(LATIN1)
    .replace('/Root 1 0 R', '/Root 1 0 R /Encrypt 6 0 R');
  return new Uint8Array(Buffer.from(text, LATIN1));
};

// PDF com object stream (CA4): contém /ObjStm → estrutura moderna não-suportada no v1.
export const buildObjStmPdf = (): Uint8Array => {
  const compressed = deflateSync(Buffer.from('1 0 2 12', LATIN1));
  return assemblePdf([
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', LATIN1),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>', LATIN1),
    Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>', LATIN1),
    streamObject(compressed, ' /Type /ObjStm /N 1 /First 8'),
  ]);
};

// Bomba de descompressão (CA5): stream que infla muito além do limite do reader.
export const buildBombPdf = (inflatedBytes: number): Uint8Array => {
  const compressed = deflateSync(Buffer.alloc(inflatedBytes, 0x20)); // N bytes de espaço
  return assemblePdf([
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', LATIN1),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>', LATIN1),
    Buffer.from('<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>', LATIN1),
    streamObject(compressed),
  ]);
};

// PDF só-imagem (CA6): página com XObject de imagem, sem operador de texto → escaneado.
export const buildImageOnlyPdf = (): Uint8Array => {
  const compressed = deflateSync(Buffer.from('q 100 0 0 100 72 660 cm /Im0 Do Q', LATIN1));
  return assemblePdf([
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', LATIN1),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>', LATIN1),
    Buffer.from(
      '<< /Type /Page /Parent 2 0 R /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>',
      LATIN1,
    ),
    streamObject(compressed),
    Buffer.from('<< /Type /XObject /Subtype /Image /Width 1 /Height 1 >>', LATIN1),
  ]);
};

const hex4 = (n: number): string => n.toString(16).padStart(4, '0').toUpperCase();

// PDF com fonte Type0/Identity-H (CA3): o content-stream mostra CÓDIGOS 2-byte `<hex>`, não o texto.
// Só o CMap `/ToUnicode` (bfchar code→Unicode) recupera o texto — um reader sem ToUnicode veria
// garbling. Cada caractere único vira um gid 2-byte (a partir de 1); o ToUnicode desfaz o mapa.
export const buildIdentityHPdf = (lines: readonly string[]): Uint8Array => {
  const text = lines.join('\n');
  const uniqueChars = [...new Set(Array.from(text).filter((c) => c !== '\n'))];
  const gidOf = new Map<string, number>();
  uniqueChars.forEach((c, i) => {
    gidOf.set(c, i + 1);
  });

  const showLine = (line: string): string =>
    `<${Array.from(line)
      .map((c) => hex4(gidOf.get(c) ?? 0))
      .join('')}> Tj`;
  const ops = ['BT', '/F1 12 Tf', '72 760 Td'];
  lines.forEach((line, i) => {
    if (i > 0) ops.push('0 -18 Td');
    ops.push(showLine(line));
  });
  ops.push('ET');
  const compressedContent = deflateSync(Buffer.from(ops.join('\n'), LATIN1));

  const bfchar = uniqueChars
    .map((c) => `<${hex4(gidOf.get(c) ?? 0)}> <${hex4(c.codePointAt(0) ?? 0)}>`)
    .join('\n');
  const cmap =
    `/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CMapType 2 def\n` +
    `1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n` +
    `${uniqueChars.length} beginbfchar\n${bfchar}\nendbfchar\nendcmap\nend\nend`;
  const compressedCmap = deflateSync(Buffer.from(cmap, LATIN1));

  return assemblePdf([
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', LATIN1),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>', LATIN1),
    Buffer.from(
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
      LATIN1,
    ),
    streamObject(compressedContent),
    Buffer.from(
      '<< /Type /Font /Subtype /Type0 /BaseFont /AAAAAA+Arial /Encoding /Identity-H /DescendantFonts [6 0 R] /ToUnicode 7 0 R >>',
      LATIN1,
    ),
    Buffer.from(
      '<< /Type /Font /Subtype /CIDFontType2 /BaseFont /AAAAAA+Arial /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> >>',
      LATIN1,
    ),
    streamObject(compressedCmap),
  ]);
};

// #388 2c — PDF com DUAS fontes Type0/Identity-H, cada uma com seu CMap /ToUnicode e GIDs DISJUNTOS
// (F1 usa 1..k1; F2 usa k1+1..). O content-stream alterna a fonte via `Tf`. O reader que usa só o
// PRIMEIRO CMap (`find(beginbfchar)`) decodifica apenas a fonte 1 → texto incompleto. Mesclar todos os
// CMaps num único mapa (códigos disjuntos → sem colisão) recupera ambas as fontes.
export const buildMultiFontIdentityHPdf = (
  run1: readonly string[],
  run2: readonly string[],
): Uint8Array => {
  const uniq = (lines: readonly string[]): string[] => [
    ...new Set(Array.from(lines.join('\n')).filter((c) => c !== '\n')),
  ];
  const chars1 = uniq(run1);
  const chars2 = uniq(run2);
  const gid1 = new Map<string, number>();
  chars1.forEach((c, k) => {
    gid1.set(c, k + 1);
  });
  const gid2 = new Map<string, number>();
  chars2.forEach((c, k) => {
    gid2.set(c, chars1.length + k + 1); // GIDs disjuntos de gid1
  });

  const showLine = (line: string, gid: ReadonlyMap<string, number>): string =>
    `<${Array.from(line)
      .map((c) => hex4(gid.get(c) ?? 0))
      .join('')}> Tj`;

  const ops: string[] = ['BT', '72 760 Td', '/F1 12 Tf'];
  run1.forEach((line, k) => {
    if (k > 0) ops.push('0 -18 Td');
    ops.push(showLine(line, gid1));
  });
  ops.push('/F2 12 Tf');
  run2.forEach((line) => {
    ops.push('0 -18 Td');
    ops.push(showLine(line, gid2));
  });
  ops.push('ET');
  const content = deflateSync(Buffer.from(ops.join('\n'), LATIN1));

  const cmapOf = (chars: readonly string[], gid: ReadonlyMap<string, number>): Buffer => {
    const bfchar = chars
      .map((c) => `<${hex4(gid.get(c) ?? 0)}> <${hex4(c.codePointAt(0) ?? 0)}>`)
      .join('\n');
    return deflateSync(
      Buffer.from(
        `/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CMapType 2 def\n` +
          `1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n` +
          `${chars.length} beginbfchar\n${bfchar}\nendbfchar\nendcmap\nend\nend`,
        LATIN1,
      ),
    );
  };

  return assemblePdf([
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', LATIN1),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>', LATIN1),
    Buffer.from(
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 8 0 R >> >> >>',
      LATIN1,
    ),
    streamObject(content),
    Buffer.from(
      '<< /Type /Font /Subtype /Type0 /BaseFont /AAAAAA+Arial /Encoding /Identity-H /DescendantFonts [6 0 R] /ToUnicode 7 0 R >>',
      LATIN1,
    ),
    Buffer.from('<< /Type /Font /Subtype /CIDFontType2 /BaseFont /AAAAAA+Arial >>', LATIN1),
    streamObject(cmapOf(chars1, gid1)),
    Buffer.from(
      '<< /Type /Font /Subtype /Type0 /BaseFont /BBBBBB+Verdana /Encoding /Identity-H /DescendantFonts [9 0 R] /ToUnicode 10 0 R >>',
      LATIN1,
    ),
    Buffer.from('<< /Type /Font /Subtype /CIDFontType2 /BaseFont /BBBBBB+Verdana >>', LATIN1),
    streamObject(cmapOf(chars2, gid2)),
  ]);
};

// #388 2c — 2 fontes cujos CMaps /ToUnicode COLIDEM: o MESMO código (0006) mapeia para chars diferentes
// ('X' na fonte 1, 'O' na fonte 2). Sob "último vence", o content de F1 "BOLET"+<0006> viraria "BOLETO"
// (tipo Boleto FALSO). O merge fail-closed dropa o código ambíguo → "BOLET" → não classifica. Prova o
// invariante #62 (char faltante > char errado). GIDs: B=0001 O=0002 L=0003 E=0004 T=0005 X=0006.
export const buildCollidingCMapPdf = (): Uint8Array => {
  const content = deflateSync(
    Buffer.from(
      'BT 72 760 Td /F1 12 Tf <000100020003000400050006> Tj /F2 12 Tf <0006> Tj ET',
      LATIN1,
    ),
  );
  const mkCmap = (body: string): Buffer =>
    deflateSync(
      Buffer.from(
        `begincmap\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n${body}\nendcmap`,
        LATIN1,
      ),
    );
  // F1: B O L E T X. <0042>=B <004F>=O <004C>=L <0045>=E <0054>=T <0058>=X
  const cmap1 = mkCmap(
    '6 beginbfchar\n<0001> <0042>\n<0002> <004F>\n<0003> <004C>\n<0004> <0045>\n<0005> <0054>\n<0006> <0058>\nendbfchar',
  );
  // F2: 0006 → O (COLIDE com F1 0006=X). <004F>=O
  const cmap2 = mkCmap('1 beginbfchar\n<0006> <004F>\nendbfchar');
  return assemblePdf([
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', LATIN1),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>', LATIN1),
    Buffer.from(
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 8 0 R >> >> >>',
      LATIN1,
    ),
    streamObject(content),
    Buffer.from(
      '<< /Type /Font /Subtype /Type0 /Encoding /Identity-H /DescendantFonts [6 0 R] /ToUnicode 7 0 R >>',
      LATIN1,
    ),
    Buffer.from('<< /Type /Font /Subtype /CIDFontType2 /BaseFont /AAAAAA+A >>', LATIN1),
    streamObject(cmap1),
    Buffer.from(
      '<< /Type /Font /Subtype /Type0 /Encoding /Identity-H /DescendantFonts [9 0 R] /ToUnicode 10 0 R >>',
      LATIN1,
    ),
    Buffer.from('<< /Type /Font /Subtype /CIDFontType2 /BaseFont /BBBBBB+B >>', LATIN1),
    streamObject(cmap2),
  ]);
};

// --- Fixtures adversariais (testes de regressão de segurança) ------------------

// Content-stream CRU (sem escape) — para forjar payloads hostis (ex.: parênteses sem fechar, F1).
export const buildRawContentPdf = (rawContent: string): Uint8Array => {
  const compressed = deflateSync(Buffer.from(rawContent, LATIN1));
  return assemblePdf([
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', LATIN1),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>', LATIN1),
    Buffer.from('<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>', LATIN1),
    streamObject(compressed),
  ]);
};

// #389 — CMap /ToUnicode HOSTIL: um `bfchar` mapeia um código para codepoint FORA da faixa Unicode
// (> 0x10FFFF). Sem guarda de faixa, o `String.fromCodePoint(cp)` do parseToUnicode lança um
// `RangeError` NÃO capturado que atravessa a borda do port (viola o contrato Result — CWE-248).
// `destHex` é o codepoint de destino em hex (ex.: 'FFFFFF' = 16777215 > 0x10FFFF).
export const buildHostileToUnicodePdf = (destHex: string): Uint8Array => {
  const content = deflateSync(Buffer.from('BT\n/F1 12 Tf\n72 760 Td\n<0001> Tj\nET', LATIN1));
  const cmap = deflateSync(
    Buffer.from(
      `/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CMapType 2 def\n` +
        `1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n` +
        `1 beginbfchar\n<0001> <${destHex}>\nendbfchar\nendcmap\nend\nend`,
      LATIN1,
    ),
  );
  return assemblePdf([
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', LATIN1),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>', LATIN1),
    Buffer.from(
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
      LATIN1,
    ),
    streamObject(content),
    Buffer.from(
      '<< /Type /Font /Subtype /Type0 /BaseFont /AAAAAA+Arial /Encoding /Identity-H /DescendantFonts [6 0 R] /ToUnicode 7 0 R >>',
      LATIN1,
    ),
    Buffer.from(
      '<< /Type /Font /Subtype /CIDFontType2 /BaseFont /AAAAAA+Arial /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> >>',
      LATIN1,
    ),
    streamObject(cmap),
  ]);
};

// PDF com N streams FlateDecode, cada um inflando `inflatedEach` bytes (amplificação — F3).
export const buildMultiStreamPdf = (streamCount: number, inflatedEach: number): Uint8Array => {
  const one = deflateSync(Buffer.alloc(inflatedEach, 0x20));
  return assemblePdf([
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', LATIN1),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>', LATIN1),
    Buffer.from('<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>', LATIN1),
    ...Array.from({ length: streamCount }, () => streamObject(one)),
  ]);
};

// Bytes que forçariam varredura O(n²) em extractStreams sem janela/cap (F2). Passa detectStructure.
export const buildQuadraticScanBytes = (repeat: number): Uint8Array =>
  new Uint8Array(Buffer.from(`%PDF-1.4\nxref\n${'stream endstream '.repeat(repeat)}`, LATIN1));
