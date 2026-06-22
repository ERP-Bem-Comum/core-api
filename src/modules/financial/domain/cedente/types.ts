import type { CedenteAccountId } from './cedente-account-id.ts';

// Conta-cedente (conta-débito Bradesco da organização) — referência de identidade que liga
// documento → conta de pagamento (D-CEDENTE). Valores em EN (C1).
export type CedenteAccountStatus = 'Active' | 'Closed';

// Tipo de conta bancária (extensão conciliação 019). Opcional no agregado para não quebrar
// contas criadas pela 016/CNAB, que não o registravam (FR-013).
// #206: `cartao` (cartão corporativo, concilia como conta) e `outro` (genérico, identificado por
// `typeLabel`) — o cliente paga por cartão e precisa conciliá-lo.
export type AccountType = 'corrente' | 'poupanca' | 'investimento' | 'cartao' | 'outro';

export const ACCOUNT_TYPES: readonly AccountType[] = [
  'corrente',
  'poupanca',
  'investimento',
  'cartao',
  'outro',
];

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
  // #206: texto livre p/ identificar a conta quando `type` é `outro` (ou complementar `cartao`).
  typeLabel?: string;
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
  typeLabel?: string;
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
