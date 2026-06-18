import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { sha256Hex } from '../../../../shared/utils/hash.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';

import * as Fitid from '../../domain/statement/fitid.ts';
import { importStatement } from '../../domain/statement/bank-statement.ts';
import type { BankStatementError } from '../../domain/statement/errors.ts';
import type { BankStatementId } from '../../domain/statement/bank-statement-id.ts';
import type {
  ImportStatementInput,
  ParsedTransaction as DomainTransaction,
  StatementFile,
  StatementPeriod,
} from '../../domain/statement/types.ts';
import type {
  BankStatementParser,
  ParseError,
  ParsedTransaction,
} from '../ports/bank-statement-parser.ts';
import type {
  BankStatementRepository,
  BankStatementRepositoryError,
} from '../ports/bank-statement-repository.ts';
import type { FinancialOutbox, OutboxAppendError } from '../ports/outbox.ts';

export type ImportBankStatementDeps = Readonly<{
  parser: BankStatementParser;
  repo: BankStatementRepository;
  // Só precisa do instante (occurredAt do evento) — depende da interface mais estreita do Clock.
  clock: Pick<Clock, 'now'>;
  outbox: FinancialOutbox;
}>;

export type ImportBankStatementInput = Readonly<{
  debitAccountRef: string;
  format: 'OFX' | 'CSV';
  content: string;
  fileName?: string;
}>;

export type ImportBankStatementOutput = Readonly<{
  statementId: BankStatementId;
  imported: number;
  discardedDuplicates: number;
  period: StatementPeriod;
}>;

export type ImportBankStatementError =
  | ParseError
  | BankStatementError
  | BankStatementRepositoryError
  | OutboxAppendError;

// Resolve a chave anti-duplicidade da transação: FITID nativo (OFX) via `fromNative`; ausente (CSV)
// ou malformado cai no FITID sintético determinístico (sha256 de conteúdo+seq) — preserva o dedup
// sem abortar a importação inteira por uma linha sem chave nativa.
const resolveFitid = (debitAccountRef: string, tx: ParsedTransaction, seq: number): Fitid.Fitid => {
  if (tx.fitid !== null) {
    const native = Fitid.fromNative(tx.fitid);
    if (native.ok) return native.value;
  }
  return Fitid.synthesize({
    debitAccountRef,
    dateIso: tx.date.toISOString(),
    valueCents: tx.valueCents,
    memo: tx.memo,
    seq,
  });
};

// Imperative Shell (.claude/rules/application.md: validar → fetch → domain → persist → publish).
// Parser traduz bytes→ParsedStatement; o use-case resolve FITID, consulta dedup no repo, delega a
// regra de descarte ao domínio (importStatement), persiste e publica o evento — só após o save ok.
export const importBankStatement =
  (deps: ImportBankStatementDeps) =>
  async (
    input: ImportBankStatementInput,
  ): Promise<Result<ImportBankStatementOutput, ImportBankStatementError>> => {
    const parsed = deps.parser.parse(input.format, input.content);
    if (!parsed.ok) return err(parsed.error);

    const transactions: DomainTransaction[] = parsed.value.transactions.map((tx, seq) => ({
      fitid: resolveFitid(input.debitAccountRef, tx, seq),
      date: tx.date,
      movement: tx.movement,
      entryType: tx.entryType,
      payeeName: tx.payeeName,
      memo: tx.memo,
      valueCents: tx.valueCents,
      balanceAfterCents: tx.balanceAfterCents,
    }));

    const knownR = await deps.repo.knownFitids(
      input.debitAccountRef,
      transactions.map((tx) => tx.fitid),
    );
    if (!knownR.ok) return err(knownR.error);

    const file: StatementFile = {
      name: input.fileName ?? `extrato.${input.format.toLowerCase()}`,
      format: input.format,
      hash: sha256Hex(input.content),
    };
    const domainInput: ImportStatementInput = {
      debitAccountRef: input.debitAccountRef,
      period: { start: parsed.value.periodStart, end: parsed.value.periodEnd },
      file,
      openingBalanceCents: parsed.value.openingBalanceCents,
      closingBalanceCents: parsed.value.closingBalanceCents,
      transactions,
      occurredAt: deps.clock.now(),
    };

    const imported = importStatement(domainInput, knownR.value);
    if (!imported.ok) return err(imported.error);

    const saved = await deps.repo.save(imported.value.statement);
    if (!saved.ok) return err(saved.error);

    const published = await deps.outbox.append(imported.value.events);
    if (!published.ok) return err(published.error);

    return ok({
      statementId: imported.value.statement.id,
      imported: imported.value.statement.transactions.length,
      discardedDuplicates: imported.value.discardedDuplicates,
      period: imported.value.statement.period,
    });
  };
