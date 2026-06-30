import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import type { CedenteAccount } from '../../domain/cedente/types.ts';
import { buildStatementView } from '../../domain/statement/statement-view.ts';
import type {
  CedenteAccountStore,
  CedenteAccountStoreError,
} from '../ports/cedente-account-store.ts';
import type {
  BankStatementRepository,
  BankStatementRepositoryError,
} from '../ports/bank-statement-repository.ts';

// #89c (F1): lista as contas-cedente já com o SALDO ATUAL (abertura + Σ de todos os movimentos
// importados), para o dropdown "Pagar da Conta" do front. Saldo atual = closingBalanceCents do
// extrato sobre TODO o histórico (buildStatementView, função pura — mesma base do #139). Sem extratos
// importados → saldo = abertura. N+1 sobre as poucas contas-cedente da organização (aceitável).

export type CedenteAccountWithBalance = Readonly<{
  account: CedenteAccount;
  currentBalanceCents: number;
}>;

export type ListCedenteAccountsWithBalanceError =
  | CedenteAccountStoreError
  | BankStatementRepositoryError;

type Deps = Readonly<{
  cedenteStore: Pick<CedenteAccountStore, 'list'>;
  statements: Pick<BankStatementRepository, 'listTransactionsByPeriod'>;
  clock: Clock;
}>;

// Limite inferior fixo: captura todo o histórico de transações da conta (não há "antes do epoch").
const HISTORY_START = new Date(0);

export const listCedenteAccountsWithBalance =
  (deps: Deps) =>
  async (): Promise<
    Result<readonly CedenteAccountWithBalance[], ListCedenteAccountsWithBalanceError>
  > => {
    const accounts = await deps.cedenteStore.list();
    if (!accounts.ok) return err(accounts.error);

    const now = deps.clock.now();
    const out: CedenteAccountWithBalance[] = [];
    for (const account of accounts.value) {
      const opening = account.openingBalanceCents ?? 0;
      const txs = await deps.statements.listTransactionsByPeriod(
        String(account.id),
        HISTORY_START,
        now,
      );
      if (!txs.ok) return err(txs.error);
      const view = buildStatementView(opening, txs.value, 'all');
      out.push({ account, currentBalanceCents: view.closingBalanceCents });
    }
    return ok(out);
  };
