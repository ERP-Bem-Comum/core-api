import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';

// VOs de destino de pagamento, compartilhados pelos 4 tipos de parceiro (Supplier, Act,
// Financier, Collaborator). Promovido de `domain/supplier/` para `domain/shared/` (US1 da
// feature 015): banco/PIX são um "conceptual whole" imutável sem identidade (Evans, VOs) e
// quatro agregados os usam — manter no agregado Supplier acoplaria os outros três a ele.
// A invariante "ao menos um destino" é de cada agregado (Supplier.register / Act), não do VO.

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random-key';

export type BankAccount = Readonly<{
  bank: string;
  agency: string;
  accountNumber: string;
  checkDigit: string;
}>;

export type PixKey = Readonly<{
  keyType: PixKeyType;
  key: string;
}>;

export type PaymentTargetError = 'invalid-bank-account' | 'invalid-bank-agency' | 'invalid-pix-key';

export type BankAccountInput = Readonly<{
  bank: string;
  agency: string;
  accountNumber: string;
  checkDigit: string;
}>;

export type PixKeyInput = Readonly<{ keyType: string; key: string }>;

const PIX_KEY_TYPES: ReadonlySet<string> = new Set<PixKeyType>([
  'cpf',
  'cnpj',
  'email',
  'phone',
  'random-key',
]);

// Agência bancária BR: 4 dígitos + dígito verificador opcional (ex.: `0001` ou `0001-2`).
const AGENCY_RE = /^\d{4}(-?\d)?$/;

const isBlank = (s: string): boolean => s.trim().length === 0;

export const createBankAccount = (
  input: BankAccountInput,
): Result<BankAccount, PaymentTargetError> => {
  if (isBlank(input.bank) || isBlank(input.agency) || isBlank(input.accountNumber)) {
    return err('invalid-bank-account');
  }
  if (!AGENCY_RE.test(input.agency.trim())) return err('invalid-bank-agency');
  return ok(
    immutable({
      bank: input.bank.trim(),
      agency: input.agency.trim(),
      accountNumber: input.accountNumber.trim(),
      checkDigit: input.checkDigit.trim(),
    }),
  );
};

export const createPixKey = (input: PixKeyInput): Result<PixKey, PaymentTargetError> => {
  if (!PIX_KEY_TYPES.has(input.keyType) || isBlank(input.key)) return err('invalid-pix-key');
  return ok(immutable({ keyType: input.keyType as PixKeyType, key: input.key.trim() }));
};
