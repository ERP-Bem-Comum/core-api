/**
 * #126 — Export do histórico no formato legado de 9 colunas: DETALHE (/:id) e LISTA (combinado).
 *
 * A identidade (nome/email/cpf/programa/inicio_contrato) vem do read-model (reader), que em prod
 * single-node reflete o writer. No driver memory o reader é seed-only → seedamos os colaboradores
 * e injetamos o histórico via override de `listCollaboratorHistory` (a captura PUT→diff é coberta
 * pelo teste de domínio `collaborator-history.test.ts`).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/index.ts';
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
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import type { CollaboratorReadRecord } from '#src/modules/partners/application/ports/collaborator-reader.ts';
import type { CollaboratorHistoryEntry } from '#src/modules/partners/application/ports/collaborator-history.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const READER = 'rh.hist@example.com';
const NOW = new Date('2026-01-10T08:00:00.000Z');
const CHANGED_AT = new Date('2026-06-18T00:00:00.000Z');

const u = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw new Error(`fixture: ${JSON.stringify(r.error)}`);
  return r.value;
};

const record = (over: {
  id: CollaboratorId.CollaboratorId;
  name: string;
  email: string;
  cpf: string;
  occupationArea: string;
  startOfContract: Date;
}): CollaboratorReadRecord => ({
  collaborator: u(
    Collaborator.register({
      id: over.id,
      name: over.name,
      email: over.email,
      cpf: over.cpf,
      occupationArea: over.occupationArea,
      role: 'Coordenador',
      startOfContract: over.startOfContract,
      employmentRelationship: 'CLT',
      registeredAt: NOW,
    }),
  ).collaborator,
  legacyId: null,
  createdAt: NOW,
  updatedAt: NOW,
});

const ID_A = CollaboratorId.generate();
const ID_B = CollaboratorId.generate();

const RECORD_A = record({
  id: ID_A,
  name: 'Cazé TV',
  email: 'leka.devcode@gmail.com',
  cpf: '364.820.461-00',
  occupationArea: 'DCE',
  startOfContract: new Date('2026-06-03T00:00:00.000Z'),
});
const RECORD_B = record({
  id: ID_B,
  name: 'kauan',
  email: 'kauanoliveira@abemcomum.org',
  cpf: '529.982.247-25',
  occupationArea: 'PARC',
  startOfContract: new Date('2026-06-06T00:00:00.000Z'),
});

const entry = (
  collaboratorId: string,
  over: Partial<CollaboratorHistoryEntry>,
): CollaboratorHistoryEntry => ({
  id: `h-${collaboratorId}`,
  collaboratorId,
  eventType: 'CollaboratorEdited',
  fieldName: 'role',
  fieldLabel: 'Cargo',
  valueBefore: 'Diretor',
  valueAfter: 'Diretor Adjunto',
  occurredAt: CHANGED_AT,
  ...over,
});

type DepsOverride = (
  deps: Awaited<ReturnType<typeof buildPartnersHttpDeps>>,
) => Awaited<ReturnType<typeof buildPartnersHttpDeps>>;

const makeApp = async (
  seedCollaborators: readonly CollaboratorReadRecord[],
  override?: DepsOverride,
) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [{ email: READER, password: STRONG, permissions: [COLLABORATOR_PERMISSION.read] }],
    },
  });
  const baseDeps = await buildPartnersHttpDeps({
    driver: 'memory',
    seed: { collaborators: seedCollaborators },
  });
  const partnersDeps = override ? override(baseDeps) : baseDeps;
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
    await baseDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, teardown };
};

const login = async (app: Awaited<ReturnType<typeof buildApp>>): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: READER, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const HEADER =
  'nome;email;cpf;programa;inicio_contrato;tipo_alteracao;historico_antes;historico_depois;data_alteracao';

describe('COLLABORATORS — export de histórico 9 colunas (#126)', () => {
  it('detalhe: GET /:id/export?type=history → 9 colunas com identidade preenchida', async () => {
    const { app, teardown } = await makeApp([RECORD_A], (deps) => ({
      ...deps,
      listCollaboratorHistory: (id: string) =>
        Promise.resolve(ok(id === String(ID_A) ? [entry(String(ID_A), {})] : [])),
    }));
    const token = await login(app);
    const exp = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators/${String(ID_A)}/export?type=history`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(exp.statusCode, 200, exp.body);
    assert.equal(exp.headers['content-type'], 'text/csv; charset=utf-8');
    assert.ok(exp.body.includes(HEADER), `cabeçalho ausente:\n${exp.body}`);
    assert.ok(
      exp.body.includes('Cazé TV;leka.devcode@gmail.com;'),
      `identidade ausente:\n${exp.body}`,
    );
    assert.ok(
      exp.body.includes(';DCE;03/06/2026;Cargo;Diretor;Diretor Adjunto;18/06/2026'),
      `linha de alteração ausente:\n${exp.body}`,
    );
    await teardown();
  });

  it('lista: GET /collaborators/export?type=history → CSV combinado de todos do filtro', async () => {
    const { app, teardown } = await makeApp([RECORD_A, RECORD_B], (deps) => ({
      ...deps,
      listCollaboratorHistory: (id: string) =>
        Promise.resolve(
          ok(
            id === String(ID_A)
              ? [entry(String(ID_A), {})]
              : id === String(ID_B)
                ? [
                    entry(String(ID_B), {
                      fieldLabel: 'Admissão',
                      valueBefore: null,
                      valueAfter: '06/06/2026',
                    }),
                  ]
                : [],
          ),
        ),
    }));
    const token = await login(app);
    const exp = await app.inject({
      method: 'GET',
      url: '/api/v1/collaborators/export?type=history',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(exp.statusCode, 200, exp.body);
    assert.equal(
      exp.headers['content-disposition'],
      'attachment; filename="collaborators-history.csv"',
    );
    assert.ok(
      exp.body.includes('Cazé TV;leka.devcode@gmail.com'),
      `falta colaborador A:\n${exp.body}`,
    );
    assert.ok(
      exp.body.includes('kauan;kauanoliveira@abemcomum.org'),
      `falta colaborador B:\n${exp.body}`,
    );
    await teardown();
  });

  it('CA3: repositório de histórico indisponível → 503', async () => {
    const { app, teardown } = await makeApp([RECORD_A], (deps) => ({
      ...deps,
      listCollaboratorHistory: () => Promise.resolve(err('collaborator-repo-unavailable' as const)),
    }));
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators/${String(ID_A)}/export?type=history`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 503);
    await teardown();
  });
});
