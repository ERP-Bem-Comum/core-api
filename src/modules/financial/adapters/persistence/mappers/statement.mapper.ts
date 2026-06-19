// Mapper row↔domínio do extrato (US1 conciliação). `toRow`/`transactionsToRows` confiam no domínio
// já validado; `toDomain` revalida IDs, FITID e enums (movement/reconciliationStatus/file_format/
// entryType) — o domínio rejeita estado inválido vindo do banco (.claude/rules/adapters.md).
//
// `entry_type` é union FECHADO (#159 caminho A — spec 017 `data-model.md:37`/`:122`): o parser normaliza
// na ingestão; `toDomain` revalida via `EntryType.rehydrate` e o CHECK no schema é a defesa no DB.

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import * as BankStatementId from '#src/modules/financial/domain/statement/bank-statement-id.ts';
import * as StatementTransactionId from '#src/modules/financial/domain/statement/statement-transaction-id.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import * as EntryType from '#src/modules/financial/domain/statement/entry-type.ts';
import type {
  BankStatement,
  Movement,
  ReconciliationStatus,
  StatementTransaction,
} from '#src/modules/financial/domain/statement/types.ts';
import type {
  BankStatementRow,
  NewBankStatementRow,
  NewStatementTransactionRow,
  StatementTransactionRow,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';

export type StatementMapperError =
  | 'invalid-bank-statement-id'
  | 'invalid-statement-transaction-id'
  | 'invalid-statement-fitid'
  | 'invalid-statement-file-format'
  | 'invalid-statement-movement'
  | 'invalid-statement-entry-type'
  | 'invalid-statement-reconciliation-status';

const toFormat = (raw: string): 'OFX' | 'CSV' | null =>
  raw === 'OFX' || raw === 'CSV' ? raw : null;

const toMovement = (raw: string): Movement | null =>
  raw === 'Debit' || raw === 'Credit' ? raw : null;

const toReconStatus = (raw: string): ReconciliationStatus | null =>
  raw === 'Pending' || raw === 'Reconciled' || raw === 'ManualEntry' ? raw : null;

export const statementToRow = (statement: BankStatement): NewBankStatementRow => ({
  id: statement.id,
  debitAccountRef: statement.debitAccountRef,
  periodStart: statement.period.start,
  periodEnd: statement.period.end,
  fileName: statement.file.name,
  fileFormat: statement.file.format,
  fileHash: statement.file.hash,
  openingBalanceCents: statement.openingBalanceCents,
  closingBalanceCents: statement.closingBalanceCents,
});

export const transactionsToRows = (statement: BankStatement): NewStatementTransactionRow[] =>
  statement.transactions.map((tx) => ({
    id: tx.id,
    statementId: statement.id,
    debitAccountRef: statement.debitAccountRef,
    fitid: tx.fitid,
    date: tx.date,
    movement: tx.movement,
    entryType: tx.entryType,
    payeeName: tx.payeeName,
    memo: tx.memo,
    valueCents: tx.valueCents,
    balanceAfterCents: tx.balanceAfterCents,
    reconciliationStatus: tx.reconciliationStatus,
  }));

export const transactionRowToDomain = (
  tr: Readonly<StatementTransactionRow>,
): Result<StatementTransaction, StatementMapperError> => {
  const txId = StatementTransactionId.rehydrate(tr.id);
  if (!txId.ok) return err('invalid-statement-transaction-id');

  const fitid = Fitid.rehydrate(tr.fitid);
  if (!fitid.ok) return err('invalid-statement-fitid');

  const movement = toMovement(tr.movement);
  if (movement === null) return err('invalid-statement-movement');

  const entryType = EntryType.rehydrate(tr.entryType);
  if (!entryType.ok) return err('invalid-statement-entry-type');

  const reconciliationStatus = toReconStatus(tr.reconciliationStatus);
  if (reconciliationStatus === null) return err('invalid-statement-reconciliation-status');

  return ok({
    id: txId.value,
    fitid: fitid.value,
    date: tr.date,
    movement,
    entryType: entryType.value,
    payeeName: tr.payeeName,
    memo: tr.memo,
    valueCents: tr.valueCents,
    balanceAfterCents: tr.balanceAfterCents,
    reconciliationStatus,
  });
};

export const toDomain = (
  row: Readonly<BankStatementRow>,
  txRows: readonly Readonly<StatementTransactionRow>[],
): Result<BankStatement, StatementMapperError> => {
  const id = BankStatementId.rehydrate(row.id);
  if (!id.ok) return err('invalid-bank-statement-id');

  const format = toFormat(row.fileFormat);
  if (format === null) return err('invalid-statement-file-format');

  const transactions: StatementTransaction[] = [];
  for (const tr of txRows) {
    const mapped = transactionRowToDomain(tr);
    if (!mapped.ok) return err(mapped.error);
    transactions.push(mapped.value);
  }

  return ok(
    immutable<BankStatement>({
      id: id.value,
      debitAccountRef: row.debitAccountRef,
      period: { start: row.periodStart, end: row.periodEnd },
      file: { name: row.fileName, format, hash: row.fileHash },
      openingBalanceCents: row.openingBalanceCents,
      closingBalanceCents: row.closingBalanceCents,
      transactions,
    }),
  );
};
