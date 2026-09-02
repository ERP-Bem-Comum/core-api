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
import { createInMemoryRemittanceRepository } from '#src/modules/financial/adapters/persistence/repos/remittance-repository.in-memory.ts';

const GENERATOR = 'remittance:generate';
const READER_ONLY = 'remittance:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';

const URL = '/api/v2/financial/remittances';
const DOC_A = '11111111-1111-4111-8111-111111111111';
const DOC_B = '22222222-2222-4222-8222-222222222222';
const DOC_GUIA = '33333333-3333-4333-8333-333333333333';
// Nunca entra numa remessa bem-sucedida: é o título dos cenários que devem falhar ANTES do NSA, e
// reusar um já preso faria o 409 mascarar o que se quer medir.
const DOC_LIVRE = '55555555-5555-4555-8555-555555555555';
// #736: doc do cenário de não-aprovação. Dedicado para não colidir com o held-check — reusar um já
// preso faria o 409 vir do "já incluído", mascarando a barreira de aprovação que se quer medir.
const DOC_NAO_APROVADO = '66666666-6666-4666-8666-666666666666';
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
    payableId: DOC_A,
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
    },
    valueCents: 150_00,
    paymentDate: PAYMENT_DATE,
  },
  {
    payableId: DOC_B,
    documentId: DOC_B,
    route: 'billet',
    barcode: '23791234500000150000123456789012345678901234',
    beneficiaryName: 'FORNECEDOR DOIS',
    beneficiaryDocumentType: '2',
    beneficiaryDocument: '98765432000122',
    dueDate: PAYMENT_DATE,
    valueCents: 90_00,
    paymentDate: PAYMENT_DATE,
  },
  // A rota sem emissor da fixture era `pix` até a #838, e virou a GUIA — que é a única que sobrou, e
  // sobrou por decisão de escopo da P.O. (23/08), não por atraso de implementação.
  {
    payableId: DOC_GUIA,
    documentId: DOC_GUIA,
    route: 'tax-guide',
    valueCents: 40_00,
    paymentDate: PAYMENT_DATE,
  },
  {
    payableId: DOC_LIVRE,
    documentId: DOC_LIVRE,
    route: 'billet',
    barcode: '23791234500000200000123456789012345678901234',
    beneficiaryName: 'FORNECEDOR TRES',
    beneficiaryDocumentType: '2',
    beneficiaryDocument: '98765432000133',
    dueDate: PAYMENT_DATE,
    valueCents: 20_00,
    paymentDate: PAYMENT_DATE,
  },
  {
    payableId: DOC_NAO_APROVADO,
    documentId: DOC_NAO_APROVADO,
    route: 'billet',
    barcode: '23791234500000250000123456789012345678901234',
    beneficiaryName: 'FORNECEDOR QUATRO',
    beneficiaryDocumentType: '2',
    beneficiaryDocument: '98765432000144',
    dueDate: PAYMENT_DATE,
    valueCents: 25_00,
    paymentDate: PAYMENT_DATE,
  },
]);

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;
let cedenteAccountId = ACCOUNT_ID;

/**
 * `authorizeHook` parametrizável para o bloco da guarda (#634): ele precisa de um app cujo
 * `authorize` SIMULE o bypass — no-op salvo `{ strict: true }` —, e o fake do topo cobra a permissão
 * sempre. Default preserva o comportamento de todos os outros casos deste arquivo.
 */
const buildHandle = async (
  authorizeHook: (permissionName: string) => preHandlerAsyncHookHandler = authorize,
): Promise<AppHandle> => {
  const deps = await buildFinancialHttpDeps({
    driver: 'memory',
    remittancePaymentReader: payments,
    // O repositório precisa vir pelo seam desde o ADR-0065 §2: o `save` de criação transiciona os
    // títulos `Approved → Transmitted` por CAS, e o fallback do composition root nasce sem conhecer
    // título nenhum — toda geração cairia em `document-not-approved`, que é o veredito certo para um
    // repositório que não sabe de nada.
    //
    // `DOC_NAO_APROVADO` fica FORA de propósito: o cenário do #736 o recusa no reader
    // (`payments.setNotApproved`), antes de chegar aqui, e semeá-lo como aprovado não mudaria o
    // desfecho — só apagaria a razão pela qual ele existe.
    remittanceRepo: createInMemoryRemittanceRepository({
      payableStatuses: Object.fromEntries(
        [DOC_A, DOC_B, DOC_GUIA, DOC_LIVRE].map((id) => [id, 'Approved' as const]),
      ),
    }),
  });
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [financialHttpPlugin(deps, { requireAuth, authorize: authorizeHook })],
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
      // Seis dígitos: é o máximo que o banco lê (#804), e `000000` é a máscara reservada.
      convenio: '000000',
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

const generate = async (payableIds: readonly string[], perms = GENERATOR) =>
  handle.app.inject({
    method: 'POST',
    url: URL,
    headers: bearer(perms),
    payload: { cedenteAccountId, payableIds },
  });

describe('financial/http — POST /remittances (#720) · RBAC', () => {
  it('sem Authorization → 401', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: URL,
      payload: { cedenteAccountId, payableIds: [DOC_A] },
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

    // ⚠️ MUDANÇA DE CONTRATO da CA4 (#838): a resposta era o arquivo, e passou a ser `{ files: [] }`.
    // A lista vem mesmo com um elemento só — uma seleção que não tem Pix produz um arquivo, e um
    // corpo que mudasse de forma conforme a seleção faria o caso comum (um arquivo) ser o testado e o
    // caso de dois, o quebrado.
    const body = res.json() as {
      files: {
        remittanceId: string;
        fileName: string;
        objectKey: string;
        nsa: number;
        totalCents: string;
        lineCount: number;
      }[];
    };
    // Uma seleção sem Pix não parte: `fileGroupFor` manda tudo para o grupo comum.
    assert.equal(body.files.length, 1);

    const [file] = body.files;
    assert.ok(file);
    assert.ok(file.remittanceId.length > 0);
    assert.ok(file.fileName.length > 0);
    // Gravado em `saida/` — o prefixo é o que torna o arquivo visível ao agente da VAN.
    assert.ok(file.objectKey.startsWith('saida/'), file.objectKey);
    assert.equal(file.nsa, 1);
    assert.equal(file.totalCents, '15000');
  });

  it('o NSA avança a cada remessa, e não se repete', async () => {
    const res = await generate([DOC_B]);
    assert.equal(res.statusCode, 201, res.body);
    // O NSA é POR ARQUIVO desde a partição (#838): ele vive dentro de cada item, não no topo. Lê-lo
    // do topo devolveria `undefined`, e um assert contra `undefined` passaria em silêncio se o
    // esperado também fosse ausente — por isso o índice é explícito.
    assert.equal((res.json() as { files: { nsa: number }[] }).files[0]?.nsa, 2);
  });

  // Documento já preso é conflito de estado, não dado inválido: incluí-lo de novo pagaria duas vezes.
  it('recusa com 409 documento já incluído em remessa viva', async () => {
    const res = await generate([DOC_A]);
    assert.equal(res.statusCode, 409, res.body);
  });

  // CA5: o operador precisa distinguir "falta dado" de "o arquivo não emite esta forma" — não há
  // cadastro que resolva a segunda.
  it('CA5: título de rota sem emissor recusa com mensagem própria', async () => {
    const res = await generate([DOC_GUIA]);
    assert.equal(res.statusCode, 422, res.body);

    const body = res.json() as { error: { message: string } };
    assert.match(body.error.message, /forma de pagamento ainda não é emitida/i);
  });

  // #736: só título Aprovado entra em remessa. A barreira é a ROTA, não só o front — 409 com nome
  // próprio, e a mensagem manda ao pré-voo, não a "erro interno". `finally` reseta o toggle para
  // não vazar não-aprovação para os testes irmãos que compartilham este reader.
  it('#736: recusa com 409 documento não aprovado', async () => {
    payments.setNotApproved([DOC_NAO_APROVADO]);
    try {
      const res = await generate([DOC_NAO_APROVADO]);
      assert.equal(res.statusCode, 409, res.body);

      const body = res.json() as { error: { message: string } };
      assert.match(body.error.message, /não aprovado/i);
    } finally {
      payments.setNotApproved([]);
    }
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
      payload: { cedenteAccountId: 'nao-e-uuid', payableIds: [DOC_A] },
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
      payload: { cedenteAccountId, payableIds: [DOC_A], launchForm: '41' },
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
      payload: { cedenteAccountId: accountId, payableIds: [DOC_LIVRE] },
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
        payload: { cedenteAccountId: accountId, payableIds: [DOC_LIVRE] },
      });
      assert.equal(frustrada.statusCode, 422, frustrada.body);
    }

    const fix = await handle.app.inject({
      method: 'PATCH',
      url: `/api/v2/financial/cedente-accounts/${accountId}`,
      headers: bearer('bank-account:write'),
      payload: { convenio: '999999' },
    });
    assert.equal(fix.statusCode, 200, fix.body);

    const res = await handle.app.inject({
      method: 'POST',
      url: URL,
      headers: bearer(GENERATOR),
      payload: { cedenteAccountId: accountId, payableIds: [DOC_LIVRE] },
    });
    assert.equal(res.statusCode, 201, res.body);
    // A resposta é `{ files: [...] }` desde a partição multi-arquivo (CA4 da #838): uma seleção pode
    // produzir mais de um arquivo, cada um com seu NSA. Esta seleção produz um só.
    const body = res.json() as { files: readonly { nsa: number }[] };
    assert.equal(body.files.length, 1);
    assert.equal(body.files[0]?.nsa, 1);
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

  // ⚠️ NÃO HÁ GUARDA — e estes casos existem para que a ausência seja VISÍVEL, não para escondê-la.
  //
  // Histórico, porque o status esperado aqui já mudou duas vezes e vai tentar mudar de novo:
  //
  //   · até 24/08/2026 — `refuseUnderRbacBypass` devolvia **503** sempre que o modo fosse `bypass`,
  //     e este bloco cobrava isso. A guarda foi retirada quando o bypass virou o modo permanente da
  //     homologação: a condição deixou de discriminar, e ela recusaria em todo ambiente;
  //   · 25/08/2026 — uma guarda por PERMISSÃO (`authorize` cobrando `remittance:generate` mesmo sob
  //     bypass) foi desenhada, medida e **recusada pelo dono**: enquanto o modelo de permissões não
  //     for validado com a gerência e o time de negócio, nenhuma rota exige permissão — a que move
  //     dinheiro inclusive. Todo usuário autenticado é super-usuário, de propósito.
  //
  // O gatilho para reabrir é de NEGÓCIO: o aceite do modelo de permissões. Até lá, o que estes casos
  // fixam é o estado real, para que a ausência de proteção não passe por engano nem por descuido.
  // Réplica fiel do `authorize` real sob bypass (`auth/adapters/http/composition.ts`): devolve um
  // preHandler que não faz nada. Sem `async` porque não há o que aguardar — o hook do Fastify aceita
  // a Promise resolvida, e um `async` vazio só existiria para satisfazer a forma.
  const bypassAuthorize = (): preHandlerAsyncHookHandler => (): Promise<undefined> =>
    Promise.resolve(undefined);

  let bypassHandle: AppHandle;
  let bypassAccountId: string;

  before(async () => {
    bypassHandle = await buildHandle(bypassAuthorize);
    const seeded = await bypassHandle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/cedente-accounts',
      headers: bearer('sem-permissao-alguma'),
      payload: {
        bankCode: '237',
        bankName: 'Bradesco',
        type: 'corrente',
        agency: '1234',
        accountNumber: '567890',
        accountDigit: '1',
        document: '12345678000190',
        nickname: 'Conta bypass',
        convenio: '000000',
      },
    });
    assert.equal(seeded.statusCode, 201, seeded.body);
    bypassAccountId = (seeded.json() as { id: string }).id;
  });

  after(async () => {
    await bypassHandle.teardown();
  });

  it('sob bypass, QUALQUER autenticado gera remessa — inclusive sem a permissão', async () => {
    // O bearer não apresenta `remittance:generate`. A rota opera assim mesmo, porque `authorize` é
    // no-op. Este caso é o registro executável da consequência aceita em #634: entre "autenticado" e
    // "pagamento enfileirado no banco" não existe mais nenhuma porta.
    const res = await bypassHandle.app.inject({
      method: 'POST',
      url: URL,
      headers: bearer('nenhuma-permissao'),
      payload: { cedenteAccountId: bypassAccountId, payableIds: [DOC_B] },
    });

    assert.ok(
      res.statusCode === 201 || res.statusCode === 409,
      `esperado 201 ou 409, veio ${String(res.statusCode)}: ${res.body}`,
    );
    assert.notEqual(res.statusCode, 403, 'sob bypass a permissão NÃO é cobrada — por decisão');
  });

  it('a autenticação SOBREVIVE ao bypass — sem token continua 401', async () => {
    // A única porta que restou, e a que o ADR-0052 garante que o bypass não toca: `requireAuth`.
    // Se este caso ficar vermelho, a rota virou pública — que é diferente de "aberta a autenticados".
    const res = await bypassHandle.app.inject({
      method: 'POST',
      url: URL,
      payload: { cedenteAccountId: bypassAccountId, payableIds: [DOC_B] },
    });

    assert.equal(res.statusCode, 401, res.body);
  });

  /**
   * ⚠️ O CONTRASTE que impede alguém de "corrigir a inconsistência" (#792, ADR-0065 §4).
   *
   * Ler as duas rotas lado a lado dá vontade de uniformizá-las: a geração recusa sob bypass, o
   * descarte não. A assimetria é decisão do Gabriel (24/08) e tem razão de ser — **gerar enfileira
   * pagamento no banco; descartar desfaz um registro nosso.** A geração precisa da guarda mecânica
   * porque o efeito dela é irreversível do lado de lá da fronteira; o descarte precisa do oposto,
   * porque é a operação de CORREÇÃO e tem de funcionar exatamente onde o ambiente está em bypass —
   * que é como a demo roda.
   *
   * Copiar `refuseUnderRbacBypass` para o descarte deixaria o operador sem via de saída justo
   * quando ele mais precisa dela: com títulos presos por uma remessa que não saiu. Este teste existe
   * para que essa "correção" fique vermelha.
   */
  it('o DESCARTE responde sob bypass — a assimetria com a geração é deliberada', async () => {
    // Mesma chamada, mesmo ambiente em bypass, resultado oposto ao da geração acima. O 404 (remessa
    // inexistente) é suficiente e é o ponto: a requisição ATRAVESSOU as guardas e chegou ao use
    // case. Se `refuseUnderRbacBypass` estivesse aqui, o desfecho seria 503 antes disso.
    const res = await handle.app.inject({
      method: 'POST',
      url: `${URL}/11111111-1111-4111-8111-111111111111/discard`,
      headers: bearer(GENERATOR),
      payload: { reason: 'remessa presa; devolvendo os titulos' },
    });

    assert.notEqual(
      res.statusCode,
      503,
      `a rota de descarte NÃO pode recusar sob bypass: ${res.body}`,
    );
    assert.equal(res.statusCode, 404, res.body);

    // O discriminador é o **status**, e não o code: desde o #792 nenhum dos dois lados expõe slug
    // interno — 4xx e 5xx colapsam no envelope público (OWASP API8:2023, #52). `404` significa que a
    // requisição atravessou as guardas e morreu no use case, por não achar a remessa; se
    // `refuseUnderRbacBypass` estivesse nesta rota, ela pararia antes, com 503.
    //
    // `requestId` nos dois lados é o que torna o par auditável: qualquer que seja o desfecho, o slug
    // real está no log e é por ele que se chega lá.
    const body = res.json() as { error: { code: string; requestId?: string } };
    assert.equal(body.error.code, 'not-found');
    assert.ok(
      typeof body.error.requestId === 'string' && body.error.requestId.length > 0,
      'requestId presente também no 404 — o contrato do envelope vale nos dois lados',
    );
  });

  // O pré-voo NÃO é afetado: ele não move dinheiro, e travá-lo tiraria do operador justamente a
  // ferramenta de diagnóstico enquanto o ambiente está em bypass.
  it('o pré-voo continua respondendo sob bypass', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/remittances:preview',
      headers: bearer(READER_ONLY),
      // O pré-voo recebe TÍTULOS. Este caso mede a guarda de bypass, não o conteúdo da resposta:
      // um id que não existe volta como linha `not-found` e a chamada segue 200, que é o que se
      // afirma aqui.
      //
      // A conta-cedente entrou no corpo com a #804 (CA7): a composição dos lotes depende dela, e
      // sem o campo a chamada morre em 400 na validação do schema — antes de a guarda de bypass
      // ser exercitada, que é justamente o que este teste mede.
      payload: { cedenteAccountId, payableIds: [DOC_A] },
    });
    assert.equal(res.statusCode, 200, res.body);
  });
});
