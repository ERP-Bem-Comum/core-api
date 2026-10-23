/**
 * Spec 131 do web-app (P.O., 23/10/2026): a resposta de Pessoa com Deficiência vai ao histórico em
 * PT — no PUT (preenche até completar) e, só ela, ao completar o cadastro (autocadastro ou RH).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import {
  buildHistoryEntries,
  formatPwdPt,
} from '#src/modules/partners/adapters/persistence/mappers/collaborator-history.mapper.ts';
import { makeInMemoryCollaboratorStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-repository.in-memory.ts';
import { makeInMemoryCollaboratorHistory } from '#src/modules/partners/adapters/persistence/repos/collaborator-history-repository.in-memory.ts';
import { completeCollaboratorRegistration } from '#src/modules/partners/application/use-cases/complete-collaborator-registration.ts';
import type { Collaborator as CollaboratorEntity } from '#src/modules/partners/domain/collaborator/types.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';

const NOW = new Date('2026-10-23T12:00:00.000Z');
const clock: Clock = { now: () => NOW, today: () => PlainDate.fromDate(NOW) };
const RH_USER = '9b1f0c2e-4a3d-4e5f-8a7b-6c5d4e3f2a1b';

const preRegistered = (): CollaboratorEntity => {
  const r = Collaborator.register({
    id: CollaboratorId.generate(),
    name: 'Maria Silva',
    email: 'maria@bemcomum.org',
    cpf: '11144477735',
    occupationArea: 'PARC',
    role: 'Analista',
    startOfContract: NOW,
    employmentRelationship: 'CLT',
    registeredAt: NOW,
  });
  assert.ok(r.ok);
  return r.value.collaborator;
};

describe('formatPwdPt — antes → depois em português', () => {
  it('resposta, tipos na ordem do formulário e o texto de "Outra"', () => {
    assert.equal(formatPwdPt(null), null);
    assert.equal(formatPwdPt(JSON.stringify({ answer: 'NAO' })), 'Não');
    assert.equal(
      formatPwdPt(JSON.stringify({ answer: 'PREFIRO_NAO_RESPONDER' })),
      'Prefiro não responder',
    );
    assert.equal(
      formatPwdPt(
        JSON.stringify({
          answer: 'SIM',
          types: ['VISUAL', 'TEA', 'OUTRA'],
          otherDescription: 'fibromialgia',
        }),
      ),
      'Sim — Deficiência Visual; Transtorno do Espectro Autista (TEA); Outra: fibromialgia',
    );
    assert.equal(formatPwdPt(JSON.stringify({ answer: 'SIM', types: [] })), 'Sim');
  });

  it('valor fora do formato passa cru (o histórico não perde a linha)', () => {
    assert.equal(formatPwdPt('texto legado'), 'texto legado');
  });
});

describe('buildHistoryEntries — PcD', () => {
  it('PUT que completa um "Sim" antigo gera a linha "Pessoa com Deficiência" em PT', () => {
    const before: CollaboratorEntity = {
      ...preRegistered(),
      pwd: { answer: 'SIM', types: [], otherDescription: null },
    };
    const after: CollaboratorEntity = {
      ...before,
      pwd: { answer: 'SIM', types: ['AUDITIVA'], otherDescription: null },
    };
    const entries = buildHistoryEntries({
      collaboratorId: String(before.id),
      eventType: 'CollaboratorEdited',
      before,
      after,
      occurredAt: NOW,
      changedBy: { userId: RH_USER, userName: 'RH' },
    });
    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.fieldLabel, 'Pessoa com Deficiência');
    assert.equal(entries[0]?.valueBefore, 'Sim');
    assert.equal(entries[0]?.valueAfter, 'Sim — Deficiência Auditiva');
  });

  it('`fields` restringe o diff: só o PcD entra, mesmo com outros campos mudando', () => {
    const before = preRegistered();
    const after: CollaboratorEntity = {
      ...before,
      race: 'PARDO',
      pwd: { answer: 'NAO' },
    };
    const entries = buildHistoryEntries({
      collaboratorId: String(before.id),
      eventType: 'CollaboratorRegistrationCompleted',
      before,
      after,
      occurredAt: NOW,
      changedBy: null,
      fields: ['pwd'],
    });
    assert.deepEqual(
      entries.map((e) => e.fieldName),
      ['pwd'],
    );
  });
});

describe('completeCollaboratorRegistration (RH) — a primeira resposta vai ao histórico', () => {
  it('grava só a linha de PcD, com o autor do RH', async () => {
    const store = makeInMemoryCollaboratorStore();
    const history = makeInMemoryCollaboratorHistory();
    const collaborator = preRegistered();
    await store.repository.save(collaborator);

    const r = await completeCollaboratorRegistration({
      collaboratorRepo: store.repository,
      historyRepo: history,
      userNameReader: { getUserName: () => Promise.resolve('Ana do RH') },
      clock,
    })({
      collaboratorId: String(collaborator.id),
      changedByUserId: RH_USER,
      rg: '12.345.678-9',
      dateOfBirth: null,
      genderIdentity: 'MULHER_CIS',
      genderIdentityDescription: null,
      race: 'PARDO',
      education: null,
      foodCategory: null,
      foodCategoryDescription: null,
      completeAddress: null,
      telephone: null,
      emergencyContactName: null,
      emergencyContactTelephone: null,
      allergies: null,
      biography: null,
      experienceInThePublicSector: null,
      pwd: { answer: 'SIM', types: ['FISICA'] },
    });
    assert.ok(r.ok, `complete: ${r.ok ? '' : r.error}`);

    const listed = await history.listByCollaborator(String(collaborator.id));
    assert.ok(listed.ok);
    assert.deepEqual(
      listed.value.map((e) => [e.fieldName, e.valueBefore, e.valueAfter, e.changedByName]),
      [['pwd', null, 'Sim — Deficiência Física', 'Ana do RH']],
    );
  });

  it('sem resposta de PcD, nenhuma linha', async () => {
    const store = makeInMemoryCollaboratorStore();
    const history = makeInMemoryCollaboratorHistory();
    const collaborator = preRegistered();
    await store.repository.save(collaborator);

    const r = await completeCollaboratorRegistration({
      collaboratorRepo: store.repository,
      historyRepo: history,
      userNameReader: { getUserName: () => Promise.resolve(null) },
      clock,
    })({
      collaboratorId: String(collaborator.id),
      changedByUserId: RH_USER,
      rg: null,
      dateOfBirth: null,
      genderIdentity: null,
      genderIdentityDescription: null,
      race: 'PARDO',
      education: null,
      foodCategory: null,
      foodCategoryDescription: null,
      completeAddress: null,
      telephone: null,
      emergencyContactName: null,
      emergencyContactTelephone: null,
      allergies: null,
      biography: null,
      experienceInThePublicSector: null,
    });
    assert.ok(r.ok);
    const listed = await history.listByCollaborator(String(collaborator.id));
    assert.ok(listed.ok);
    assert.equal(listed.value.length, 0);
  });
});
