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
  batchKeyFor,
  batchProfileFor,
  clearingHouseFor,
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
  type CnabRecordError,
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

// TODO registro termina em CRLF — o trailer de arquivo inclusive (#804, defeito 6).
//
// A versão anterior era `lines.join(LINE_TERMINATOR)`, e `join` põe separador ENTRE elementos: N
// registros saíam com N-1 terminadores. O Validador Universal recusou. A suposição estava
// declarada em teste, com o aviso de que era suposição — foi o que tornou a correção uma linha.
//
// ⚠️ Quem for conferir isto NÃO use `split(LINE_TERMINATOR)`: `split` de um texto terminado produz
// um elemento vazio final, e comparar contagens depois disso esconde exatamente o defeito que esta
// função existe para não cometer. A testemunha honesta é o comprimento em bytes.
const terminated = (lines: readonly string[]): string =>
  lines.map((l) => `${l}${LINE_TERMINATOR}`).join('');

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
  // ⚠️ `yourNumber` NÃO entra aqui (#752). A referência de G064 é DERIVADA pelo montador a partir do
  // NSA e da posição do pagamento — dados que o chamador não tem: o NSA é alocado no use case,
  // depois de o reader já ter montado os pagamentos. Aceitá-la de fora reabriria o caminho para a
  // string vazia, que é o defeito original. A ausência do campo faz o compilador cobrar quem tentar.
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
  // Idem `TransferPayment`: derivado no montador, nunca recebido de fora.
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
  // O erro do ENVELOPE entra por inteiro, e não achatado num membro genérico: o convênio recusado
  // (#804) precisa chegar ao tradutor com o nome que tinha, para o `switch` de lá poder distingui-lo
  // de um campo numérico que estourou. Achatar aqui apagaria a informação antes de alguém usá-la.
  | CnabRecordError
  | BatchProfileError
  | 'remittance-without-payments'
  // Um componente da referência de G064 não coube na sua largura (#752, CA5). Recusar é a única
  // saída: truncar colapsaria duas referências distintas na mesma string, e o casamento do retorno
  // apontaria para o título errado — sem nada indicando que houve truncamento.
  | 'remittance-reference-overflow';

export type RemittanceFile = Readonly<{
  content: string;
  lineCount: number;
  totalCents: number;
  batchCount: number;
  // As referências de G064 emitidas, NA ORDEM DE ENTRADA de `payments` (#752).
  //
  // ⚠️ A ordem é o contrato inteiro deste campo, e é frágil de propósito: o chamador casa por
  // índice com os `documentId` que ele possui, porque a camada CNAB não conhece identidade de
  // domínio e não deve conhecer (ADR-0006). Devolver na ordem de EMISSÃO associaria a referência ao
  // documento errado — arquivo válido, casamento de retorno errado, que é a pior classe de falha
  // deste módulo. Ver `groupIntoBatches`, que reordena.
  yourNumbers: readonly string[];
}>;

// A referência que a EMPRESA atribui ao pagamento e o banco devolve no retorno — G064, Segmento A,
// colunas 074-093 (20 posições).
//
// Composição: convênio (8) + NSA (6) + posição do pagamento na seleção (6) = 20, o campo inteiro.
//
// A largura do convênio aqui é 8, e a razão registrada antes da #804 estava ERRADA: dizia que "o
// convênio real tem 7 dígitos" e que "nada garante 6", apoiando-se nas 20 posições que o layout
// reserva ao campo no header. O Validador Universal desmentiu as duas coisas — ele lê o convênio
// só em 033-038, e o próprio emissor agora recusa acima de 6 (`convenioField`).
//
// A largura permanece 8, e permanecer é a escolha: um convênio de 6 cabe nela com zeros à esquerda,
// e encolhê-la mudaria o formato de TODA referência G064 já emitida — quebrando o casamento dos
// retornos que ainda vão chegar. O excedente é folga inerte, não premissa.
//
//   • A posição dá unicidade DENTRO do arquivo — e é a posição na ENTRADA, não o sequencial do
//     registro no lote (G038). Este último REINICIA a cada lote, então dois pagamentos em lotes
//     diferentes teriam o mesmo número e a referência colidiria dentro do próprio arquivo.
//   • O NSA dá unicidade entre arquivos DA MESMA CONTA-CEDENTE: é alocado sob lock de linha e nunca
//     repete ali.
//   • ⚠️ O convênio é o que fecha o CA4, e não é adorno. `allocateNsa` recebe `cedenteAccountId` —
//     a sequência é POR CONTA. Com duas contas-cedente, o NSA 7 existe nas duas, e `NSA + posição`
//     produziria a mesma referência para títulos diferentes. Como o banco devolve só este campo, o
//     casamento ficaria ambíguo justamente no caso que a issue existe para evitar. O convênio já é o
//     discriminador de conta no nome do arquivo (`buildRemittanceFileName`), e é o mesmo aqui.
//
// Reversibilidade (CA2): a resolução referência → título é uma consulta ao vínculo persistido, não
// um recálculo. Recalcular exigiria reproduzir o agrupamento em lotes como ele estava no dia da
// emissão, e o agrupamento depende do cadastro do favorecido, que muda.
const CONVENIO_WIDTH = 8;
const NSA_WIDTH = 6;
const SEQUENCE_WIDTH = 6;

// G064 tem 20 posições (Segmento A, colunas 074-093). A soma bater com a largura do campo não é
// coincidência a preservar por acaso: se um componente crescer, outro precisa encolher, e a conta
// tem de continuar fechando. Há teste fixando isto.
const YOUR_NUMBER_WIDTH = CONVENIO_WIDTH + NSA_WIDTH + SEQUENCE_WIDTH;

// Um componente que não cabe na sua largura RECUSA o arquivo. Truncar produziria referências
// distintas colapsadas na mesma string — colisão silenciosa, que é o modo de falha do CA5.
const fixedWidth = (value: string, width: number): string | null =>
  value.length > width ? null : value.padStart(width, '0');

export const referenceFor = (convenio: string, nsa: number, inputIndex: number): string | null => {
  const c = fixedWidth(convenio.trim(), CONVENIO_WIDTH);
  const n = fixedWidth(String(nsa), NSA_WIDTH);
  const s = fixedWidth(String(inputIndex + 1), SEQUENCE_WIDTH);
  if (c === null || n === null || s === null) return null;

  const reference = `${c}${n}${s}`;
  // Guarda de largura, e não asserção redundante: as três larguras são constantes independentes, e
  // alguém que mexer numa delas descobre aqui — na emissão — em vez de descobrir no banco.
  return reference.length === YOUR_NUMBER_WIDTH ? reference : null;
};

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
  yourNumber: string,
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
        yourNumber,
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
        yourNumber,
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

// O pagamento COM a posição que ele ocupava na entrada.
//
// ⚠️ Este par é a defesa contra a armadilha da #752. `groupIntoBatches` reordena — agrupa por forma
// de lançamento e banco do favorecido —, então a ordem de emissão não é a ordem de entrada. Sem
// carregar o índice original, devolver as referências "na ordem de entrada" seria impossível, e
// casá-las por posição no chamador associaria cada referência ao documento errado. O arquivo sairia
// válido, o banco aceitaria, e o erro só apareceria meses depois, no primeiro retorno.
type IndexedPayment = Readonly<{ payment: RemittancePayment; inputIndex: number }>;

type Batch = Readonly<{ profile: CnabBatchProfile; payments: readonly IndexedPayment[] }>;

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
// ⚠️ A RÉGUA MUDOU DE CASA na #804 e agora vive em `batch-profile.ts`, junto de
// `normalizeBankCode`: ela passou a ter DOIS consumidores — este montador e o planejador de lotes
// do pré-voo (CA7). Uma segunda cópia faria a tela de confirmação descrever um agrupamento
// diferente do que foi transmitido, que é pior que não ter pré-voo: o operador confirma
// acreditando ter conferido.
//
// O que sobra aqui é a tradução do pagamento do montador para o mínimo que a régua consulta.
const batchKeyOf = (payment: RemittancePayment, profile: CnabBatchProfile): string =>
  batchKeyFor(
    payment.route === 'transfer',
    profile.launchForm,
    payment.route === 'transfer' ? payment.payee.bankCode : null,
  );

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
  const byKey = new Map<string, { profile: CnabBatchProfile; payments: IndexedPayment[] }>();

  for (const [inputIndex, payment] of payments.entries()) {
    const profile = batchProfileFor(profiledOf(payment), cedenteBankCode);
    // Uma rota sem emissor aborta o arquivo inteiro, em vez de sair como transferência por omissão.
    // Emitir o par de crédito em conta para um boleto produziria arquivo bem-formado, aceito pelo
    // banco, pagando errado — a pior classe de falha do módulo.
    if (!profile.ok) return profile;

    const key = batchKeyOf(payment, profile.value);
    const indexed: IndexedPayment = { payment, inputIndex };
    const group = byKey.get(key);
    if (group === undefined) {
      order.push(key);
      byKey.set(key, { profile: profile.value, payments: [indexed] });
    } else {
      group.payments.push(indexed);
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

  // Indexado pela posição de ENTRADA — preenchido na ordem de emissão, lido na ordem de entrada. É o
  // que permite ao chamador casar por índice com os `documentId` que ele já tem, sem que esta camada
  // conheça documento algum.
  const yourNumbers: string[] = new Array<string>(input.payments.length);

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

    for (const { payment, inputIndex } of batch.payments) {
      // A referência vem da posição de ENTRADA, não do sequencial do registro — que reinicia por
      // lote e colidiria entre lotes do mesmo arquivo. Ver `referenceFor`.
      const yourNumber = referenceFor(input.cedente.convenio, input.nsa, inputIndex);
      if (yourNumber === null) return err('remittance-reference-overflow');
      yourNumbers[inputIndex] = yourNumber;

      // O sequencial REINICIA a cada lote: é o que o campo declara, e é o que o trailer daquele
      // lote confere. Continuar a contagem entre lotes produziria arquivo que o banco recusa.
      const emitted = detailsOf(
        payment,
        {
          bankCode: input.cedente.bankCode,
          batchNumber,
          firstRecordNumber: details.length + 1,
          launchForm: batch.profile.launchForm,
        },
        yourNumber,
      );
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
    content: terminated(lines),
    lineCount: lines.length,
    totalCents,
    batchCount: batches.value.length,
    yourNumbers,
  });
};
