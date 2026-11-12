import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { err } from '#src/shared/primitives/result.ts';
import * as schema from '#src/modules/contracts/adapters/persistence/schemas/mysql.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import type { ContractRow } from '#src/modules/contracts/adapters/persistence/mappers/contract.mapper.ts';
import { contractFromRow } from '#src/modules/contracts/adapters/persistence/mappers/contract.mapper.ts';
import { createDrizzleContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { runSweep } from '#src/jobs/contracts/sweeper/sweeper.ts';

/** Linha `Active` + `Fixed` cujo fim de vigência o mysql2 devolveu como `Date` inválido. */
const activeRowWithInvalidEnd = (): ContractRow => ({
  id: '11111111-1111-4111-8111-111111111111',
  sequentialNumber: '001/2026',
  title: 'Contrato com fim inválido',
  objective: 'Objeto',
  signedAt: new Date('2026-01-15T00:00:00.000Z'),
  originalValueCents: 10_000_000,
  originalPeriodKind: 'Fixed',
  originalPeriodStart: new Date('2026-01-15T00:00:00.000Z'),
  originalPeriodEnd: new Date('2026-12-31T00:00:00.000Z'),
  currentValueCents: 10_000_000,
  currentPeriodKind: 'Fixed',
  currentPeriodStart: new Date('2026-01-15T00:00:00.000Z'),
  currentPeriodEnd: new Date('invalid'),
  status: 'Active',
  endedAt: null,
  terminationReason: null,
  contractorType: 'supplier',
  contractorId: '55555555-5555-4555-8555-555555555555',
  classification: 'CT',
  programId: null,
  budgetPlanId: null,
  categorizacao: null,
  centroDeCusto: null,
  costCenterRef: null,
  categoryRef: null,
  subcategoryRef: null,
  observations: null,
  email: null,
  telephone: null,
});

/** Query encadeável do Drizzle que resolve para `rows` quando aguardada. */
const query = (rows: readonly unknown[]): Record<string, unknown> => {
  const builder: Record<string, unknown> = {};
  for (const step of ['from', 'where', 'orderBy', 'limit']) builder[step] = () => builder;
  builder['then'] = (resolve: (v: readonly unknown[]) => unknown) => resolve(rows);
  return builder;
};

/** `MysqlHandle` com `db` falso: o primeiro `select` devolve `contractRows`, os demais nada. */
const stubHandle = (contractRows: readonly ContractRow[]) => {
  const writes: string[] = [];
  let selects = 0;
  const db = {
    select: () => {
      selects += 1;
      return query(selects === 1 ? contractRows : []);
    },
    transaction: () => {
      writes.push('transaction');
      return Promise.resolve();
    },
    insert: () => {
      writes.push('insert');
      return query([]);
    },
    update: () => {
      writes.push('update');
      return query([]);
    },
  };
  return { handle: { db, schema } as unknown as MysqlHandle, writes };
};

describe('sweeper — contrato cujo fim de vigência veio inválido do banco', () => {
  it('o mapper recusa a linha, com o motivo plain-date-invalid-date', () => {
    const r = contractFromRow(activeRowWithInvalidEnd(), []);
    assert.deepEqual(
      r,
      err({
        tag: 'ContractMapperInvalidPeriod',
        field: 'currentPeriod',
        reason: 'plain-date-invalid-date',
      }),
    );
  });

  it('runSweep devolve erro e não expira nem grava o contrato', async () => {
    const { handle, writes } = stubHandle([activeRowWithInvalidEnd()]);
    const r = await runSweep(
      {
        contractRepo: createDrizzleContractRepository(handle),
        clock: ClockFixed(new Date('2027-06-01T03:00:00.000Z')),
      },
      { batchSize: 100 },
    );
    assert.deepEqual(r, err('contract-repo-unavailable'));
    assert.deepEqual(writes, []);
  });
});
