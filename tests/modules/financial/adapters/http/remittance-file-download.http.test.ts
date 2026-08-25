/**
 * Borda HTTP: GET /financial/remittances/:id/file — o arquivo que foi ao banco, em TODO ambiente.
 *
 * ⚠️ A rota JÁ NÃO é restrita a fora de produção, e este arquivo mede as duas montagens porque a
 * mudança é recente: `FORCE_REMITTANCE_FILE_ROUTE` a registra também em produção (commit `9ab19f22`,
 * #822), por exigência da equipe de negócio — o arquivo é o comprovante do que foi transmitido, e
 * sem ele a conferência de um pagamento contestado depende de pedi-lo a quem o gerou.
 *
 * O discriminador de ambiente continua sendo um id MALFORMADO, e continua útil: com a rota
 * registrada ele responde **400** (o handler rodou e recusou o id); sem ela, **404** por ausência.
 * Comparar 404 com 404 não provaria nada. Hoje as duas montagens respondem 400 — e é exatamente
 * isso que os casos abaixo fixam.
 *
 * A proteção do arquivo deixou de ser TOPOLÓGICA ("a rota não existe") e passou a ser de
 * AUTORIZAÇÃO ("existe, exige token e a permissão `remittance:read`"), o que é mais fraco por
 * desenho — ver ADR-0065. Por isso os casos de 401 e 403 em produção não são decoração: são o que
 * sobrou.
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

describe('financial/http — a rota de download EXISTE em produção (#822)', () => {
  // ⚠️ ESTE BLOCO AFIRMAVA O CONTRÁRIO até 24/08/2026, e a inversão é decisão de NEGÓCIO.
  //
  // O desenho original registrava `GET /financial/remittances/:id/file` apenas fora de produção, e o
  // argumento era bom: ausência é mais forte que proibição — uma superfície que não se registra não
  // vaza por erro de permissão, por ordem de preHandler nem por bypass de RBAC. O arquivo carrega o
  // cadastro bancário de todos os favorecidos do lote.
  //
  // O que mudou: a equipe de negócio exige acesso ao arquivo que foi ao banco em TODO ambiente —
  // é o comprovante do que foi transmitido, e sem ele a conferência de um pagamento contestado
  // depende de pedir o arquivo a quem o gerou. `FORCE_REMITTANCE_FILE_ROUTE` implementa isso
  // (`plugin.ts`, commit `9ab19f22`), e o ADR-0065 sustenta a fronteira: o download vive sob
  // permissão dedicada (`remittance:read`) e registro de acesso, não sob ausência de rota.
  //
  // O que NÃO mudou, e os casos abaixo continuam cobrando: a rota exige token, exige a permissão
  // certa, e valida o id antes de tocar em qualquer storage. A proteção deixou de ser topológica
  // ("não existe") e passou a ser de autorização ("existe, e cobra") — que é mais fraca por
  // desenho, e por isso os três casos precisam continuar verdes juntos.
  it('em produção o id malformado dá 400, como em homologação — a rota responde', async () => {
    const res = await producao.app.inject({
      method: 'GET',
      url: `/api/v2/financial/remittances/${MALFORMED_ID}/file`,
      headers: { authorization: `Bearer ${READER}` },
    });

    // Só o STATUS, como o caso irmão de homologação: o slug interno (`remittance-id-invalid`) não
    // vai no envelope público — é a política do módulo desde o #52 (OWASP API8:2023). O 400 já é o
    // discriminador que importa: com a rota ausente a resposta seria 404, e o handler não teria
    // rodado para recusar o id.
    assert.equal(res.statusCode, 400, 'a rota tem de existir em produção (#822)');
  });

  it('em produção a rota continua exigindo a permissão — 403 sem ela', async () => {
    // O que substituiu a ausência da rota. Se este caso ficar vermelho, o arquivo com o cadastro
    // bancário de todos os favorecidos ficou acessível a qualquer autenticado em PRODUÇÃO.
    const res = await producao.app.inject({
      method: 'GET',
      url: `/api/v2/financial/remittances/${REMITTANCE_ID}/file`,
      headers: { authorization: 'Bearer document:read' },
    });

    assert.equal(res.statusCode, 403);
  });

  it('em produção a rota continua exigindo token — 401 sem ele', async () => {
    const res = await producao.app.inject({
      method: 'GET',
      url: `/api/v2/financial/remittances/${REMITTANCE_ID}/file`,
    });

    assert.equal(res.statusCode, 401);
  });

  // Guarda contra verde por vacuidade, preservada da versão anterior deste bloco: se o plugin
  // parasse de registrar as rotas de remessa em produção, os casos acima passariam a medir o app
  // errado. A irmã prova que o ambiente de produção do teste está montado e servindo.
  it('a rota IRMÃ de detalhe também responde em produção', async () => {
    const res = await producao.app.inject({
      method: 'GET',
      url: `/api/v2/financial/remittances/${REMITTANCE_ID}`,
      headers: { authorization: `Bearer ${READER}` },
    });

    assert.equal(res.statusCode, 404);
    assert.match(
      res.body,
      /Remessa não encontrada/,
      '404 VAZIO aqui significaria app mal montado, não remessa inexistente',
    );
  });
});
