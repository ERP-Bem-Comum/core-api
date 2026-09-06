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
  // DV DA AGÊNCIA — posição 058 do header de arquivo e de lote (#856, G009).
  //
  // ⚠️ CAMPO PRÓPRIO, e NUNCA concatenado em `agency`. O emissor escreve `digits(agency, 5)`, que faz
  // `replace(/\D/g,'')` antes do pad: guardar `1487-2` em `agency` produziria `14872` nas posições
  // 053-057, onde o banco espera `01487` — cinco dígitos, cabe no campo, nenhum gate acusa, e toda
  // remessa daquela conta sai com a agência errada. É a armadilha que o front registrou na #859 e a
  // razão de `checkCedenteRemittanceReadiness` RECUSAR agência com separador em vez de truncá-la.
  //
  // OPCIONAL porque o cadastro legado não o tem (não havia coluna) e porque a agência pode não ter
  // DV. Ausente, a 058 sai em branco — `Alfa` vazio é brancos, nunca zeros (layout p. 14).
  agencyDigit?: string;
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
  agencyDigit?: string;
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
