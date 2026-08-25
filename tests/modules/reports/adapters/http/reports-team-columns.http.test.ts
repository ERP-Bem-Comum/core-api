/**
 * W0 RED — REPORTS-TEAM-DEMOGRAPHIC-COLUMNS. Borda GET /api/v2/reports/team ganha as 3 colunas
 * demograficas que a tabela "Equipe ABC" exibe e hoje mostram "-" em todas as linhas:
 * `genderIdentity`, `race` e `age`.
 *
 * RED esperado: o `teamMemberSchema` (reports/adapters/http/schemas.ts) declara 10 campos; o
 * serializer da resposta descarta o que nao esta no schema. Logo os 3 campos novos somem do
 * payload mesmo com o port devolvendo-os.
 *
 * CA1: payload traz genderIdentity, race e age por colaborador.
 * CA3: `dateOfBirth` NAO aparece (so `age`) e nenhuma data de nascimento vaza no corpo cru.
 * CA4: nulos preservados (nunca string vazia, nunca valor inventado).
 * CA5: RBAC inalterado - segue sob `collaborator:read`.
 * CA6: regressao zero - os 10 campos atuais seguem identicos.
 *
 * Nao cobre o CALCULO da idade (isso e do mapper puro, ver
 * tests/modules/partners/public-api/collaborator-team-projection.test.ts): aqui a idade ja chega
 * calculada pelo port.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler, LightMyRequestResponse } from 'fastify';

import { ok } from '#src/shared/primitives/result.ts';
import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import { buildReportsHttpDeps, reportsHttpPlugin } from '#src/modules/reports/public-api/http.ts';
import type { TeamMember } from '#src/modules/reports/application/ports/team-report-read.ts';

const READER = 'collaborator:read';
const NO_PERM = 'reconciliation:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';

/** Data de nascimento da fixture — usada so no ASSERT do CA3 (nao deve vazar no payload). */
const BIRTH_DATE_ISO = '1985-03-12';

/**
 * Shape-alvo deste ticket. Declarado local para o teste compilar ANTES do W1 estender
 * `TeamMember`; o W1 deve mover estes 3 campos para o proprio `TeamMember` e este alias vira
 * `TeamMember` puro.
 */
type TeamMemberWithDemographics = TeamMember &
  Readonly<{
    genderIdentity: string | null;
    race: string | null;
    age: number | null;
  }>;

/** Os 10 campos do contrato atual (#238) — congelados pelo CA6. */
const CURRENT_TEN_KEYS = [
  'id',
  'name',
  'program',
  'role',
  'employmentRelationship',
  'startOfContract',
  'registrationStatus',
  'active',
  'education',
  'experienceInPublicSector',
] as const;

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

const member = (over: Partial<TeamMemberWithDemographics> = {}): TeamMemberWithDemographics => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Maria Silva',
  program: null,
  role: 'Coordenadora',
  employmentRelationship: 'CLT',
  startOfContract: '2025-01-15',
  registrationStatus: 'Complete',
  active: true,
  education: 'ENSINO_SUPERIOR',
  experienceInPublicSector: true,
  genderIdentity: 'MULHER_CIS',
  race: 'PARDO',
  age: 41,
  ...over,
});

/** Colaborador em pre-cadastro: sem raca, sem genero, sem data de nascimento. */
const memberWithoutDemographics = (): TeamMemberWithDemographics =>
  member({
    id: '22222222-2222-4222-8222-222222222222',
    name: 'João Souza',
    registrationStatus: 'PreRegistration',
    education: null,
    experienceInPublicSector: null,
    genderIdentity: null,
    race: null,
    age: null,
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
    listTeam: () => Promise.resolve(ok([member(), memberWithoutDemographics()])),
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

const get = (perm: string): Promise<LightMyRequestResponse> =>
  handle.app.inject({
    method: 'GET',
    url: '/api/v2/reports/team',
    headers: { authorization: `Bearer ${perm}` },
  });

const rows = async (): Promise<Record<string, unknown>[]> => {
  const res = await get(READER);
  assert.equal(res.statusCode, 200, res.body);
  return (res.json() as { team: Record<string, unknown>[] }).team;
};

describe('reports/http — GET /reports/team: colunas demográficas (REPORTS-TEAM-DEMOGRAPHIC-COLUMNS)', () => {
  it('CA1: cada colaborador traz genderIdentity, race e age', async () => {
    // Arrange
    const team = await rows();

    // Act
    const first = team[0]!;

    // Assert
    assert.equal(Object.hasOwn(first, 'genderIdentity'), true, 'falta a chave genderIdentity');
    assert.equal(Object.hasOwn(first, 'race'), true, 'falta a chave race');
    assert.equal(Object.hasOwn(first, 'age'), true, 'falta a chave age');
    assert.equal(first['genderIdentity'], 'MULHER_CIS');
    assert.equal(first['race'], 'PARDO');
    assert.equal(first['age'], 41);
  });

  it('CA1: age atravessa a borda como number (não string)', async () => {
    // Arrange
    const team = await rows();

    // Act
    const age = team[0]!['age'];

    // Assert
    assert.equal(typeof age, 'number', 'a coluna Idade espera número, não string');
  });

  it('CA3: dateOfBirth NÃO aparece no payload — só age', async () => {
    // Arrange
    const team = await rows();

    // Act
    const keys = Object.keys(team[0]!);

    // Assert
    assert.equal(keys.includes('dateOfBirth'), false, 'dateOfBirth não pode cruzar a borda');
    assert.equal(keys.includes('birthDate'), false, 'nenhum alias de data de nascimento');
    assert.equal(keys.includes('age'), true, 'a idade é o substituto da data de nascimento');
  });

  it('CA3: nenhuma data de nascimento vaza no corpo cru da resposta', async () => {
    // Arrange
    const res = await get(READER);
    const raw = res.body;

    // Act
    const birthYear = BIRTH_DATE_ISO.slice(0, 4);

    // Assert
    assert.equal(raw.includes(BIRTH_DATE_ISO), false, `vazou data de nascimento: ${raw}`);
    assert.equal(raw.includes(birthYear), false, `vazou ano de nascimento: ${raw}`);
    assert.equal(raw.toLowerCase().includes('birth'), false, 'nenhum campo com "birth" no payload');
  });

  it('CA4: sem race/genderIdentity/age → null (nunca string vazia nem valor inventado)', async () => {
    // Arrange
    const team = await rows();

    // Act
    const second = team[1]!;

    // Assert
    assert.equal(second['genderIdentity'], null, 'genderIdentity ausente deve ser null');
    assert.equal(second['race'], null, 'race ausente deve ser null');
    assert.equal(second['age'], null, 'age sem data de nascimento deve ser null');
  });

  it('CA5: RBAC inalterado — sem collaborator:read → 403', async () => {
    // Arrange + Act
    const res = await get(NO_PERM);

    // Assert
    assert.equal(res.statusCode, 403, res.body);
  });

  it('CA5: RBAC inalterado — com collaborator:read → 200 (nenhuma permissão nova)', async () => {
    // Arrange + Act
    const res = await get(READER);

    // Assert
    assert.equal(res.statusCode, 200, res.body);
  });

  it('CA6: regressão zero — os 10 campos atuais seguem idênticos', async () => {
    // Arrange
    const team = await rows();

    // Act
    const first = team[0]!;

    // Assert
    for (const key of CURRENT_TEN_KEYS) {
      assert.equal(Object.hasOwn(first, key), true, `campo do contrato #238 sumiu: ${key}`);
    }
    assert.equal(first['id'], '11111111-1111-4111-8111-111111111111');
    assert.equal(first['name'], 'Maria Silva');
    assert.equal(first['program'], null);
    assert.equal(first['role'], 'Coordenadora');
    assert.equal(first['employmentRelationship'], 'CLT');
    assert.equal(first['startOfContract'], '2025-01-15');
    assert.equal(first['registrationStatus'], 'Complete');
    assert.equal(first['active'], true);
    assert.equal(first['education'], 'ENSINO_SUPERIOR');
    assert.equal(first['experienceInPublicSector'], true);
  });

  it('CA6: o payload tem EXATAMENTE 13 campos (10 atuais + 3 novos)', async () => {
    // Arrange
    const team = await rows();

    // Act
    const keys = [...Object.keys(team[0]!)].sort();

    // Assert
    assert.deepEqual(keys, [...CURRENT_TEN_KEYS, 'genderIdentity', 'race', 'age'].sort());
  });
});
