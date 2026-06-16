/**
 * #44 — W0/W1 — captura de histórico nas transições de escrita do Colaborador.
 *
 * CA1/CA1b: edit/deactivate/reactivate/complete apendam exatamente 1 entry com before/after
 * coerentes; cadastro inicial NÃO gera entry. Wiring application puro (sem HTTP), InMemory.
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import { makeInMemoryCollaboratorStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-repository.in-memory.ts';
import { makeInMemoryCollaboratorHistoryStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-history-repository.in-memory.ts';
import { editCollaborator } from '#src/modules/partners/application/use-cases/edit-collaborator.ts';
import { deactivateCollaborator } from '#src/modules/partners/application/use-cases/deactivate-collaborator.ts';
import { reactivateCollaborator } from '#src/modules/partners/application/use-cases/reactivate-collaborator.ts';
import { completeCollaboratorRegistration } from '#src/modules/partners/application/use-cases/complete-collaborator-registration.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const START = new Date('2025-02-01T00:00:00.000Z');
const clock: Clock = ClockReal();

const collaboratorStore = makeInMemoryCollaboratorStore();
const historyStore = makeInMemoryCollaboratorHistoryStore();

const seedActive = async (over: Record<string, unknown> = {}) => {
  const r = Collaborator.register({
    id: CollaboratorId.generate(),
    name: 'Maria Silva',
    email: `maria${Math.random()}@bemcomum.org`,
    cpf: '111.444.777-35',
    occupationArea: 'PARC',
    role: 'Diretor',
    startOfContract: START,
    employmentRelationship: 'CLT',
    registeredAt: NOW,
    ...over,
  });
  assert.ok(r.ok, `fixture: ${r.ok ? '' : r.error}`);
  const saved = await collaboratorStore.repository.save(r.value.collaborator);
  assert.ok(saved.ok);
  return r.value.collaborator;
};

const deps = () => ({
  collaboratorRepo: collaboratorStore.repository,
  historyRepo: historyStore.repository,
  clock,
});

beforeEach(() => {
  collaboratorStore.clear();
  historyStore.clear();
});

describe('#44 captura de histórico', () => {
  it('CA1: edit (role Diretor → Diretor Adjunto) apenda 1 entry Edicao com before/after', async () => {
    const c = await seedActive({ role: 'Diretor' });
    const res = await editCollaborator(deps())({
      collaboratorId: String(c.id),
      canEditSensitive: false,
      name: c.name,
      email: c.email,
      cpf: String(c.cpf),
      occupationArea: c.occupationArea,
      role: 'Diretor Adjunto',
      startOfContract: c.startOfContract,
      employmentRelationship: c.employmentRelationship,
    });
    assert.ok(res.ok, `edit falhou: ${res.ok ? '' : res.error}`);

    const entries = historyStore.entries();
    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.changeType, 'Edicao');
    assert.equal(entries[0]?.collaboratorRef, c.id);
    assert.ok(entries[0]?.before?.includes('role=Diretor'));
    assert.ok(entries[0]?.after.includes('role=Diretor Adjunto'));
    assert.ok(entries[0]?.occurredAt instanceof Date);
  });

  it('CA1b: deactivate apenda 1 entry Desativacao', async () => {
    const c = await seedActive();
    const res = await deactivateCollaborator(deps())({
      collaboratorId: String(c.id),
      disableBy: 'TEMPO_CONTRATO_FINALIZADO',
    });
    assert.ok(res.ok, `deactivate falhou: ${res.ok ? '' : res.error}`);
    const entries = historyStore.entries();
    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.changeType, 'Desativacao');
    assert.ok(entries[0]?.before?.includes('status=Active'));
    assert.ok(entries[0]?.after.includes('status=Inactive'));
  });

  it('CA1b: reactivate apenda 1 entry Reativacao', async () => {
    const c = await seedActive();
    await deactivateCollaborator(deps())({
      collaboratorId: String(c.id),
      disableBy: 'TEMPO_CONTRATO_FINALIZADO',
    });
    historyStore.clear();
    const res = await reactivateCollaborator(deps())({ collaboratorId: String(c.id) });
    assert.ok(res.ok, `reactivate falhou: ${res.ok ? '' : res.error}`);
    const entries = historyStore.entries();
    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.changeType, 'Reativacao');
    assert.ok(entries[0]?.before?.includes('status=Inactive'));
    assert.ok(entries[0]?.after.includes('status=Active'));
  });

  it('CA1b: complete-registration apenda 1 entry Complementacao', async () => {
    const c = await seedActive();
    const res = await completeCollaboratorRegistration(deps())({
      collaboratorId: String(c.id),
      rg: '12.345.678-9',
      dateOfBirth: new Date('1990-05-10T00:00:00.000Z'),
      genderIdentity: 'MULHER_CIS',
      race: 'PARDO',
      education: 'ENSINO_SUPERIOR',
      foodCategory: 'ONIVORO',
      foodCategoryDescription: null,
      completeAddress: 'Rua das Flores 123',
      telephone: '11999998888',
      emergencyContactName: 'João Silva',
      emergencyContactTelephone: '11988887777',
      allergies: null,
      biography: null,
      experienceInThePublicSector: true,
    });
    assert.ok(res.ok, `complete falhou: ${res.ok ? '' : res.error}`);
    const entries = historyStore.entries();
    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.changeType, 'Complementacao');
    assert.ok(entries[0]?.before?.includes('registrationStatus=PreRegistration'));
    assert.ok(entries[0]?.after.includes('registrationStatus=Complete'));
  });

  it('CA1b: cadastro inicial NÃO gera entry de histórico', async () => {
    await seedActive();
    assert.equal(historyStore.entries().length, 0);
  });
});
