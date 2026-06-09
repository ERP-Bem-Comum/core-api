// Integração Drizzle/MySQL do ProgramRepository. Roda a MESMA suite de contrato
// (program-repository.suite.ts) contra MySQL real. Opt-in MYSQL_INTEGRATION=1
// (padrão do projeto) — no `pnpm test` puro só o teste estrutural roda.

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';

import { openProgramsMysql } from '#src/modules/programs/adapters/persistence/drivers/mysql-driver.ts';
import type { ProgramsMysqlHandle } from '#src/modules/programs/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleProgramRepository } from '#src/modules/programs/adapters/persistence/repos/program-repository.drizzle.ts';
import { runProgramRepositoryContract } from './program-repository.suite.ts';

const VALID_CONN = 'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

const integrationEnabled = (): boolean => process.env.MYSQL_INTEGRATION === '1';

// Estrutural — sempre roda (mesmo sem DB).
describe('createDrizzleProgramRepository — shape', () => {
  it('é uma função', () => {
    assert.equal(typeof createDrizzleProgramRepository, 'function');
  });
});

if (integrationEnabled()) {
  let handle: ProgramsMysqlHandle | null = null;

  before(async () => {
    const r = await openProgramsMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!r.ok) throw new Error(`fixture: openProgramsMysql falhou — ${r.error}`);
    handle = r.value;
  });

  after(async () => {
    if (handle !== null) {
      await handle.close();
      handle = null;
    }
  });

  const truncate = async (h: ProgramsMysqlHandle): Promise<void> => {
    await h.db.delete(h.schema.prgOutbox);
    await h.db.delete(h.schema.programs);
  };

  runProgramRepositoryContract('Drizzle/MySQL (truncated)', {
    make: async () => {
      if (handle === null) throw new Error('fixture: handle MySQL não inicializado');
      await truncate(handle);
      return { repo: createDrizzleProgramRepository(handle) };
    },
  });
}
