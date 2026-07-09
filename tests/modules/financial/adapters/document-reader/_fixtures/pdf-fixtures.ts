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
} from './pdf-builder.ts';

type RetentionExpect = Readonly<{
  type: string;
  baseCents: number;
  rateBps: number;
  valueCents: number;
}>;
export type NativeExpect = Readonly<{
  type: 'NFS-e' | 'RPA' | 'Boleto';
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
