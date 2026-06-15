/**
 * W0 (RED) - getProgramLogo (PRG-LOGO-CONTENT).
 *
 * Use case de leitura dos bytes do logo do programa (servir a imagem que o upload-program-logo
 * so faz upload). DEVE FALHAR em W0 - get-program-logo.ts e `download` no port LogoStorage nao
 * existem. Espelha getProfilePhoto: validar id -> fetch program -> sem logoKey? program-logo-not-found
 * -> storage.download. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import { InMemoryProgramRepository } from '#src/modules/programs/adapters/persistence/repos/program-repository.in-memory.ts';
import { createProgram } from '#src/modules/programs/application/use-cases/create-program.ts';
import { uploadProgramLogo } from '#src/modules/programs/application/use-cases/upload-program-logo.ts';
import { getProgramLogo } from '#src/modules/programs/application/use-cases/get-program-logo.ts';
import type { LogoStorage } from '#src/modules/programs/application/ports/logo-storage.ts';
import type { ProgramRepository } from '#src/modules/programs/domain/program/repository.ts';

const NOW = new Date('2026-06-09T12:00:00.000Z');
const clock: Clock = { now: () => NOW, today: () => PlainDate.fromDate(NOW) };
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02]);
const ABSENT_ID = '00000000-0000-4000-8000-000000000000';

type StorageBehavior = 'found' | 'missing' | 'unavailable';

// Fake controlavel do LogoStorage: registra as keys baixadas e simula cada ramo do download.
const makeStorage = (behavior: StorageBehavior = 'found') => {
  const downloads: string[] = [];
  const storage: LogoStorage = {
    upload: () => Promise.resolve(ok(undefined)),
    remove: () => Promise.resolve(ok(undefined)),
    download: (key: string) => {
      downloads.push(key);
      if (behavior === 'missing') return Promise.resolve(err('logo-object-missing' as const));
      if (behavior === 'unavailable')
        return Promise.resolve(err('logo-storage-unavailable' as const));
      return Promise.resolve(ok({ bytes: PNG, contentType: 'image/png' }));
    },
  };
  return { storage, downloads };
};

const makeProgramRepo = (): ProgramRepository => InMemoryProgramRepository().repo;

// Cria um programa e (opcionalmente) sobe um logo, devolvendo o id. O upload escreve no proprio
// storage in-memory do repo helper; o get-program-logo usa um storage separado (fake) de proposito.
const seedProgram = async (
  programRepo: ProgramRepository,
  opts: Readonly<{ withLogo: boolean }>,
): Promise<string> => {
  const created = await createProgram({ programRepo, clock })({
    name: 'Programa EPV',
    sigla: 'EPV',
    director: null,
    generalCharacteristics: null,
    logoKey: null,
  });
  assert.equal(created.ok, true);
  if (!created.ok) throw new Error('setup');
  const id = String(created.value.program.id);
  if (opts.withLogo) {
    const { storage } = makeStorage();
    const up = await uploadProgramLogo({ programRepo, storage, clock })({
      programId: id,
      bytes: PNG,
      mimeType: 'image/png',
    });
    assert.equal(up.ok, true);
  }
  return id;
};

describe('getProgramLogo', () => {
  it('CA-A: programa com logo -> ok com bytes + contentType, download da logoKey', async () => {
    const programRepo = makeProgramRepo();
    const id = await seedProgram(programRepo, { withLogo: true });
    const { storage, downloads } = makeStorage();

    const r = await getProgramLogo({ programRepo, storage })({ targetId: id });

    assert.equal(r.ok, true);
    if (r.ok) {
      assert.deepEqual(r.value.bytes, PNG);
      assert.equal(r.value.contentType, 'image/png');
    }
    assert.deepEqual(downloads, [`programs/${id}/logo`]);
  });

  it('CA-B: programa sem logo -> program-logo-not-found; storage nao e consultado', async () => {
    const programRepo = makeProgramRepo();
    const id = await seedProgram(programRepo, { withLogo: false });
    const { storage, downloads } = makeStorage();

    const r = await getProgramLogo({ programRepo, storage })({ targetId: id });

    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'program-logo-not-found');
    assert.equal(downloads.length, 0);
  });

  it('CA-C: id invalido -> program-id-invalid', async () => {
    const programRepo = makeProgramRepo();
    const { storage } = makeStorage();
    const r = await getProgramLogo({ programRepo, storage })({ targetId: 'nao-e-uuid' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'program-id-invalid');
  });

  it('CA-D: programa inexistente -> program-not-found', async () => {
    const programRepo = makeProgramRepo();
    const { storage } = makeStorage();
    const r = await getProgramLogo({ programRepo, storage })({ targetId: ABSENT_ID });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'program-not-found');
  });

  it('CA-E: logoKey existe mas objeto sumiu do storage -> logo-object-missing', async () => {
    const programRepo = makeProgramRepo();
    const id = await seedProgram(programRepo, { withLogo: true });
    const { storage } = makeStorage('missing');
    const r = await getProgramLogo({ programRepo, storage })({ targetId: id });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'logo-object-missing');
  });

  it('CA-F: storage indisponivel -> logo-storage-unavailable', async () => {
    const programRepo = makeProgramRepo();
    const id = await seedProgram(programRepo, { withLogo: true });
    const { storage } = makeStorage('unavailable');
    const r = await getProgramLogo({ programRepo, storage })({ targetId: id });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'logo-storage-unavailable');
  });
});
