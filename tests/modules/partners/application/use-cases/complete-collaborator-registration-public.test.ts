/**
 * PAR-COLLABORATOR-SELF-REGISTER — W0 (RED) — completeCollaboratorRegistrationPublic com token (#43).
 *
 * CA4: token válido + cpfPrefix correto -> Complete + token marcado usado; 2º POST -> token-used.
 * CA5: cpfPrefix errado -> cpf-mismatch slug e o token NÃO é consumido (não queima por identidade).
 * O use case órfão EVOLUI: ganha deps inviteTokenRepo + minter e cmd.token; retorna os slugs
 * `collaborator-autocadastro-*`. DEVE FALHAR: assinatura antiga não recebe token.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { completeCollaboratorRegistrationPublic } from '#src/modules/partners/application/use-cases/complete-collaborator-registration-public.ts';
import { makeInMemoryCollaboratorStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-repository.in-memory.ts';
import { makeInMemoryCollaboratorInviteTokenStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-invite-token-repository.in-memory.ts';
import { makeNodeCollaboratorInviteTokenMinter } from '#src/modules/partners/adapters/crypto/collaborator-invite-token-minter.node.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as InviteToken from '#src/modules/partners/domain/collaborator/invite-token.ts';
import * as InviteTokenId from '#src/modules/partners/domain/collaborator/invite-token-id.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';

const VALID_CPF = '11144477735'; // prefixo 111

const EMPTY_PERSONAL = {
  rg: null,
  dateOfBirth: null,
  genderIdentity: null,
  race: null,
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
};

const makeFixture = async () => {
  const { repository: collaboratorRepo } = makeInMemoryCollaboratorStore();
  const { repository: inviteTokenRepo } = makeInMemoryCollaboratorInviteTokenStore();
  const minter = makeNodeCollaboratorInviteTokenMinter();
  const clock = ClockReal();

  const registered = Collaborator.register({
    id: CollaboratorId.generate(),
    name: 'Maria Silva',
    email: 'maria@bemcomum.org',
    cpf: VALID_CPF,
    occupationArea: 'PARC',
    role: 'Analista',
    startOfContract: new Date('2026-01-10'),
    employmentRelationship: 'CLT',
    registeredAt: new Date('2026-01-01'),
  });
  assert.ok(registered.ok);
  const collaborator = registered.value.collaborator;
  await collaboratorRepo.save(collaborator);

  // Emite token válido (pending) para o colaborador.
  const secret = minter.mint();
  const now = clock.now();
  const issued = InviteToken.issue({
    id: InviteTokenId.generate(),
    collaboratorId: collaborator.id,
    tokenHash: secret.tokenHash,
    requestedAt: now,
    expiresAt: new Date(now.getTime() + 900_000),
  });
  assert.ok(issued.ok);
  await inviteTokenRepo.save(issued.value);

  const useCase = completeCollaboratorRegistrationPublic({
    collaboratorRepo,
    inviteTokenRepo,
    minter,
    clock,
  });
  return { collaborator, token: secret.token, inviteTokenRepo, collaboratorRepo, useCase };
};

describe('completeCollaboratorRegistrationPublic — CA4', () => {
  it('token válido + cpfPrefix correto -> Complete + token usado; 2º POST -> token-used', async () => {
    const fx = await makeFixture();

    const first = await fx.useCase({
      token: fx.token,
      cpfPrefix: '111',
      ...EMPTY_PERSONAL,
    });
    assert.equal(first.ok, true);
    if (first.ok) assert.equal(first.value.collaborator.registrationStatus, 'Complete');

    // token foi marcado used: findUnusedByCollaboratorId vazio
    const unused = await fx.inviteTokenRepo.findUnusedByCollaboratorId(fx.collaborator.id);
    assert.ok(unused.ok);
    if (unused.ok) assert.equal(unused.value.length, 0);

    const second = await fx.useCase({ token: fx.token, cpfPrefix: '111', ...EMPTY_PERSONAL });
    assert.equal(second.ok, false);
    if (!second.ok) assert.equal(second.error, 'collaborator-autocadastro-token-used');
  });
});

describe('completeCollaboratorRegistrationPublic — CA5', () => {
  it('cpfPrefix errado -> cpf-mismatch e token NÃO consumido', async () => {
    const fx = await makeFixture();

    const result = await fx.useCase({ token: fx.token, cpfPrefix: '999', ...EMPTY_PERSONAL });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, 'collaborator-autocadastro-cpf-mismatch');

    // token preservado (ainda pending)
    const unused = await fx.inviteTokenRepo.findUnusedByCollaboratorId(fx.collaborator.id);
    assert.ok(unused.ok);
    if (unused.ok) assert.equal(unused.value.length, 1);
  });

  it('token inexistente -> token-invalid', async () => {
    const fx = await makeFixture();
    const result = await fx.useCase({ token: 'nao-existe', cpfPrefix: '111', ...EMPTY_PERSONAL });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, 'collaborator-autocadastro-token-invalid');
  });
});
