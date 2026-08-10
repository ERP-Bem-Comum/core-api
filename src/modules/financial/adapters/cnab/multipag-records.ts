// Registros de ENVELOPE do CNAB 240 Multipag (Bradesco): header/trailer de arquivo e de lote.
//
// Fonte primária: `handbook/guidelines/bradesco_guideline/jun-19-layout-multipag.pdf` (local-only,
// restrição de redistribuição) — header/trailer de arquivo nas pp. 14-16, envelope de lote nas
// pp. 22-29. Posições conferidas contra o PDF, não contra transcrição: a transcrição já divergiu
// dele uma vez (marcava o Segmento B como opcional, quando o layout diz obrigatório).
//
// Esta camada é ACL (ADR-0006): o domínio entrega `RemittanceOrder` e nunca vê "posição 143-172".
// Aqui NÃO entram os detalhes (Segmentos A e B) — envelope e conteúdo são fatias separadas.
import { type Result, ok } from '../../../../shared/primitives/result.ts';
import { alpha, cents, dateDDMMYYYY, num, timeHHMMSS } from './positional.ts';
import type { PositionalFieldError } from './positional.ts';

export type CnabRecordError = PositionalFieldError;

// Versões de layout que o Bradesco espera. Fixas por documento, não configuráveis: mudam quando o
// banco publica layout novo, e aí o valor vem acompanhado de um novo PDF.
const FILE_LAYOUT_VERSION = '089';
const BATCH_LAYOUT_VERSION = '045';
const REMITTANCE_CODE = '1'; // 1 = remessa (arquivo que sai daqui); 2 = retorno.
const BATCH_TRAILER_RESERVED_LOT = '9999';

export type CedenteHeaderData = Readonly<{
  bankCode: string;
  documentType: '1' | '2'; // 1 = CPF, 2 = CNPJ
  document: string;
  convenio: string;
  agency: string;
  agencyDigit: string;
  accountNumber: string;
  accountDigit: string;
  accountAgencyDigit: string;
  companyName: string;
}>;

// O layout tem campos de endereço da empresa no header de lote. O domínio ainda não os modela, e
// brancos são aceitos — quando `CedenteAccount` ganhar endereço, ele entra por aqui sem mudar a
// assinatura dos demais registros.
export type CompanyAddress = Readonly<{
  street?: string;
  number?: number;
  complement?: string;
  city?: string;
  zipCode?: string;
  zipSuffix?: string;
  state?: string;
}>;

export type FileHeaderInput = Readonly<{
  cedente: CedenteHeaderData;
  bankName: string;
  nsa: number;
  generatedAt: Date;
}>;

export type BatchHeaderInput = Readonly<{
  cedente: CedenteHeaderData;
  batchNumber: number;
  serviceType: string; // G025 — tipo de serviço do lote
  launchForm: string; // G029 — forma de lançamento (crédito em conta, TED, …)
  message?: string;
  address?: CompanyAddress;
}>;

export type BatchTrailerInput = Readonly<{
  bankCode: string;
  batchNumber: number;
  recordCount: number; // registros DO LOTE, incluindo seu header e este trailer
  totalCents: number;
}>;

export type FileTrailerInput = Readonly<{
  bankCode: string;
  batchCount: number;
  recordCount: number; // TODOS os registros do arquivo, envelope incluído
}>;

// Concatena campos já formatados, propagando o primeiro erro. Sem isto, cada registro viraria uma
// escada de quinze `if (isErr(...))` — e a escada é onde se esquece de checar um.
const join = (
  fields: readonly Result<string, CnabRecordError>[],
): Result<string, CnabRecordError> => {
  const parts: string[] = [];
  for (const field of fields) {
    if (!field.ok) return field;
    parts.push(field.value);
  }
  return ok(parts.join(''));
};

const blanks = (size: number): Result<string, CnabRecordError> => ok(' '.repeat(size));
const text = (value: string, size: number): Result<string, CnabRecordError> =>
  ok(alpha(value, size));

export const fileHeader = (input: FileHeaderInput): Result<string, CnabRecordError> => {
  const { cedente: c } = input;
  return join([
    num(c.bankCode, 3), // 001-003 banco
    num(0, 4), // 004-007 lote (0000 no header de arquivo)
    num(0, 1), // 008     tipo de registro
    blanks(9), // 009-017 uso FEBRABAN
    num(c.documentType, 1), // 018     tipo de inscrição
    num(c.document, 14), // 019-032 nº de inscrição
    text(c.convenio, 20), // 033-052 convênio
    num(c.agency, 5), // 053-057 agência
    text(c.agencyDigit, 1), // 058     DV agência
    num(c.accountNumber, 12), // 059-070 conta
    text(c.accountDigit, 1), // 071     DV conta
    text(c.accountAgencyDigit, 1), // 072     DV ag/conta
    text(c.companyName, 30), // 073-102 nome da empresa
    text(input.bankName, 30), // 103-132 nome do banco
    blanks(10), // 133-142 uso FEBRABAN
    num(REMITTANCE_CODE, 1), // 143     remessa/retorno
    dateDDMMYYYY(input.generatedAt), // 144-151 data de geração
    timeHHMMSS(input.generatedAt), // 152-157 hora de geração
    num(input.nsa, 6), // 158-163 NSA
    num(FILE_LAYOUT_VERSION, 3), // 164-166 versão do layout de arquivo
    num(0, 5), // 167-171 densidade
    blanks(20), // 172-191 uso do banco
    blanks(20), // 192-211 uso da empresa
    blanks(29), // 212-240 uso FEBRABAN
  ]);
};

export const batchHeader = (input: BatchHeaderInput): Result<string, CnabRecordError> => {
  const { cedente: c, address: a } = input;
  return join([
    num(c.bankCode, 3), // 001-003 banco
    num(input.batchNumber, 4), // 004-007 lote
    num(1, 1), // 008     tipo de registro
    text('C', 1), // 009     tipo de operação (crédito)
    num(input.serviceType, 2), // 010-011 tipo de serviço
    num(input.launchForm, 2), // 012-013 forma de lançamento
    num(BATCH_LAYOUT_VERSION, 3), // 014-016 versão do layout de lote
    blanks(1), // 017     CNAB
    num(c.documentType, 1), // 018     tipo de inscrição
    num(c.document, 14), // 019-032 nº de inscrição
    text(c.convenio, 20), // 033-052 convênio
    num(c.agency, 5), // 053-057 agência
    text(c.agencyDigit, 1), // 058     DV agência
    num(c.accountNumber, 12), // 059-070 conta
    text(c.accountDigit, 1), // 071     DV conta
    text(c.accountAgencyDigit, 1), // 072     DV ag/conta
    text(c.companyName, 30), // 073-102 nome da empresa
    text(input.message ?? '', 40), // 103-142 mensagem
    text(a?.street ?? '', 30), // 143-172 logradouro
    num(a?.number ?? 0, 5), // 173-177 número
    text(a?.complement ?? '', 15), // 178-192 complemento
    text(a?.city ?? '', 20), // 193-212 cidade
    num(a?.zipCode ?? 0, 5), // 213-217 CEP
    text(a?.zipSuffix ?? '', 3), // 218-220 complemento do CEP
    text(a?.state ?? '', 2), // 221-222 estado
    num('01', 2), // 223-224 indicativo de forma de pagamento
    blanks(6), // 225-230 CNAB
    blanks(10), // 231-240 ocorrências (preenchidas no retorno)
  ]);
};

export const batchTrailer = (input: BatchTrailerInput): Result<string, CnabRecordError> =>
  join([
    num(input.bankCode, 3), // 001-003 banco
    num(input.batchNumber, 4), // 004-007 lote
    num(5, 1), // 008     tipo de registro
    blanks(9), // 009-017 CNAB
    num(input.recordCount, 6), // 018-023 qtde de registros do lote
    cents(input.totalCents, 18), // 024-041 somatória de valores (16 + 2 decimais)
    num(0, 18), // 042-059 somatória de quantidade de moeda (13 + 5)
    num(0, 6), // 060-065 número do aviso de débito
    blanks(165), // 066-230 CNAB
    blanks(10), // 231-240 ocorrências (preenchidas no retorno)
  ]);

export const fileTrailer = (input: FileTrailerInput): Result<string, CnabRecordError> =>
  join([
    num(input.bankCode, 3), // 001-003 banco
    num(BATCH_TRAILER_RESERVED_LOT, 4), // 004-007 lote reservado do trailer de arquivo
    num(9, 1), // 008     tipo de registro
    blanks(9), // 009-017 uso FEBRABAN
    num(input.batchCount, 6), // 018-023 qtde de lotes
    num(input.recordCount, 6), // 024-029 qtde de registros do arquivo
    num(0, 6), // 030-035 qtde de contas para conciliação
    blanks(205), // 036-240 uso FEBRABAN
  ]);
