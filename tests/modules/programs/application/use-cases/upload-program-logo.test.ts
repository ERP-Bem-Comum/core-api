import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOk, isErr } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import { InMemoryProgramRepository } from '#src/modules/programs/adapters/persistence/repos/program-repository.in-memory.ts';
import { makeInMemoryLogoStorage } from '#src/modules/programs/adapters/storage/logo-storage.in-memory.ts';
import { createProgram } from '#src/modules/programs/application/use-cases/create-program.ts';
import { uploadProgramLogo } from '#src/modules/programs/application/use-cases/upload-program-logo.ts';

const NOW = new Date('2026-06-09T12:00:00.000Z');
const clock: Clock = { now: () => NOW, today: () => PlainDate.fromDate(NOW) };
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
const ABSENT_ID = '00000000-0000-4000-8000-000000000000';

const makeCtx = () => {
  const storage = makeInMemoryLogoStorage();
  const deps = { programRepo: InMemoryProgramRepository().repo, storage, clock };
  return { deps, storage };
};

const seed = async (deps: ReturnType<typeof makeCtx>['deps']) => {
  const r = await createProgram(deps)({
    name: 'Programa EPV',
    sigla: 'EPV',
    director: null,
    generalCharacteristics: null,
    logoKey: null,
  });
  assert.ok(isOk(r));
  return r.value.program;
};

describe('uploadProgramLogo', () => {
  it('valida + armazena + atualiza logoKey e version', async () => {
    const { deps, storage } = makeCtx();
    const p = await seed(deps);
    const r = await uploadProgramLogo(deps)({
      programId: String(p.id),
      bytes: PNG,
      mimeType: 'image/png',
    });
    assert.ok(isOk(r));
    assert.equal(r.value.program.logoKey, `programs/${String(p.id)}/logo`);
    assert.equal(r.value.program.version, 2);
    assert.equal(storage.size(), 1);
  });

  it('mime nao suportado -> logo-type-unsupported', async () => {
    const { deps } = makeCtx();
    const p = await seed(deps);
    const r = await uploadProgramLogo(deps)({
      programId: String(p.id),
      bytes: PNG,
      mimeType: 'application/pdf',
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'logo-type-unsupported');
  });

  it('vazio -> logo-empty', async () => {
    const { deps } = makeCtx();
    const p = await seed(deps);
    const r = await uploadProgramLogo(deps)({
      programId: String(p.id),
      bytes: new Uint8Array(0),
      mimeType: 'image/png',
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'logo-empty');
  });

  it('acima de 5 MB -> logo-too-large', async () => {
    const { deps } = makeCtx();
    const p = await seed(deps);
    const r = await uploadProgramLogo(deps)({
      programId: String(p.id),
      bytes: new Uint8Array(5 * 1024 * 1024 + 1),
      mimeType: 'image/png',
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'logo-too-large');
  });

  it('programa inexistente -> program-not-found', async () => {
    const { deps } = makeCtx();
    const r = await uploadProgramLogo(deps)({
      programId: ABSENT_ID,
      bytes: PNG,
      mimeType: 'image/png',
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'program-not-found');
  });
});
