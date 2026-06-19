import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as CedenteAccountId from '../../domain/cedente/cedente-account-id.ts';
import { create } from '../../domain/cedente/cedente-account.ts';
import type {
  AccountType,
  CedenteAccount,
  CedenteAccountError,
} from '../../domain/cedente/types.ts';
import type {
  CedenteAccountStore,
  CedenteAccountStoreError,
} from '../ports/cedente-account-store.ts';

export type CreateCedenteAccountInput = Readonly<{
  bankCode: string;
  bankName?: string;
  type?: string; // raw — validado pelo domínio (invalid-account-type)
  agency: string;
  accountNumber: string;
  accountDigit: string;
  convenio?: string;
  document: string;
  nickname?: string;
  openingBalanceCents?: number;
  openingBalanceDate?: string;
}>;

export type CreateCedenteAccountError =
  | 'cedente-account-duplicate'
  | CedenteAccountError
  | CedenteAccountStoreError;

type Deps = Readonly<{ cedenteStore: CedenteAccountStore }>;

// FR-016: rejeita duplicata pela chave natural ANTES de inserir (insert-only, não reusa o
// upsert do save() — research D2).
export const createCedenteAccount =
  (deps: Deps) =>
  async (
    input: CreateCedenteAccountInput,
  ): Promise<Result<CedenteAccount, CreateCedenteAccountError>> => {
    const existing = await deps.cedenteStore.findByNaturalKey({
      bankCode: input.bankCode,
      agency: input.agency,
      accountNumber: input.accountNumber,
      accountDigit: input.accountDigit,
    });
    if (!existing.ok) return existing;
    if (existing.value !== null) return err('cedente-account-duplicate');

    const created = create({
      id: CedenteAccountId.generate(),
      bankCode: input.bankCode,
      agency: input.agency,
      accountNumber: input.accountNumber,
      accountDigit: input.accountDigit,
      convenio: input.convenio ?? '',
      document: input.document,
      ...(input.type !== undefined ? { type: input.type as AccountType } : {}),
      ...(input.nickname !== undefined ? { nickname: input.nickname } : {}),
      ...(input.bankName !== undefined ? { bankName: input.bankName } : {}),
      ...(input.openingBalanceCents !== undefined
        ? { openingBalanceCents: input.openingBalanceCents }
        : {}),
      ...(input.openingBalanceDate !== undefined
        ? { openingBalanceDate: input.openingBalanceDate }
        : {}),
    });
    if (!created.ok) return created;

    const saved = await deps.cedenteStore.save(created.value);
    if (!saved.ok) return saved;
    return ok(created.value);
  };
