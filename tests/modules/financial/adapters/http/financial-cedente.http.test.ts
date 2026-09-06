/**
 * W0 RED (019) — borda HTTP /api/v2/financial/cedente-accounts (CRUD + close).
 * As rotas ainda não existem no plugin → inject retorna 404, falhando os asserts de 201/200/403.
 * Driver memory; auth via hooks FAKE (mesmo padrão de financial-reconciliation.http.test.ts).
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler } from 'fastify';

import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import {
  financialHttpPlugin,
  buildFinancialHttpDeps,
} from '#src/modules/financial/public-api/http.ts';

const WRITER = 'bank-account:write,bank-account:read';
const READER = 'bank-account:read';
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

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}

let handle: AppHandle;

before(async () => {
  const base = await buildFinancialHttpDeps({ driver: 'memory' });
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [financialHttpPlugin(base, { requireAuth, authorize })],
  });
  handle = {
    app,
    teardown: async () => {
      await app.close();
      await base.shutdown();
    },
  };
});

after(async () => {
  await handle.teardown();
});

const body = (over: Record<string, unknown> = {}) => ({
  bankCode: '237',
  bankName: 'Bradesco',
  type: 'corrente',
  agency: '1234',
  accountNumber: '567890',
  accountDigit: '1',
  document: '12345678000190',
  nickname: 'Conta principal',
  ...over,
});

describe('financial/http — cedente-accounts (019) — W0 RED', () => {
  it('CA-US1: POST /cedente-accounts → 201', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/cedente-accounts',
      headers: { authorization: `Bearer ${WRITER}` },
      payload: body(),
    });
    assert.equal(res.statusCode, 201, res.body);
  });

  it('CA-US1: GET /cedente-accounts → 200 (lista)', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/cedente-accounts',
      headers: { authorization: `Bearer ${READER}` },
    });
    assert.equal(res.statusCode, 200, res.body);
  });

  it('#89c F1: GET lista expõe currentBalanceCents (= abertura quando sem extratos)', async () => {
    const created = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/cedente-accounts',
      headers: { authorization: `Bearer ${WRITER}` },
      payload: body({
        accountNumber: '778899',
        nickname: 'Conta com saldo',
        openingBalanceCents: '50000',
        openingBalanceDate: '2026-01-01',
      }),
    });
    assert.equal(created.statusCode, 201, created.body);
    const id = (created.json() as { id: string }).id;

    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/cedente-accounts',
      headers: { authorization: `Bearer ${READER}` },
    });
    assert.equal(res.statusCode, 200, res.body);
    const items = res.json() as readonly { id: string; currentBalanceCents: string | null }[];
    const item = items.find((a) => a.id === id);
    assert.ok(item, 'conta criada deve aparecer na lista');
    // Sem extratos importados → saldo atual = saldo de abertura.
    assert.equal(item.currentBalanceCents, '50000');
  });

  /*
   * O CONTRATO DO DV DA AGÊNCIA (#856), na forma que a #859 pediu: opcional no create e no edit,
   * PRESENTE na leitura.
   *
   * ⚠️ A leitura é a metade que resolve o beco medido em produção (#942/#943). Sem `agencyDigit` na
   * resposta, o front reabre a edição com quatro dígitos, marca a agência como incompleta e
   * desabilita o Salvar — então alterar QUALQUER outro campo da conta exige redigitar um dígito que
   * seria descartado de novo. Um teste que só cobrisse o POST ficaria verde com o beco intacto.
   */
  it('#856: o DV da agência entra no POST e volta na leitura', async () => {
    const created = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/cedente-accounts',
      headers: { authorization: `Bearer ${WRITER}` },
      payload: body({ accountNumber: '445566', agencyDigit: '5', nickname: 'Conta com DV' }),
    });
    assert.equal(created.statusCode, 201, created.body);
    assert.equal((created.json() as { agencyDigit: string | null }).agencyDigit, '5');

    const id = (created.json() as { id: string }).id;
    const read = await handle.app.inject({
      method: 'GET',
      url: `/api/v2/financial/cedente-accounts/${id}`,
      headers: { authorization: `Bearer ${READER}` },
    });
    assert.equal(read.statusCode, 200, read.body);
    assert.equal((read.json() as { agencyDigit: string | null }).agencyDigit, '5');
  });

  // Opcional de verdade: a conta cadastrada sem DV continua sendo criada, e a leitura diz `null` em
  // vez de omitir o campo — o front precisa distinguir "não tem" de "não veio no contrato".
  it('#856: conta sem DV é criada, e a leitura devolve null', async () => {
    const created = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/cedente-accounts',
      headers: { authorization: `Bearer ${WRITER}` },
      payload: body({ accountNumber: '556677', nickname: 'Conta sem DV' }),
    });
    assert.equal(created.statusCode, 201, created.body);
    assert.equal((created.json() as { agencyDigit: string | null }).agencyDigit, null);
  });

  // O PATCH é o caminho pelo qual a conta JÁ CADASTRADA se completa. Sem ele, a coluna nova só
  // serviria a contas criadas do zero — e as que estão em uso ficariam no beco para sempre.
  it('#856: o PATCH preenche o DV de uma conta que nasceu sem ele', async () => {
    const created = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/cedente-accounts',
      headers: { authorization: `Bearer ${WRITER}` },
      payload: body({ accountNumber: '667788', nickname: 'Conta a completar' }),
    });
    assert.equal(created.statusCode, 201, created.body);
    const id = (created.json() as { id: string }).id;

    const patched = await handle.app.inject({
      method: 'PATCH',
      url: `/api/v2/financial/cedente-accounts/${id}`,
      headers: { authorization: `Bearer ${WRITER}` },
      payload: { agencyDigit: '7' },
    });
    assert.equal(patched.statusCode, 200, patched.body);
    assert.equal((patched.json() as { agencyDigit: string | null }).agencyDigit, '7');
  });

  /*
   * B8.2 (#995) — a borda passa a ACEITAR o convênio vazio no PATCH.
   *
   * ⚠️ ESTE CASO MEDE A BORDA, e é onde o defeito estava: o use case sempre soube lidar com vazio
   * (`checkCedenteConvenio` o recusa com nome próprio), mas o schema declarava `min(1)` e o pedido
   * morria em 400 antes de chegar lá. Um teste só do use case ficaria verde com a operação ainda
   * impossível pela tela — que é exatamente o que empurrou a correção de 06/09 para `UPDATE` no
   * banco de produção.
   */
  it('#995 B8.2: o PATCH aceita convênio VAZIO — 400 aqui significa o `min(1)` de volta', async () => {
    const created = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/cedente-accounts',
      headers: { authorization: `Bearer ${WRITER}` },
      payload: body({ accountNumber: '991122', nickname: 'Conta a desativar' }),
    });
    assert.equal(created.statusCode, 201, created.body);
    const id = (created.json() as { id: string }).id;

    const patched = await handle.app.inject({
      method: 'PATCH',
      url: `/api/v2/financial/cedente-accounts/${id}`,
      headers: { authorization: `Bearer ${WRITER}` },
      payload: { convenio: '' },
    });

    assert.notEqual(
      patched.statusCode,
      400,
      'o schema recusou a string vazia — o `min(1)` voltou ao `editCedenteAccountBodySchema`',
    );
  });

  /*
   * REABRIR E EXCLUIR (#995, B1/B3/B4/B5) — o ciclo completo pela borda.
   *
   * ⚠️ ESTE BLOCO EXISTE PARA FECHAR UM BECO MEDIDO EM PRODUÇÃO (06/09). Uma conta encerrada por
   * engano ficava inacessível pelos DOIS caminhos: não havia rota para reabrir, e o recadastro batia
   * em `cedente-account-duplicate` porque a linha encerrada continua ocupando a chave natural. A
   * saída foi `UPDATE` direto no banco — o tipo de intervenção que a #879 já mostrou custar caro.
   */
  const createAccount = async (over: Record<string, unknown>) => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/cedente-accounts',
      headers: { authorization: `Bearer ${WRITER}` },
      payload: body(over),
    });
    assert.equal(res.statusCode, 201, res.body);
    return (res.json() as { id: string }).id;
  };

  const transition = async (id: string, path: 'close' | 'reopen') =>
    handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/cedente-accounts/${id}/${path}`,
      headers: { authorization: `Bearer ${WRITER}` },
    });

  const remove = async (id: string) =>
    handle.app.inject({
      method: 'DELETE',
      url: `/api/v2/financial/cedente-accounts/${id}`,
      headers: { authorization: `Bearer ${WRITER}` },
    });

  it('#995 B1: encerrar e REABRIR devolve a conta ao ativo', async () => {
    const id = await createAccount({ accountNumber: '770011', nickname: 'Conta a reabrir' });
    assert.equal((await transition(id, 'close')).statusCode, 200);

    const reopened = await transition(id, 'reopen');
    assert.equal(reopened.statusCode, 200, reopened.body);
    assert.equal((reopened.json() as { status: string }).status, 'Active');
  });

  it('#995 B2: reabrir conta ATIVA → 409', async () => {
    const id = await createAccount({ accountNumber: '770022', nickname: 'Conta ativa' });

    const res = await transition(id, 'reopen');
    assert.equal(res.statusCode, 409, res.body);
  });

  it('#995 B3: excluir conta ATIVA → 409 (encerre antes)', async () => {
    const id = await createAccount({ accountNumber: '770033', nickname: 'Conta ativa' });

    const res = await remove(id);
    assert.equal(res.statusCode, 409, res.body);
  });

  /*
   * ⚠️ O CASO CENTRAL — B4 + B5 juntos, porque separá-los deixaria passar a meia-correção.
   *
   * Excluir tem de fazer as DUAS coisas: tirar a conta do grid E liberar a chave natural. Um teste
   * só da listagem passaria com a chave ainda presa, e o operador continuaria no beco — que é
   * exatamente o estado que motivou a issue.
   *
   * E o histórico segue alcançável por id: sair da lista não é sair do sistema.
   */
  it('#995 B4/B5: a conta excluída sai da lista, LIBERA a chave, e segue legível por id', async () => {
    const naturalKey = { accountNumber: '770044', nickname: 'Conta a excluir' };
    const id = await createAccount(naturalKey);
    assert.equal((await transition(id, 'close')).statusCode, 200);

    const deleted = await remove(id);
    assert.equal(deleted.statusCode, 200, deleted.body);
    assert.equal((deleted.json() as { status: string }).status, 'Deleted');

    // B4 — sumiu do grid (a listagem serve o filtro "Encerradas" também).
    const list = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/cedente-accounts',
      headers: { authorization: `Bearer ${READER}` },
    });
    assert.equal(list.statusCode, 200);
    const ids = (list.json() as readonly { id: string }[]).map((a) => a.id);
    assert.ok(!ids.includes(id), 'a conta excluída continua aparecendo na listagem');

    // B4 — a chave natural foi liberada: o MESMO cadastro passa a ser aceito.
    const recreated = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/cedente-accounts',
      headers: { authorization: `Bearer ${WRITER}` },
      payload: body(naturalKey),
    });
    assert.equal(
      recreated.statusCode,
      201,
      `a chave natural continua presa pela conta excluída: ${recreated.body}`,
    );

    // B5 — o histórico segue alcançável pelo id antigo.
    const read = await handle.app.inject({
      method: 'GET',
      url: `/api/v2/financial/cedente-accounts/${id}`,
      headers: { authorization: `Bearer ${READER}` },
    });
    assert.equal(read.statusCode, 200, 'a conta excluída deixou de ser legível por id');
    assert.equal((read.json() as { status: string }).status, 'Deleted');
  });

  // ⚠️ O outro lado do B4/B7: a conta ENCERRADA continua ocupando a chave. É o invariante que dá
  // sentido às duas ações — se encerrar já liberasse, não haveria por que existir o excluir.
  it('#995 B7: conta ENCERRADA continua ocupando a chave — o caminho é reabrir ou excluir', async () => {
    const naturalKey = { accountNumber: '770055', nickname: 'Conta encerrada' };
    const id = await createAccount(naturalKey);
    assert.equal((await transition(id, 'close')).statusCode, 200);

    const recreated = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/cedente-accounts',
      headers: { authorization: `Bearer ${WRITER}` },
      payload: body(naturalKey),
    });
    assert.equal(recreated.statusCode, 409, recreated.body);
  });

  it('CA-US2: POST /cedente-accounts/:id/close → rota existe (≠ 404)', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const res = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/cedente-accounts/${id}/close`,
      headers: { authorization: `Bearer ${WRITER}` },
    });
    assert.notEqual(res.statusCode, 404, `rota close deve existir (status=${res.statusCode})`);
  });

  it('CA-US1: POST sem permissão write → 403', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/cedente-accounts',
      headers: { authorization: `Bearer ${READER}` },
      payload: body(),
    });
    assert.equal(res.statusCode, 403, res.body);
  });
});
