/**
 * CONTRACTS-HTTP-EXPORT-CSV (C4) — W0 (RED) — GET /export.csv com RBAC.
 *
 * DEVE FALHAR: a rota `GET /api/v2/contracts/export.csv` ainda não existe (404) e o serializador
 * `contractsToCsv` não foi escrito. GREEN quando o W1 entregar a rota (reader, `contract:read`) + o CSV
 * RFC 4180 com neutralização de fórmula (D3) e BOM (D5).
 *
 * Driver memory (sem Docker). Token COM `contract:read` via seed RBAC; token SEM permissão via register.
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
  contractsHttpPlugin,
  buildContractsHttpDeps,
} from '#src/modules/contracts/public-api/http.ts';

import { buildContract } from '../persistence/fixtures.ts';
import type { Contract } from '#src/modules/contracts/domain/contract/types.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const READER_EMAIL = 'reader@example.com'; // seed RBAC: contract:read
const PLAIN_EMAIL = 'plain@example.com'; // register normal: roles:[]

const EXPORT_URL = '/api/v2/contracts/export.csv';
const HEADER_ROW =
  'id,sequentialNumber,title,objective,status,originalValueCents,originalPeriodStart,' +
  'originalPeriodEnd,signedAt,currentValueCents,currentPeriodStart,currentPeriodEnd,endedAt,' +
  // CTR-NUMBER-PROGRAM: classificação + metadados de cadastro crus (append no fim — colunas
  // existentes preservam posição).
  'classification,programId,budgetPlanId,categorizacao,centroDeCusto';
const BOM = '﻿';

const makeApp = async (seedContracts: readonly Contract[]) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: { users: [{ email: READER_EMAIL, password: STRONG, permissions: ['contract:read'] }] },
  });
  const contractsDeps = await buildContractsHttpDeps({
    driver: 'memory',
    seed: { contracts: seedContracts },
  });
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      contractsHttpPlugin(contractsDeps, {
        requireAuth: makeRequireAuth(authDeps.verifyAccessToken),
        authorize: authDeps.authorize,
      }),
    ],
  });
  const teardown = async (): Promise<void> => {
    await app.close();
    await contractsDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, teardown };
};

type App = Awaited<ReturnType<typeof buildApp>>;

const loginSeeded = async (app: App, email: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const registerAndLogin = async (app: App, email: string): Promise<string> => {
  await app.inject({
    method: 'POST',
    url: '/api/v2/auth/register',
    payload: { email, password: STRONG },
  });
  return loginSeeded(app, email);
};

const bearer = (token: string): Record<string, string> => ({ authorization: `Bearer ${token}` });

describe('CONTRACTS-HTTP-EXPORT-CSV (C4) — GET /contracts/export.csv', () => {
  it('CA1: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp([
      buildContract({ id: '11111111-1111-4111-8111-111111111111' }),
    ]);
    const res = await app.inject({ method: 'GET', url: EXPORT_URL });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA1: token sem contract:read -> 403', async () => {
    const { app, teardown } = await makeApp([
      buildContract({ id: '11111111-1111-4111-8111-111111111111' }),
    ]);
    const token = await registerAndLogin(app, PLAIN_EMAIL);
    const res = await app.inject({ method: 'GET', url: EXPORT_URL, headers: bearer(token) });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA2: com contract:read -> 200 text/csv, attachment, cabeçalho + 1 linha por contrato', async () => {
    const { app, teardown } = await makeApp([
      buildContract({ id: '11111111-1111-4111-8111-111111111111', sequentialNumber: '001/2026' }),
      buildContract({ id: '22222222-2222-4222-8222-222222222222', sequentialNumber: '002/2026' }),
    ]);
    const token = await loginSeeded(app, READER_EMAIL);
    const res = await app.inject({ method: 'GET', url: EXPORT_URL, headers: bearer(token) });

    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'] ?? '', /text\/csv/);
    assert.match(res.headers['content-disposition'] ?? '', /attachment/);
    assert.match(res.headers['content-disposition'] ?? '', /contracts\.csv/);

    const body = res.body;
    assert.ok(body.startsWith(BOM), 'CSV deve iniciar com BOM UTF-8');
    const lines = body
      .slice(BOM.length)
      .split('\r\n')
      .filter((l) => l.length > 0);
    assert.equal(lines[0], HEADER_ROW);
    assert.equal(lines.length, 3); // cabeçalho + 2 contratos
    await teardown();
  });

  it('CA3: lista vazia -> 200 com só o cabeçalho', async () => {
    const { app, teardown } = await makeApp([]);
    const token = await loginSeeded(app, READER_EMAIL);
    const res = await app.inject({ method: 'GET', url: EXPORT_URL, headers: bearer(token) });
    assert.equal(res.statusCode, 200);
    const lines = res.body
      .slice(BOM.length)
      .split('\r\n')
      .filter((l) => l.length > 0);
    assert.equal(lines.length, 1);
    assert.equal(lines[0], HEADER_ROW);
    await teardown();
  });

  it('CA4: title iniciando com "=" é neutralizado (formula injection) com prefixo \'', async () => {
    const { app, teardown } = await makeApp([
      buildContract({ id: '11111111-1111-4111-8111-111111111111', title: '=SOMA(A1:A9)' }),
    ]);
    const token = await loginSeeded(app, READER_EMAIL);
    const res = await app.inject({ method: 'GET', url: EXPORT_URL, headers: bearer(token) });
    assert.equal(res.statusCode, 200);
    // a célula neutralizada vira '=SOMA(A1:A9) (prefixo aspa simples antes do =).
    assert.ok(
      res.body.includes("'=SOMA(A1:A9)"),
      'célula de fórmula deve ser prefixada com aspa simples',
    );
    await teardown();
  });

  it('CTR-NUMBER-PROGRAM: classificação + metadados crus aparecem nas células de dados', async () => {
    const { app, teardown } = await makeApp([
      buildContract({
        id: '11111111-1111-4111-8111-111111111111',
        classification: 'OS',
        programId: '77777777-7777-4777-8777-777777777777',
        budgetPlanId: '66666666-6666-4666-8666-666666666666',
        categorizacao: 'Custeio',
        centroDeCusto: 'CC-042',
      }),
    ]);
    const token = await loginSeeded(app, READER_EMAIL);
    const res = await app.inject({ method: 'GET', url: EXPORT_URL, headers: bearer(token) });
    assert.equal(res.statusCode, 200);
    const dataLine = res.body
      .slice(BOM.length)
      .split('\r\n')
      .filter((l) => l.length > 0)[1];
    assert.ok(dataLine !== undefined);
    assert.ok(
      dataLine.endsWith(
        'OS,77777777-7777-4777-8777-777777777777,' +
          '66666666-6666-4666-8666-666666666666,Custeio,CC-042',
      ),
      `linha de dados deve terminar com classificação + metadados: ${dataLine}`,
    );
    await teardown();
  });

  it('CA5: objective com vírgula e aspas é quotado RFC 4180', async () => {
    const { app, teardown } = await makeApp([
      buildContract({
        id: '11111111-1111-4111-8111-111111111111',
        objective: 'Reforma da "ala leste", fase 1',
      }),
    ]);
    const token = await loginSeeded(app, READER_EMAIL);
    const res = await app.inject({ method: 'GET', url: EXPORT_URL, headers: bearer(token) });
    assert.equal(res.statusCode, 200);
    // RFC 4180: campo entre aspas, aspas internas duplicadas.
    assert.ok(
      res.body.includes('"Reforma da ""ala leste"", fase 1"'),
      'campo com vírgula/aspas deve ser quotado RFC 4180',
    );
    await teardown();
  });
});

describe('CONTRACTS-HTTP-EXPORT-CSV (C4) — OpenAPI + roteamento + regressão', () => {
  it('CA6: /docs/json contém /api/v2/contracts/export.csv com response text/csv', async () => {
    const { app, teardown } = await makeApp([]);
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    const doc = res.json() as {
      paths: Record<
        string,
        { get?: { responses?: Record<string, { content?: Record<string, unknown> }> } }
      >;
    };
    const get = doc.paths['/api/v2/contracts/export.csv']?.get;
    assert.ok(get !== undefined, 'rota export.csv deve estar no OpenAPI');
    assert.ok(
      get?.responses?.['200']?.content?.['text/csv'] !== undefined,
      'response 200 deve declarar content text/csv',
    );
    await teardown();
  });

  it('CA7: export.csv NÃO é capturado por GET /contracts/:id (rota estática vence)', async () => {
    const { app, teardown } = await makeApp([
      buildContract({ id: '11111111-1111-4111-8111-111111111111' }),
    ]);
    const token = await loginSeeded(app, READER_EMAIL);
    const res = await app.inject({ method: 'GET', url: EXPORT_URL, headers: bearer(token) });
    // Se caísse em /:id, 'export.csv' não é uuid -> 400. A rota estática deve responder 200 CSV.
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'] ?? '', /text\/csv/);
    await teardown();
  });

  it('CA8 (regressão): GET /api/v2/contracts (list) segue 200', async () => {
    const { app, teardown } = await makeApp([
      buildContract({ id: '11111111-1111-4111-8111-111111111111' }),
    ]);
    const token = await loginSeeded(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/contracts',
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 200);
    await teardown();
  });
});
