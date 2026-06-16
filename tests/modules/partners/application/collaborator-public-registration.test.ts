import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as Cpf from '#src/shared/kernel/cpf.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import type { Collaborator as CollaboratorType } from '#src/modules/partners/domain/collaborator/types.ts';
import { makeInMemoryCollaboratorStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-repository.in-memory.ts';
import { makeInMemoryCollaboratorInviteTokenStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-invite-token-repository.in-memory.ts';
import { makeNodeCollaboratorInviteTokenMinter } from '#src/modules/partners/adapters/crypto/collaborator-invite-token-minter.node.ts';
import type { CollaboratorRepository } from '#src/modules/partners/domain/collaborator/repository.ts';
import type { CollaboratorInviteTokenRepository } from '#src/modules/partners/domain/collaborator/invite-token-repository.ts';
import * as InviteToken from '#src/modules/partners/domain/collaborator/invite-token.ts';
import * as InviteTokenId from '#src/modules/partners/domain/collaborator/invite-token-id.ts';
import { verifyCpfPrefix } from '#src/modules/partners/application/use-cases/verify-cpf-prefix.ts';
import { checkFirstThreeNumbersCpf } from '#src/modules/partners/application/use-cases/check-first-three-numbers-cpf.ts';
import { completeCollaboratorRegistrationPublic } from '#src/modules/partners/application/use-cases/complete-collaborator-registration-public.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const clock: Clock = { now: () => NOW, today: () => PlainDate.fromDate(NOW) };

const CPF = '111.444.777-35'; // prefixo '111'
const MISSING_ID = '7f3a1234-5678-4abc-9def-fedcba987654';

const completeInput = () => ({
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

const register = (): CollaboratorType => {
  const r = Collaborator.register({
    id: CollaboratorId.generate(),
    name: 'Maria Silva',
    email: 'maria@bemcomum.org',
    cpf: CPF,
    occupationArea: 'PARC',
    role: 'Educadora',
    startOfContract: new Date('2025-02-01T00:00:00.000Z'),
    employmentRelationship: 'CLT',
    registeredAt: NOW,
  });
  assert.ok(r.ok, `fixture inválido: ${r.ok ? '' : r.error}`);
  return r.value.collaborator;
};

describe('verifyCpfPrefix', () => {
  const cpf = (() => {
    const c = Cpf.parse(CPF);
    assert.ok(c.ok);
    return c.value;
  })();

  it('prefixo correto (3 dígitos) → ok', () => {
    assert.equal(isOk(verifyCpfPrefix(cpf, '111')), true);
  });

  it('aceita máscara, considerando só dígitos', () => {
    assert.equal(isOk(verifyCpfPrefix(cpf, '111.')), true);
  });

  it('prefixo errado → cpf-prefix-mismatch', () => {
    const r = verifyCpfPrefix(cpf, '999');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'cpf-prefix-mismatch');
  });

  it('não são 3 dígitos → cpf-prefix-invalid', () => {
    for (const bad of ['11', '1111', 'ab1', '']) {
      const r = verifyCpfPrefix(cpf, bad);
      assert.equal(isErr(r), true);
      if (!r.ok) assert.equal(r.error, 'cpf-prefix-invalid');
    }
  });
});

describe('checkFirstThreeNumbersCpf', () => {
  let repo: CollaboratorRepository;
  let collab: CollaboratorType;

  beforeEach(async () => {
    repo = makeInMemoryCollaboratorStore().repository;
    collab = register();
    await repo.save(collab);
  });

  it('prefixo correto → retorna o Collaborator', async () => {
    const r = await checkFirstThreeNumbersCpf({ collaboratorRepo: repo })({
      collaboratorId: collab.id as unknown as string,
      cpfPrefix: '111',
    });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.name, 'Maria Silva');
  });

  it('prefixo errado → cpf-prefix-mismatch', async () => {
    const r = await checkFirstThreeNumbersCpf({ collaboratorRepo: repo })({
      collaboratorId: collab.id as unknown as string,
      cpfPrefix: '222',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'cpf-prefix-mismatch');
  });

  it('id inexistente → check-cpf-not-found', async () => {
    const r = await checkFirstThreeNumbersCpf({ collaboratorRepo: repo })({
      collaboratorId: MISSING_ID,
      cpfPrefix: '111',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'check-cpf-not-found');
  });

  it('id malformado → check-cpf-invalid-id', async () => {
    const r = await checkFirstThreeNumbersCpf({ collaboratorRepo: repo })({
      collaboratorId: 'nope',
      cpfPrefix: '111',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'check-cpf-invalid-id');
  });
});

// #43 — o use case EVOLUIU: consome o token uso-único (cmd.token) em vez de {collaboratorId}.
// Os slugs de contrato são `collaborator-autocadastro-*` (a rota só mapeia status).
describe('completeCollaboratorRegistrationPublic (com token)', () => {
  let repo: CollaboratorRepository;
  let inviteTokenRepo: CollaboratorInviteTokenRepository;
  let collab: CollaboratorType;
  const minter = makeNodeCollaboratorInviteTokenMinter();

  // Emite um token pending válido para o colaborador e devolve o token em claro.
  const issueTokenFor = async (id: CollaboratorType['id']): Promise<string> => {
    const secret = minter.mint();
    const issued = InviteToken.issue({
      id: InviteTokenId.generate(),
      collaboratorId: id,
      tokenHash: secret.tokenHash,
      requestedAt: NOW,
      expiresAt: new Date(NOW.getTime() + 900_000),
    });
    assert.ok(issued.ok);
    await inviteTokenRepo.save(issued.value);
    return secret.token;
  };

  const deps = () => ({ collaboratorRepo: repo, inviteTokenRepo, minter, clock });

  beforeEach(async () => {
    repo = makeInMemoryCollaboratorStore().repository;
    inviteTokenRepo = makeInMemoryCollaboratorInviteTokenStore().repository;
    collab = register();
    await repo.save(collab);
  });

  it('token válido + prefixo correto → Complete + evento + token usado', async () => {
    const token = await issueTokenFor(collab.id);
    const r = await completeCollaboratorRegistrationPublic(deps())({
      token,
      cpfPrefix: '111',
      ...completeInput(),
    });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.collaborator.registrationStatus, 'Complete');
      assert.equal(r.value.event.type, 'CollaboratorRegistrationCompleted');
    }
    const found = await repo.findById(collab.id);
    if (found.ok && found.value !== null) {
      assert.equal(found.value.registrationStatus, 'Complete');
    }
    const unused = await inviteTokenRepo.findUnusedByCollaboratorId(collab.id);
    assert.ok(unused.ok);
    if (unused.ok) assert.equal(unused.value.length, 0);
  });

  it('prefixo errado → cpf-mismatch, NÃO persiste e NÃO queima o token', async () => {
    const token = await issueTokenFor(collab.id);
    const r = await completeCollaboratorRegistrationPublic(deps())({
      token,
      cpfPrefix: '999',
      ...completeInput(),
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'collaborator-autocadastro-cpf-mismatch');

    const found = await repo.findById(collab.id);
    if (found.ok && found.value !== null) {
      assert.equal(found.value.registrationStatus, 'PreRegistration');
    }
    const unused = await inviteTokenRepo.findUnusedByCollaboratorId(collab.id);
    assert.ok(unused.ok);
    if (unused.ok) assert.equal(unused.value.length, 1);
  });

  it('segundo uso do mesmo token → token-used', async () => {
    const token = await issueTokenFor(collab.id);
    await completeCollaboratorRegistrationPublic(deps())({
      token,
      cpfPrefix: '111',
      ...completeInput(),
    });
    const again = await completeCollaboratorRegistrationPublic(deps())({
      token,
      cpfPrefix: '111',
      ...completeInput(),
    });
    assert.equal(isErr(again), true);
    if (!again.ok) assert.equal(again.error, 'collaborator-autocadastro-token-used');
  });

  it('token inexistente → token-invalid', async () => {
    const r = await completeCollaboratorRegistrationPublic(deps())({
      token: 'nao-existe',
      cpfPrefix: '111',
      ...completeInput(),
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'collaborator-autocadastro-token-invalid');
  });
});
