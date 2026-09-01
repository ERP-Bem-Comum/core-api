import type { Result } from '../../../../shared/primitives/result.ts';

// ACL do layout bancário (ADR-0006). O domínio e a application falam "pagamento"; o adapter fala
// "posição 120-134". Nenhum tipo daqui menciona CNAB, segmento ou coluna — é o que permite trocar
// de banco, ou de layout, sem tocar no use case.

// O DV agência/conta do favorecido não entra: o banco exige a posição correspondente em branco, e um
// campo que não pode ser preenchido não deve existir na borda (#754). O homônimo em
// `RemittanceCedenteData` é outro campo, noutro ponto do layout, e permanece.
export type RemittancePayeeData = Readonly<{
  name: string;
  documentType: '1' | '2';
  document: string;
  bankCode: string;
  agency: string;
  agencyDigit: string;
  accountNumber: string;
  accountDigit: string;
}>;

export type RemittanceCedenteData = Readonly<{
  bankCode: string;
  documentType: '1' | '2';
  document: string;
  convenio: string;
  agency: string;
  agencyDigit: string;
  accountNumber: string;
  accountDigit: string;
  accountAgencyDigit: string;
  companyName: string;
  bankName: string;
}>;

// Um pagamento como a application o conhece: pela ROTA (vocabulário do domínio, `VanRoute`), com os
// dados que aquela rota de fato usa. Quem traduz rota em forma de lançamento é o adapter — a
// application não sabe que existe "forma de lançamento".
//
// A união é discriminada porque as rotas não carregam os mesmos dados: transferência precisa da
// conta do favorecido, boleto precisa do código de barras e não olha conta alguma (#708, CA5). Um
// tipo com todos os campos opcionais deixaria o emissor descobrir a ausência em runtime.
export type RemittanceTransferPayment = Readonly<{
  route: 'transfer';
  payee: RemittancePayeeData;
  valueCents: number;
  paymentDate: Date;
}>;

export type RemittanceBilletPayment = Readonly<{
  route: 'billet';
  barcode: string;
  beneficiaryName: string;
  // A inscrição de quem emitiu o título. O boleto continua não olhando conta bancária (#708, CA5) —
  // o dinheiro segue o código de barras —, mas o layout exige IDENTIFICAR quem recebe, e isso é
  // outra coisa: o registro que o banco declara obrigatório para título de cobrança nomeia sacado e
  // cedente por inscrição, não por conta (#891).
  //
  // Obrigatórios, sem `?`: ver o comentário em `BilletPayment`, no montador.
  beneficiaryDocumentType: '1' | '2';
  beneficiaryDocument: string;
  dueDate: Date;
  valueCents: number;
  paymentDate: Date;
  titleValueCents?: number;
  discountCents?: number;
  surchargeCents?: number;
}>;

// As rotas contratadas que ainda não têm emissor. Existem no tipo para poderem ser RECUSADAS: o
// dado chega do reader em runtime, e um tipo que as omitisse empurraria a decisão para um cast.
// Valor e data viajam como nas demais — o título os tem havendo emissor ou não.
export type RemittanceUnsupportedPayment = Readonly<{
  route: 'pix' | 'tax-guide';
  valueCents: number;
  paymentDate: Date;
}>;

export type RemittancePaymentInput =
  | RemittanceTransferPayment
  | RemittanceBilletPayment
  | RemittanceUnsupportedPayment;

export type TranslateRemittanceInput = Readonly<{
  cedente: RemittanceCedenteData;
  nsa: number;
  generatedAt: Date;
  // Tipo de serviço e forma de lançamento NÃO entram: são derivados do conteúdo, um lote por forma
  // (#711, CA4). Recebê-los seria aceitar uma afirmação que o arquivo pode contradizer.
  payments: readonly RemittancePaymentInput[];
}>;

export type TranslatedRemittance = Readonly<{
  fileName: string;
  content: string;
  totalCents: number;
  lineCount: number;
  // Quantos lotes o arquivo tem. Deixou de ser sempre 1 quando o arquivo passou a comportar uma
  // forma de lançamento por lote — e é o número que o operador vê no comprovante da remessa.
  batchCount: number;
  // As referências de casamento do retorno (G064), NA ORDEM DE ENTRADA de `payments` (#752).
  //
  // Sobe pelo port porque o tradutor é quem sabe derivá-las — ele conhece NSA e posição — e o use
  // case é quem sabe a quem elas pertencem. Nenhum dos dois sabe as duas coisas sozinho, e é essa
  // divisão que mantém o layout fora da application e o documento fora do adapter CNAB.
  //
  // ⚠️ A ordem É o contrato: o chamador casa por índice. Ver `RemittanceFile.yourNumbers`.
  yourNumbers: readonly string[];
}>;

export type CnabTranslateError =
  | 'cnab-file-name-failed'
  | 'cnab-translation-failed'
  | 'cnab-malformed-file'
  // Convênio do cedente, e são DUAS causas porque a ação de quem corrige difere (#804): `missing`
  // manda cadastrar o convênio; `overflow` manda conferir o que o banco cadastrou, porque acima de
  // 6 posições o banco não recusa — ele trunca, e processa a remessa sob outro contrato. Achatá-las
  // em `cnab-translation-failed` mandaria o operador procurar dado faltando num arquivo completo.
  | 'cnab-convenio-missing'
  | 'cnab-convenio-overflow'
  // Rota contratada que ainda não tem emissor. Erro PRÓPRIO, e não um `translation-failed`
  // genérico: a ação de quem recebe é diferente — não há dado a corrigir no cadastro, o arquivo é
  // que ainda não sabe emitir aquela forma.
  | 'cnab-launch-form-unsupported'
  // Título de cobrança cujo Segmento J-52 não teria como identificar quem paga ou quem recebe
  // (#891). Erro próprio pela mesma régua do convênio: a ação é CADASTRAR o dado do favorecido, e
  // achatá-lo em `cnab-translation-failed` mandaria o operador abrir chamado de código para um
  // campo que só ele pode preencher.
  | 'cnab-billet-party-unidentified';

// ─── A partição em arquivos (CA4 da #838) ──────────────────────────────────────────────────────
//
// Uma seleção pode exigir MAIS DE UM arquivo: o layout do banco manda certas modalidades em arquivo
// separado das demais. Qual é a régua, e quais modalidades, é conhecimento do adapter — a
// application só precisa saber EM QUANTOS arquivos a seleção se reparte e QUAIS pagamentos vão em
// cada um, porque é ela que aloca um NSA por arquivo e grava uma remessa por arquivo.
//
// ⚠️ Existe como operação SEPARADA de `translate`, e não como um `translate` que devolve N arquivos,
// porque a alocação do NSA fica entre as duas. O NSA vem do banco, sob lock; o adapter é puro e não
// pode alocá-lo. Sem esta separação, ou o adapter ganharia acesso ao repositório — furando o ADR-0006
// — ou os N arquivos dividiriam um NSA, que é retransmissão aos olhos do banco.
export type PlanRemittanceFilesInput = Readonly<{
  // O banco do CEDENTE decide a forma de lançamento de cada título (crédito interno × transferência),
  // e a forma decide o arquivo. Sem ele a partição não é derivável.
  cedenteBankCode: string;
  payments: readonly RemittancePaymentInput[];
}>;

export type RemittanceFilePlan = Readonly<{
  // As posições dos pagamentos deste arquivo dentro de `payments`, em ordem crescente.
  //
  // Posições, e não os pagamentos: quem chamou já os tem, e devolver cópias criaria duas listas
  // livres para divergir. É também por posição que a application casa cada referência de retorno com
  // o `documentId` que só ela conhece — o mesmo casamento por índice que `yourNumbers` já exige.
  paymentIndices: readonly number[];
}>;

export type CnabRemittanceTranslator = Readonly<{
  // Em quantos arquivos esta seleção se reparte, e o que vai em cada um. Não monta nada e não
  // consome NSA: é a pergunta que a application faz ANTES de alocar, justamente para saber quantos
  // alocar.
  planFiles: (
    input: PlanRemittanceFilesInput,
  ) => Result<readonly RemittanceFilePlan[], CnabTranslateError>;

  // Devolve o arquivo JÁ VERIFICADO. A inspeção estrutural mora do lado do adapter porque é ela que
  // conhece o layout — e porque o use case não deve poder esquecer de chamá-la antes de enfileirar
  // dinheiro.
  translate: (input: TranslateRemittanceInput) => Result<TranslatedRemittance, CnabTranslateError>;
}>;
