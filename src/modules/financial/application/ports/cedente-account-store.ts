import type { Result } from '../../../../shared/primitives/result.ts';
import type { CedenteAccount } from '../../domain/cedente/types.ts';
import type { CedenteAccountId } from '../../domain/cedente/cedente-account-id.ts';

export type CedenteAccountStoreError = 'cedente-account-store-unavailable';

export type CedenteAccountStore = Readonly<{
  findById: (
    id: CedenteAccountId,
  ) => Promise<Result<CedenteAccount | null, CedenteAccountStoreError>>;
  save: (account: CedenteAccount) => Promise<Result<void, CedenteAccountStoreError>>;
}>;
