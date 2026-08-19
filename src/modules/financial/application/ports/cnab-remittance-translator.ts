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
  // Rota contratada que ainda não tem emissor. Erro PRÓPRIO, e não um `translation-failed`
  // genérico: a ação de quem recebe é diferente — não há dado a corrigir no cadastro, o arquivo é
  // que ainda não sabe emitir aquela forma.
  | 'cnab-launch-form-unsupported';

export type CnabRemittanceTranslator = Readonly<{
  // Devolve o arquivo JÁ VERIFICADO. A inspeção estrutural mora do lado do adapter porque é ela que
  // conhece o layout — e porque o use case não deve poder esquecer de chamá-la antes de enfileirar
  // dinheiro.
  translate: (input: TranslateRemittanceInput) => Result<TranslatedRemittance, CnabTranslateError>;
}>;
