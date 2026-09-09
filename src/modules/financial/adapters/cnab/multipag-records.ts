// Registros de ENVELOPE do CNAB 240 Multipag (Bradesco): header/trailer de arquivo e de lote.
//
// Fonte primária: `handbook/guidelines/bradesco_guideline/jun-19-layout-multipag.pdf` (local-only,
// restrição de redistribuição) — header/trailer de arquivo nas pp. 14-16, envelope de lote nas
// pp. 22-29. Posições conferidas contra o PDF, não contra transcrição: a transcrição já divergiu
// dele uma vez (marcava o Segmento B como opcional, quando o layout diz obrigatório).
//
// Esta camada é ACL (ADR-0006): o domínio entrega `RemittanceOrder` e nunca vê "posição 143-172".
// Aqui NÃO entram os detalhes (Segmentos A e B) — envelope e conteúdo são fatias separadas.
import { err, type Result } from '../../../../shared/primitives/result.ts';
import {
  blanks,
  cents,
  dateDDMMYYYY,
  digits,
  inscription,
  joinFields,
  num,
  text,
  timeHHMMSS,
} from './positional.ts';
import type { PositionalFieldError } from './positional.ts';
import type { CnabBatchProfile } from './batch-profile.ts';

// O convênio tem erros PRÓPRIOS, e não um `numeric-field-*` emprestado (#804).
//
// Dois motivos independentes. O campo é Alfa, então "numérico estourou" descreveria mal o que
// houve; e a ação de quem recebe a recusa é diferente em cada caso — `empty` manda cadastrar o
// convênio, `overflow` manda conferir o que o banco cadastrou. Uma união fechada é o que faz o
// `switch` do tradutor ser exaustivo: quando um membro novo entrar aqui, o compilador cobra o
// mapeamento lá, em vez de deixá-lo cair num erro genérico em silêncio.
export type ConvenioFieldError = 'convenio-field-empty' | 'convenio-field-overflow';

export type CnabRecordError = PositionalFieldError | ConvenioFieldError;

// Versão do layout DE ARQUIVO. Fixa por documento, não configurável: muda quando o banco publica
// layout novo, e aí o valor vem acompanhado de um novo PDF.
//
// A versão do layout DE LOTE não mora aqui, e essa ausência é deliberada: ela varia por rota — cada
// seção do manual declara a sua — e viver como constante única neste módulo foi o que fez o header
// de lote parecer um formato só. Ela chega pelo `CnabBatchProfile` (#711).
const FILE_LAYOUT_VERSION = '089';
const REMITTANCE_CODE = '1'; // 1 = remessa (arquivo que sai daqui); 2 = retorno.
const BATCH_TRAILER_RESERVED_LOT = '9999';

// G020, colunas 167-171 — densidade de gravação em BPI. Domínio FECHADO no manual: 1600 ou 6250,
// e mais nada. O emissor escrevia `00000`, valor fora do domínio, que o Validador Universal
// recusa (#804, defeito 2).
//
// Herança de fita magnética: BPI é bits por polegada, e nada no transporte por VAN lê este número.
// Justamente por ser inerte é que a escolha entre os dois é livre — o que NÃO é livre é ficar fora
// do domínio. `1600` é a densidade convencional do CNAB 240; trocar para `6250` é trocar esta
// constante, e nenhum outro ponto do emissor depende dela.
const RECORDING_DENSITY = '01600';

// G007, colunas 033-052 — o convênio, e o campo onde layout e validador NÃO concordam.
//
// O layout declara 20 posições Alfa (p. 15, campo 07.0), e `text(convenio, 20)` era aderente a
// ele: alinha à esquerda, completa com brancos. Para convênio de até 6 dígitos o resultado já era
// exatamente o que o banco quer — este emissor nunca esteve errado nesse caso.
//
// O que faltava era a GUARDA. O Validador Universal lê o convênio apenas em 033-038 e exige
// 039-052 em branco (#804): um convênio mais longo não é recusado, é TRUNCADO pelo banco, que
// processa o arquivo sob outro contrato. O laudo mostrou isso — as posições 039-040 chegaram
// preenchidas, e o resumo do lote exibiu um convênio de 6 dígitos que não era o enviado.
//
// É a mesma classe de falha que `positional.ts` já trata em campo numérico: arquivo sintaticamente
// válido e semanticamente errado, aceito pelo banco, pagando sob a identidade errada. Lá a escolha
// foi recusar em vez de truncar, e o comentário do módulo diz por quê.
// O conteúdo que o banco LÊ (033-038) e o resto do campo, que ele exige em branco (039-052).
const CONVENIO_CONTENT_WIDTH = 6;
const CONVENIO_PADDING_WIDTH = 14;

// Recusa em vez de truncar, e monta o campo em DUAS peças. As duas escolhas são defesas
// independentes contra o mesmo desfecho — remessa processada sob um convênio que não é o nosso:
//
//   · a guarda impede que um convênio longo seja emitido de qualquer forma;
//   · a composição `text(6) + blanks(14)` impede o vazamento POSICIONAL mesmo sem a guarda —
//     `alpha` corta em 6, então nada alcança a coluna 039. Um `text(raw, 20)` daria o resultado
//     certo apenas ENQUANTO a guarda existisse, e voltaria a corromper 039-052 em silêncio no dia
//     em que alguém a removesse num refactor. É a mesma disciplina de `segmentJ`, que valida o
//     código de barras E usa comprimento exato.
const convenioField = (convenio: string): Result<string, CnabRecordError> => {
  const raw = convenio.trim();
  if (raw === '') return err('convenio-field-empty');
  if (raw.length > CONVENIO_CONTENT_WIDTH) return err('convenio-field-overflow');

  return joinFields([text(raw, CONVENIO_CONTENT_WIDTH), blanks(CONVENIO_PADDING_WIDTH)]);
};

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
  // G021, colunas 172-174 — `null` quando o arquivo não é de Pix, e as posições saem em branco.
  //
  // Obrigatório e não opcional, de propósito: é a quinta reincidência do padrão que a rule do CNAB
  // registra em §"Parâmetro opcional é o defeito". Um `?` aqui deixaria TODO arquivo sair sem a
  // literal enquanto ninguém o preenchesse — e o arquivo de Pix sem `PIX` em 172-174 é bem-formado,
  // some no meio dos demais e só é recusado pelo banco. Sendo obrigatório, o compilador cobra a
  // derivação de quem monta o arquivo, que é quem sabe o grupo dele.
  pixIdentification: string | null;
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
    inscription(c.document, 14), // 019-032 nº de inscrição
    convenioField(c.convenio), // 033-052 convênio (G007)
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
    num(RECORDING_DENSITY, 5), // 167-171 densidade (G020)
    // O campo 22 se PARTE em duas (pág. 15): 3 posições de identificação + 17 reservadas ao banco.
    // Eram `blanks(20)` num bloco só — aderente ao arquivo não-Pix por acidente, porque o arquivo
    // não-Pix escreve brancos nas duas metades. Escrever `PIX` sem encurtar a vizinha produziria
    // registro de 243 posições. Medido nos goldens: [PIX] + 17 brancos no de Pix; brancos nos dois
    // no de TED.
    text(input.pixIdentification ?? '', 3), // 172-174 identificação Pix (22.0, G021)
    blanks(17), // 175-191 reservado banco (22.1)
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
    inscription(c.document, 14), // 019-032 nº de inscrição
    convenioField(c.convenio), // 033-052 convênio (G007)
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
