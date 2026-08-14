// Registros de ENVELOPE do CNAB 240 Multipag (Bradesco): header/trailer de arquivo e de lote.
//
// Fonte primária: `handbook/guidelines/bradesco_guideline/jun-19-layout-multipag.pdf` (local-only,
// restrição de redistribuição) — header/trailer de arquivo nas pp. 14-16, envelope de lote nas
// pp. 22-29. Posições conferidas contra o PDF, não contra transcrição: a transcrição já divergiu
// dele uma vez (marcava o Segmento B como opcional, quando o layout diz obrigatório).
//
// Esta camada é ACL (ADR-0006): o domínio entrega `RemittanceOrder` e nunca vê "posição 143-172".
// Aqui NÃO entram os detalhes (Segmentos A e B) — envelope e conteúdo são fatias separadas.
import type { Result } from '../../../../shared/primitives/result.ts';
import {
  blanks,
  cents,
  dateDDMMYYYY,
  digits,
  joinFields,
  num,
  text,
  timeHHMMSS,
} from './positional.ts';
import type { PositionalFieldError } from './positional.ts';
import type { CnabBatchProfile } from './batch-profile.ts';

export type CnabRecordError = PositionalFieldError;

// Versão do layout DE ARQUIVO. Fixa por documento, não configurável: muda quando o banco publica
// layout novo, e aí o valor vem acompanhado de um novo PDF.
//
// A versão do layout DE LOTE não mora aqui, e essa ausência é deliberada: ela varia por rota — cada
// seção do manual declara a sua — e viver como constante única neste módulo foi o que fez o header
// de lote parecer um formato só. Ela chega pelo `CnabBatchProfile` (#711).
const FILE_LAYOUT_VERSION = '089';
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
  // Serviço, forma, versão do layout e presença do indicativo vêm JUNTOS, do perfil da rota. Passá-
  // los soltos permitiria combinar a forma de uma seção com a versão de layout de outra, que é
  // exatamente o arquivo que o banco recusa sem dizer qual campo.
  profile: CnabBatchProfile;
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

export const fileHeader = (input: FileHeaderInput): Result<string, CnabRecordError> => {
  const { cedente: c } = input;
  return joinFields([
    num(c.bankCode, 3), // 001-003 banco
    num(0, 4), // 004-007 lote (0000 no header de arquivo)
    num(0, 1), // 008     tipo de registro
    blanks(9), // 009-017 uso FEBRABAN
    num(c.documentType, 1), // 018     tipo de inscrição
    digits(c.document, 14), // 019-032 nº de inscrição
    text(c.convenio, 20), // 033-052 convênio
    digits(c.agency, 5), // 053-057 agência
    text(c.agencyDigit, 1), // 058     DV agência
    digits(c.accountNumber, 12), // 059-070 conta
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
  const { cedente: c, address: a, profile: p } = input;
  return joinFields([
    num(c.bankCode, 3), // 001-003 banco
    num(input.batchNumber, 4), // 004-007 lote
    num(1, 1), // 008     tipo de registro
    text('C', 1), // 009     tipo de operação (crédito)
    num(p.serviceType, 2), // 010-011 tipo de serviço
    num(p.launchForm, 2), // 012-013 forma de lançamento
    num(p.batchLayoutVersion, 3), // 014-016 versão do layout de lote — varia por rota
    blanks(1), // 017     CNAB
    num(c.documentType, 1), // 018     tipo de inscrição
    digits(c.document, 14), // 019-032 nº de inscrição
    text(c.convenio, 20), // 033-052 convênio
    digits(c.agency, 5), // 053-057 agência
    text(c.agencyDigit, 1), // 058     DV agência
    digits(c.accountNumber, 12), // 059-070 conta
    text(c.accountDigit, 1), // 071     DV conta
    text(c.accountAgencyDigit, 1), // 072     DV ag/conta
    text(c.companyName, 30), // 073-102 nome da empresa
    text(input.message ?? '', 40), // 103-142 mensagem
    text(a?.street ?? '', 30), // 143-172 logradouro
    num(a?.number ?? 0, 5), // 173-177 número
    text(a?.complement ?? '', 15), // 178-192 complemento
    text(a?.city ?? '', 20), // 193-212 cidade
    digits(a?.zipCode ?? '0', 5), // 213-217 CEP
    text(a?.zipSuffix ?? '', 3), // 218-220 complemento do CEP
    text(a?.state ?? '', 2), // 221-222 estado
    // 223-230. Na seção de pagamentos o indicativo ocupa 223-224 e o CNAB vai de 225 a 230; na
    // seção de cobrança o campo não existe e as oito posições são brancos. Emitir o indicativo num
    // lote de boleto preencheria campo que aquela seção não prevê.
    ...(p.paymentIndicator === null ? [blanks(8)] : [num(p.paymentIndicator, 2), blanks(6)]),
    blanks(10), // 231-240 ocorrências (preenchidas no retorno)
  ]);
};

export const batchTrailer = (input: BatchTrailerInput): Result<string, CnabRecordError> =>
  joinFields([
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
  joinFields([
    num(input.bankCode, 3), // 001-003 banco
    num(BATCH_TRAILER_RESERVED_LOT, 4), // 004-007 lote reservado do trailer de arquivo
    num(9, 1), // 008     tipo de registro
    blanks(9), // 009-017 uso FEBRABAN
    num(input.batchCount, 6), // 018-023 qtde de lotes
    num(input.recordCount, 6), // 024-029 qtde de registros do arquivo
    num(0, 6), // 030-035 qtde de contas para conciliação
    blanks(205), // 036-240 uso FEBRABAN
  ]);
