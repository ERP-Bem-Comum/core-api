import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as CedenteAccountId from '../../domain/cedente/cedente-account-id.ts';
import { close } from '../../domain/cedente/cedente-account.ts';
import type { CedenteAccount } from '../../domain/cedente/types.ts';
import type { CedenteAccountIdError } from '../../domain/cedente/cedente-account-id.ts';
import type {
  CedenteAccountStore,
  CedenteAccountStoreError,
} from '../ports/cedente-account-store.ts';

export type CloseCedenteAccountInput = Readonly<{ id: string }>;

export type CloseCedenteAccountError =
  | 'cedente-account-not-found'
  | 'cedente-account-already-closed'
  | CedenteAccountIdError
  | CedenteAccountStoreError;

type Deps = Readonly<{ cedenteStore: CedenteAccountStore }>;

export const closeCedenteAccount =
  (deps: Deps) =>
  async (
    input: CloseCedenteAccountInput,
  ): Promise<Result<CedenteAccount, CloseCedenteAccountError>> => {
    const id = CedenteAccountId.rehydrate(input.id);
    if (!id.ok) return id;

    const found = await deps.cedenteStore.findById(id.value);
    if (!found.ok) return found;
    if (found.value === null) return err('cedente-account-not-found');

    const closed = close(found.value);
    if (!closed.ok) return closed;

    const saved = await deps.cedenteStore.save(closed.value);
    if (!saved.ok) return saved;
    return ok(closed.value);
  };
