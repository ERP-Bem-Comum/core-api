import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';

import * as BankStatementId from './bank-statement-id.ts';
import * as StatementTransactionId from './statement-transaction-id.ts';
import type { BankStatementError } from './errors.ts';
import type { BankStatementEvent } from './events.ts';
import type {
  BankStatement,
  ImportStatementInput,
  ImportStatementOutput,
  StatementTransaction,
} from './types.ts';

// Importa um extrato aplicando anti-duplicidade por FITID (R5): transações cujo `fitid` já é
// conhecido (em `knownFitids`) ou repetido no próprio arquivo são descartadas silenciosamente;
// o output reporta a contagem. Importação sem nenhuma transação é rejeitada (atomicidade).
export const importStatement = (
  input: ImportStatementInput,
  knownFitids: ReadonlySet<string>,
): Result<ImportStatementOutput, BankStatementError> => {
  if (input.transactions.length === 0) return err('empty-statement');

  const seen = new Set<string>(knownFitids);
  const kept: StatementTransaction[] = [];
  let discardedDuplicates = 0;

  for (const t of input.transactions) {
    if (seen.has(t.fitid)) {
      discardedDuplicates += 1;
      continue;
    }
    seen.add(t.fitid);
    kept.push({
      id: StatementTransactionId.generate(),
      fitid: t.fitid,
      date: t.date,
      movement: t.movement,
      entryType: t.entryType,
      payeeName: t.payeeName,
      memo: t.memo,
      valueCents: t.valueCents,
      balanceAfterCents: t.balanceAfterCents,
      reconciliationStatus: 'Pending',
    });
  }

  const id = BankStatementId.generate();
  const statement = immutable<BankStatement>({
    id,
    debitAccountRef: input.debitAccountRef,
    period: input.period,
    file: input.file,
    openingBalanceCents: input.openingBalanceCents,
    closingBalanceCents: input.closingBalanceCents,
    transactions: kept,
  });

  const events: readonly BankStatementEvent[] = [
    {
      type: 'BankStatementImported',
      statementId: id,
      debitAccountRef: input.debitAccountRef,
      importedCount: kept.length,
      occurredAt: input.occurredAt,
    },
  ];

  return ok(immutable<ImportStatementOutput>({ statement, discardedDuplicates, events }));
};
