import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import { makeInMemoryCollaboratorStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-repository.in-memory.ts';
import type { CollaboratorRepository } from '#src/modules/partners/domain/collaborator/repository.ts';
import { registerCollaborator } from '#src/modules/partners/application/use-cases/register-collaborator.ts';
import { completeCollaboratorRegistration } from '#src/modules/partners/application/use-cases/complete-collaborator-registration.ts';
import { deactivateCollaborator } from '#src/modules/partners/application/use-cases/deactivate-collaborator.ts';
import { reactivateCollaborator } from '#src/modules/partners/application/use-cases/reactivate-collaborator.ts';
import { listCollaborators } from '#src/modules/partners/application/use-cases/list-collaborators.ts';
import { findCollaboratorByCpf } from '#src/modules/partners/application/use-cases/find-collaborator-by-cpf.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const clock: Clock = { now: () => NOW, today: () => PlainDate.fromDate(NOW) };

const CPF_A = '111.444.777-35';
const CPF_B = '529.982.247-25';

let repo: CollaboratorRepository;
let store: ReturnType<typeof makeInMemoryCollaboratorStore>;

const baseCmd = () => ({
  name: 'Maria Silva',
  email: 'maria.silva@bemcomum.org',
  cpf: CPF_A,
  occupationArea: 'PARC',
  role: 'Educadora',
  startOfContract: new Date('2025-02-01T00:00:00.000Z'),
  employmentRelationship: 'CLT',
});

const validCmd = (over: Partial<ReturnType<typeof baseCmd>> = {}) => ({ ...baseCmd(), ...over });

const completeInput = () => ({
  rg: '12.345.678-9',
  dateOfBirth: new Date('1990-05-10T00:00:00.000Z'),
  genderIdentity: 'MULHER_CIS',
  race: 'PARDO',
  education: 'ENSINO_SUPERIOR',
  foodCategory: 'ONIVORO',
  foodCategoryDescription: null,
  completeAddress: 'Rua das Flores, 123 — Centro',
  telephone: '11999998888',
  emergencyContactName: 'João Silva',
  emergencyContactTelephone: '11988887777',
  allergies: null,
  biography: null,
  experienceInThePublicSector: true,
});

beforeEach(() => {
  store = makeInMemoryCollaboratorStore();
  repo = store.repository;
});

describe('registerCollaborator', () => {
  it('persiste e retorna Active + PreRegistration + evento', async () => {
    const r = await registerCollaborator({ collaboratorRepo: repo, clock })(validCmd());
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.collaborator.status, 'Active');
      assert.equal(r.value.collaborator.registrationStatus, 'PreRegistration');
      assert.equal(r.value.event.type, 'CollaboratorRegistered');
      const listed = await repo.list();
      if (listed.ok) assert.equal(listed.value.length, 1);
    }
  });

  it('rejeita CPF duplicado (email diferente)', async () => {
    await registerCollaborator({ collaboratorRepo: repo, clock })(validCmd());
    const dup = await registerCollaborator({ collaboratorRepo: repo, clock })(
      validCmd({ email: 'outro@bemcomum.org' }),
    );
    assert.equal(isErr(dup), true);
    if (!dup.ok) assert.equal(dup.error, 'register-collaborator-cpf-duplicate');
  });

  it('rejeita email duplicado (CPF diferente)', async () => {
    await registerCollaborator({ collaboratorRepo: repo, clock })(validCmd());
    const dup = await registerCollaborator({ collaboratorRepo: repo, clock })(
      validCmd({ cpf: CPF_B }),
    );
    assert.equal(isErr(dup), true);
    if (!dup.ok) assert.equal(dup.error, 'register-collaborator-email-duplicate');
  });

  it('rejeita CPF inválido', async () => {
    const r = await registerCollaborator({ collaboratorRepo: repo, clock })(
      validCmd({ cpf: '11144477700' }),
    );
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-cpf');
  });

  it('rejeita email inválido', async () => {
    const r = await registerCollaborator({ collaboratorRepo: repo, clock })(
      validCmd({ email: 'sem-arroba' }),
    );
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'collaborator-email-invalid');
  });

  it('rejeita occupationArea desconhecida', async () => {
    const r = await registerCollaborator({ collaboratorRepo: repo, clock })(
      validCmd({ occupationArea: 'XPTO' }),
    );
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-occupation-area');
  });

  it('rejeita employmentRelationship desconhecido', async () => {
    const r = await registerCollaborator({ collaboratorRepo: repo, clock })(
      validCmd({ employmentRelationship: 'ESTAGIO' }),
    );
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-employment-relationship');
  });
});

describe('completeCollaboratorRegistration', () => {
  it('transiciona PreRegistration → Complete + evento', async () => {
    const reg = await registerCollaborator({ collaboratorRepo: repo, clock })(validCmd());
    if (!reg.ok) return;
    const id = reg.value.collaborator.id as unknown as string;

    const r = await completeCollaboratorRegistration({ collaboratorRepo: repo, clock })({
      collaboratorId: id,
      ...completeInput(),
    });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.collaborator.registrationStatus, 'Complete');
      assert.equal(r.value.event.type, 'CollaboratorRegistrationCompleted');
    }
  });

  it('id inexistente → not-found', async () => {
    const r = await completeCollaboratorRegistration({ collaboratorRepo: repo, clock })({
      collaboratorId: '7f3a1234-5678-4abc-9def-fedcba987654',
      ...completeInput(),
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'complete-collaborator-registration-not-found');
  });

  it('já completo → collaborator-already-complete', async () => {
    const reg = await registerCollaborator({ collaboratorRepo: repo, clock })(validCmd());
    if (!reg.ok) return;
    const id = reg.value.collaborator.id as unknown as string;
    await completeCollaboratorRegistration({ collaboratorRepo: repo, clock })({
      collaboratorId: id,
      ...completeInput(),
    });

    const again = await completeCollaboratorRegistration({ collaboratorRepo: repo, clock })({
      collaboratorId: id,
      ...completeInput(),
    });
    assert.equal(isErr(again), true);
    if (!again.ok) assert.equal(again.error, 'collaborator-already-complete');
  });
});

describe('deactivateCollaborator / reactivateCollaborator', () => {
  it('desativa um colaborador existente (com disableBy)', async () => {
    const reg = await registerCollaborator({ collaboratorRepo: repo, clock })(validCmd());
    if (!reg.ok) return;
    const id = reg.value.collaborator.id as unknown as string;

    const r = await deactivateCollaborator({ collaboratorRepo: repo, clock })({
      collaboratorId: id,
      disableBy: 'TEMPO_CONTRATO_FINALIZADO',
    });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.collaborator.status, 'Inactive');
  });

  it('id inexistente → not-found', async () => {
    const r = await deactivateCollaborator({ collaboratorRepo: repo, clock })({
      collaboratorId: '7f3a1234-5678-4abc-9def-fedcba987654',
      disableBy: 'FALECIMENTO',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'deactivate-collaborator-not-found');
  });

  it('disableBy inválido → erro do enum', async () => {
    const reg = await registerCollaborator({ collaboratorRepo: repo, clock })(validCmd());
    if (!reg.ok) return;
    const id = reg.value.collaborator.id as unknown as string;

    const r = await deactivateCollaborator({ collaboratorRepo: repo, clock })({
      collaboratorId: id,
      disableBy: 'MOTIVO_INEXISTENTE',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-disable-reason');
  });

  it('reativa um inativo', async () => {
    const reg = await registerCollaborator({ collaboratorRepo: repo, clock })(validCmd());
    if (!reg.ok) return;
    const id = reg.value.collaborator.id as unknown as string;
    await deactivateCollaborator({ collaboratorRepo: repo, clock })({
      collaboratorId: id,
      disableBy: 'SOLICITACAO_RESCISAO_CONTRATUAL',
    });

    const r = await reactivateCollaborator({ collaboratorRepo: repo, clock })({
      collaboratorId: id,
    });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.collaborator.status, 'Active');
  });

  it('reativar já ativo → collaborator-already-active', async () => {
    const reg = await registerCollaborator({ collaboratorRepo: repo, clock })(validCmd());
    if (!reg.ok) return;
    const id = reg.value.collaborator.id as unknown as string;

    const r = await reactivateCollaborator({ collaboratorRepo: repo, clock })({
      collaboratorId: id,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'collaborator-already-active');
  });
});

describe('queries', () => {
  it('listCollaborators retorna os persistidos', async () => {
    await registerCollaborator({ collaboratorRepo: repo, clock })(validCmd());
    const r = await listCollaborators({ collaboratorRepo: repo })();
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.length, 1);
  });

  it('findCollaboratorByCpf acha por CPF e retorna null quando ausente', async () => {
    await registerCollaborator({ collaboratorRepo: repo, clock })(validCmd());
    const found = await findCollaboratorByCpf({ collaboratorRepo: repo })({ cpf: CPF_A });
    assert.equal(isOk(found), true);
    if (found.ok) assert.notEqual(found.value, null);

    const missing = await findCollaboratorByCpf({ collaboratorRepo: repo })({ cpf: CPF_B });
    assert.equal(isOk(missing), true);
    if (missing.ok) assert.equal(missing.value, null);
  });
});

describe('adapter InMemory', () => {
  it('save recusa CPF duplicado com id diferente', async () => {
    const reg = await registerCollaborator({ collaboratorRepo: repo, clock })(validCmd());
    if (!reg.ok) return;
    const clone = { ...reg.value.collaborator, id: '00000000-0000-4000-8000-000000000000' };
    const saved = await repo.save(clone as typeof reg.value.collaborator);
    assert.equal(isErr(saved), true);
    if (!saved.ok) assert.equal(saved.error, 'collaborator-cpf-duplicate');
  });

  it('save recusa email duplicado com id diferente', async () => {
    const reg = await registerCollaborator({ collaboratorRepo: repo, clock })(validCmd());
    if (!reg.ok) return;
    const clone = {
      ...reg.value.collaborator,
      id: '00000000-0000-4000-8000-000000000000',
      cpf: CPF_B.replace(/\D/g, ''),
    };
    const saved = await repo.save(clone as typeof reg.value.collaborator);
    assert.equal(isErr(saved), true);
    if (!saved.ok) assert.equal(saved.error, 'collaborator-email-duplicate');
  });
});
