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
  tedPurposeFor,
  complementPurposeFor,
  fileGroupFor,
  pixIdentificationFor,
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
  pixPaymentInfo,
  segmentA,
  segmentBPix,
  segmentJ,
  segmentJ52,
  PIX_ACCOUNT_TYPE_CHECKING,
  PIX_ZEROED_PAYEE_ACCOUNT,
  type BilletParty,
  type CnabSegmentError,
  type Payee,
  type PayeeAddress,
  type PayeeIdentity,
} from './multipag-segments.ts';
import { pixInitiationFor, type PixInitiationError } from './pix-initiation.ts';

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
  //
  // `tedPurpose` saiu daqui pela mesma razão, e é o ponto da #813: era opcional, ninguém o
  // preenchia — seis menções e zero usos —, e o default do Segmento A escrevia brancos em toda
  // remessa, TED inclusive. A finalidade é DERIVADA da forma do lote (`tedPurposeFor`), como a
  // câmara: recebê-la de fora é aceitar uma afirmação que o conteúdo do arquivo pode contradizer.
  message?: string;
}>;

// O boleto não declara favorecido: quem recebe está no código de barras. Por isso este membro da
// união não tem `payee` — não é omissão, é o que a rota transporta (#708, CA5).
export type BilletPayment = Readonly<{
  route: 'billet';
  barcode: string;
  beneficiaryName: string;
  // A INSCRIÇÃO de quem emitiu o título, que o Segmento J-52 exige em 076-091 (#891). O nome
  // sozinho não identifica o cedente para o banco.
  //
  // ⚠️ OBRIGATÓRIOS: sem `?`, sem default — e a ausência do opcional é a decisão, não um descuido.
  // É o quinto caso que a rule `cnab.md` enumera: `address?: PayeeAddress`, logo acima, não produz
  // valor errado, produz SILÊNCIO — ninguém tem o que passar, o `?? ''` vira branco em 100% das
  // remessas (#858), e o adapter compila perfeitamente sem o dado que o layout exige. Um
  // `beneficiaryDocument?` com `?? ''` reproduziria exatamente isso num registro novo. Aqui o
  // compilador cobra quem esquecer, e a guarda de `segmentJ52` cobra quem passar vazio.
  beneficiaryDocumentType: '1' | '2';
  beneficiaryDocument: string;
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

// Pagamento por chave Pix, na forma `45` (#838).
//
// ⚠️ NÃO carrega bloco bancário — e a versão anterior deste tipo carregava, com o argumento de que o
// golden `GOLDEN_TEST_MULTIPAG_PIX_240` traz banco, agência, DV, conta e DV preenchidos no Segmento A
// e o layout marca os campos com asterisco. **O laudo do Bradesco de 05/09/2026 arbitrou contra**
// (#945): esses campos podem sair zerados no Pix iniciado por chave, e é o que `segmentA` recebe
// desta rota, via `PIX_ZEROED_PAYEE_ACCOUNT`.
//
// A decisão da P.O. de 13/08 (#708) — "PIX paga por chave, não olha agência ou conta" — estava certa
// desde o começo; o que faltava era separar *campo posicional do CNAB* de *dado necessário para
// identificar o recebedor*. O preenchimento das 021-042 é regra de serialização, não requisito de
// cadastro, e é por isso que ele mora no montador e não neste tipo.
//
// O `keyType` chega CRU, do vocabulário de `partners`, e é traduzido aqui — não antes. Quem conhece
// o domínio `G100` é o adapter. O ISPB não chega nem cru nem derivado: desde a #923 é constante do
// layout (`PIX_ISPB_ZEROS`). Um `initiation: string` na entrada seria a sexta reincidência do padrão
// que a rule `cnab.md` registra — um campo que o chamador só poderia preencher a partir do que ele
// já passou.
export type PixPayment = Readonly<{
  route: 'pix';
  payee: PayeeIdentity;
  pixKey: string;
  pixKeyType: string;
  paymentDate: Date;
  valueCents: number;
}>;

// A rota que a P.O. contratou e o emissor não cobre. Existe no tipo de propósito: o dado chega em
// runtime, do reader, e o montador precisa poder RECUSÁ-LO explicitamente. Um tipo que a proibisse
// empurraria a decisão para um `as` no chamador — e a recusa deixaria de acontecer.
//
// ⚠️ Era `'pix' | 'tax-guide'` até a #838. A guia continua aqui, e continua por DECISÃO DE ESCOPO,
// não por atraso: a P.O. fixou em 23/08 que imposto retido pago por guia de recolhimento permanece
// fora da remessa. Não há release futuro que a mova daqui.
//
// Carrega valor e data como as demais: o título os tem havendo emissor ou não, e é o que permite ao
// use case conferir a data única da remessa antes de saber se o arquivo sai.
export type UnsupportedPayment = Readonly<{
  route: 'tax-guide';
  valueCents: number;
  paymentDate: Date;
}>;

export type RemittancePayment = TransferPayment | BilletPayment | PixPayment | UnsupportedPayment;

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
  // Seleção que mistura modalidades que o manual manda em arquivos SEPARADOS (pág. 15: o Pix vai em
  // arquivo próprio). Recusa em vez de repartir, e a escolha é deliberada: este montador monta UM
  // arquivo, e reparti-lo aqui produziria N arquivos com um NSA só — o mesmo número sequencial em
  // dois arquivos distintos, que é retransmissão aos olhos do banco. Quem reparte é quem consegue
  // alocar um NSA por arquivo, e isso vive no use case. Ver `planRemittanceFiles`.
  | 'remittance-mixed-file-modalities'
  // Um componente da referência de G064 não coube na sua largura (#752, CA5). Recusar é a única
  // saída: truncar colapsaria duas referências distintas na mesma string, e o casamento do retorno
  // apontaria para o título errado — sem nada indicando que houve truncamento.
  | 'remittance-reference-overflow'
  // O erro da tradução do Pix (#838), entrando por inteiro pela mesma razão do envelope: ele manda o
  // operador a um lugar próprio. `remittance-pix-key-type-unsupported` diz que o tipo da chave não
  // existe no domínio `G100`; achatá-lo em `cnab-translation-failed` mandaria abrir chamado de código.
  //
  // Eram DOIS até a #923. O `payee-ispb-unknown` saiu junto com a tabela de-para: com o ISPB virando
  // constante do layout, não há mais banco a desconhecer. Era a recusa mais cara das três da #948 —
  // vinha depois do `allocateNsa`, então cada favorecido de banco fora da tabela queimava um número
  // da série antes de o operador descobrir que não daria.
  | PixInitiationError;

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
  // Quem PAGA — o SACADO do Segmento J-52 (#891). Vem do envelope, não do pagamento: é a mesma
  // empresa para todo título do arquivo, e derivá-la aqui do `cedente` do input é o que impede um
  // chamador de afirmar um pagador diferente do que o header do arquivo declara.
  //
  // ⚠️ O nome do campo é `payer` e não `cedente` DE PROPÓSITO. Nesta base `cedente` é a empresa
  // dona do arquivo; no vocabulário de cobrança do J-52 essa mesma empresa é o **Sacado**, e
  // "Cedente" é quem recebe. Reusar a palavra aqui faria o campo apontar para o bloco errado.
  payer: BilletParty;
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
        // A finalidade sai da mesma forma que a câmara, e pelo mesmo motivo (#813): os dois campos
        // descrevem a mesma operação e não podem divergir dentro de um registro. `null` é a rota
        // que não tem o campo — crédito em conta —, e sai em branco.
        tedPurpose: tedPurposeFor(batch.launchForm),
        // P013 acompanha a finalidade pela MESMA razão: campos vizinhos que descrevem a mesma
        // operação e invertem juntos por forma. Derivar um da forma e o outro de um parâmetro
        // abriria a porta para o par divergir dentro do registro.
        complementPurpose: complementPurposeFor(batch.launchForm),
        ...(payment.message !== undefined ? { message: payment.message } : {}),
      });

    // O boleto é o PAR J + J-52, e a ordem é a do layout: o J-52 complementa o J imediatamente
    // anterior (#891). O manual declara o J-52 "Obrigatório para pagamentos de títulos de Cobrança
    // independente do valor" (p. 33) — emitir só o J produz arquivo que o trailer fecha, o inspetor
    // aprova e o modelo do banco não reconhece. É a mesma relação que o par A+B tem na
    // transferência, e por isso mora aqui, junto: quem emite um emite o outro, sem rota alternativa.
    case 'billet': {
      const j = segmentJ({
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
      if (!j.ok) return j;

      const j52 = segmentJ52({
        bankCode,
        batchNumber,
        // O sequencial do lote é do REGISTRO, não do pagamento: o J-52 é uma linha inteira e ocupa
        // o número seguinte, como o Segmento B ocupa depois do A. Errar isto emite dois registros
        // com o mesmo sequencial e o banco recusa o lote.
        recordNumber: firstRecordNumber + 1,
        payer: batch.payer,
        // O nome do cedente é o MESMO que o Segmento J grava em 062-091 — mesmo campo `G013`, mesmo
        // participante, mesmo pagamento. Passar os dois da mesma origem é o que garante que não
        // divirjam dentro do par.
        beneficiary: {
          documentType: payment.beneficiaryDocumentType,
          document: payment.beneficiaryDocument,
          name: payment.beneficiaryName,
        },
      });
      if (!j52.ok) return j52;

      return ok([j.value, j52.value]);
    }

    // O Pix é o par A + B, sem J — e a ausência do J é medida, não suposta: o golden da forma `45`
    // tem 6 registros (dois headers, A, B, dois trailers), e o trailer do lote conta `000004`. A
    // tabela da pág. 9 lista "A, B, J" para Pix porque a seção agrega as formas `45` e `47`, e o J
    // exige código de barras — que Pix por chave não tem. O J e o J-52 daquela seção (p. 41-42) são
    // do `47`, QR Code, fora do escopo por decisão da P.O.
    case 'pix': {
      // As DUAS traduções acontecem antes de montar, e as duas recusam com nome próprio em vez de
      // cair para um valor por omissão. É a lição que este módulo pagou cinco vezes: um `?? ''` aqui
      // produziria arquivo bem-formado com iniciação em branco ou ISPB zerado, que o
      // `remittance-inspector.ts` aprova — não é defeito de forma — e o banco recusa depois de
      // transmitido, quando o NSA já foi queimado.
      const initiation = pixInitiationFor(payment.pixKeyType);
      if (!initiation.ok) return initiation;

      // O ISPB deixou de ser derivado (#923): é constante do layout, e os dois lugares que o pedem
      // — o `P015` do Segmento B e o complemento do `G031` aqui — leem o mesmo `PIX_ISPB_ZEROS`
      // lá dentro. Some com ele a recusa `payee-ispb-unknown`, que era emitida DEPOIS do
      // `allocateNsa` e queimava um número da série por banco fora da tabela.
      //
      // A Informação 2 (G031) do Segmento A: inscrição do favorecido + ISPB + tipo de conta. Mesma
      // inscrição que o Segmento B grava em 018-032 — passar as duas da mesma origem é o que garante
      // que não divirjam dentro do par, exatamente como o nome do cedente no par J + J-52.
      const info = pixPaymentInfo({
        payeeDocument: payment.payee.document,
        accountType: PIX_ACCOUNT_TYPE_CHECKING,
      });
      if (!info.ok) return info;

      const a = segmentA({
        bankCode,
        batchNumber,
        recordNumber: firstRecordNumber,
        // ⚠️ O bloco bancário do favorecido sai ZERADO, por laudo do banco de 05/09/2026 (#945) — ver
        // `PIX_ZEROED_PAYEE_ACCOUNT`. O spread é explícito, e não um default lá dentro do `segmentA`,
        // porque a decisão é DA ROTA: o Segmento A da transferência continua escrevendo a conta real,
        // e um montador que decidisse sozinho teria de conhecer a forma de lançamento — que é
        // exatamente o acoplamento que `segmentBPix` existe para evitar.
        //
        // Note que `payment.payee` é `RemittancePayeeIdentity` e NÃO TEM as cinco posições: o spread
        // não sobrescreve dado do cadastro, ele fornece o que o tipo não carrega. É o compilador
        // garantindo que ninguém volte a alimentar estas posições a partir do favorecido.
        payee: { ...payment.payee, ...PIX_ZEROED_PAYEE_ACCOUNT },
        paymentDate: payment.paymentDate,
        valueCents: payment.valueCents,
        // `009` (SPI), derivada da forma como em toda rota. O golden confirma, e o manual não a
        // enuncia — ver a nota de `clearingHouseFor`.
        clearingHouse: clearingHouseFor(batch.launchForm),
        yourNumber,
        // `null` nos dois, e o golden confirma: 220-224 e 225-226 saem em BRANCOS na forma `45`.
        // Preenchê-los é recusa fora de TED, medido na inquiry-0033 — a mesma régua que vale para
        // crédito em conta. Derivam da forma, não desta rota, e é por isso que a chamada é idêntica
        // à da transferência.
        tedPurpose: tedPurposeFor(batch.launchForm),
        complementPurpose: complementPurposeFor(batch.launchForm),
        message: info.value,
      });
      if (!a.ok) return a;

      const b = segmentBPix({
        bankCode,
        batchNumber,
        // O B ocupa o número seguinte ao A, como o J-52 ocupa depois do J.
        recordNumber: firstRecordNumber + 1,
        payee: payment.payee,
        initiation: initiation.value,
        pixKey: payment.pixKey,
      });
      if (!b.ok) return b;

      return ok([a.value, b.value]);
    }

    // Inalcançável na prática — o perfil já recusou a rota antes de chegar aqui. Fica explícito
    // mesmo assim: um emissor novo entra por este switch, e o compilador cobra o caso.
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

// ─── A partição multi-arquivo (CA4 da #838) ────────────────────────────────────────────────────
//
// Quais pagamentos vão em QUAL arquivo, sem montar arquivo nenhum. Devolve as posições de entrada
// agrupadas — nunca os pagamentos —, e a escolha é deliberada: o chamador já os tem, e devolver
// cópias abriria a porta para as duas listas divergirem. A posição é também o que ele usa para casar
// as referências de G064 com os `documentId` que só ele conhece.
//
// ⚠️ SEPARADA DA MONTAGEM porque a alocação de NSA fica no meio das duas. Cada arquivo consome seu
// próprio NSA — é o Número Sequencial do ARQUIVO, e dois arquivos com o mesmo número são, para o
// banco, o mesmo arquivo transmitido duas vezes. Mas o NSA vem do banco de dados, sob lock, e esta
// camada é pura (ADR-0006). Então quem sabe repartir não sabe alocar, e quem aloca não sabe
// repartir: a partição precede a montagem, e o use case costura as duas.
//
// A ordem é a de PRIMEIRA APARIÇÃO de cada grupo na seleção, pela mesma razão que rege
// `groupIntoBatches`: uma ordenação implícita faria dois arquivos com a mesma seleção saírem em
// ordem diferente, e o operador confere contra o primeiro.
export type RemittanceFilePlan = Readonly<{
  // As posições de ENTRADA dos pagamentos deste arquivo, em ordem crescente.
  paymentIndices: readonly number[];
}>;

export const planRemittanceFiles = (
  payments: readonly RemittancePayment[],
  cedenteBankCode: string,
): Result<readonly RemittanceFilePlan[], RemittanceFileError> => {
  if (payments.length === 0) return err('remittance-without-payments');

  const order: string[] = [];
  const byGroup = new Map<string, number[]>();

  for (const [inputIndex, payment] of payments.entries()) {
    // O perfil é derivado com a MESMA função do montador. Uma segunda derivação aqui faria a
    // partição repartir por um critério e o arquivo sair por outro — e o defeito só apareceria como
    // um arquivo de Pix com um lote de TED dentro, que o banco recusa inteiro.
    const profile = batchProfileFor(profiledOf(payment), cedenteBankCode);
    // Rota sem emissor aborta a partição inteira, e não só o arquivo dela: é a mesma postura de
    // `groupIntoBatches`, e pelo mesmo motivo. Repartir e deixar um dos arquivos falhar adiante
    // pagaria parte dos fornecedores e silenciaria o resto — com NSA já queimado no meio.
    if (!profile.ok) return profile;

    const group = fileGroupFor(profile.value.launchForm);
    const indices = byGroup.get(group);
    if (indices === undefined) {
      order.push(group);
      byGroup.set(group, [inputIndex]);
    } else {
      indices.push(inputIndex);
    }
  }

  return ok(order.map((group) => ({ paymentIndices: byGroup.get(group) as readonly number[] })));
};

export const buildRemittanceFile = (
  input: RemittanceFileInput,
): Result<RemittanceFile, RemittanceFileError> => {
  // Arquivo sem pagamento é envelope vazio: o banco recebe, processa e não paga nada. Recusar aqui
  // é mais barato que descobrir depois por que a remessa "foi" e ninguém recebeu.
  if (input.payments.length === 0) return err('remittance-without-payments');

  const batches = groupIntoBatches(input.payments, input.cedente.bankCode);
  if (!batches.ok) return batches;

  // ─── Um arquivo, UM grupo de modalidade ───────────────────────────────────────────────────────
  //
  // O grupo é derivado dos lotes, como tudo mais neste montador: a forma sai do conteúdo, e o grupo
  // sai da forma. O primeiro lote define o grupo do arquivo e os demais têm de concordar.
  //
  // Recusar a divergência — em vez de repartir aqui, ou de escolher o grupo do primeiro lote e
  // seguir — é o que torna o arquivo misto IMPOSSÍVEL de emitir por esquecimento. Uma régua que só
  // descrevesse a partição deixaria o caminho aberto para quem não a chamasse, e o arquivo misto é
  // bem-formado: ele passa no inspetor, o banco o aceita na entrada e recusa o processamento
  // inteiro depois. É a diferença entre documentar a regra e cobrá-la.
  const firstBatch = batches.value[0];
  if (firstBatch === undefined) return err('remittance-without-payments');

  const fileGroup = fileGroupFor(firstBatch.profile.launchForm);
  if (batches.value.some((b) => fileGroupFor(b.profile.launchForm) !== fileGroup)) {
    return err('remittance-mixed-file-modalities');
  }

  const header = fileHeader({
    cedente: input.cedente,
    bankName: input.bankName,
    nsa: input.nsa,
    generatedAt: input.generatedAt,
    // A identificação de Pix (172-174) é do ARQUIVO, e por isso deriva do grupo e não da forma de
    // um lote: um arquivo tem um grupo só, mas pode ter várias formas.
    pixIdentification: pixIdentificationFor(fileGroup),
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
          // O SACADO do J-52 é a empresa do envelope — a mesma que o header do arquivo declara.
          payer: {
            documentType: input.cedente.documentType,
            document: input.cedente.document,
            name: input.cedente.companyName,
          },
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
