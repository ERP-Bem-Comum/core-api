import type { Result } from '../../../../shared/primitives/result.ts';
import type { CedenteAccountId } from '../../domain/cedente/cedente-account-id.ts';

export type CedenteAccountHistoryError = 'cedente-account-history-unavailable';

// FR-008: a conta tem "histórico" quando já recebeu extrato importado / conciliações.
// Com histórico, os dados bancários ficam travados (só apelido/bankName podem mudar).
export type CedenteAccountHistory = Readonly<{
  hasActivity: (id: CedenteAccountId) => Promise<Result<boolean, CedenteAccountHistoryError>>;
}>;
