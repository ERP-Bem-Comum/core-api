import type { Result } from '../../../../shared/primitives/result.ts';
import type { CedenteAccount } from '../../domain/cedente/types.ts';
import type {
  CedenteAccountStore,
  CedenteAccountStoreError,
} from '../ports/cedente-account-store.ts';

type Deps = Readonly<{ cedenteStore: CedenteAccountStore }>;

export const listCedenteAccounts =
  (deps: Deps) => async (): Promise<Result<readonly CedenteAccount[], CedenteAccountStoreError>> =>
    deps.cedenteStore.list();
