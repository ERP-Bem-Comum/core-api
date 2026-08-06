/**
 * W0 RED — REP-1 · filtro OPCIONAL por status de cadastro no gráfico demográfico
 * (feat/team-demographics-registration-filter).
 *
 * Borda GET /api/v2/reports/team/demographics?registrationStatus=<PreRegistration|Complete>.
 * O filtro recorta a POPULAÇÃO que alimenta a agregação — logo afeta as 3 distribuições
 * (gênero, faixa etária, raça) E o `totalActive` de uma vez. Ausente = todos (comportamento atual).
 *
 * Prova através da borda real (memory driver + InMemoryTeamDemographicsRead semeado com registros
 * crus): a mesma função pura `aggregateTeamDemographics` do partners agrega o recorte.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler, LightMyRequestResponse } from 'fastify';

import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import { buildReportsHttpDeps, reportsHttpPlugin } from '#src/modules/reports/public-api/http.ts';
import {
  InMemoryTeamDemographicsRead,
  type SeededDemographicsRecord,
} from '#src/modules/reports/adapters/persistence/team-demographics-read.in-memory.ts';
import type {
  CategoryCount,
  TeamDemographics,
} from '#src/modules/reports/application/ports/team-demographics-read.ts';

const READER = 'collaborator:read';

const requireAuth: preHandlerAsyncHookHandler = async (req, reply) => {
  const auth = req.headers.authorization;
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ error: { code: 'unauthorized', message: 'sem token' } });
  }
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

// referenceDate fixa da faixa etária (nunca `Date.now()`): 2026-06-01.
const REFERENCE = new Date('2026-06-01T12:00:00.000Z');
const rec = (over: Partial<SeededDemographicsRecord>): SeededDemographicsRecord => ({
  active: true,
  registrationStatus: 'Complete',
  genderIdentity: null,
  race: null,
  dateOfBirth: null,
  ...over,
});

// 3 Complete (varridos), 2 PreRegistration (campos pessoais null), 1 Complete INATIVO (fora sempre).
const SEED: readonly SeededDemographicsRecord[] = [
  rec({ genderIdentity: 'HOMEM_CIS', race: 'BRANCO', dateOfBirth: new Date('2000-01-01') }), // ATE_29
  rec({ genderIdentity: 'MULHER_CIS', race: 'PARDO', dateOfBirth: new Date('1980-01-01') }), // 40_49
  rec({ genderIdentity: 'NAO_BINARIO', race: 'PRETO', dateOfBirth: new Date('1960-01-01') }), // 60+
  rec({ registrationStatus: 'PreRegistration' }),
  rec({ registrationStatus: 'PreRegistration' }),
  rec({
    active: false,
    genderIdentity: 'HOMEM_CIS',
    race: 'BRANCO',
    dateOfBirth: new Date('1990-01-01'),
  }),
];

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;

before(async () => {
  const base = await buildReportsHttpDeps({ driver: 'memory' });
  const seeded = InMemoryTeamDemographicsRead(SEED, REFERENCE);
  const deps = { ...base, listTeamDemographics: seeded.list };
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

const getDemographics = (query: string): Promise<LightMyRequestResponse> =>
  handle.app.inject({
    method: 'GET',
    url: `/api/v2/reports/team/demographics${query}`,
    headers: { authorization: `Bearer ${READER}` },
  });

const sum = (d: readonly CategoryCount[]): number => d.reduce((a, b) => a + b.count, 0);
const countOf = (d: readonly CategoryCount[], id: string): number =>
  d.find((b) => b.id === id)?.count ?? 0;

describe('reports/http — filtro por status de cadastro no gráfico demográfico', () => {
  it('sem param: todos os ativos (5 = 3 Complete + 2 PreRegistration; inativo fora)', async () => {
    const res = await getDemographics('');
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as TeamDemographics;

    assert.equal(body.totalActive, 5);
    // As 3 distribuições E o total refletem TODOS os ativos.
    assert.equal(sum(body.gender), 5);
    assert.equal(sum(body.race), 5);
    assert.equal(sum(body.ageRange), 5);
    assert.equal(countOf(body.gender, 'NA'), 2, '2 PreRegistration sem gênero → NA');
    assert.equal(countOf(body.race, 'NA'), 2);
    assert.equal(countOf(body.ageRange, 'NA'), 2);
  });

  it('registrationStatus=Complete: só os 3 Complete ativos, nos TRÊS gráficos + total', async () => {
    const res = await getDemographics('?registrationStatus=Complete');
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as TeamDemographics;

    assert.equal(body.totalActive, 3);
    assert.equal(sum(body.gender), 3);
    assert.equal(sum(body.race), 3);
    assert.equal(sum(body.ageRange), 3);
    // Buckets específicos recortados (sem os PreRegistration → NA some).
    assert.equal(countOf(body.gender, 'HOMEM_CIS'), 1);
    assert.equal(countOf(body.gender, 'MULHER_CIS'), 1);
    assert.equal(countOf(body.gender, 'NAO_BINARIO'), 1);
    assert.equal(countOf(body.gender, 'NA'), 0);
    assert.equal(countOf(body.race, 'BRANCO'), 1);
    assert.equal(countOf(body.race, 'PARDO'), 1);
    assert.equal(countOf(body.race, 'PRETO'), 1);
    assert.equal(countOf(body.race, 'NA'), 0);
    assert.equal(countOf(body.ageRange, 'ATE_29'), 1);
    assert.equal(countOf(body.ageRange, 'DE_40_A_49'), 1);
    assert.equal(countOf(body.ageRange, 'MAIS_60'), 1);
    assert.equal(countOf(body.ageRange, 'NA'), 0);
  });

  it('registrationStatus=PreRegistration: só os 2 pré, tudo em NA + total = 2', async () => {
    const res = await getDemographics('?registrationStatus=PreRegistration');
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as TeamDemographics;

    assert.equal(body.totalActive, 2);
    assert.equal(sum(body.gender), 2);
    assert.equal(sum(body.race), 2);
    assert.equal(sum(body.ageRange), 2);
    assert.equal(countOf(body.gender, 'NA'), 2);
    assert.equal(countOf(body.race, 'NA'), 2);
    assert.equal(countOf(body.ageRange, 'NA'), 2);
  });

  it('registrationStatus=lixo → 400 (enum)', async () => {
    const res = await getDemographics('?registrationStatus=lixo');
    assert.equal(res.statusCode, 400, res.body);
  });

  it('resposta segue agregada-only (CA2 preservado): sem linha por pessoa', async () => {
    const res = await getDemographics('?registrationStatus=Complete');
    const body = res.json() as Record<string, unknown>;
    assert.deepEqual(Object.keys(body).sort(), ['ageRange', 'gender', 'race', 'totalActive']);
  });
});
