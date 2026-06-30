import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOk } from '#src/shared/index.ts';
import * as ProgramId from '#src/modules/programs/domain/shared/program-id.ts';
import { Program } from '#src/modules/programs/domain/program/program.ts';
import type { CreateProgramInput } from '#src/modules/programs/domain/program/program.ts';
import type { ProgramRepository } from '#src/modules/programs/domain/program/repository.ts';

export interface ProgramRepoFactory {
  make: () => Promise<{ repo: ProgramRepository; teardown?: () => Promise<void> }>;
}

const NOW = new Date('2026-06-09T12:00:00.000Z');

export const runProgramRepositoryContract = (label: string, factory: ProgramRepoFactory): void => {
  describe(`ProgramRepository contract — ${label}`, () => {
    let repo: ProgramRepository;
    let teardown: (() => Promise<void>) | undefined;

    beforeEach(async () => {
      const built = await factory.make();
      repo = built.repo;
      teardown = built.teardown;
    });

    afterEach(async () => {
      if (teardown) await teardown();
    });

    const saveNew = async (over: Partial<CreateProgramInput> = {}) => {
      const num = await repo.nextProgramNumber();
      assert.ok(isOk(num));
      const created = Program.create({
        id: ProgramId.generate(),
        programNumber: num.value,
        name: 'Programa Base',
        sigla: 'BASE',
        director: null,
        generalCharacteristics: null,
        logoKey: null,
        now: NOW,
        ...over,
      });
      assert.ok(isOk(created));
      const saved = await repo.save(created.value.program, [created.value.event]);
      assert.ok(isOk(saved));
      return created.value.program;
    };

    it('save + findById faz round-trip dos campos', async () => {
      const p = await saveNew({ name: 'Programa EPV', sigla: 'EPV', director: 'Vinicius' });
      const found = await repo.findById(p.id);
      assert.ok(isOk(found));
      assert.ok(found.value !== null);
      assert.equal(found.value.name, 'Programa EPV');
      assert.equal(found.value.sigla, 'EPV');
      assert.equal(found.value.director, 'Vinicius');
      assert.equal(found.value.status, 'ATIVO');
      assert.equal(found.value.version, 1);
    });

    it('findBySigla retorna pelo valor normalizado', async () => {
      await saveNew({ sigla: 'EPV' });
      const found = await repo.findBySigla('EPV');
      assert.ok(isOk(found));
      assert.ok(found.value !== null);
      assert.equal(found.value.sigla, 'EPV');
      const none = await repo.findBySigla('PARC');
      assert.ok(isOk(none));
      assert.equal(none.value, null);
    });

    it('nextProgramNumber cresce a cada programa', async () => {
      const p1 = await saveNew({ sigla: 'AA' });
      const p2 = await saveNew({ sigla: 'BB' });
      assert.ok(p2.programNumber > p1.programNumber);
    });

    it('listPaged: paginacao com total pos-filtro', async () => {
      for (let i = 0; i < 7; i++) await saveNew({ sigla: `S${i}A` });
      const page = await repo.listPaged({ page: 1, limit: 5, order: 'ASC' });
      assert.ok(isOk(page));
      assert.equal(page.value.items.length, 5);
      assert.equal(page.value.total, 7);
    });

    it('listPaged: search por nome/sigla case-insensitive', async () => {
      await saveNew({ name: 'Educacao para Vida', sigla: 'EPV' });
      await saveNew({ name: 'Parcerias', sigla: 'PARC' });
      const r = await repo.listPaged({ page: 1, limit: 10, order: 'ASC', search: 'epv' });
      assert.ok(isOk(r));
      assert.equal(r.value.items.length, 1);
      assert.equal(r.value.items[0]?.sigla, 'EPV');
    });

    it('listPaged: filtro status', async () => {
      const p = await saveNew({ sigla: 'AA' });
      await saveNew({ sigla: 'BB' });
      const d = Program.deactivate(p, NOW);
      assert.ok(isOk(d));
      const persisted = await repo.save(d.value.program, [d.value.event]);
      assert.ok(isOk(persisted));
      const inativos = await repo.listPaged({
        page: 1,
        limit: 10,
        order: 'ASC',
        status: 'INATIVO',
      });
      assert.ok(isOk(inativos));
      assert.equal(inativos.value.items.length, 1);
      assert.equal(inativos.value.items[0]?.status, 'INATIVO');
    });

    it('save por id existente faz upsert (substitui, nao duplica)', async () => {
      const p = await saveNew({ sigla: 'AA', name: 'Antes' });
      const upd = Program.update(
        p,
        {
          name: 'Depois',
          sigla: 'AA',
          director: null,
          generalCharacteristics: null,
          logoKey: null,
        },
        1,
        NOW,
      );
      assert.ok(isOk(upd));
      const saved = await repo.save(upd.value.program, [upd.value.event]);
      assert.ok(isOk(saved));
      const all = await repo.listPaged({ page: 1, limit: 50, order: 'ASC' });
      assert.ok(isOk(all));
      assert.equal(all.value.total, 1);
      assert.equal(all.value.items[0]?.name, 'Depois');
      assert.equal(all.value.items[0]?.version, 2);
    });
  });
};
