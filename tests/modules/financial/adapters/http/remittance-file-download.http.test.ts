/**
 * Borda HTTP: GET /financial/remittances/:id/file — o arquivo que foi ao banco, **em homologação**.
 *
 * O caso que dá nome a esta suíte é o do ambiente. A rota não é registrada em produção, então lá o
 * caminho é 404 **por ausência** — e provar isso exige distinguir "a rota não existe" de "a rota
 * existe e o recurso não". O discriminador é um id MALFORMADO: com a rota registrada ele é 400
 * (`remittance-id-invalid`); sem ela, 404. Comparar 404 com 404 não provaria nada.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import type { preHandlerAsyncHookHandler } from 'fastify';

import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import {
  financialHttpPlugin,
  buildFinancialHttpDeps,
} from '#src/modules/financial/public-api/http.ts';

// O literal do catálogo (`public-api/permissions.ts:31`), não um nome plausível: o duplo de
// `authorize` compara string crua, e um nome inventado dá 403 em todo caso — verde impossível.
const READER = 'remittance:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';
const REMITTANCE_ID = '11111111-1111-4111-8111-111111111111';
const MALFORMED_ID = 'nao-e-uuid';

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

type AppHandle = Readonly<{
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}>;

// O gate lê `process.env` no REGISTRO da rota, então o ambiente precisa valer antes do `buildApp` —
// e ser restaurado depois, senão esta suíte decide o ambiente das vizinhas.
const buildWithNodeEnv = async (nodeEnv: string | undefined): Promise<AppHandle> => {
  const original = process.env['NODE_ENV'];
  if (nodeEnv === undefined) delete process.env['NODE_ENV'];
  else process.env['NODE_ENV'] = nodeEnv;

  try {
    const base = await buildFinancialHttpDeps({ driver: 'memory' });
    const app = await buildApp({
      config: readHttpConfig({ RATE_LIMIT_MAX: '10000' }),
      routes: [financialHttpPlugin(base, { requireAuth, authorize })],
    });
    return {
      app,
      teardown: async () => {
        await app.close();
        await base.shutdown();
      },
    };
  } finally {
    if (original === undefined) delete process.env['NODE_ENV'];
    else process.env['NODE_ENV'] = original;
  }
};

let homolog: AppHandle;
let producao: AppHandle;

before(async () => {
  homolog = await buildWithNodeEnv('homologation');
  producao = await buildWithNodeEnv('production');
});

after(async () => {
  await homolog.teardown();
  await producao.teardown();
});

describe('financial/http — download da remessa existe FORA de produção', () => {
  it('id malformado responde 400: a rota está registrada e o use case rodou', async () => {
    const res = await homolog.app.inject({
      method: 'GET',
      url: `/api/v2/financial/remittances/${MALFORMED_ID}/file`,
      headers: { authorization: `Bearer ${READER}` },
    });

    assert.equal(res.statusCode, 400);
  });

  it('remessa inexistente responde 404 com o código de domínio', async () => {
    const res = await homolog.app.inject({
      method: 'GET',
      url: `/api/v2/financial/remittances/${REMITTANCE_ID}/file`,
      headers: { authorization: `Bearer ${READER}` },
    });

    // O envelope normaliza o código de domínio para a CATEGORIA (`not-found`); quem distingue qual
    // recurso faltou é a mensagem do mapa de erros. Asseverar o código cru aqui verificaria o
    // envelope, não o caminho percorrido.
    assert.equal(res.statusCode, 404);
    assert.match(res.body, /Remessa não encontrada/);
  });

  // Com OUTRA permissão real do módulo, não com um nome inventado: o 403 precisa vir de "esta
  // permissão não serve", e não de "esta string não existe em lugar nenhum".
  it('sem a permissão de leitura de remessa responde 403', async () => {
    const res = await homolog.app.inject({
      method: 'GET',
      url: `/api/v2/financial/remittances/${REMITTANCE_ID}/file`,
      headers: { authorization: 'Bearer document:read' },
    });

    assert.equal(res.statusCode, 403);
  });

  it('sem token responde 401', async () => {
    const res = await homolog.app.inject({
      method: 'GET',
      url: `/api/v2/financial/remittances/${REMITTANCE_ID}/file`,
    });

    assert.equal(res.statusCode, 401);
  });
});

describe('financial/http — em produção a rota NÃO EXISTE', () => {
  // Ausência, não proibição. Um 403 confirmaria que o recurso existe; a superfície que não se
  // registra não vaza por erro de permissão, por ordem de preHandler nem por bypass de RBAC.
  it('o mesmo id malformado que dá 400 em homologação dá 404 em produção', async () => {
    const res = await producao.app.inject({
      method: 'GET',
      url: `/api/v2/financial/remittances/${MALFORMED_ID}/file`,
      headers: { authorization: `Bearer ${READER}` },
    });

    assert.equal(
      res.statusCode,
      404,
      'a rota respondeu em produção — o gate de ambiente não pegou',
    );
    assert.doesNotMatch(res.body, /remittance-id-invalid/, 'o handler não pode ter rodado');
  });

  // Guarda contra verde por vacuidade: se o plugin parasse de registrar a rota em QUALQUER ambiente,
  // o caso acima continuaria passando e a suíte inteira viraria decoração.
  it('a rota IRMÃ continua registrada em produção — o gate é só desta', async () => {
    const res = await producao.app.inject({
      method: 'GET',
      url: `/api/v2/financial/remittances/${REMITTANCE_ID}`,
      headers: { authorization: `Bearer ${READER}` },
    });

    assert.equal(res.statusCode, 404);
    assert.match(
      res.body,
      /Remessa não encontrada/,
      'a rota de detalhe tem de responder em produção — 404 vazio aqui significaria que o gate pegou demais',
    );
  });
});
