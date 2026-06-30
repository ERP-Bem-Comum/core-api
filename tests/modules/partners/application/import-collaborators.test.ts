import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import { makeInMemoryCollaboratorStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-repository.in-memory.ts';
import type { CollaboratorRepository } from '#src/modules/partners/domain/collaborator/repository.ts';
import type { RegisterCollaboratorCommand } from '#src/modules/partners/application/use-cases/register-collaborator.ts';
import { registerCollaborator } from '#src/modules/partners/application/use-cases/register-collaborator.ts';
import { importCollaborators } from '#src/modules/partners/application/use-cases/import-collaborators.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const clock: Clock = { now: () => NOW, today: () => PlainDate.fromDate(NOW) };

const START = new Date('2025-02-01T00:00:00.000Z');

const row = (over: Partial<RegisterCollaboratorCommand> = {}): RegisterCollaboratorCommand => ({
  name: 'Maria Silva',
  email: 'maria@bemcomum.org',
  cpf: '111.444.777-35',
  occupationArea: 'PARC',
  role: 'Educadora',
  startOfContract: START,
  employmentRelationship: 'CLT',
  ...over,
});

const joao = () => row({ name: 'João Pereira', email: 'joao@bemcomum.org', cpf: '529.982.247-25' });
const ana = () => row({ name: 'Ana Souza', email: 'ana@bemcomum.org', cpf: '123.456.789-09' });

let repo: CollaboratorRepository;

beforeEach(() => {
  repo = makeInMemoryCollaboratorStore().repository;
});

describe('importCollaborators', () => {
  it('lista vazia → 0 importados, sem falhas, não-parcial', async () => {
    const r = await importCollaborators({ collaboratorRepo: repo, clock })({ rows: [] });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.importedCount, 0);
      assert.equal(r.value.failed.length, 0);
      assert.equal(r.value.isPartialImport, false);
    }
  });

  it('todas válidas distintas → todas importadas', async () => {
    const r = await importCollaborators({ collaboratorRepo: repo, clock })({
      rows: [row(), joao(), ana()],
    });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.importedCount, 3);
      assert.equal(r.value.failed.length, 0);
      assert.equal(r.value.isPartialImport, false);
    }
    const listed = await repo.list();
    if (listed.ok) assert.equal(listed.value.length, 3);
  });

  it('linha com CPF inválido vira failed; demais entram (import parcial)', async () => {
    const r = await importCollaborators({ collaboratorRepo: repo, clock })({
      rows: [row(), row({ name: 'João', email: 'joao@bemcomum.org', cpf: '11144477700' })],
    });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.importedCount, 1);
      assert.equal(r.value.failed.length, 1);
      assert.equal(r.value.failed[0]?.index, 1);
      assert.equal(r.value.failed[0]?.error, 'invalid-cpf');
      assert.equal(r.value.isPartialImport, true);
    }
  });

  it('duplicado intra-arquivo (mesmo CPF) → 2ª linha failed cpf-duplicate', async () => {
    const r = await importCollaborators({ collaboratorRepo: repo, clock })({
      rows: [row(), row({ email: 'outro@bemcomum.org' })],
    });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.importedCount, 1);
      assert.equal(r.value.failed[0]?.index, 1);
      assert.equal(r.value.failed[0]?.error, 'register-collaborator-cpf-duplicate');
    }
  });

  it('duplicado intra-arquivo (mesmo email) → 2ª linha failed email-duplicate', async () => {
    const r = await importCollaborators({ collaboratorRepo: repo, clock })({
      rows: [row(), row({ cpf: '529.982.247-25' })],
    });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.failed[0]?.error, 'register-collaborator-email-duplicate');
  });

  it('duplicado contra o banco → linha vira failed', async () => {
    await registerCollaborator({ collaboratorRepo: repo, clock })(row());
    const r = await importCollaborators({ collaboratorRepo: repo, clock })({
      rows: [joao(), row()],
    });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.importedCount, 1);
      assert.equal(r.value.failed[0]?.index, 1);
      assert.equal(r.value.failed[0]?.error, 'register-collaborator-cpf-duplicate');
    }
  });

  it('continua após falha no meio', async () => {
    const r = await importCollaborators({ collaboratorRepo: repo, clock })({
      rows: [row(), row({ email: 'dup@bemcomum.org' }), ana()],
    });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.importedCount, 2); // row() e ana()
      assert.equal(r.value.failed.length, 1); // a duplicata no meio
      assert.equal(r.value.failed[0]?.index, 1);
    }
  });
});
