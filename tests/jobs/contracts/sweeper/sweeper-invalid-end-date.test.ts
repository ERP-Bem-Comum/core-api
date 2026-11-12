import { describe, it, mock } from 'node:test';
import { strict as assert } from 'node:assert';

import { err, ok } from '#src/shared/primitives/result.ts';
import * as schema from '#src/modules/contracts/adapters/persistence/schemas/mysql.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import type { ContractRow } from '#src/modules/contracts/adapters/persistence/mappers/contract.mapper.ts';
import { contractFromRow } from '#src/modules/contracts/adapters/persistence/mappers/contract.mapper.ts';
import { createDrizzleContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts';
import type { Contract } from '#src/modules/contracts/domain/contract/types.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { runSweep } from '#src/jobs/contracts/sweeper/sweeper.ts';

const VALID_ID = '22222222-2222-4222-8222-222222222222';
const CORRUPT_ID = '11111111-1111-4111-8111-111111111111';

/** Linha `Active` + `Fixed` vencida em 2026-12-31, com o `id` e o fim de vigência dados. */
const activeRow = (id: string, currentPeriodEnd: Date): ContractRow => ({
  id,
  sequentialNumber: `${id.slice(0, 3)}/2026`,
  title: 'Contrato vencido',
  objective: 'Objeto',
  signedAt: new Date('2026-01-15T00:00:00.000Z'),
  originalValueCents: 10_000_000,
  originalPeriodKind: 'Fixed',
  originalPeriodStart: new Date('2026-01-15T00:00:00.000Z'),
  originalPeriodEnd: new Date('2026-12-31T00:00:00.000Z'),
  currentValueCents: 10_000_000,
  currentPeriodKind: 'Fixed',
  currentPeriodStart: new Date('2026-01-15T00:00:00.000Z'),
  currentPeriodEnd,
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

const corruptRow = (): ContractRow => activeRow(CORRUPT_ID, new Date('invalid'));
const validRow = (): ContractRow => activeRow(VALID_ID, new Date('2026-12-31T00:00:00.000Z'));

/** Query encadeável do Drizzle que resolve para `rows` quando aguardada. */
const query = (rows: readonly unknown[]): Record<string, unknown> => {
  const builder: Record<string, unknown> = {};
  for (const step of ['from', 'where', 'orderBy', 'limit']) builder[step] = () => builder;
  builder['then'] = (resolve: (v: readonly unknown[]) => unknown) => resolve(rows);
  return builder;
};

/** `MysqlHandle` com `db` falso: o primeiro `select` devolve `contractRows`, os demais nada. */
const stubHandle = (contractRows: readonly ContractRow[]): MysqlHandle => {
  let selects = 0;
  const db = {
    select: () => {
      selects += 1;
      return query(selects === 1 ? contractRows : []);
    },
  };
  return { db, schema } as unknown as MysqlHandle;
};

describe('sweeper — contrato cujo fim de vigência veio inválido do banco', () => {
  it('o mapper recusa a linha, nomeando a coluna e a causa plain-date-invalid-date', () => {
    assert.deepEqual(
      contractFromRow(corruptRow(), []),
      err({
        tag: 'ContractMapperInvalidDate',
        column: 'currentPeriodEnd',
        reason: 'plain-date-invalid-date',
      }),
    );
  });

  it('pula só a linha corrompida, expira a válida e informa a pulada no resultado', async () => {
    const saved: Contract[] = [];
    const repo = createDrizzleContractRepository(stubHandle([corruptRow(), validRow()]));
    const stderr = mock.method(process.stderr, 'write', () => true);
    try {
      const r = await runSweep(
        {
          contractRepo: {
            findExpirable: repo.findExpirable,
            save: (contract) => {
              saved.push(contract);
              return Promise.resolve(ok(undefined));
            },
          },
          clock: ClockFixed(new Date('2027-06-01T03:00:00.000Z')),
        },
        { batchSize: 100 },
      );
      assert.deepEqual(r, ok({ expired: 1, scanned: 1, skipped: 1 }));
    } finally {
      stderr.mock.restore();
    }
    assert.deepEqual(
      saved.map((c) => [String(c.id), c.status]),
      [[VALID_ID, 'Expired']],
    );
  });

  it('registra no stderr o id do contrato pulado, a coluna e a causa', async () => {
    const repo = createDrizzleContractRepository(stubHandle([corruptRow(), validRow()]));
    const stderr = mock.method(process.stderr, 'write', () => true);
    try {
      await repo.findExpirable(ClockFixed(new Date('2027-06-01T03:00:00.000Z')).today(), 100);
      const lines = stderr.mock.calls.map((c) => String(c.arguments[0]));
      const line = lines.find((l) => l.includes(CORRUPT_ID));
      assert.ok(line, `nenhuma linha de log cita ${CORRUPT_ID}: ${JSON.stringify(lines)}`);
      assert.match(line, /linha corrompida/);
      assert.match(line, /currentPeriodEnd/);
      assert.match(line, /plain-date-invalid-date/);
    } finally {
      stderr.mock.restore();
    }
  });
});
