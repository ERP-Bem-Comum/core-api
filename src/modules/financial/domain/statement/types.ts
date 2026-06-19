import type { Fitid } from './fitid.ts';
import type { EntryType } from './entry-type.ts';
import type { BankStatementId } from './bank-statement-id.ts';
import type { StatementTransactionId } from './statement-transaction-id.ts';
import type { BankStatementEvent } from './events.ts';

// Valores em EN (C1 — casam com fin_payables.status). Tradução PT é camada de apresentação.
export type Movement = 'Debit' | 'Credit';
export type ReconciliationStatus = 'Pending' | 'Reconciled' | 'ManualEntry';

export type StatementPeriod = Readonly<{ start: Date; end: Date }>;
export type StatementFile = Readonly<{ name: string; format: 'OFX' | 'CSV'; hash: string }>;

// Transação já dentro do boundary do agregado (com id e status).
export type StatementTransaction = Readonly<{
  id: StatementTransactionId;
  fitid: Fitid;
  date: Date;
  movement: Movement;
  entryType: EntryType;
  payeeName: string;
  memo: string;
  valueCents: number;
  balanceAfterCents: number;
  reconciliationStatus: ReconciliationStatus;
}>;

export type BankStatement = Readonly<{
  id: BankStatementId;
  debitAccountRef: string;
  period: StatementPeriod;
  file: StatementFile;
  openingBalanceCents: number;
  closingBalanceCents: number;
  transactions: readonly StatementTransaction[];
}>;

// Transação crua vinda do parser (sem id; fitid já resolvido — nativo OFX ou sintético CSV).
export type ParsedTransaction = Readonly<{
  fitid: Fitid;
  date: Date;
  movement: Movement;
  entryType: EntryType;
  payeeName: string;
  memo: string;
  valueCents: number;
  balanceAfterCents: number;
}>;

export type ImportStatementInput = Readonly<{
  debitAccountRef: string;
  period: StatementPeriod;
  file: StatementFile;
  openingBalanceCents: number;
  closingBalanceCents: number;
  transactions: readonly ParsedTransaction[];
  occurredAt: Date;
}>;

export type ImportStatementOutput = Readonly<{
  statement: BankStatement;
  discardedDuplicates: number;
  events: readonly BankStatementEvent[];
}>;
