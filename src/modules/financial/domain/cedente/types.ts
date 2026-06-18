import type { CedenteAccountId } from './cedente-account-id.ts';

// Conta-cedente (conta-débito Bradesco da organização) — referência de identidade que liga
// documento → conta de pagamento (D-CEDENTE). Valores em EN (C1).
export type CedenteAccountStatus = 'Active' | 'Closed';

export type CedenteAccount = Readonly<{
  id: CedenteAccountId;
  bankCode: string;
  agency: string;
  accountNumber: string;
  accountDigit: string;
  convenio: string;
  document: string; // CNPJ da organização (cedente)
  status: CedenteAccountStatus;
  nextNsa: number; // próximo NSA a usar na remessa (016)
}>;

export type CreateInput = Readonly<{
  id: CedenteAccountId;
  bankCode: string;
  agency: string;
  accountNumber: string;
  accountDigit: string;
  convenio: string;
  document: string;
  status?: CedenteAccountStatus;
  nextNsa?: number;
}>;

export type CedenteAccountError =
  | 'bank-code-required'
  | 'agency-required'
  | 'account-number-required'
  | 'document-required'
  | 'invalid-nsa'
  | 'cedente-account-already-closed';
