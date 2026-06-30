import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type { CedenteAccountId } from '../../../domain/cedente/cedente-account-id.ts';
import type {
  CedenteAccountHistory,
  CedenteAccountHistoryError,
} from '../../../application/ports/cedente-account-history.ts';
import type { BankStatementRepository } from '../../../application/ports/bank-statement-repository.ts';

// FR-008: "histórico" = a conta já recebeu extrato importado. Derivamos isso do repositório de
// extratos (não há método dedicado — reusa listTransactionsByPeriod num intervalo amplo). Sinal
// suficiente para travar dados bancários: não há conciliação sem importação prévia.
const EPOCH = new Date('1970-01-01T00:00:00.000Z');
const FAR_FUTURE = new Date('9999-12-31T00:00:00.000Z');

export const createStatementBackedAccountHistory = (
  statements: Pick<BankStatementRepository, 'listTransactionsByPeriod'>,
): CedenteAccountHistory => ({
  hasActivity: async (
    id: CedenteAccountId,
  ): Promise<Result<boolean, CedenteAccountHistoryError>> => {
    const r = await statements.listTransactionsByPeriod(String(id), EPOCH, FAR_FUTURE);
    if (!r.ok) return err('cedente-account-history-unavailable');
    return ok(r.value.length > 0);
  },
});
