import { describe, it, mock } from 'node:test';
import { strict as assert } from 'node:assert';

import { err, ok } from '#src/shared/primitives/result.ts';
import { contractFromRow } from '#src/modules/contracts/adapters/persistence/mappers/contract.mapper.ts';
import { createDrizzleContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts';
import type { Contract } from '#src/modules/contracts/domain/contract/types.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { EX_DATAERR, runSweep, sweepExit } from '#src/jobs/contracts/sweeper/sweeper.ts';
import {
  corruptRow,
  stubHandle,
  validRow,
} from '../../../modules/contracts/adapters/persistence/repos/corrupt-rows-fixtures.ts';

const VALID_ID = '22222222-2222-4222-8222-222222222222';
const CORRUPT_IDS = [
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
] as const;
const AT = new Date('2027-06-01T03:00:00.000Z');

/** Roda o sweep com o `findExpirable` real (db falso) e um `save` que só registra. */
const sweepWith = async (pages: Parameters<typeof stubHandle>[0], batchSize: number) => {
  const saved: Contract[] = [];
  const { handle, seen } = stubHandle(pages);
  const repo = createDrizzleContractRepository(handle);
  const stderr = mock.method(process.stderr, 'write', () => true);
  try {
    const result = await runSweep(
      {
        contractRepo: {
          findExpirable: repo.findExpirable,
          save: (contract) => {
            saved.push(contract);
            return Promise.resolve(ok(undefined));
          },
        },
        clock: ClockFixed(AT),
      },
      { batchSize },
    );
    const logs = stderr.mock.calls.map((c) => String(c.arguments[0]));
    return { result, saved, seen, logs };
  } finally {
    stderr.mock.restore();
  }
};

describe('sweeper — contrato cujo fim de vigência veio inválido do banco', () => {
  it('o mapper recusa a linha, nomeando a coluna e a causa plain-date-invalid-date', () => {
    assert.deepEqual(
      contractFromRow(corruptRow(CORRUPT_IDS[0]), []),
      err({
        tag: 'ContractMapperInvalidDate',
        column: 'currentPeriodEnd',
        reason: 'plain-date-invalid-date',
      }),
    );
  });

  it('pula só a linha corrompida, expira a válida e informa a pulada no resultado', async () => {
    const { result, saved } = await sweepWith(
      [[corruptRow(CORRUPT_IDS[0]), validRow(VALID_ID)]],
      100,
    );
    assert.deepEqual(result, ok({ expired: 1, scanned: 1, skipped: 1 }));
    assert.deepEqual(
      saved.map((c) => [String(c.id), c.status]),
      [[VALID_ID, 'Expired']],
    );
  });

  it('registra no stderr o id do contrato pulado, a coluna e a causa', async () => {
    const { logs } = await sweepWith([[corruptRow(CORRUPT_IDS[0]), validRow(VALID_ID)]], 100);
    const line = logs.find((l) => l.includes(CORRUPT_IDS[0]));
    assert.ok(line, `nenhuma linha de log cita ${CORRUPT_IDS[0]}: ${JSON.stringify(logs)}`);
    assert.match(line, /linha corrompida/);
    assert.match(line, /currentPeriodEnd/);
    assert.match(line, /plain-date-invalid-date/);
  });

  it('sem inanição: batchSize linhas corrompidas na frente não impedem a válida de expirar', async () => {
    const { result, saved, seen } = await sweepWith(
      [CORRUPT_IDS.map(corruptRow), [validRow(VALID_ID)]],
      CORRUPT_IDS.length,
    );
    assert.deepEqual(result, ok({ expired: 1, scanned: 1, skipped: 2 }));
    assert.deepEqual(
      saved.map((c) => String(c.id)),
      [VALID_ID],
    );
    const retry = seen[1];
    assert.ok(retry, 'esperava uma segunda leitura além das linhas ilegíveis');
    assert.match(retry.sql, /not in/);
    assert.deepEqual(
      retry.params.filter((p) => typeof p === 'string' && p.includes('-4')),
      [...CORRUPT_IDS],
    );
  });
});

describe('sweepExit — código de saída do job', () => {
  it('sucesso sem linha pulada sai com 0 e imprime o resultado no stdout', () => {
    assert.deepEqual(sweepExit(ok({ expired: 2, scanned: 2, skipped: 0 })), {
      code: 0,
      stdout: '[contracts-sweeper] expired=2 scanned=2 skipped=0\n',
      stderr: null,
    });
  });

  it('com linha pulada processa o resto, mas sai com EX_DATAERR (65) e avisa no stderr', () => {
    const exit = sweepExit(ok({ expired: 1, scanned: 1, skipped: 2 }));
    assert.equal(exit.code, EX_DATAERR);
    assert.equal(EX_DATAERR, 65);
    assert.equal(exit.stdout, '[contracts-sweeper] expired=1 scanned=1 skipped=2\n');
    assert.match(exit.stderr ?? '', /2 contrato\(s\) ignorado\(s\)/);
    assert.match(exit.stderr ?? '', /linha corrompida/);
  });

  it('erro de repositório sai com 1, distinto do 65 de dado corrompido', () => {
    assert.deepEqual(sweepExit(err('contract-repo-unavailable')), {
      code: 1,
      stdout: null,
      stderr: '[contracts-sweeper] erro no sweep: contract-repo-unavailable\n',
    });
  });
});
