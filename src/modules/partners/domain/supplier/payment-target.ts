import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';

// VOs de destino de pagamento do fornecedor (embedded `bancaryInfo`/`pixInfo` do
// legado). `pixKeyType` é traduzido para EN (não está nas exceções D2 do ADR-0031).
// A invariante "ao menos um destino" é imposta no `Supplier.register`, não aqui.

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

export type PaymentTargetError = 'invalid-bank-account' | 'invalid-pix-key';

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

const isBlank = (s: string): boolean => s.trim().length === 0;

export const createBankAccount = (
  input: BankAccountInput,
): Result<BankAccount, PaymentTargetError> => {
  if (isBlank(input.bank) || isBlank(input.agency) || isBlank(input.accountNumber)) {
    return err('invalid-bank-account');
  }
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
