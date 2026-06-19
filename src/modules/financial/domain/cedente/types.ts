import type { CedenteAccountId } from './cedente-account-id.ts';

// Conta-cedente (conta-débito Bradesco da organização) — referência de identidade que liga
// documento → conta de pagamento (D-CEDENTE). Valores em EN (C1).
export type CedenteAccountStatus = 'Active' | 'Closed';

// Tipo de conta bancária (extensão conciliação 019). Opcional no agregado para não quebrar
// contas criadas pela 016/CNAB, que não o registravam (FR-013).
export type AccountType = 'corrente' | 'poupanca' | 'investimento';

export const ACCOUNT_TYPES: readonly AccountType[] = ['corrente', 'poupanca', 'investimento'];

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
  // Extensão conciliação (019) — opcionais (par saldo de abertura é coeso: ambos ou nenhum).
  type?: AccountType;
  nickname?: string;
  bankName?: string;
  openingBalanceCents?: number;
  openingBalanceDate?: string; // ISO date (YYYY-MM-DD)
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
  type?: AccountType;
  nickname?: string;
  bankName?: string;
  openingBalanceCents?: number;
  openingBalanceDate?: string;
}>;

export type CedenteAccountError =
  | 'bank-code-required'
  | 'agency-required'
  | 'account-number-required'
  | 'document-required'
  | 'invalid-nsa'
  | 'invalid-account-type'
  | 'opening-balance-requires-date'
  | 'cedente-account-already-closed';
