// Montador do arquivo de remessa CNAB 240 Multipag: junta envelope e detalhes num arquivo só.
//
// A razão de existir: os totais dos trailers são **derivados das linhas efetivamente emitidas**, não
// informados por quem chama. Enquanto a contagem for responsabilidade do chamador, um erro nela
// passa despercebido até o banco recusar o arquivo inteiro — e a recusa vem sem dizer qual campo.
//
// O arquivo é MULTI-LOTE: um lote por forma de lançamento, cada um com seu header, sua numeração de
// detalhe e seu trailer (#711). O lote deixou de ser constante e virou dimensão do arquivo — que é
// o que permite pagar boleto e transferência na mesma remessa sem que um saia disfarçado do outro.
//
// A forma de cada lote é DERIVADA do conteúdo (`batch-profile.ts`), nunca recebida como parâmetro:
// enquanto havia uma rota só, quem chamava e quem pagava concordavam por acidente.
import { ok, err, type Result } from '../../../../shared/primitives/result.ts';
import {
  batchProfileFor,
  clearingHouseFor,
  normalizeBankCode,
  type BatchProfileError,
  type CnabBatchProfile,
  type ProfiledPayment,
} from './batch-profile.ts';
import {
  batchHeader,
  batchTrailer,
  fileHeader,
  fileTrailer,
  type CedenteHeaderData,
  type CompanyAddress,
} from './multipag-records.ts';
import {
  paymentRecords,
  segmentJ,
  type CnabSegmentError,
  type Payee,
  type PayeeAddress,
} from './multipag-segments.ts';

// O layout não especifica o terminador de linha — nem no corpo, nem nas notas gerais. CRLF é a
// convenção do CNAB e o destino é uma máquina Windows (o STCPCLT roda lá), então é a escolha
// segura. Fica exportado e nomeado de propósito: se o banco recusar um arquivo bem formado, este
// é o primeiro suspeito, e a troca é de uma constante.
export const LINE_TERMINATOR = '\r\n';

// A câmara centralizadora NÃO entra aqui, pelo mesmo motivo que a forma de lançamento não entra:
// ela é derivada do conteúdo (#751). Enquanto foi campo opcional, nenhum chamador a preencheu e o
// default do Segmento A — câmara de TED — valeu para todo pagamento, inclusive para o favorecido
// do próprio banco, cujo registro o Bradesco recusa.
export type TransferPayment = Readonly<{
  route: 'transfer';
  payee: Payee;
  paymentDate: Date;
  valueCents: number;
  address?: PayeeAddress;
  yourNumber?: string;
  tedPurpose?: string;
  message?: string;
}>;

// O boleto não declara favorecido: quem recebe está no código de barras. Por isso este membro da
// união não tem `payee` — não é omissão, é o que a rota transporta (#708, CA5).
export type BilletPayment = Readonly<{
  route: 'billet';
  barcode: string;
  beneficiaryName: string;
  dueDate: Date;
  paymentDate: Date;
  valueCents: number;
  // Valor NOMINAL do título. Ausente, assume-se igual ao pago — é o caso comum, sem desconto nem
  // mora; informá-lo permite que o banco reconheça a diferença.
  titleValueCents?: number;
  discountCents?: number;
  surchargeCents?: number;
  yourNumber?: string;
}>;

// As rotas que a P.O. contratou e o emissor ainda não cobre. Existem no tipo de propósito: o dado
// chega em runtime, do reader, e o montador precisa poder RECUSÁ-LO explicitamente. Um tipo que as
// proibisse empurraria a decisão para um `as` no chamador — e a recusa deixaria de acontecer.
//
// Carregam valor e data como as demais: o título os tem havendo emissor ou não, e é o que permite
// ao use case conferir a data única da remessa antes de saber se o arquivo sai.
export type UnsupportedPayment = Readonly<{
  route: 'pix' | 'tax-guide';
  valueCents: number;
  paymentDate: Date;
}>;

export type RemittancePayment = TransferPayment | BilletPayment | UnsupportedPayment;

export type RemittanceFileInput = Readonly<{
  cedente: CedenteHeaderData;
  bankName: string;
  nsa: number;
  generatedAt: Date;
  companyAddress?: CompanyAddress;
  batchMessage?: string;
  payments: readonly RemittancePayment[];
}>;

export type RemittanceFileError =
  | CnabSegmentError
  | BatchProfileError
  | 'remittance-without-payments';

export type RemittanceFile = Readonly<{
  content: string;
  lineCount: number;
  totalCents: number;
  batchCount: number;
}>;

// O que o detalhe herda do LOTE em que está. Agrupado num tipo porque são as coordenadas de uma
// coisa só — a posição do registro dentro do lote — e porque a forma entrou aqui para que o
// Segmento A derive dela a câmara, em vez de recebê-la de fora.
type BatchContext = Readonly<{
  bankCode: string; // banco do CEDENTE
  batchNumber: number;
  firstRecordNumber: number;
  launchForm: string; // G029 do lote
}>;

// Os registros de detalhe de UM pagamento, na rota dele. O sequencial do registro no lote (G038)
// numera os detalhes a partir de 1 dentro de CADA lote — centralizar a conta aqui é o que impede o
// chamador de errá-la.
const detailsOf = (
  payment: RemittancePayment,
  batch: BatchContext,
): Result<readonly string[], RemittanceFileError> => {
  const { bankCode, batchNumber, firstRecordNumber } = batch;

  switch (payment.route) {
    case 'transfer':
      return paymentRecords({
        bankCode,
        batchNumber,
        firstRecordNumber,
        payee: payment.payee,
        paymentDate: payment.paymentDate,
        valueCents: payment.valueCents,
        // A câmara sai da forma do LOTE, não de um parâmetro do pagamento: os dois campos
        // descrevem a mesma operação e não podem divergir dentro de um registro.
        clearingHouse: clearingHouseFor(batch.launchForm),
        ...(payment.address !== undefined ? { address: payment.address } : {}),
        ...(payment.yourNumber !== undefined ? { yourNumber: payment.yourNumber } : {}),
        ...(payment.tedPurpose !== undefined ? { tedPurpose: payment.tedPurpose } : {}),
        ...(payment.message !== undefined ? { message: payment.message } : {}),
      });

    case 'billet': {
      const record = segmentJ({
        bankCode,
        batchNumber,
        recordNumber: firstRecordNumber,
        barcode: payment.barcode,
        beneficiaryName: payment.beneficiaryName,
        dueDate: payment.dueDate,
        titleValueCents: payment.titleValueCents ?? payment.valueCents,
        paymentDate: payment.paymentDate,
        paymentValueCents: payment.valueCents,
        ...(payment.discountCents !== undefined ? { discountCents: payment.discountCents } : {}),
        ...(payment.surchargeCents !== undefined ? { surchargeCents: payment.surchargeCents } : {}),
        ...(payment.yourNumber !== undefined ? { yourNumber: payment.yourNumber } : {}),
      });
      return record.ok ? ok([record.value]) : record;
    }

    // Inalcançável na prática — o perfil já recusou a rota antes de chegar aqui. Fica explícito
    // mesmo assim: um emissor novo entra por este switch, e o compilador cobra o caso.
    case 'pix':
    case 'tax-guide':
      return err('remittance-launch-form-unsupported');
  }
};

type Batch = Readonly<{ profile: CnabBatchProfile; payments: readonly RemittancePayment[] }>;

// Do pagamento inteiro para o mínimo que decide o perfil. A conversão é explícita, e não o
// pagamento passado direto, porque o perfil não deve enxergar valor, data nem endereço: o que
// decide a forma é de QUEM RECEBE, e mais nada.
const profiledOf = (payment: RemittancePayment): ProfiledPayment => {
  switch (payment.route) {
    case 'transfer':
      return { route: 'transfer', payeeBankCode: payment.payee.bankCode };
    case 'billet':
      return { route: 'billet', barcode: payment.barcode };
    case 'pix':
      return { route: 'pix' };
    case 'tax-guide':
      return { route: 'tax-guide' };
  }
};

// A chave que decide se dois pagamentos dividem lote.
//
// A forma de lançamento NÃO basta, e é o terceiro efeito da #751: o validador oficial do Bradesco
// recusa lote cujos Segmentos A misturem favorecidos de bancos distintos
// (ERP-Bem-Comum/cnab-validator#2), enquanto a forma só separa o próprio banco de todo o resto —
// Itaú e Santander compartilham a forma `41` e cairiam juntos.
//
// O boleto fica fora da regra porque não tem favorecido bancário: quem recebe está no código de
// barras e o Segmento J não carrega banco de destino (#708, CA5). Para ele a forma é a chave
// inteira — e ela já separa título do próprio banco de título de outro.
//
// O banco entra NORMALIZADO, pela mesma função do perfil: `341` e `0341` são o mesmo destino e
// escrevem as mesmas posições 021-023. Chaves cruas partiriam um lote legítimo em dois, cada um
// válido e nenhum necessário.
const BATCH_KEY_SEPARATOR = ':'; // fora do domínio de G029 e de código de banco, ambos numéricos

const batchKeyOf = (payment: RemittancePayment, profile: CnabBatchProfile): string => {
  if (payment.route !== 'transfer') return profile.launchForm;

  // O `??` é inalcançável: um banco que não normaliza já derrubou o perfil com
  // `remittance-payee-bank-unreadable`. Fica porque a alternativa seria um `!` afirmando o mesmo
  // sem prova — e, se um dia divergirem, agrupar pelo código cru erra menos que estourar aqui.
  const payeeBank = normalizeBankCode(payment.payee.bankCode) ?? payment.payee.bankCode;
  return `${profile.launchForm}${BATCH_KEY_SEPARATOR}${payeeBank}`;
};

// Agrupa os pagamentos em lotes, preservando a ordem de PRIMEIRA APARIÇÃO de cada chave na seleção.
//
// A ordem é parte do contrato: uma ordenação implícita (alfabética, por rota) tornaria a numeração
// dos lotes dependente de detalhe invisível ao operador, e dois arquivos com a mesma seleção sairiam
// diferentes. Aqui, a seleção manda.
const groupIntoBatches = (
  payments: readonly RemittancePayment[],
  cedenteBankCode: string,
): Result<readonly Batch[], RemittanceFileError> => {
  const order: string[] = [];
  const byKey = new Map<string, { profile: CnabBatchProfile; payments: RemittancePayment[] }>();

  for (const payment of payments) {
    const profile = batchProfileFor(profiledOf(payment), cedenteBankCode);
    // Uma rota sem emissor aborta o arquivo inteiro, em vez de sair como transferência por omissão.
    // Emitir o par de crédito em conta para um boleto produziria arquivo bem-formado, aceito pelo
    // banco, pagando errado — a pior classe de falha do módulo.
    if (!profile.ok) return profile;

    const key = batchKeyOf(payment, profile.value);
    const group = byKey.get(key);
    if (group === undefined) {
      order.push(key);
      byKey.set(key, { profile: profile.value, payments: [payment] });
    } else {
      group.payments.push(payment);
    }
  }

  return ok(order.map((key) => byKey.get(key) as Batch));
};

export const buildRemittanceFile = (
  input: RemittanceFileInput,
): Result<RemittanceFile, RemittanceFileError> => {
  // Arquivo sem pagamento é envelope vazio: o banco recebe, processa e não paga nada. Recusar aqui
  // é mais barato que descobrir depois por que a remessa "foi" e ninguém recebeu.
  if (input.payments.length === 0) return err('remittance-without-payments');

  const batches = groupIntoBatches(input.payments, input.cedente.bankCode);
  if (!batches.ok) return batches;

  const header = fileHeader({
    cedente: input.cedente,
    bankName: input.bankName,
    nsa: input.nsa,
    generatedAt: input.generatedAt,
  });
  if (!header.ok) return header;

  const bodyLines: string[] = [header.value];
  let totalCents = 0;

  for (const [index, batch] of batches.value.entries()) {
    // Lotes numerados a partir de 1, na ordem em que as formas apareceram na seleção.
    const batchNumber = index + 1;

    const lotHeader = batchHeader({
      cedente: input.cedente,
      batchNumber,
      profile: batch.profile,
      ...(input.batchMessage !== undefined ? { message: input.batchMessage } : {}),
      ...(input.companyAddress !== undefined ? { address: input.companyAddress } : {}),
    });
    if (!lotHeader.ok) return lotHeader;

    const details: string[] = [];
    let batchCents = 0;

    for (const payment of batch.payments) {
      // O sequencial REINICIA a cada lote: é o que o campo declara, e é o que o trailer daquele
      // lote confere. Continuar a contagem entre lotes produziria arquivo que o banco recusa.
      const emitted = detailsOf(payment, {
        bankCode: input.cedente.bankCode,
        batchNumber,
        firstRecordNumber: details.length + 1,
        launchForm: batch.profile.launchForm,
      });
      // Um pagamento que falha aborta o arquivo inteiro. Emitir remessa parcial seria pagar parte
      // dos fornecedores e silenciar o resto — pior que não pagar ninguém.
      if (!emitted.ok) return emitted;

      details.push(...emitted.value);
      batchCents += payment.valueCents;
    }

    // Registros DO LOTE: seu header + os detalhes + este trailer. Cada trailer conta e soma APENAS
    // o seu lote.
    const lotTrailer = batchTrailer({
      bankCode: input.cedente.bankCode,
      batchNumber,
      recordCount: details.length + 2,
      totalCents: batchCents,
    });
    if (!lotTrailer.ok) return lotTrailer;

    bodyLines.push(lotHeader.value, ...details, lotTrailer.value);
    totalCents += batchCents;
  }

  // Registros DO ARQUIVO: tudo que já foi emitido mais este trailer. Derivado do array, nunca de
  // uma fórmula paralela — fórmula e emissão divergem no dia em que alguém acrescentar um registro.
  const trailer = fileTrailer({
    bankCode: input.cedente.bankCode,
    batchCount: batches.value.length,
    recordCount: bodyLines.length + 1,
  });
  if (!trailer.ok) return trailer;

  const lines = [...bodyLines, trailer.value];

  return ok({
    content: lines.join(LINE_TERMINATOR),
    lineCount: lines.length,
    totalCents,
    batchCount: batches.value.length,
  });
};
