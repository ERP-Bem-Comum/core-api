/**
 * W0 (RED) - mapper userFromRows com password_hash NULL (OIDC-ready).
 * Ticket: AUTH-USER-PASSWORD-OPTIONAL.
 *
 * BUG latente: a coluna auth_user.password_hash e nullable (schemas/mysql.ts:106), mas o mapper
 * de leitura faz `userRow.passwordHash ?? ''` -> PasswordHash.fromString('') -> err('password-hash-empty').
 * Logo, todo user federado (password_hash=NULL) FALHA ao hidratar.
 *
 * Correcao (Opcao A): UserCore.passwordHash: PasswordHash | null. NULL no banco -> passwordHash: null
 * no agregado (sem `?? ''`, sem fromString quando null).
 *
 * DEVE FALHAR em W0 (hoje userFromRows retorna err para password_hash=null). ASCII puro.
 *
 * Nota: este e um teste UNITARIO do mapper (constroi UserRow literal, sem DB). Roda em `pnpm test`
 * puro — nao e gated por MYSQL_INTEGRATION.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { userFromRows } from '#src/modules/auth/adapters/persistence/mappers/user.mapper.ts';
import type { UserRow } from '#src/modules/auth/adapters/persistence/schemas/mysql.ts';

const NOW = new Date('2026-05-27T12:00:00.000Z');

// UserRow valido (auth_user) — Q1 do blueprint. password_hash sobrescrito por cenario.
const baseRow = (over: Partial<UserRow> = {}): UserRow => ({
  id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  email: 'federated@example.com',
  passwordHash: '$argon2id$v=19$m=65536$local-hash',
  status: 'active',
  disabledAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  legacyId: null,
  ...over,
});

describe('userFromRows (AUTH-USER-PASSWORD-OPTIONAL)', () => {
  // CA1: usuario federado (password_hash NULL) deve hidratar com passwordHash: null.
  it('CA1: password_hash NULL -> hidrata com passwordHash: null e status active', () => {
    const r = userFromRows(baseRow({ passwordHash: null }), [], []);

    assert.equal(r.ok, true, `esperava ok=true; hoje falha com ${!r.ok ? r.error.tag : ''}`);
    if (!r.ok) return;
    assert.equal(r.value.passwordHash, null, 'user federado deve ter passwordHash null');
    assert.equal(r.value.status, 'active');
    assert.equal(r.value.email as unknown as string, 'federated@example.com');
  });

  // CA2 (regressao): hash nao-vazio continua reidratando o branded PasswordHash.
  it('CA2 (regressao): password_hash nao-vazio -> reidrata PasswordHash brandado', () => {
    const r = userFromRows(baseRow({ passwordHash: '$argon2id$v=19$m=65536$local-hash' }), [], []);

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.passwordHash !== null, true, 'hash nao-vazio nao pode virar null');
    assert.equal(
      r.value.passwordHash as unknown as string,
      '$argon2id$v=19$m=65536$local-hash',
      'hash deve ser preservado byte-a-byte',
    );
  });

  // CA2b (regressao): usuario disabled com hash continua hidratando DisabledUser.
  it('CA2b (regressao): disabled com hash -> DisabledUser com disabledAt', () => {
    const r = userFromRows(baseRow({ status: 'disabled', disabledAt: NOW }), [], []);

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.status, 'disabled');
    if (r.value.status === 'disabled') {
      assert.equal(r.value.disabledAt.getTime(), NOW.getTime());
    }
  });
});
