import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, ok } from '#src/shared/index.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { getAccountStatement } from '#src/modules/financial/application/use-cases/get-account-statement.ts';

const ACC = CedenteAccountId.generate();

const tx = (over: Record<string, unknown>): unknown => ({
  id: 't1',
  fitid: 'f1',
  date: new Date('2026-01-10T12:00:00.000Z'),
  movement: 'Debit',
  entryType: 'PIX',
  payeeName: 'X',
  memo: 'm',
  valueCents: 1000,
  balanceAfterCents: 0,
  reconciliationStatus: 'Pending',
  ...over,
});

const deps = (opts: { account?: unknown; txs?: readonly unknown[] }) => ({
  cedenteStore: {
    findById: (): Promise<Result<unknown, never>> =>
      Promise.resolve(ok(opts.account === undefined ? null : opts.account)),
  },
  statements: {
    listTransactionsByPeriod: (): Promise<Result<readonly unknown[], never>> =>
      Promise.resolve(ok(opts.txs ?? [])),
  },
});

describe('financial/application/get-account-statement (#139)', () => {
  it('usa o saldo de abertura da conta + transações → running balance correto', async () => {
    const account = { id: ACC, openingBalanceCents: 100000, status: 'Active' };
    const r = await getAccountStatement(
      deps({
        account,
        txs: [
          tx({ date: new Date('2026-01-10T09:00:00.000Z'), movement: 'Credit', valueCents: 50000 }),
          tx({ date: new Date('2026-01-10T15:00:00.000Z'), movement: 'Debit', valueCents: 30000 }),
        ],
      }) as never,
    )({ accountId: String(ACC), from: new Date('2026-01-01'), to: new Date('2026-01-31') });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.openingBalanceCents, 100000);
      assert.equal(r.value.closingBalanceCents, 120000);
      assert.equal(r.value.counters.all, 2);
    }
  });

  it('saldo de abertura ausente (null) → assume 0', async () => {
    const account = { id: ACC, status: 'Active' }; // sem openingBalanceCents
    const r = await getAccountStatement(deps({ account, txs: [] }) as never)({
      accountId: String(ACC),
      from: new Date('2026-01-01'),
      to: new Date('2026-01-31'),
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.openingBalanceCents, 0);
  });

  it('conta inexistente → cedente-account-not-found', async () => {
    const r = await getAccountStatement(deps({}) as never)({
      accountId: String(ACC),
      from: new Date('2026-01-01'),
      to: new Date('2026-01-31'),
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cedente-account-not-found');
  });
});
