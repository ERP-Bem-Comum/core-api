// Teste de integração: ProgramsReadPort.listAll (Drizzle + MySQL real) — pré-req do 020 · US3.
// Insere programas via repo e valida a listagem ordenada por programNumber (projeção ProgramView).
// GATE: só roda com MYSQL_INTEGRATION=1 (package.json §test:integration:programs).

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { isOk } from '#src/shared/index.ts';
import * as ProgramId from '#src/modules/programs/domain/shared/program-id.ts';
import { Program } from '#src/modules/programs/domain/program/program.ts';
import { openProgramsMysql } from '#src/modules/programs/adapters/persistence/drivers/mysql-driver.ts';
import type { ProgramsMysqlHandle } from '#src/modules/programs/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleProgramRepository } from '#src/modules/programs/adapters/persistence/repos/program-repository.drizzle.ts';
import { createDrizzleProgramListReader } from '#src/modules/programs/adapters/persistence/repos/program-list-read.drizzle.ts';

const VALID_CONN = 'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';
const NOW = new Date('2026-06-20T12:00:00.000Z');

// Estrutural — sempre roda (mesmo sem DB).
describe('createDrizzleProgramListReader — shape', () => {
  it('é uma função', () => {
    assert.equal(typeof createDrizzleProgramListReader, 'function');
  });
});

if (process.env['MYSQL_INTEGRATION'] === '1') {
  describe('ProgramsReadPort.listAll — Drizzle + MySQL (integração)', () => {
    let handle: ProgramsMysqlHandle;

    before(async () => {
      const r = await openProgramsMysql({ connectionString: VALID_CONN, applyMigrations: true });
      if (!r.ok) throw new Error(`fixture: openProgramsMysql falhou — ${r.error}`);
      handle = r.value;
      // estado limpo (a suite roda contra MySQL compartilhado)
      await handle.db.delete(handle.schema.prgOutbox);
      await handle.db.delete(handle.schema.programs);
    });

    after(async () => {
      await handle?.close();
    });

    const saveNew = async (name: string, sigla: string): Promise<void> => {
      const repo = createDrizzleProgramRepository(handle);
      const num = await repo.nextProgramNumber();
      assert.ok(isOk(num));
      const created = Program.create({
        id: ProgramId.generate(),
        programNumber: num.value,
        name,
        sigla,
        director: null,
        generalCharacteristics: null,
        logoKey: null,
        now: NOW,
      });
      assert.ok(isOk(created));
      const saved = await repo.save(created.value.program, [created.value.event]);
      assert.ok(isOk(saved));
    };

    it('listAll() lista todos os programas ordenados por programNumber (projeção {id,name,sigla,programNumber})', async () => {
      await saveNew('Saúde Comunitária', 'SAUD');
      await saveNew('Educação Infantil', 'EDUC');
      await saveNew('Captação de Recursos', 'CAPT');

      const reader = createDrizzleProgramListReader(handle);
      const r = await reader.listAll();
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.equal(r.value.length, 3);
        const numbers = r.value.map((p) => p.programNumber);
        assert.deepEqual(
          [...numbers],
          [...numbers].sort((a, b) => a - b),
          'ordenado por programNumber asc',
        );
        for (const p of r.value) {
          assert.equal(typeof p.id, 'string');
          assert.ok(p.name.length > 0);
          assert.ok(p.sigla.length > 0);
          assert.equal(typeof p.programNumber, 'number');
        }
        assert.ok(
          r.value.some((p) => p.name === 'Saúde Comunitária'),
          'programa inserido aparece na listagem',
        );
      }
    });
  });
}
