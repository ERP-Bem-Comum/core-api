import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, ok } from '#src/shared/index.ts';
import { listReconciliationPeriods } from '#src/modules/financial/application/use-cases/list-reconciliation-periods.ts';

const ACC = 'acc-1';

const deps = (periods: readonly unknown[]) => ({
  periodStore: {
    listByAccount: (): Promise<Result<readonly unknown[], never>> => Promise.resolve(ok(periods)),
  },
});

describe('financial/application/list-reconciliation-periods (#173)', () => {
  it('lista os períodos da conta', async () => {
    const periods = [
      { id: 'p1', debitAccountRef: ACC, status: 'Closed' },
      { id: 'p2', debitAccountRef: ACC, status: 'Open' },
    ];
    const r = await listReconciliationPeriods(deps(periods) as never)({ debitAccountRef: ACC });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal((r.value as unknown[]).length, 2);
  });

  it('conta sem períodos → lista vazia', async () => {
    const r = await listReconciliationPeriods(deps([]) as never)({ debitAccountRef: ACC });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal((r.value as unknown[]).length, 0);
  });
});
