import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok } from '#src/shared/primitives/result.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { listCedenteAccountsWithBalance } from '#src/modules/financial/application/use-cases/list-cedente-accounts-with-balance.ts';
import type { CedenteAccount } from '#src/modules/financial/domain/cedente/types.ts';
import type { StatementTransaction } from '#src/modules/financial/domain/statement/types.ts';

const CLOCK = ClockFixed(new Date('2026-06-20T12:00:00Z'));

let seq = 0;
const tx = (movement: 'Credit' | 'Debit', valueCents: number): StatementTransaction => {
  seq += 1;
  return {
    id: `tx-${seq}`,
    fitid: `fit-${seq}`,
    date: new Date('2026-02-10T12:00:00.000Z'),
    movement,
    entryType: 'PIX',
    payeeName: 'FULANO',
    memo: 'mov',
    valueCents,
    balanceAfterCents: 0,
    reconciliationStatus: 'Pending',
  } as StatementTransaction;
};

const account = (
  id: string,
  openingBalanceCents: number | undefined,
  status: 'Active' | 'Closed' = 'Active',
): CedenteAccount => ({ id, openingBalanceCents, status }) as unknown as CedenteAccount;

describe('financial/application — listCedenteAccountsWithBalance (#89c F1)', () => {
  it('saldo atual = abertura + Σ assinado dos extratos (Credit:+ / Debit:−)', async () => {
    const result = await listCedenteAccountsWithBalance({
      cedenteStore: { list: () => Promise.resolve(ok([account('acc-1', 50000)])) },
      statements: {
        listTransactionsByPeriod: () =>
          Promise.resolve(ok([tx('Credit', 30000), tx('Debit', 10000)])),
      },
      clock: CLOCK,
    })();
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.length, 1);
      // 50000 + 30000 − 10000 = 70000
      assert.equal(result.value[0]?.currentBalanceCents, 70000);
    }
  });

  it('sem extratos → saldo atual = abertura; abertura ausente → 0', async () => {
    const result = await listCedenteAccountsWithBalance({
      cedenteStore: {
        list: () => Promise.resolve(ok([account('acc-1', 50000), account('acc-2', undefined)])),
      },
      statements: { listTransactionsByPeriod: () => Promise.resolve(ok([])) },
      clock: CLOCK,
    })();
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value[0]?.currentBalanceCents, 50000);
      assert.equal(result.value[1]?.currentBalanceCents, 0);
    }
  });

  // #293 (FIN-PAYABLE-ACCOUNT-ACTIVE) — seletor "Pagar da Conta" só lista contas ativas.
  it('CA1: onlyActive=true exclui contas Closed do seletor', async () => {
    const result = await listCedenteAccountsWithBalance({
      cedenteStore: {
        list: () =>
          Promise.resolve(
            ok([account('acc-active', 50000, 'Active'), account('acc-closed', 99999, 'Closed')]),
          ),
      },
      statements: { listTransactionsByPeriod: () => Promise.resolve(ok([])) },
      clock: CLOCK,
    })({ onlyActive: true });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.length, 1);
      assert.equal(result.value[0]?.account.id, 'acc-active');
    }
  });

  it('CA2: sem flag mantém todas as contas (inclui Closed) — backward-compat', async () => {
    const result = await listCedenteAccountsWithBalance({
      cedenteStore: {
        list: () =>
          Promise.resolve(
            ok([account('acc-active', 50000, 'Active'), account('acc-closed', 99999, 'Closed')]),
          ),
      },
      statements: { listTransactionsByPeriod: () => Promise.resolve(ok([])) },
      clock: CLOCK,
    })();
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.length, 2);
  });
});
