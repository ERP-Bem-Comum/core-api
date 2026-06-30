import type { Result } from '../../../../shared/primitives/result.ts';
import type { CedenteAccount } from '../../domain/cedente/types.ts';
import type { CedenteAccountId } from '../../domain/cedente/cedente-account-id.ts';

export type CedenteAccountStoreError = 'cedente-account-store-unavailable';

// Chave natural da conta-cedente (FR-016): banco + agência + conta + dígito.
export type CedenteAccountNaturalKey = Readonly<{
  bankCode: string;
  agency: string;
  accountNumber: string;
  accountDigit: string;
}>;

export type CedenteAccountStore = Readonly<{
  findById: (
    id: CedenteAccountId,
  ) => Promise<Result<CedenteAccount | null, CedenteAccountStoreError>>;
  findByNaturalKey: (
    key: CedenteAccountNaturalKey,
  ) => Promise<Result<CedenteAccount | null, CedenteAccountStoreError>>;
  list: () => Promise<Result<readonly CedenteAccount[], CedenteAccountStoreError>>;
  save: (account: CedenteAccount) => Promise<Result<void, CedenteAccountStoreError>>;
}>;
