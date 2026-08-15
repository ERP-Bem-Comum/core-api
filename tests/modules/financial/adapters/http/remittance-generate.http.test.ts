/**
 * REMITTANCE-GENERATE (#720) — borda HTTP: POST /api/v2/financial/remittances.
 *
 * A única rota do módulo cuja chamada MOVE DINHEIRO: consome NSA, prende os documentos e grava em
 * `saida/` — e gravar ali é enfileirar pagamento no banco (ADR-0060).
 *
 * Driver memory (nada sai para bucket real); auth via hooks FAKE (o "token" Bearer carrega as
 * permissões por vírgula). Fastify.inject por cenário (ADR-0037).
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
import { createInMemoryRemittancePaymentReader } from '#src/modules/financial/adapters/persistence/repos/remittance-payment-reader.in-memory.ts';

const GENERATOR = 'remittance:generate';
const READER_ONLY = 'remittance:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';

const URL = '/api/v2/financial/remittances';
const DOC_A = '11111111-1111-4111-8111-111111111111';
const DOC_B = '22222222-2222-4222-8222-222222222222';
const DOC_PIX = '33333333-3333-4333-8333-333333333333';
// Nunca entra numa remessa bem-sucedida: é o título dos cenários que devem falhar ANTES do NSA, e
// reusar um já preso faria o 409 mascarar o que se quer medir.
const DOC_LIVRE = '55555555-5555-4555-8555-555555555555';
const ACCOUNT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const PAYMENT_DATE = new Date(Date.UTC(2026, 8, 10));

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

const bearer = (perms: string) => ({ authorization: `Bearer ${perms}` });

const payments = createInMemoryRemittancePaymentReader([
  {
    documentId: DOC_A,
    route: 'transfer',
    payee: {
      name: 'FORNECEDOR UM',
      documentType: '2',
      document: '12345678000199',
      bankCode: '341',
      agency: '04321',
      agencyDigit: '0',
      accountNumber: '000000112234',
      accountDigit: '4',
      accountAgencyDigit: '',
    },
    valueCents: 150_00,
    paymentDate: PAYMENT_DATE,
  },
  {
    documentId: DOC_B,
    route: 'billet',
    barcode: '23791234500000150000123456789012345678901234',
    beneficiaryName: 'FORNECEDOR DOIS',
    dueDate: PAYMENT_DATE,
    valueCents: 90_00,
    paymentDate: PAYMENT_DATE,
  },
  {
    documentId: DOC_PIX,
    route: 'pix',
    valueCents: 40_00,
    paymentDate: PAYMENT_DATE,
  },
  {
    documentId: DOC_LIVRE,
    route: 'billet',
    barcode: '23791234500000200000123456789012345678901234',
    beneficiaryName: 'FORNECEDOR TRES',
    dueDate: PAYMENT_DATE,
    valueCents: 20_00,
    paymentDate: PAYMENT_DATE,
  },
]);

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;
let cedenteAccountId = ACCOUNT_ID;

const buildHandle = async (): Promise<AppHandle> => {
  const deps = await buildFinancialHttpDeps({
    driver: 'memory',
    remittancePaymentReader: payments,
  });
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [financialHttpPlugin(deps, { requireAuth, authorize })],
  });
  return {
    app,
    teardown: async () => {
      await app.close();
      await deps.shutdown();
    },
  };
};

/** Cria a conta-cedente que a remessa debita, pela própria borda. */
const seedCedenteAccount = async (): Promise<string> => {
  const res = await handle.app.inject({
    method: 'POST',
    url: '/api/v2/financial/cedente-accounts',
    headers: bearer('bank-account:write'),
    payload: {
      bankCode: '237',
      bankName: 'Bradesco',
      type: 'corrente',
      agency: '1234',
      accountNumber: '567890',
      accountDigit: '1',
      document: '12345678000190',
      nickname: 'Conta principal',
      // ⚠️ OPCIONAL no cadastro e OBRIGATÓRIO para gerar: sem convênio o nome do arquivo não se
      // monta e a geração falha com 503 genérico, sem dizer ao operador o que corrigir. Gap
      // registrado na #722 — aqui a conta é semeada completa, para o teste medir a rota e não ele.
      convenio: '1234567',
    },
  });
  assert.equal(res.statusCode, 201, res.body);
  return (res.json() as { id: string }).id;
};

before(async () => {
  handle = await buildHandle();
  cedenteAccountId = await seedCedenteAccount();
});

after(async () => {
  await handle.teardown();
});

const generate = async (documentIds: readonly string[], perms = GENERATOR) =>
  handle.app.inject({
    method: 'POST',
    url: URL,
    headers: bearer(perms),
    payload: { cedenteAccountId, documentIds },
  });

describe('financial/http — POST /remittances (#720) · RBAC', () => {
  it('sem Authorization → 401', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: URL,
      payload: { cedenteAccountId, documentIds: [DOC_A] },
    });
    assert.equal(res.statusCode, 401, res.body);
  });

  // A permissão de leitura NÃO dispara pagamento: quem confere o lote não necessariamente o manda.
  it('CA3: token com apenas remittance:read → 403', async () => {
    const res = await generate([DOC_A], READER_ONLY);
    assert.equal(res.statusCode, 403, res.body);
  });
});

describe('financial/http — POST /remittances (#720) · geração', () => {
  it('CA2: gera o arquivo e devolve remessa, NSA e nome', async () => {
    const res = await generate([DOC_A]);
    assert.equal(res.statusCode, 201, res.body);

    const body = res.json() as {
      remittanceId: string;
      fileName: string;
      objectKey: string;
      nsa: number;
      totalCents: string;
      lineCount: number;
    };
    assert.ok(body.remittanceId.length > 0);
    assert.ok(body.fileName.length > 0);
    // Gravado em `saida/` — o prefixo é o que torna o arquivo visível ao agente da VAN.
    assert.ok(body.objectKey.startsWith('saida/'), body.objectKey);
    assert.equal(body.nsa, 1);
    assert.equal(body.totalCents, '15000');
  });

  it('o NSA avança a cada remessa, e não se repete', async () => {
    const res = await generate([DOC_B]);
    assert.equal(res.statusCode, 201, res.body);
    assert.equal((res.json() as { nsa: number }).nsa, 2);
  });

  // Documento já preso é conflito de estado, não dado inválido: incluí-lo de novo pagaria duas vezes.
  it('recusa com 409 documento já incluído em remessa viva', async () => {
    const res = await generate([DOC_A]);
    assert.equal(res.statusCode, 409, res.body);
  });

  // CA5: o operador precisa distinguir "falta dado" de "o arquivo não emite esta forma" — não há
  // cadastro que resolva a segunda.
  it('CA5: título de rota sem emissor recusa com mensagem própria', async () => {
    const res = await generate([DOC_PIX]);
    assert.equal(res.statusCode, 422, res.body);

    const body = res.json() as { error: { message: string } };
    assert.match(body.error.message, /forma de pagamento ainda não é emitida/i);
  });
});

describe('financial/http — POST /remittances (#720) · borda', () => {
  it('recusa seleção vazia com 400', async () => {
    const res = await generate([]);
    assert.equal(res.statusCode, 400, res.body);
  });

  it('recusa conta-cedente que não é uuid com 400', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: URL,
      headers: bearer(GENERATOR),
      payload: { cedenteAccountId: 'nao-e-uuid', documentIds: [DOC_A] },
    });
    assert.equal(res.statusCode, 400, res.body);
  });

  // Forma de lançamento e tipo de serviço são DERIVADOS do conteúdo (#711, CA4): aceitá-los do
  // cliente seria aceitar uma afirmação que o arquivo pode contradizer.
  it('recusa corpo que tenta informar a forma de lançamento', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: URL,
      headers: bearer(GENERATOR),
      payload: { cedenteAccountId, documentIds: [DOC_A], launchForm: '41' },
    });
    assert.equal(res.statusCode, 400, res.body);
  });
});

describe('financial/http — POST /remittances · conta-cedente sem convênio (#722)', () => {
  // O convênio é opcional no cadastro (a conta serve à conciliação sem ele) e obrigatório aqui.
  // Antes, a falha acontecia três camadas adiante, no montador do nome, e chegava como 503
  // genérico: nada dizia ao operador que faltava um campo, nem em qual tela preenchê-lo.
  // Criada UMA vez: a chave bancária é única por conta, e semear de novo colidiria em 409 —
  // mascarando com um conflito de cadastro o que este bloco quer medir.
  let accountId = '';

  before(async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/cedente-accounts',
      headers: bearer('bank-account:write'),
      payload: {
        bankCode: '237',
        bankName: 'Bradesco',
        type: 'corrente',
        agency: '4321',
        accountNumber: '098765',
        accountDigit: '2',
        document: '12345678000190',
        nickname: 'Conta sem convenio',
      },
    });
    assert.equal(res.statusCode, 201, res.body);
    accountId = (res.json() as { id: string }).id;
  });

  it('recusa com erro que o operador consegue agir, não com falha interna', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: URL,
      headers: bearer(GENERATOR),
      payload: { cedenteAccountId: accountId, documentIds: [DOC_LIVRE] },
    });

    // 422, não 503: é dado a corrigir, não defeito nosso.
    assert.equal(res.statusCode, 422, res.body);
    const body = res.json() as { error: { code: string; message: string } };
    assert.equal(body.error.code, 'unprocessable');
    assert.match(body.error.message, /convênio/i);
    // A mensagem diz ONDE corrigir — sem isso o operador sabe o que falta e não sabe aonde ir.
    assert.match(body.error.message, /cadastro da conta/i);
  });

  // A história completa do operador: ele recebe a recusa, corrige o cadastro e gera. Sem o convênio
  // editável, a mensagem "informe no cadastro da conta" seria uma promessa que a API não cumpre —
  // o PATCH não aceitava o campo, e não havia como consertar uma conta cadastrada sem ele.
  //
  // O NSA em 1 na primeira geração é a prova de que nenhuma das tentativas frustradas queimou
  // número: ele não volta depois de alocado, e a sequência é o que o banco usa para detectar
  // retransmissão.
  it('depois de preencher o convênio, a conta gera — e o NSA começa em 1', async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const frustrada = await handle.app.inject({
        method: 'POST',
        url: URL,
        headers: bearer(GENERATOR),
        payload: { cedenteAccountId: accountId, documentIds: [DOC_LIVRE] },
      });
      assert.equal(frustrada.statusCode, 422, frustrada.body);
    }

    const fix = await handle.app.inject({
      method: 'PATCH',
      url: `/api/v2/financial/cedente-accounts/${accountId}`,
      headers: bearer('bank-account:write'),
      payload: { convenio: '7654321' },
    });
    assert.equal(fix.statusCode, 200, fix.body);

    const res = await handle.app.inject({
      method: 'POST',
      url: URL,
      headers: bearer(GENERATOR),
      payload: { cedenteAccountId: accountId, documentIds: [DOC_LIVRE] },
    });
    assert.equal(res.statusCode, 201, res.body);
    assert.equal((res.json() as { nsa: number }).nsa, 1);
  });

  it('o convênio preenche uma vez: trocar é recusado com 409', async () => {
    const res = await handle.app.inject({
      method: 'PATCH',
      url: `/api/v2/financial/cedente-accounts/${accountId}`,
      headers: bearer('bank-account:write'),
      payload: { convenio: '9999999' },
    });

    assert.equal(res.statusCode, 409, res.body);
    const body = res.json() as { error: { message: string } };
    assert.match(body.error.message, /não pode ser trocado/i);
  });
});

describe('financial/http — POST /remittances (#720) · guarda do bypass (#634)', () => {
  // Sob `AUTH_RBAC_MODE=bypass` todo autenticado é super-usuário (ADR-0052). Para leitura é uma
  // escolha operacional; para disparar pagamento ao banco, não é escolha nenhuma. A guarda é
  // mecânica de propósito — depender da disciplina de deploy é apostar que ninguém vai esquecer.
  const originalMode = process.env['AUTH_RBAC_MODE'];

  before(() => {
    process.env['AUTH_RBAC_MODE'] = 'bypass';
  });

  after(() => {
    if (originalMode === undefined) delete process.env['AUTH_RBAC_MODE'];
    else process.env['AUTH_RBAC_MODE'] = originalMode;
  });

  it('CA4: a rota recusa com 503 e código próprio enquanto o bypass estiver ligado', async () => {
    const res = await generate([DOC_B]);
    assert.equal(res.statusCode, 503, res.body);

    const body = res.json() as { error: { code: string } };
    assert.equal(body.error.code, 'remittance-disabled-under-rbac-bypass');
  });

  it('a recusa vem ANTES da autenticação — nem com token válido a rota opera', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: URL,
      payload: { cedenteAccountId, documentIds: [DOC_B] },
    });
    assert.equal(res.statusCode, 503, res.body);
  });

  // O pré-voo NÃO é afetado: ele não move dinheiro, e travá-lo tiraria do operador justamente a
  // ferramenta de diagnóstico enquanto o ambiente está em bypass.
  it('o pré-voo continua respondendo sob bypass', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/remittances:preview',
      headers: bearer(READER_ONLY),
      payload: { documentIds: [DOC_A] },
    });
    assert.equal(res.statusCode, 200, res.body);
  });
});
