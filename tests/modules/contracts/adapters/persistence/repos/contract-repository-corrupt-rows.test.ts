import { describe, it, mock } from 'node:test';
import { strict as assert } from 'node:assert';

import { createDrizzleContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts';
import { corruptRow, stubHandle, validRow } from './corrupt-rows-fixtures.ts';

const VALID_ID = '22222222-2222-4222-8222-222222222222';
const CORRUPT_ID = '11111111-1111-4111-8111-111111111111';

/** Executa `fn` capturando o stderr; devolve o valor e as linhas escritas. */
const capturingStderr = async <T>(fn: () => Promise<T>) => {
  const stderr = mock.method(process.stderr, 'write', () => true);
  try {
    const value = await fn();
    return { value, logs: stderr.mock.calls.map((c) => String(c.arguments[0])) };
  } finally {
    stderr.mock.restore();
  }
};

const assertLogsSkip = (logs: readonly string[], ctx: string): void => {
  const line = logs.find((l) => l.includes(CORRUPT_ID));
  assert.ok(line, `nenhuma linha de log cita ${CORRUPT_ID}: ${JSON.stringify(logs)}`);
  assert.match(line, new RegExp(`\\[contract-repo:${ctx}\\]`));
  assert.match(line, /linha corrompida/);
  assert.match(line, /currentPeriodEnd/);
  assert.match(line, /plain-date-invalid-date/);
};

describe('contract repo — linha corrompida na listagem segue a política do sweep', () => {
  it('list pula a linha corrompida, devolve as legíveis e loga id, coluna e causa', async () => {
    const { handle } = stubHandle([[corruptRow(CORRUPT_ID), validRow(VALID_ID)]]);
    const { value, logs } = await capturingStderr(() =>
      createDrizzleContractRepository(handle).list(),
    );
    assert.ok(value.ok, `list falhou: ${JSON.stringify(value)}`);
    assert.deepEqual(
      value.value.map((c) => String(c.id)),
      [VALID_ID],
    );
    assertLogsSkip(logs, 'list');
  });

  it('listPaged pula a linha corrompida e mantém o total do banco', async () => {
    const { handle } = stubHandle([[corruptRow(CORRUPT_ID), validRow(VALID_ID)]], 2);
    const { value, logs } = await capturingStderr(() =>
      createDrizzleContractRepository(handle).listPaged({ page: 1, limit: 10, order: 'ASC' }),
    );
    assert.ok(value.ok, `listPaged falhou: ${JSON.stringify(value)}`);
    assert.deepEqual(
      value.value.items.map((c) => String(c.id)),
      [VALID_ID],
    );
    assert.equal(value.value.total, 2);
    assertLogsSkip(logs, 'listPaged');
  });
});
