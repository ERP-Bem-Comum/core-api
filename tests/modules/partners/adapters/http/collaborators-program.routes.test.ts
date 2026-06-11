/**
 * 010-partner-contract-counts (R3) — W0 (RED) — vínculo Colaborador↔Programa na borda HTTP.
 *
 * DEVE FALHAR: `createCollaboratorBodySchema`/`updateCollaboratorBodySchema` ainda não aceitam
 * `programId` (Zod faz strip), o detalhe/list item não expõem `programId` e a query de lista não
 * conhece `programIds`. GREEN quando o W1 (T018) adicionar: programId no body (register/edit),
 * no DTO de detalhe/item de lista, e programIds em queryToFilter + collaboratorListQuerySchema.
 *
 * Driver memory: POST cria (writer repo) e GET lê (reader). Para o filtro `programIds`, semeia-se
 * read-records com programId via register({ ..., programId }).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
} from '#src/modules/auth/public-api/http.ts';
import {
  collaboratorsHttpPlugin,
  buildPartnersHttpDeps,
} from '#src/modules/partners/public-api/http.ts';
import { COLLABORATOR_PERMISSION } from '#src/modules/partners/public-api/permissions.ts';
import type { CollaboratorReadRecord } from '#src/modules/partners/application/ports/collaborator-reader.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const RW_EMAIL = 'rh.editor@example.com';
const NOW = new Date('2026-06-01T12:00:00.000Z');

const PROGRAM_A = '11111111-1111-4111-8111-111111111111';
const PROGRAM_B = '22222222-2222-4222-8222-222222222222';

const VALID_BODY = {
  name: 'Maria Silva',
  email: 'maria@bemcomum.org',
  cpf: '11144477735',
  occupationArea: 'PARC',
  role: 'Analista',
  startOfContract: '2026-01-10',
  employmentRelationship: 'CLT',
};

const recordOf = (cpf: string, programId: string | null): CollaboratorReadRecord => {
  const r = Collaborator.register({
    id: CollaboratorId.generate(),
    name: 'Fulano',
    email: `${cpf}@bemcomum.org`,
    cpf,
    occupationArea: 'PARC',
    role: 'Analista',
    startOfContract: new Date('2026-03-01T00:00:00.000Z'),
    employmentRelationship: 'CLT',
    registeredAt: NOW,
    programId,
  });
  assert.ok(r.ok, `register: ${r.ok ? '' : r.error}`);
  return { collaborator: r.value.collaborator, legacyId: null, createdAt: NOW, updatedAt: NOW };
};

const makeApp = async (records: readonly CollaboratorReadRecord[] = []) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: RW_EMAIL,
          password: STRONG,
          permissions: [COLLABORATOR_PERMISSION.read, COLLABORATOR_PERMISSION.write],
        },
      ],
    },
  });
  const partnersDeps = await buildPartnersHttpDeps({
    driver: 'memory',
    seed: { collaborators: records },
  });
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      {
        plugin: collaboratorsHttpPlugin(partnersDeps, {
          requireAuth,
          authorize: authDeps.authorize,
          hasPermission: authDeps.hasPermission,
        }),
        prefix: '/api/v1',
      },
    ],
  });
  const teardown = async (): Promise<void> => {
    await app.close();
    await partnersDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, teardown };
};

const login = async (app: Awaited<ReturnType<typeof buildApp>>): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: RW_EMAIL, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

describe('COLLABORATORS-HTTP-PROGRAM (R3) — programId no cadastro (body) e no detalhe (response)', () => {
  it('CA: POST com programId UUID válido -> 201 (body aceita o vínculo)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...VALID_BODY, programId: PROGRAM_A },
    });
    assert.equal(created.statusCode, 201);
    await teardown();
  });

  it('CA: POST com programId null -> 201 (null aceito = sem vínculo)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...VALID_BODY, programId: null },
    });
    assert.equal(created.statusCode, 201);
    await teardown();
  });

  it('CA: POST com programId fora do formato UUID -> 400 (Zod)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...VALID_BODY, programId: 'nao-uuid' },
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA: detalhe (response) expõe o programId do colaborador vinculado', async () => {
    const record = recordOf('11144477735', PROGRAM_A);
    const { app, teardown } = await makeApp([record]);
    const token = await login(app);
    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators/${String(record.collaborator.id)}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(detail.statusCode, 200);
    assert.equal((detail.json() as Record<string, unknown>)['programId'], PROGRAM_A);
    await teardown();
  });

  it('CA: detalhe de colaborador sem vínculo traz programId null', async () => {
    const record = recordOf('11144477735', null);
    const { app, teardown } = await makeApp([record]);
    const token = await login(app);
    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators/${String(record.collaborator.id)}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal((detail.json() as Record<string, unknown>)['programId'], null);
    await teardown();
  });
});

describe('COLLABORATORS-HTTP-PROGRAM (R3) — item de lista expõe programId', () => {
  it('CA: lista traz programId em cada item', async () => {
    const { app, teardown } = await makeApp([recordOf('11144477735', PROGRAM_A)]);
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/collaborators',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const items = (res.json() as { items: readonly Record<string, unknown>[] }).items;
    assert.equal(items[0]?.['programId'], PROGRAM_A);
    await teardown();
  });
});

describe('COLLABORATORS-HTTP-PROGRAM (R3) — filtro programIds na query', () => {
  const seed = (): readonly CollaboratorReadRecord[] => [
    recordOf('11144477735', PROGRAM_A),
    recordOf('52998224725', PROGRAM_B),
    recordOf('39053344705', null),
  ];

  const totalItems = async (
    app: Awaited<ReturnType<typeof buildApp>>,
    token: string,
    query: string,
  ): Promise<number> => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators${query}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    return (res.json() as { meta: { totalItems: number } }).meta.totalItems;
  };

  it('CA: ?programIds=<A> -> só o vinculado a A (1)', async () => {
    const { app, teardown } = await makeApp(seed());
    const token = await login(app);
    assert.equal(await totalItems(app, token, `?programIds=${PROGRAM_A}`), 1);
    await teardown();
  });

  it('CA: ?programIds=<A>&programIds=<B> -> os dois vinculados (2)', async () => {
    const { app, teardown } = await makeApp(seed());
    const token = await login(app);
    assert.equal(
      await totalItems(app, token, `?programIds=${PROGRAM_A}&programIds=${PROGRAM_B}`),
      2,
    );
    await teardown();
  });

  it('CA: sem filtro -> todos (3, inclusive sem vínculo)', async () => {
    const { app, teardown } = await makeApp(seed());
    const token = await login(app);
    assert.equal(await totalItems(app, token, ''), 3);
    await teardown();
  });
});
