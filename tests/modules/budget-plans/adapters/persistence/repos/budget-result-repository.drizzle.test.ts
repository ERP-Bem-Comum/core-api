import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { isOk } from '#src/shared/primitives/result.ts';
import * as BudgetIdMod from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import type { BudgetPlansMysqlHandle } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import * as schema from '#src/modules/budget-plans/adapters/persistence/schemas/mysql.ts';
import { createDrizzleBudgetResultRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-result-repository.drizzle.ts';

/** Handle cujo `db` registra cada membro lido e lança ao ser chamado, sem conexão nenhuma. */
const spyHandle = (): Readonly<{ handle: BudgetPlansMysqlHandle; touched: readonly string[] }> => {
  const touched: string[] = [];
  const db = new Proxy(
    {},
    {
      get: (_target, member) => {
        touched.push(String(member));
        return () => {
          throw new Error(`banco consultado por ${String(member)}`);
        };
      },
    },
  );
  const handle = {
    db,
    schema,
    close: () => Promise.resolve(),
  } as unknown as BudgetPlansMysqlHandle;
  return { handle, touched };
};

describe('createDrizzleBudgetResultRepository — lista de ids vazia não consulta o banco', () => {
  it('sumByBudgetIds([]) devolve mapa vazio sem ler membro algum do db', async () => {
    const { handle, touched } = spyHandle();
    const repo = createDrizzleBudgetResultRepository(handle);

    const sums = await repo.sumByBudgetIds([]);

    assert.deepEqual(touched, []);
    assert.ok(isOk(sums));
    assert.equal(sums.value.size, 0);
  });

  it('listByBudgetIds([]) devolve lista vazia sem ler membro algum do db', async () => {
    const { handle, touched } = spyHandle();
    const repo = createDrizzleBudgetResultRepository(handle);

    const results = await repo.listByBudgetIds([]);

    assert.deepEqual(touched, []);
    assert.ok(isOk(results));
    assert.deepEqual(results.value, []);
  });

  it('contraprova: com um id, sumByBudgetIds lê db.select', async (t) => {
    t.mock.method(process.stderr, 'write', () => true);
    const { handle, touched } = spyHandle();
    const repo = createDrizzleBudgetResultRepository(handle);

    await repo.sumByBudgetIds([BudgetIdMod.generate()]);

    assert.deepEqual(touched, ['select']);
  });

  it('contraprova: com um id, listByBudgetIds lê db.select', async (t) => {
    t.mock.method(process.stderr, 'write', () => true);
    const { handle, touched } = spyHandle();
    const repo = createDrizzleBudgetResultRepository(handle);

    await repo.listByBudgetIds([BudgetIdMod.generate()]);

    assert.deepEqual(touched, ['select']);
  });
});
