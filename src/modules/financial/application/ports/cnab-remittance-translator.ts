import type { Result } from '../../../../shared/primitives/result.ts';

// ACL do layout bancário (ADR-0006). O domínio e a application falam "pagamento"; o adapter fala
// "posição 120-134". Nenhum tipo daqui menciona CNAB, segmento ou coluna — é o que permite trocar
// de banco, ou de layout, sem tocar no use case.

export type RemittancePayeeData = Readonly<{
  name: string;
  documentType: '1' | '2';
  document: string;
  bankCode: string;
  agency: string;
  agencyDigit: string;
  accountNumber: string;
  accountDigit: string;
  accountAgencyDigit: string;
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

export type TranslateRemittanceInput = Readonly<{
  cedente: RemittanceCedenteData;
  nsa: number;
  generatedAt: Date;
  serviceType: string;
  launchForm: string;
  payments: readonly Readonly<{
    payee: RemittancePayeeData;
    valueCents: number;
    paymentDate: Date;
  }>[];
}>;

export type TranslatedRemittance = Readonly<{
  fileName: string;
  content: string;
  totalCents: number;
  lineCount: number;
}>;

export type CnabTranslateError =
  | 'cnab-file-name-failed'
  | 'cnab-translation-failed'
  | 'cnab-malformed-file';

export type CnabRemittanceTranslator = Readonly<{
  // Devolve o arquivo JÁ VERIFICADO. A inspeção estrutural mora do lado do adapter porque é ela que
  // conhece o layout — e porque o use case não deve poder esquecer de chamá-la antes de enfileirar
  // dinheiro.
  translate: (input: TranslateRemittanceInput) => Result<TranslatedRemittance, CnabTranslateError>;
}>;
