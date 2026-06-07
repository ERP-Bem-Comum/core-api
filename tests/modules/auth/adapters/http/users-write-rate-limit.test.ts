/**
 * HTTP-SEC-HARDENING — W0 (RED). Finding F5: rotas de escrita de users com rate-limit dedicado.
 *
 * DEVE FALHAR em W0: sem `config.rateLimit` por rota, POST /api/v1/users usa so o teto global
 * (200/min) -> 31 requests nao atingem 429. GREEN quando W1 aplicar 30/min nas rotas de escrita.
 * O rate-limit roda em onRequest (antes do preHandler de auth) -> POSTs sem token contam. ASCII puro.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
  usersHttpPlugin,
} from '#src/modules/auth/public-api/http.ts';

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

const WRITE_LIMIT = 30;

describe('HTTP-SEC-HARDENING — F5 rate-limit nas rotas de escrita de users', () => {
  let app: AppHandle;
  let shutdown: () => Promise<void>;

  before(async () => {
    const authDeps = await buildAuthHttpDeps({ driver: 'memory' });
    const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
    app = await buildApp({
      routes: [
        authHttpPlugin(authDeps),
        {
          plugin: usersHttpPlugin(
            {
              listUsers: authDeps.listUsers,
              getUser: authDeps.getUser,
              createUserByAdmin: authDeps.createUserByAdmin,
              updateUserProfile: authDeps.updateUserProfile,
              activateUser: authDeps.activateUser,
              deactivateUser: authDeps.deactivateUser,
              setProfilePhoto: authDeps.setProfilePhoto,
              removeProfilePhoto: authDeps.removeProfilePhoto,
            },
            { requireAuth, authorize: authDeps.authorize },
          ),
          prefix: '/api/v1',
        },
      ],
    });
    shutdown = async () => {
      await app.close();
      await authDeps.shutdown();
    };
  });

  after(async () => {
    await shutdown();
  });

  it('CA5: exceder o limite de escrita em POST /api/v1/users -> 429', async () => {
    const body = { name: 'X', cpf: '52998224725', email: 'x@x.com', telephone: '15997133502' };
    let last = 0;
    // Dispara o limite + 1: as primeiras passam pelo rate-limit (401 sem token), a excedente -> 429.
    for (let i = 0; i < WRITE_LIMIT + 1; i++) {
      const res = await app.inject({ method: 'POST', url: '/api/v1/users', payload: body });
      last = res.statusCode;
    }
    assert.equal(last, 429);
  });
});
