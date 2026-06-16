/**
 * PAR-COLLABORATOR-SELF-REGISTER — W0 (RED) — requestCollaboratorActivation (#43, CA1/CA1b).
 *
 * Gera token uso-único + dispara o mailer InMemory com link de origem confiável
 * (activationBaseUrl, nunca Host). Invalida tokens pendentes anteriores antes de emitir.
 * DEVE FALHAR: o use case ainda não existe.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { requestCollaboratorActivation } from '#src/modules/partners/application/use-cases/request-collaborator-activation.ts';
import { makeInMemoryCollaboratorStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-repository.in-memory.ts';
import { makeInMemoryCollaboratorInviteTokenStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-invite-token-repository.in-memory.ts';
import { makeInMemoryCollaboratorActivationMailer } from '#src/modules/partners/adapters/notifications/collaborator-activation-mailer.in-memory.ts';
import { makeNodeCollaboratorInviteTokenMinter } from '#src/modules/partners/adapters/crypto/collaborator-invite-token-minter.node.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';

const VALID_CPF = '11144477735';

const seedCollaborator = async (
  repo: ReturnType<typeof makeInMemoryCollaboratorStore>['repository'],
) => {
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
  await repo.save(registered.value.collaborator);
  return registered.value.collaborator;
};

const makeDeps = () => {
  const { repository: collaboratorRepo } = makeInMemoryCollaboratorStore();
  const { repository: inviteTokenRepo } = makeInMemoryCollaboratorInviteTokenStore();
  const mailer = makeInMemoryCollaboratorActivationMailer();
  return {
    collaboratorRepo,
    inviteTokenRepo,
    mailer,
    minter: makeNodeCollaboratorInviteTokenMinter(),
    clock: ClockReal(),
    inviteTtlSeconds: 900,
    activationBaseUrl: 'http://localhost:3000/collaborators/autocadastro',
  };
};

describe('requestCollaboratorActivation (CA1)', () => {
  it('persiste 1 token pending e envia exatamente 1 link tokenizado de origem confiável', async () => {
    const deps = makeDeps();
    const collaborator = await seedCollaborator(deps.collaboratorRepo);

    const result = await requestCollaboratorActivation(deps)({
      collaboratorId: String(collaborator.id),
    });
    assert.equal(result.ok, true);

    assert.equal(deps.mailer.sentLinks.length, 1);
    const sent = deps.mailer.sentLinks[0]!;
    assert.equal(sent.email, 'maria@bemcomum.org');
    assert.ok(
      sent.activationUrl.startsWith('http://localhost:3000/collaborators/autocadastro?token='),
    );

    const unused = await deps.inviteTokenRepo.findUnusedByCollaboratorId(collaborator.id);
    assert.ok(unused.ok);
    if (unused.ok) assert.equal(unused.value.length, 1);
  });

  it('id inexistente -> erro not-found, sem enviar e-mail', async () => {
    const deps = makeDeps();
    const result = await requestCollaboratorActivation(deps)({
      collaboratorId: '00000000-0000-4000-8000-000000000000',
    });
    assert.equal(result.ok, false);
    assert.equal(deps.mailer.sentLinks.length, 0);
  });
});

describe('requestCollaboratorActivation (CA1b — invalida pendentes)', () => {
  it('um segundo request invalida o token anterior (só 1 pending por vez)', async () => {
    const deps = makeDeps();
    const collaborator = await seedCollaborator(deps.collaboratorRepo);
    const cmd = { collaboratorId: String(collaborator.id) };

    const first = await requestCollaboratorActivation(deps)(cmd);
    assert.ok(first.ok);
    const second = await requestCollaboratorActivation(deps)(cmd);
    assert.ok(second.ok);

    const unused = await deps.inviteTokenRepo.findUnusedByCollaboratorId(collaborator.id);
    assert.ok(unused.ok);
    if (unused.ok) assert.equal(unused.value.length, 1);
    assert.equal(deps.mailer.sentLinks.length, 2);
  });
});
