// Gabaritos das fixtures PDF sintéticas (FIN-DOC-READER-NATIVE) — dados FALSOS, sem PII.
// Cada documento é montado pelo pdf-builder e vem com o resultado esperado (gabarito 12/12).
import {
  buildNativePdf,
  buildIdentityHPdf,
  buildEncryptedPdf,
  buildObjStmPdf,
  buildBombPdf,
  buildImageOnlyPdf,
  buildRawContentPdf,
  buildMultiStreamPdf,
  buildQuadraticScanBytes,
  buildHostileToUnicodePdf,
  buildShortLengthFlatePdf,
  buildTruncatedDeflatePdf,
} from './pdf-builder.ts';

type RetentionExpect = Readonly<{
  type: string;
  baseCents: number;
  rateBps: number;
  valueCents: number;
}>;
export type NativeExpect = Readonly<{
  type: 'NFS-e' | 'RPA' | 'Boleto' | 'DANFE';
  documentNumber?: string;
  competence?: Readonly<{ year: number; month: number }>;
  legalName?: string;
  taxId?: string;
  grossValueCents?: number;
  retentions?: readonly RetentionExpect[];
}>;

// CA1 — NFS-e nativa (WinAnsi). Bruto R$ 1.000,00; ISS 5% retido R$ 50,00.
export const NFSE_NATIVE = {
  bytes: (): Uint8Array =>
    buildNativePdf([
      'PREFEITURA - NOTA FISCAL DE SERVICOS ELETRONICA NFS-e',
      'Numero da Nota: 0000000001234',
      'Competencia: 04/2026',
      'Prestador: PRESTADOR SINTETICO LTDA',
      'CNPJ: 98765432000155',
      'Valor Total dos Servicos: R$ 1.000,00',
      'ISS (5,00%) Retido: R$ 50,00',
    ]),
  expected: {
    type: 'NFS-e',
    documentNumber: '0000000001234',
    competence: { year: 2026, month: 4 },
    legalName: 'PRESTADOR SINTETICO LTDA',
    taxId: '98765432000155',
    grossValueCents: 100000,
    retentions: [{ type: 'ISS', baseCents: 100000, rateBps: 500, valueCents: 5000 }],
  } satisfies NativeExpect,
} as const;

// CA2 — RPA nativa (WinAnsi). Bruto 1.000,00; INSS 11% 110,00; IRRF 7,5% 75,00; ISS 5% 50,00; liq 765,00.
export const RPA_NATIVE = {
  bytes: (): Uint8Array =>
    buildNativePdf([
      'RECIBO DE PAGAMENTO A AUTONOMO - RPA',
      'Numero: 000123',
      'Prestador: JOAO PRESTADOR AUTONOMO',
      'CPF: 12345678901',
      'Valor Bruto: R$ 1.000,00',
      'INSS (11,00%): R$ 110,00',
      'IRRF (7,50%): R$ 75,00',
      'ISS (5,00%): R$ 50,00',
      'Valor Liquido: R$ 765,00',
    ]),
  expected: {
    type: 'RPA',
    documentNumber: '000123',
    legalName: 'JOAO PRESTADOR AUTONOMO',
    taxId: '12345678901',
    grossValueCents: 100000,
    retentions: [
      { type: 'INSS', baseCents: 100000, rateBps: 1100, valueCents: 11000 },
      { type: 'IRRF', baseCents: 100000, rateBps: 750, valueCents: 7500 },
      { type: 'ISS', baseCents: 100000, rateBps: 500, valueCents: 5000 },
    ],
  } satisfies NativeExpect,
  // bruto − Σretenções = líquido (invariante do CA2)
  netValueCents: 76500,
} as const;

// CA3 — Boleto com fonte Identity-H (o texto SÓ é recuperável via CMap /ToUnicode).
export const BOLETO_IDENTITY_H = {
  bytes: (): Uint8Array =>
    buildIdentityHPdf([
      'BOLETO BANCARIO DE COBRANCA',
      'Vencimento: 15/05/2024',
      'Valor do Documento: R$ 1.234,56',
    ]),
  expected: {
    type: 'Boleto',
    grossValueCents: 123456,
  } satisfies NativeExpect,
} as const;

// CA4 — estrutura não-suportada
export const ENCRYPTED_PDF = { bytes: (): Uint8Array => buildEncryptedPdf() } as const;
export const OBJSTM_PDF = { bytes: (): Uint8Array => buildObjStmPdf() } as const;

// CA5 — bomba de descompressão (infla 12 MiB, acima do limite do reader)
export const BOMB_PDF = { bytes: (): Uint8Array => buildBombPdf(12 * 1024 * 1024) } as const;

// CA6 — escaneado (só imagem, sem texto)
export const IMAGE_ONLY_PDF = { bytes: (): Uint8Array => buildImageOnlyPdf() } as const;

// CA7 — erros triviais
export const EMPTY_PDF = { bytes: (): Uint8Array => new Uint8Array([]) } as const;
export const GARBAGE = {
  bytes: (): Uint8Array => new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]),
} as const;

// --- Fixtures adversariais (regressão de segurança, W2) -----------------------

// F1 — ReDoS: content-stream com '(' sem fechamento (o tokenizer O(n) deve terminar rápido).
export const REDOS_UNBALANCED = {
  bytes: (): Uint8Array => buildRawContentPdf(`BT (${'('.repeat(150000)} Tj ET`),
} as const;

// F2 — varredura O(n²) em extractStreams (muitas ocorrências de "stream").
export const QUADRATIC_SCAN = { bytes: (): Uint8Array => buildQuadraticScanBytes(40000) } as const;

// F3 — amplificação: 3 streams inflando 6 MiB cada (18 MiB > MAX_TOTAL_INFLATE de 16 MiB).
export const MULTI_STREAM_BOMB = {
  bytes: (): Uint8Array => buildMultiStreamPdf(3, 6 * 1024 * 1024),
} as const;

// F4 — input acima de MAX_BYTES (8 MiB).
export const OVERSIZE_INPUT = {
  bytes: (): Uint8Array => new Uint8Array(8 * 1024 * 1024 + 1),
} as const;

// #389 — CMap /ToUnicode hostil: bfchar aponta para codepoint > 0x10FFFF. Sem guarda de faixa,
// parseToUnicode lançaria RangeError atravessando a borda do port (CWE-248). Esperado: Result
// (mapeamento inválido ignorado → sem texto útil → scanned-unsupported), nunca exceção vazada.
export const HOSTILE_TOUNICODE = {
  bytes: (): Uint8Array => buildHostileToUnicodePdf('FFFFFF'),
} as const;

// #388 2a — stream FlateDecode com `/Length` curto (corta 4 bytes finais). Hoje o inflateGuarded
// falha (inflateSync/Raw → 'unexpected end of file') → malformed-document; após Z_SYNC_FLUSH (com
// validação) o texto é recuperado 100% e a NFS-e classifica.
export const SHORT_LENGTH_FLATE = {
  bytes: (): Uint8Array =>
    buildShortLengthFlatePdf(
      [
        'PREFEITURA - NOTA FISCAL DE SERVICOS ELETRONICA NFS-e',
        'Numero da Nota: 0000000462171',
        'Valor Total dos Servicos: R$ 1.500,00',
      ],
      4,
    ),
  expected: { type: 'NFS-e', documentNumber: '0000000462171', grossValueCents: 150000 },
} as const;

// #388 2a — /Length declarado = 0 (pdf.js: "the Length entry can be completely wrong, e.g. zero for
// non-empty streams"). O Z_SYNC_FLUSH sozinho NÃO recupera (0 bytes fatiados ao /Length); só o recovery
// por 'endstream' no extractStreams alcança o deflate completo. shortBy enorme → declaredLen colapsa a 0.
export const ZERO_LENGTH_FLATE = {
  bytes: (): Uint8Array =>
    buildShortLengthFlatePdf(
      [
        'PREFEITURA - NOTA FISCAL DE SERVICOS ELETRONICA NFS-e',
        'Numero da Nota: 0000000999999',
        'Valor Total dos Servicos: R$ 2.000,00',
      ],
      100000,
    ),
  expected: { type: 'NFS-e', documentNumber: '0000000999999', grossValueCents: 200000 },
} as const;

// #388 2a — deflate truncado no arquivo (/Length correto p/ os bytes escritos, mas o deflate está
// incompleto): o endstream-recovery não alcança mais bytes; só o Z_SYNC_FLUSH recupera. Cobre a rede final.
export const TRUNCATED_DEFLATE = {
  bytes: (): Uint8Array =>
    buildTruncatedDeflatePdf(
      [
        'PREFEITURA - NOTA FISCAL DE SERVICOS ELETRONICA NFS-e',
        'Numero da Nota: 0000000777777',
        'Valor Total dos Servicos: R$ 3.000,00',
      ],
      4,
    ),
  expected: { type: 'NFS-e', grossValueCents: 300000 },
} as const;

// #388 2b — token hifenizado fragmentado: "NFS-e" emitido em 2 Tj ("NFS-" | "e Servico") com Td de
// avanço horizontal (ty=0) entre eles, e as demais linhas separadas por Td com ty!=0. Hoje o flushLine
// cego quebra a linha no ty=0 → normalização vira "NFS- e" → detectType /NFS-e/ NÃO casa (malformed).
// Após reconstrução por ΔTd (ty=0 → mesma linha) + normalização de hífen (`-\s+`→`-`) → casa.
export const FRAGMENTED_HYPHEN = {
  bytes: (): Uint8Array =>
    buildRawContentPdf(
      'BT /F1 12 Tf 100 700 Td (Documento Auxiliar NFS-) Tj 25 0 Td (e Servico) Tj ' +
        '0 -18 Td (Numero da Nota: 0000000888888) Tj 0 -18 Td (Valor Total: R$ 700,00) Tj ET',
    ),
  expected: { type: 'NFS-e', documentNumber: '0000000888888', grossValueCents: 70000 },
} as const;

// --- #386 Fatia 1: PDF real (operador TJ, reconstrução de linha, DANFE) --------

// TJ (array) com strings literais — modo dominante em PDFs reais (DANFCOM usa 112 TJ / 0 Tj).
// Hoje o reader ignora TJ → texto vazio → 'scanned-unsupported'.
export const TJ_ARRAY_NFSE = {
  bytes: (): Uint8Array =>
    buildRawContentPdf(
      'BT /F1 12 Tf 72 760 Td [(NOTA FISCAL DE SERVICOS ELETRONICA)] TJ ' +
        '0 -18 Td [(Numero da Nota: )-3(9998887776)] TJ ' +
        '0 -18 Td [(Valor Total: R$ )-2(500,00)] TJ ET',
    ),
  expected: { type: 'NFS-e', documentNumber: '9998887776', grossValueCents: 50000 },
} as const;

// Palavra-chave FRAGMENTADA em 2 Tj na MESMA linha (sem Td entre eles) — fragmentação real.
// Hoje: 1-linha-por-Tj quebra "Valor Tot|al" → gross não casa. Após reconstrução → casa.
export const FRAGMENTED_KEYWORD = {
  bytes: (): Uint8Array =>
    buildRawContentPdf(
      'BT /F1 12 Tf 72 760 Td (NOTA FISCAL DE SERVICOS) Tj ' +
        '0 -18 Td (Valor Tot) Tj (al: R$ 700,00) Tj ET',
    ),
  expected: { type: 'NFS-e', grossValueCents: 70000 },
} as const;

// DANFE (NF-e) — hoje detectType não cobre → 'malformed-document'.
export const DANFE_NATIVE = {
  bytes: (): Uint8Array =>
    buildNativePdf([
      'DANFE - Documento Auxiliar da Nota Fiscal Eletronica',
      'Numero: 000000123',
      'Valor Total: R$ 250,00',
    ]),
  expected: { type: 'DANFE', documentNumber: '000000123', grossValueCents: 25000 },
} as const;

// F5 (#386) — amplificação por operandos: muitos '()' SEM Tj/TJ/posição entre eles. Sem o teto
// MAX_PENDING_OPERANDS, `pending` cresceria sem limite (KB → centenas de MB de heap). Com o teto,
// o reader termina rápido e devolve Result (sem texto útil → scanned-unsupported).
export const PENDING_AMPLIFY = {
  bytes: (): Uint8Array => buildRawContentPdf(`BT /F1 12 Tf 72 760 Td ${'() '.repeat(300000)} ET`),
} as const;
