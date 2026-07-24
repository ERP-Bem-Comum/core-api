/**
 * W0 RED - REPORTS-TEAM-DEMOGRAPHICS (REP-1 . Equipe ABC . graficos demograficos).
 *
 * Borda GET /api/v2/reports/team/demographics - as 3 distribuicoes (genero, faixa etaria,
 * raca/cor) como CONTAGEM agregada. RED por inexistencia do port/rota/permissao.
 *
 * CA1 200 com as 3 distribuicoes em `CategoryCount[]`.
 * CA2 nenhum campo por pessoa no payload.
 * CA7 RBAC: gate = `collaborator:read`, o MESMO da tabela (REPORTS-DEMOGRAPHICS-GATE-ALIGN,
 *     P.O. 2026-07-20). Sem permissao -> 403. Permissoes sao planas: `read-sensitive` sozinho
 *     tambem da 403. (Modo `bypass` libera tudo - ADR-0053 rejeitado, sem carve-out.)
 * CA9 regressao zero: GET /api/v2/reports/team (#238) inalterado.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler, LightMyRequestResponse } from 'fastify';

import { ok } from '#src/shared/primitives/result.ts';
import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import { buildReportsHttpDeps, reportsHttpPlugin } from '#src/modules/reports/public-api/http.ts';
import type { TeamMember } from '#src/modules/reports/application/ports/team-report-read.ts';
import type {
  CategoryCount,
  TeamDemographics,
} from '#src/modules/reports/application/ports/team-demographics-read.ts';
import { COLLABORATOR_PERMISSION } from '#src/modules/partners/public-api/permissions.ts';
import * as PermissionCatalog from '#src/modules/auth/domain/authorization/permission-catalog.ts';

const SENSITIVE = 'collaborator:read-sensitive';
const READER = 'collaborator:read';
const NO_PERM = 'reconciliation:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';

const requireAuth: preHandlerAsyncHookHandler = async (req, reply) => {
  const auth = req.headers.authorization;
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ error: { code: 'unauthorized', message: 'sem token' } });
  }
  (req as unknown as { userId: string }).userId = TEST_USER_ID;
  return undefined;
};
const authorize =
  (permission: string): preHandlerAsyncHookHandler =>
  async (req, reply) => {
    const perms = (req.headers.authorization ?? '').replace('Bearer ', '').split(',');
    if (!perms.includes(permission)) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'sem permissão' } });
    }
    return undefined;
  };

const bucket = (id: string, label: string, count: number): CategoryCount => ({ id, label, count });

// Fixture do read port: ja agregada (o backend agrega - Opcao A). 21 ativos nas 3 dimensoes.
const DEMOGRAPHICS: TeamDemographics = {
  totalActive: 21,
  gender: [
    bucket('PREFIRO_NAO_RESPONDER', 'Prefiro não responder', 0),
    bucket('HOMEM_CIS', 'Homem cis', 5),
    bucket('HOMEM_TRANS', 'Homem trans', 0),
    bucket('MULHER_CIS', 'Mulher cis', 6),
    bucket('MULHER_TRANS', 'Mulher trans', 0),
    bucket('TRAVESTI', 'Travesti', 0),
    bucket('NAO_BINARIO', 'Não binário', 5),
    bucket('OUTRO', 'Outro', 0),
    bucket('NA', 'N/A', 5),
  ],
  ageRange: [
    bucket('ATE_29', 'Até 29', 6),
    bucket('DE_30_A_39', '30 a 39', 5),
    bucket('DE_40_A_49', '40 a 49', 0),
    bucket('DE_50_A_59', '50 a 59', 0),
    bucket('MAIS_60', '60+', 5),
    bucket('NA', 'N/A', 5),
  ],
  race: [
    bucket('AMARELO', 'Amarelo', 0),
    bucket('BRANCO', 'Branco', 6),
    bucket('PARDO', 'Pardo', 5),
    bucket('INDIGENA', 'Indígena', 0),
    bucket('PRETO', 'Preto', 5),
    bucket('PREFIRO_NAO_RESPONDER', 'Prefiro não responder', 0),
    bucket('NA', 'N/A', 5),
  ],
};

const member = (over: Partial<TeamMember> = {}): TeamMember => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Maria Silva',
  program: null,
  role: 'Coordenadora',
  employmentRelationship: 'CLT',
  startOfContract: '2025-01-15',
  registrationStatus: 'Complete',
  active: true,
  education: 'Superior completo',
  experienceInPublicSector: true,
  // 3 colunas demográficas (REPORTS-TEAM-DEMOGRAPHIC-COLUMNS) — entraram no contrato de
  // `TeamMember` depois deste ticket; a fixture as declara para seguir espelhando o port.
  genderIdentity: 'MULHER_CIS',
  race: 'PARDO',
  age: 41,
  ...over,
});

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;

before(async () => {
  const base = await buildReportsHttpDeps({ driver: 'memory' });
  const deps = {
    ...base,
    listTeam: () => Promise.resolve(ok([member()])),
    listTeamDemographics: () => Promise.resolve(ok(DEMOGRAPHICS)),
  };
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [reportsHttpPlugin(deps, { requireAuth, authorize })],
  });
  handle = { app, teardown: () => app.close() };
});

after(async () => {
  await handle.teardown();
});

const get = (url: string, perms: string): Promise<LightMyRequestResponse> =>
  handle.app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${perms}` } });

const getDemographics = (perms: string): Promise<LightMyRequestResponse> =>
  get('/api/v2/reports/team/demographics', perms);

describe('reports/http - GET /reports/team/demographics (REP-1 . demograficos)', () => {
  it('CA1: 200 com as 3 distribuicoes como CategoryCount[]', async () => {
    const res = await getDemographics(READER);
    assert.equal(res.statusCode, 200, res.body);

    const body = res.json() as TeamDemographics;
    assert.equal(body.totalActive, 21);
    assert.equal(body.gender.length, 9, '8 categorias de genero + N/A');
    assert.equal(body.race.length, 7, '6 categorias de raca + N/A');
    assert.equal(body.ageRange.length, 6, '6 faixas etarias (N/A inclusa)');

    for (const dimension of [body.gender, body.race, body.ageRange]) {
      for (const item of dimension) {
        assert.equal(typeof item.id, 'string');
        assert.ok(item.label.length > 0, `bucket sem label: ${item.id}`);
        assert.equal(Number.isInteger(item.count), true);
      }
    }
  });

  it('CA1/CA4: INDIGENA atravessa a fronteira e a soma bate com o total de ativos', async () => {
    const res = await getDemographics(READER);
    const body = res.json() as TeamDemographics;

    assert.ok(
      body.race.some((b) => b.id === 'INDIGENA'),
      'INDIGENA nao pode sumir (defeito do front que o backend passa a impedir)',
    );
    const sum = (d: readonly CategoryCount[]): number => d.reduce((a, b) => a + b.count, 0);
    assert.equal(sum(body.gender), body.totalActive);
    assert.equal(sum(body.race), body.totalActive);
    assert.equal(sum(body.ageRange), body.totalActive);
  });

  it('CA2: nenhum campo por pessoa no payload', async () => {
    const res = await getDemographics(READER);
    const body = res.json() as Record<string, unknown>;

    assert.deepEqual(Object.keys(body).sort(), ['ageRange', 'gender', 'race', 'totalActive']);
    for (const key of ['team', 'members', 'collaborators', 'rows']) {
      assert.equal(key in body, false, `payload nao pode trazer linha por pessoa: ${key}`);
    }
    for (const dimension of [body['gender'], body['race'], body['ageRange']] as CategoryCount[][]) {
      for (const item of dimension) {
        assert.deepEqual(Object.keys(item).sort(), ['count', 'id', 'label']);
      }
    }

    const raw = res.body;
    for (const leak of ['dateOfBirth', 'birth', 'genderIdentity', 'idade', 'cpf', 'nome']) {
      assert.equal(raw.includes(leak), false, `vazou dado sensivel por pessoa: ${leak}`);
    }
    assert.equal(/\d{4}-\d{2}-\d{2}/.test(raw), false, 'nenhuma data pode atravessar a fronteira');
  });

  it('CA7: sem permissao nenhuma -> 403', async () => {
    const res = await getDemographics(NO_PERM);
    assert.equal(res.statusCode, 403, res.body);
  });

  // REPORTS-DEMOGRAPHICS-GATE-ALIGN (P.O. 2026-07-20): o gate desceu para `collaborator:read`, o
  // MESMO da tabela. Motivo: `GET /reports/team` mostra raca/genero POR PESSOA, com nome, sob
  // `read`; trancar o agregado (que nao identifica ninguem) atras de uma permissao mais restritiva
  // nao protegia nada e deixava os graficos vazios em todo ambiente. A segregacao volta no
  // redesenho do RBAC, para os DOIS endpoints juntos.
  it('CA7: collaborator:read abre o relatorio demografico -> 200 (mesmo gate da tabela)', async () => {
    const res = await getDemographics(READER);
    assert.equal(res.statusCode, 200, res.body);
  });

  // Permissoes sao PLANAS, nao hierarquicas: `read-sensitive` NAO implica `read`. Quem so tem a
  // sensivel nao entra — e na pratica ninguem esta nesse estado (quem ve o relatorio tem `read`,
  // que a tabela exige). Documentado para ninguem assumir hierarquia que nao existe.
  it('CA7: read-sensitive SOZINHO nao abre — o gate e read, e permissao nao e hierarquica', async () => {
    const res = await getDemographics(SENSITIVE);
    assert.equal(res.statusCode, 403, res.body);
  });

  it('CA7: a permissao existe no catalogo do partners e no catalogo RBAC do auth', () => {
    assert.equal(COLLABORATOR_PERMISSION.readSensitive, SENSITIVE);
    assert.ok(
      PermissionCatalog.all.some((p) => String(p) === SENSITIVE),
      'collaborator:read-sensitive precisa estar no catalogo deploy-time do auth',
    );
  });
});

describe('reports/http - CA9 regressao zero em GET /reports/team (#238)', () => {
  // O contrato desta rota passou de 10 para 13 campos no REPORTS-TEAM-DEMOGRAPHIC-COLUMNS
  // (decisao da P.O. 2026-07-20: a tabela "Equipe ABC" exibe Idade/Identidade de genero/Raca-cor
  // e mostrava "-" por falta de contrato). A lista abaixo acompanha essa mudanca; o que o CA9
  // guarda segue sendo o mesmo: os 10 campos do #238 continuam la, sob a MESMA permissao.
  it('CA9: a projecao do #238 segue inalterada sob collaborator:read (agora com as 3 colunas)', async () => {
    const res = await get('/api/v2/reports/team', READER);
    assert.equal(res.statusCode, 200, res.body);

    const body = res.json() as { team: TeamMember[] };
    assert.equal(body.team.length, 1);
    assert.deepEqual(Object.keys(body.team[0]!).sort(), [
      'active',
      'age',
      'education',
      'employmentRelationship',
      'experienceInPublicSector',
      'genderIdentity',
      'id',
      'name',
      'program',
      'race',
      'registrationStatus',
      'role',
      'startOfContract',
    ]);
  });

  it('CA9: /reports/team NAO passa a exigir a permissao nova', async () => {
    const res = await get('/api/v2/reports/team', READER);
    assert.equal(res.statusCode, 200, res.body);
  });
});
