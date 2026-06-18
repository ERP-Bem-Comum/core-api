import type { BankStatementId } from './bank-statement-id.ts';

// Eventos de domínio do extrato (EN-passado). Discriminados por `type` (padrão do módulo).

export type BankStatementImported = Readonly<{
  type: 'BankStatementImported';
  statementId: BankStatementId;
  debitAccountRef: string;
  importedCount: number;
  occurredAt: Date;
}>;

export type BankStatementEvent = BankStatementImported;
