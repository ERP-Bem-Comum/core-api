// Registros de DETALHE do CNAB 240 Multipag (Bradesco): Segmentos A e B do pagamento por crédito
// em conta / TED / transferência.
//
// Fonte primária: `jun-19-layout-multipag.pdf` (local-only) — Segmento A na p. 24, Segmento B na
// p. 25. Ambos declarados **Obrigatório – Remessa / Retorno** pelo layout: um pagamento é o PAR
// A+B, nunca o A sozinho. Por isso `paymentRecords` existe e é o ponto de entrada preferido — quem
// chamar `segmentA` isolado consegue montar um arquivo que o banco recusa.
//
// Esta camada é ACL (ADR-0006): recebe dados já resolvidos e não conhece agregado nem repositório.
import { ok, err, type Result } from '../../../../shared/primitives/result.ts';
import {
  blanks,
  cents,
  dateDDMMYYYY,
  digits,
  joinFields,
  num,
  text,
  type PositionalFieldError,
} from './positional.ts';

export type CnabSegmentError = PositionalFieldError;

const DETAIL_RECORD_TYPE = 3;
const MOVEMENT_INCLUSION = '0'; // G060 — 0 = inclusão (remessa)
const MOVEMENT_INSTRUCTION_NONE = '00'; // G061
const CURRENCY_BRL = 'BRL'; // G040

export type Payee = Readonly<{
  name: string;
  documentType: '1' | '2'; // 1 = CPF, 2 = CNPJ
  document: string;
  bankCode: string;
  agency: string;
  agencyDigit: string;
  accountNumber: string;
  accountDigit: string;
  // `accountAgencyDigit` NÃO existe aqui de propósito — ver a coluna 043 em `segmentA` (#754).
}>;

export type PayeeAddress = Readonly<{
  street?: string;
  number?: number;
  complement?: string;
  district?: string;
  city?: string;
  zipCode?: string;
  zipSuffix?: string;
  state?: string;
}>;

export type SegmentAInput = Readonly<{
  bankCode: string; // banco do CEDENTE (posições 1-3); o do favorecido vai em 21-23
  batchNumber: number;
  recordNumber: number;
  payee: Payee;
  paymentDate: Date;
  valueCents: number;
  // P001, colunas 018-020. OBRIGATÓRIO, e sem default de propósito (#751): o valor depende da forma
  // de lançamento, e quem monta o registro não tem como adivinhá-la. Quem deriva é
  // `clearingHouseFor`, em `batch-profile.ts`.
  clearingHouse: string;
  // G064 "Seu Número" — a referência do pagador, e a CHAVE DE CASAMENTO do retorno (#752).
  // Obrigatória, e sem default: o `?? ''` que existia aqui emitia arquivo válido, aceito pelo banco,
  // cujo retorno chegava sem nada a que se ligar. Quem deriva é `referenceFor`, no montador.
  yourNumber: string;
  tedPurpose?: string; // P011
  message?: string; // G031 "Informação 2"
}>;

export type SegmentBInput = Readonly<{
  bankCode: string;
  batchNumber: number;
  recordNumber: number;
  payee: Payee;
  address?: PayeeAddress;
}>;

export type PaymentRecordsInput = Readonly<{
  bankCode: string;
  batchNumber: number;
  firstRecordNumber: number;
  payee: Payee;
  paymentDate: Date;
  valueCents: number;
  address?: PayeeAddress;
  clearingHouse: string; // P001 — ver `SegmentAInput`
  yourNumber: string; // ver `SegmentAInput` — obrigatório desde a #752
  tedPurpose?: string;
  message?: string;
}>;

export const segmentA = (input: SegmentAInput): Result<string, CnabSegmentError> => {
  const { payee: p } = input;
  return joinFields([
    num(input.bankCode, 3), // 001-003 banco do cedente
    num(input.batchNumber, 4), // 004-007 lote
    num(DETAIL_RECORD_TYPE, 1), // 008     tipo de registro (detalhe)
    num(input.recordNumber, 5), // 009-013 nº do registro no lote
    text('A', 1), // 014     segmento
    num(MOVEMENT_INCLUSION, 1), // 015     tipo de movimento
    num(MOVEMENT_INSTRUCTION_NONE, 2), // 016-017 código da instrução
    num(input.clearingHouse, 3), // 018-020 câmara centralizadora
    num(p.bankCode, 3), // 021-023 banco do FAVORECIDO
    digits(p.agency, 5), // 024-028 agência do favorecido
    text(p.agencyDigit, 1), // 029     DV agência
    digits(p.accountNumber, 12), // 030-041 conta do favorecido
    text(p.accountDigit, 1), // 042     DV conta
    // 043 — G012, DV agência/conta do FAVORECIDO. Em branco por REGRA DO BANCO: o validador oficial
    // trata a posição preenchida como erro (regra extraída em ERP-Bem-Comum/cnab-validator#2). Por
    // isso `blanks`, e não um campo do `Payee`: o que o banco recusa não deve ser preenchível, e a
    // ausência do campo faz o compilador cobrar quem tentar (#754).
    //
    // ⚠️ NÃO confundir com a coluna 072 de `multipag-records.ts`, que tem nome homônimo e é do
    // CEDENTE, noutro contexto do layout. Os dois campos não compartilham regra.
    blanks(1), // 043     DV ag/conta — sempre em branco
    text(p.name, 30), // 044-073 nome do favorecido
    text(input.yourNumber, 20), // 074-093 seu número
    dateDDMMYYYY(input.paymentDate), // 094-101 data do pagamento
    text(CURRENCY_BRL, 3), // 102-104 tipo da moeda
    num(0, 15), // 105-119 quantidade de moeda (10 + 5)
    cents(input.valueCents, 15), // 120-134 valor do pagamento (13 + 2)
    blanks(20), // 135-154 nosso número — o banco preenche no retorno
    num(0, 8), // 155-162 data real da efetivação — só no retorno
    num(0, 15), // 163-177 valor real — só no retorno
    text(input.message ?? '', 40), // 178-217 informação 2
    blanks(2), // 218-219 CNAB
    text(input.tedPurpose ?? '', 5), // 220-224 finalidade da TED
    blanks(2), // 225-226 finalidade complementar
    blanks(3), // 227-229 CNAB
    num(0, 1), // 230     aviso ao favorecido (0 = não emite)
    blanks(10), // 231-240 ocorrências — preenchidas no retorno
  ]);
};

export const segmentB = (input: SegmentBInput): Result<string, CnabSegmentError> => {
  const { payee: p, address: a } = input;
  return joinFields([
    num(input.bankCode, 3), // 001-003 banco do cedente
    num(input.batchNumber, 4), // 004-007 lote
    num(DETAIL_RECORD_TYPE, 1), // 008     tipo de registro (detalhe)
    num(input.recordNumber, 5), // 009-013 nº do registro no lote
    text('B', 1), // 014     segmento
    blanks(3), // 015-017 CNAB
    num(p.documentType, 1), // 018     tipo de inscrição do favorecido
    digits(p.document, 14), // 019-032 nº de inscrição do favorecido
    text(a?.street ?? '', 30), // 033-062 logradouro
    num(a?.number ?? 0, 5), // 063-067 número
    text(a?.complement ?? '', 15), // 068-082 complemento
    text(a?.district ?? '', 15), // 083-097 bairro
    text(a?.city ?? '', 20), // 098-117 cidade
    digits(a?.zipCode ?? '0', 5), // 118-122 CEP
    text(a?.zipSuffix ?? '', 3), // 123-125 complemento do CEP
    text(a?.state ?? '', 2), // 126-127 estado
    num(0, 8), // 128-135 vencimento nominal
    num(0, 15), // 136-150 valor do documento nominal
    num(0, 15), // 151-165 abatimento
    num(0, 15), // 166-180 desconto
    num(0, 15), // 181-195 mora
    num(0, 15), // 196-210 multa
    blanks(15), // 211-225 código/documento do favorecido
    num(0, 1), // 226     aviso
    num(0, 6), // 227-232 código da UG centralizadora (SIAPE)
    num(0, 8), // 233-240 código ISPB
  ]);
};

// ─── Segmento J — Pagamento de Títulos de Cobrança (boleto) ──────────────────────────────────
//
// Fonte primária: `jun-19-layout-multipag.pdf` p. 32 (local-only), campos 01.3J a 21.3J, declarado
// **Obrigatório – Remessa / Retorno**. Posições conferidas no PDF, não em transcrição.
//
// ⚠️ Este registro NÃO tem banco, agência nem conta do FAVORECIDO — quem identifica o beneficiário
// é o código de barras. É a razão pela qual o boleto não depende do cadastro bancário, e a
// confirmação na fonte do CA5 da #708.
//
// O `Nome do Cedente` (62-091) é de quem RECEBE, não do pagador: cedente, no vocabulário de
// cobrança, é quem emitiu o título. A mesma posição, na seção de PIX do manual (p. 41), aparece
// nomeada "Nome do Beneficiário" — é a leitura que desfaz a ambiguidade do termo. Isso não
// contradiz o parágrafo acima: o que o registro não carrega é o DADO BANCÁRIO do favorecido; o
// nome dele viaja, e é informativo.
export type SegmentJInput = Readonly<{
  bankCode: string; // banco do CEDENTE do arquivo, isto é, o pagador (posições 001-003)
  batchNumber: number;
  recordNumber: number;
  // G063 — 44 posições numéricas. É o CÓDIGO DE BARRAS (Carta-Circular Bacen 2.926), não a linha
  // digitável de 47: são representações diferentes, e a linha traz DVs que o código não tem.
  barcode: string;
  beneficiaryName: string; // G013 — nome do cedente do título: quem RECEBE
  dueDate: Date; // G044
  titleValueCents: number; // G042
  paymentDate: Date; // P009
  paymentValueCents: number; // P010
  discountCents?: number; // L002
  surchargeCents?: number; // L003 — mora + multa
  yourNumber?: string; // G064 — referência do pagador
}>;

const CURRENCY_REAL = '09'; // G065 — domínio do layout: '09' = Real

// 44 é comprimento EXATO, não máximo — e a diferença importa.
//
// `num()` alinha à direita com zeros à esquerda, que é o certo para agência (`1234` → `01234`,
// mesma agência). Para código de barras não é: os 44 dígitos são posicionais e cada um significa
// algo — banco, moeda, DV, fator de vencimento, valor. Preencher `123` com 41 zeros produz um
// código sintaticamente válido e semanticamente outro, que o banco aceita e paga errado.
const BARCODE_LENGTH = 44;
const isBarcode = (raw: string): boolean =>
  new RegExp(`^\\d{${String(BARCODE_LENGTH)}}$`).test(raw);

export const segmentJ = (input: SegmentJInput): Result<string, CnabSegmentError> => {
  if (!isBarcode(input.barcode)) return err('numeric-field-invalid');

  return joinFields([
    num(input.bankCode, 3), // 001-003 banco do cedente
    num(input.batchNumber, 4), // 004-007 lote
    num(DETAIL_RECORD_TYPE, 1), // 008     tipo de registro (detalhe)
    num(input.recordNumber, 5), // 009-013 nº do registro no lote
    text('J', 1), // 014     segmento
    num(MOVEMENT_INCLUSION, 1), // 015     tipo de movimento
    num(MOVEMENT_INSTRUCTION_NONE, 2), // 016-017 código da instrução
    num(input.barcode, 44), // 018-061 código de barras
    text(input.beneficiaryName, 30), // 062-091 nome do cedente (quem recebe)
    dateDDMMYYYY(input.dueDate), // 092-099 vencimento do título
    cents(input.titleValueCents, 15), // 100-114 valor do título (13 + 2)
    cents(input.discountCents ?? 0, 15), // 115-129 desconto + abatimento
    cents(input.surchargeCents ?? 0, 15), // 130-144 mora + multa
    dateDDMMYYYY(input.paymentDate), // 145-152 data do pagamento
    cents(input.paymentValueCents, 15), // 153-167 valor do pagamento
    num(0, 15), // 168-182 quantidade da moeda (10 + 5)
    text(input.yourNumber ?? '', 20), // 183-202 referência do sacado
    blanks(20), // 203-222 nosso número — o banco preenche no retorno
    num(CURRENCY_REAL, 2), // 223-224 código da moeda
    blanks(6), // 225-230 CNAB
    blanks(10), // 231-240 ocorrências — preenchidas no retorno
  ]);
};

// O par que representa UM pagamento. O Segmento B é obrigatório no Multipag: emitir só o A produz
// arquivo recusado, e foi exatamente o que a transcrição da knowledge base induzia ao marcá-lo como
// opcional. Manter a numeração sequencial aqui evita que o chamador a calcule errado.
export const paymentRecords = (
  input: PaymentRecordsInput,
): Result<readonly string[], CnabSegmentError> => {
  const a = segmentA({
    bankCode: input.bankCode,
    batchNumber: input.batchNumber,
    recordNumber: input.firstRecordNumber,
    payee: input.payee,
    paymentDate: input.paymentDate,
    valueCents: input.valueCents,
    clearingHouse: input.clearingHouse,
    yourNumber: input.yourNumber,
    ...(input.tedPurpose !== undefined ? { tedPurpose: input.tedPurpose } : {}),
    ...(input.message !== undefined ? { message: input.message } : {}),
  });
  if (!a.ok) return a;

  const b = segmentB({
    bankCode: input.bankCode,
    batchNumber: input.batchNumber,
    recordNumber: input.firstRecordNumber + 1,
    payee: input.payee,
    ...(input.address !== undefined ? { address: input.address } : {}),
  });
  if (!b.ok) return b;

  return ok([a.value, b.value]);
};
