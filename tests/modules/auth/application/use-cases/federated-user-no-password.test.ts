/**
 * W0 (RED) - usuario federado (passwordHash null) nao autentica por senha local.
 * Ticket: AUTH-USER-PASSWORD-OPTIONAL.
 *
 * Correcao (Opcao A): UserCore.passwordHash: PasswordHash | null. Um user OIDC tem passwordHash=null
 * e NUNCA autentica por senha. Para nao vazar quais contas sao federadas (timing side-channel, OWASP
 * WSTG-ATHN — mesma familia do BE-REC-002 ja existente), o ramo passwordHash===null roda o DUMMY verify
 * antes de responder err('invalid-credentials'), espelhando o ramo "usuario inexistente"
 * (authenticate-user.ts:92-97).
 *
 * DEVE FALHAR em W0:
 *   - CA3: hoje o user federado nem hidrataria (mapper); aqui injetamos direto no store, e o use case
 *     NAO tem o guard null -> faz verify(password, null) -> comportamento indefinido / nao equaliza
 *     deterministicamente o ramo de erro generico. O assert sobre verifyCalls + erro generico falha.
 *   - CA4: changePassword nao trata passwordHash null antes do verify.
 *
 * ASCII puro.
 *
 * NOTA SOBRE O CAST: hoje UserCore.passwordHash e PasswordHash (nao-null), entao montar um user
 * federado exige `passwordHash: null as ...`. Apos a Opcao A (W1) o cast desaparece e o `| null` passa
 * a ser de primeira classe. Em tests/** o ESLint relaxa as regras de cast (ver .claude/rules/testing.md).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { authenticateUser } from '#src/modules/auth/application/use-cases/authenticate-user.ts';
import { changePassword } from '#src/modules/auth/application/use-cases/change-password.ts';
import { makeInMemoryUserStore } from '#src/modules/auth/adapters/persistence/repos/user-repository.in-memory.ts';
import { makeInMemoryRefreshTokenStore } from '#src/modules/auth/adapters/persistence/repos/refresh-token-repository.in-memory.ts';
import { makeFakePasswordHasher } from '#src/modules/auth/adapters/crypto/password-hasher.fake.ts';
import { makeFakeTokenIssuer } from '#src/modules/auth/adapters/crypto/token-issuer.fake.ts';
import { makeFakeRefreshTokenMinter } from '#src/modules/auth/adapters/crypto/refresh-token-minter.fake.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { DUMMY_PASSWORD_HASH } from '../../_support/dummy-password-hash.ts';
import { makeInMemoryLoginLockoutStore, TEST_LOCKOUT_POLICY } from '../../_support/lockout.ts';

import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import type { PasswordHasher } from '#src/modules/auth/application/ports/password-hasher.ts';
import type { ActiveUser } from '#src/modules/auth/domain/identity/user/types.ts';
import type { PasswordHash } from '#src/modules/auth/domain/credential/password-hash.ts';

const AT = new Date('2026-05-27T12:00:00.000Z');
const FEDERATED_EMAIL = 'federated@example.com';
const SOME_PASSWORD = 'super-secret-123';
const REFRESH_TTL = 2_592_000;

// Constroi um ActiveUser federado (sem credencial local). Cast localizado: hoje passwordHash e
// nao-null; apos a Opcao A o `null` e de primeira classe e o cast some.
const makeFederatedUser = (): ActiveUser => {
  const emailR = Email.parse(FEDERATED_EMAIL);
  if (!emailR.ok) throw new Error('fixture: email invalido');
  return {
    id: UserId.generate(),
    email: emailR.value,
    passwordHash: null as unknown as PasswordHash,
    roles: [],
    status: 'active',
  };
};

describe('usuario federado (passwordHash null) — AUTH-USER-PASSWORD-OPTIONAL', () => {
  // CA3 (anti-timing): login de user federado -> err generico + dummy verify chamado 1x.
  it('CA3: authenticateUser com passwordHash null -> invalid-credentials E dummy verify chamado 1x', async () => {
    const store = makeInMemoryUserStore();
    const refreshStore = makeInMemoryRefreshTokenStore();
    const base = makeFakePasswordHasher();
    let verifyCalls = 0;
    const spyHasher: PasswordHasher = {
      hash: base.hash,
      verify: (plain, hash) => {
        verifyCalls += 1;
        return base.verify(plain, hash);
      },
    };

    const federated = makeFederatedUser();
    const savedFixture = await store.repository.save(federated);
    assert.equal(savedFixture.ok, true, 'fixture: save do user federado falhou');

    const authenticate = authenticateUser({
      userReader: store.reader,
      passwordHasher: spyHasher,
      tokenIssuer: makeFakeTokenIssuer(),
      refreshTokenMinter: makeFakeRefreshTokenMinter(),
      refreshTokenRepo: refreshStore.repository,
      clock: ClockFixed(AT),
      refreshTtlSeconds: REFRESH_TTL,
      dummyPasswordHash: DUMMY_PASSWORD_HASH,
      lockoutStore: makeInMemoryLoginLockoutStore(),
      lockoutPolicy: TEST_LOCKOUT_POLICY,
    });

    const r = await authenticate({ email: FEDERATED_EMAIL, password: SOME_PASSWORD });

    assert.equal(r.ok, false, 'user federado nunca autentica por senha local');
    if (!r.ok)
      assert.equal(r.error, 'invalid-credentials', 'erro deve ser generico (anti-enumeration)');
    // Prova da equalizacao de timing: o verify roda exatamente 1x (contra o dummy hash), igual ao
    // ramo "usuario inexistente". Sem o guard + dummy verify este assert falha.
    assert.equal(verifyCalls, 1, 'dummy verify deve rodar exatamente 1x (equaliza timing)');
  });

  // CA4: changePassword de user sem credencial local -> erro adequado (nao verifica null, nao crasha).
  it('CA4: changePassword com passwordHash null -> invalid-credentials (sem verificar null)', async () => {
    const store = makeInMemoryUserStore();
    const refreshStore = makeInMemoryRefreshTokenStore();
    const passwordHasher = makeFakePasswordHasher();

    const federated = makeFederatedUser();
    const savedFixture = await store.repository.save(federated);
    assert.equal(savedFixture.ok, true, 'fixture: save do user federado falhou');

    const change = changePassword({
      userReader: store.reader,
      userRepo: store.repository,
      passwordHasher,
      refreshTokenRepo: refreshStore.repository,
      clock: ClockFixed(AT),
    });

    const r = await change({
      userId: federated.id,
      currentPassword: SOME_PASSWORD,
      newPassword: 'brand-new-pass-456',
    });

    // W0: hoje o use case faz verify(currentPassword, null) e CRASHA antes de retornar Result
    // (ERR_INVALID_ARG_TYPE) — prova da ausencia do guard null. Em W1, deve retornar um erro
    // generico ('invalid-credentials') sem inspecionar/verificar o hash null.
    //
    // Nao asserto o literal exato do erro aqui para nao acoplar o teste a uma API futura
    // ('user-has-no-local-credential' so passa a existir em W1): basta que o use case devolva
    // um Result de erro em vez de crashar. A semantica fina do erro e fixada em W1.
    assert.equal(r.ok, false, 'user sem credencial local nao troca senha via re-autenticacao');
  });
});
