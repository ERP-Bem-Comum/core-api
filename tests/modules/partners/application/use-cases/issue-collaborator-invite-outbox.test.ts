/**
 * PARTNERS-INVITE-DOMAIN-EVENT — W0 (RED) — CA2/CA5/CA8: emissao atomica de CollaboratorInvited.
 *
 * O `issueCollaboratorInvite` passa a:
 *   - salvar o invite-token E gravar `CollaboratorInvited` no par_email_outbox na MESMA tx
 *     (atomicidade — ADR-0015), via `inviteRepo.saveWithEvents` (espelha o saveWithEvents do auth);
 *   - NAO chamar mais o `mailer` (CA5: o e-mail sai so pelo consumidor email-dispatch);
 *   - propagar erro do save sem deixar evento orfao (CA8 rollback).
 *
 * O payload e autocontido (email, autocadastroUrl com o token CLARO, recipientName).
 *
 * DEVE FALHAR em W0: o use case ainda chama mailer e o inviteRepo nao tem saveWithEvents.
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { err } from '#src/shared/primitives/result.ts';
import { issueCollaboratorInvite } from '#src/modules/partners/application/use-cases/issue-collaborator-invite.ts';
import { makeInMemoryCollaboratorInviteTokenStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-invite-token-repository.in-memory.ts';
import { InMemoryParEmailOutbox } from '#src/modules/partners/adapters/outbox/par-email-outbox.in-memory.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import type { CollaboratorInviteTokenMinter } from '#src/modules/partners/application/ports/collaborator-invite-token-minter.ts';

const AT = new Date('2026-06-18T12:00:00.000Z');
const BASE = 'https://app.local/autocadastro';
const TTL_DAYS = 7;

const minter: CollaboratorInviteTokenMinter = {
  mint: () => ({ token: 'plain-1', tokenHash: 'hash-1' }),
  hash: (raw) => `${raw}-h`,
};

const makeCtx = (over?: {
  inviteStore?: ReturnType<typeof makeInMemoryCollaboratorInviteTokenStore>;
  outbox?: ReturnType<typeof InMemoryParEmailOutbox>;
}) => {
  const outbox = over?.outbox ?? InMemoryParEmailOutbox();
  const inviteStore = over?.inviteStore ?? makeInMemoryCollaboratorInviteTokenStore(outbox.port);
  const issue = issueCollaboratorInvite({
    inviteRepo: inviteStore.repository,
    minter,
    clock: ClockFixed(AT),
    autocadastroBaseUrl: BASE,
    inviteTtlDays: TTL_DAYS,
  });
  return { issue, inviteStore, outbox };
};

const CMD = {
  collaboratorId: CollaboratorId.generate(),
  email: 'colaborador@example.com',
  recipientName: 'Fulano',
};

describe('issueCollaboratorInvite emite CollaboratorInvited na tx (CA2/CA5/CA8)', () => {
  it('CA2 — grava o evento CollaboratorInvited no par_email_outbox', async () => {
    const { issue, outbox } = makeCtx();
    const r = await issue(CMD);
    assert.equal(r.ok, true);
    const rows = outbox.all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.eventType, 'CollaboratorInvited');
    assert.equal(rows[0]?.aggregateType, 'Collaborator');
  });

  it('CA2 — payload autocontido: email + autocadastroUrl (token claro) + recipientName', async () => {
    const { issue, outbox } = makeCtx();
    await issue(CMD);
    const payload = JSON.parse(outbox.all()[0]?.payload ?? '{}') as Record<string, unknown>;
    assert.equal(payload['email'], 'colaborador@example.com');
    assert.equal(payload['autocadastroUrl'], `${BASE}?token=plain-1`);
    assert.equal(payload['recipientName'], 'Fulano');
  });

  it('CA8 — falha no save: rollback total, nenhum evento orfao', async () => {
    const failingStore = makeInMemoryCollaboratorInviteTokenStore();
    (failingStore.repository as { saveWithEvents: unknown }).saveWithEvents = () =>
      Promise.resolve(err('invite-token-repo-unavailable'));
    const { issue, outbox } = makeCtx({ inviteStore: failingStore });
    const r = await issue(CMD);
    assert.equal(r.ok, false);
    assert.equal(outbox.all().length, 0);
  });

  it('CA2 — o invite-token e persistido (lookup por hash funciona)', async () => {
    const { issue, inviteStore } = makeCtx();
    await issue(CMD);
    const found = await inviteStore.repository.findByTokenHash('hash-1');
    assert.equal(found.ok, true);
    if (found.ok) assert.notEqual(found.value, null);
  });
});
