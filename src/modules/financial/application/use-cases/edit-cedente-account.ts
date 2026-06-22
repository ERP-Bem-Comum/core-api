import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as CedenteAccountId from '../../domain/cedente/cedente-account-id.ts';
import type { AccountType, CedenteAccount } from '../../domain/cedente/types.ts';
import type { CedenteAccountIdError } from '../../domain/cedente/cedente-account-id.ts';
import type {
  CedenteAccountStore,
  CedenteAccountStoreError,
} from '../ports/cedente-account-store.ts';
import type {
  CedenteAccountHistory,
  CedenteAccountHistoryError,
} from '../ports/cedente-account-history.ts';

export type EditCedenteAccountInput = Readonly<{
  id: string;
  // Dados bancários (travados após histórico — FR-008).
  bankCode?: string;
  agency?: string;
  accountNumber?: string;
  accountDigit?: string;
  type?: string;
  // Sempre editáveis.
  typeLabel?: string; // #206: texto livre (metadado, não dado bancário travável).
  nickname?: string;
  bankName?: string;
}>;

export type EditCedenteAccountError =
  | 'cedente-account-not-found'
  | 'cedente-account-bank-data-locked'
  | CedenteAccountIdError
  | CedenteAccountStoreError
  | CedenteAccountHistoryError;

type Deps = Readonly<{
  cedenteStore: CedenteAccountStore;
  accountHistory: CedenteAccountHistory;
}>;

export const editCedenteAccount =
  (deps: Deps) =>
  async (
    input: EditCedenteAccountInput,
  ): Promise<Result<CedenteAccount, EditCedenteAccountError>> => {
    const id = CedenteAccountId.rehydrate(input.id);
    if (!id.ok) return id;

    const found = await deps.cedenteStore.findById(id.value);
    if (!found.ok) return found;
    if (found.value === null) return err('cedente-account-not-found');

    const wantsBankDataChange =
      input.bankCode !== undefined ||
      input.agency !== undefined ||
      input.accountNumber !== undefined ||
      input.accountDigit !== undefined ||
      input.type !== undefined;

    if (wantsBankDataChange) {
      const hist = await deps.accountHistory.hasActivity(id.value);
      if (!hist.ok) return hist;
      if (hist.value) return err('cedente-account-bank-data-locked');
    }

    const updated: CedenteAccount = {
      ...found.value,
      ...(input.bankCode !== undefined ? { bankCode: input.bankCode } : {}),
      ...(input.agency !== undefined ? { agency: input.agency } : {}),
      ...(input.accountNumber !== undefined ? { accountNumber: input.accountNumber } : {}),
      ...(input.accountDigit !== undefined ? { accountDigit: input.accountDigit } : {}),
      ...(input.type !== undefined ? { type: input.type as AccountType } : {}),
      ...(input.typeLabel !== undefined ? { typeLabel: input.typeLabel } : {}),
      ...(input.nickname !== undefined ? { nickname: input.nickname } : {}),
      ...(input.bankName !== undefined ? { bankName: input.bankName } : {}),
    };

    const saved = await deps.cedenteStore.save(updated);
    if (!saved.ok) return saved;
    return ok(updated);
  };
