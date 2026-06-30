import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, err, isErr } from '#src/shared/index.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import * as ReconciliationPeriodId from '#src/modules/financial/domain/reconciliation/reconciliation-period-id.ts';
import { closePeriod } from '#src/modules/financial/domain/reconciliation/period.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import type { ParsedTransaction } from '#src/modules/financial/domain/statement/types.ts';
import type {
  FinancialOutbox,
  OutboxAppendError,
} from '#src/modules/financial/application/ports/outbox.ts';
import { createInMemoryBankStatementRepository } from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.in-memory.ts';
import { createInMemoryReconciliationPeriodStore } from '#src/modules/financial/adapters/persistence/repos/reconciliation-period-store.in-memory.ts';

// CA1/CA3 (#127) — atomicidade estado+evento dos agregados Statement e ReconciliationPeriod.
// O use-case encaminha os eventos PARA DENTRO de `save`/`close`; falha no append do outbox (na tx)
// reverte tudo — extrato/período não persistem.

const D = new Date('2024-05-18T00:00:00.000Z');
const failingOutbox: FinancialOutbox = {
  append: (): Promise<Result<void, OutboxAppendError>> =>
    Promise.resolve(err('outbox-append-failed')),
};

const fitidOf = (raw: string) => {
  const f = Fitid.fromNative(raw);
  if (!f.ok) throw new Error('setup: fitid');
  return f.value;
};

const buildStatement = () => {
  const cedenteId = CedenteAccountId.generate();
  const txs: readonly ParsedTransaction[] = [
    {
      fitid: fitidOf('f-tx'),
      date: D,
      movement: 'Debit',
      entryType: 'TED',
      payeeName: 'FORNECEDOR X',
      memo: 'pagamento',
      valueCents: 1000,
      balanceAfterCents: 0,
    },
  ];
  const imported = importStatement(
    {
      debitAccountRef: String(cedenteId),
      period: { start: D, end: D },
      file: { name: 'e.ofx', format: 'OFX', hash: 'h1' },
      openingBalanceCents: 0,
      closingBalanceCents: 0,
      transactions: txs,
      occurredAt: D,
    },
    new Set(),
  );
  if (!imported.ok) throw new Error('setup: importStatement');
  return imported.value;
};

const buildClosedPeriod = () => {
  const out = closePeriod({
    periodId: ReconciliationPeriodId.generate(),
    debitAccountRef: String(CedenteAccountId.generate()),
    periodStart: new Date('2024-05-01T00:00:00.000Z'),
    periodEnd: new Date('2024-05-31T00:00:00.000Z'),
    hasPendingTransactions: false,
    closedBy: 'u1',
    occurredAt: D,
  });
  if (!out.ok) throw new Error('setup: closePeriod');
  return out.value;
};

describe('financial/adapters — atomicidade statement/period+outbox (in-memory)', () => {
  it('CA3: falha no outbox durante save do extrato reverte (extrato nao persiste)', async () => {
    const { statement, events } = buildStatement();
    const repo = createInMemoryBankStatementRepository(new Map(), failingOutbox);

    const r = await repo.save(statement, events);

    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bank-statement-repository-failure');
    const found = await repo.listTransactions(statement.id);
    assert.equal(found.ok && found.value === null, true);
  });

  it('CA3: falha no outbox durante close do periodo reverte (periodo nao persiste)', async () => {
    const { period, events } = buildClosedPeriod();
    const store = createInMemoryReconciliationPeriodStore(new Map(), failingOutbox);

    const r = await store.close(period, events);

    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'reconciliation-period-store-failure');
    const found = await store.findById(period.id);
    assert.equal(found.ok && found.value === null, true);
  });
});
