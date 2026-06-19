import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, ok } from '#src/shared/index.ts';
import * as StatementTransactionId from '#src/modules/financial/domain/statement/statement-transaction-id.ts';
import { getTransactionReconciliation } from '#src/modules/financial/application/use-cases/get-transaction-reconciliation.ts';

const TX = StatementTransactionId.generate();

const deps = (rec: unknown) => ({
  reconciliationRepo: {
    findActiveByTransaction: (): Promise<Result<unknown, never>> => Promise.resolve(ok(rec)),
  },
});

describe('financial/application/get-transaction-reconciliation (#175)', () => {
  it('conciliação ativa encontrada → ok com o agregado', async () => {
    const reconciliation = {
      id: 'rec-1',
      transactionId: String(TX),
      type: 'Individual',
      status: 'Active',
    };
    const r = await getTransactionReconciliation(deps(reconciliation) as never)({
      transactionId: String(TX),
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal((r.value as { id: string }).id, 'rec-1');
  });

  it('sem conciliação ativa (null) → reconciliation-not-found', async () => {
    const r = await getTransactionReconciliation(deps(null) as never)({
      transactionId: String(TX),
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'reconciliation-not-found');
  });

  it('id de transação inválido → statement-transaction-id-invalid', async () => {
    const r = await getTransactionReconciliation(deps(null) as never)({
      transactionId: 'not-a-uuid',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'statement-transaction-id-invalid');
  });
});
