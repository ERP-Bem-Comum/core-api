/**
 * COLLABORATORS-HTTP-EDIT — W0 (RED) — PUT /api/v1/collaborators/:id com RBAC elevado.
 *
 * DEVE FALHAR: PUT, `editCollaborator` no composition, `hasPermission` no CollaboratorsHttpHooks e
 * `updateCollaboratorBodySchema` ainda não existem. GREEN no W1. Vital = cpf; email não-vital (único →
 * 409). PUT edita os 7 cadastrais (pessoais preservados). POST→PUT no mesmo writer (memory).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok } from '#src/shared/index.ts';
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

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'rh.editor@example.com';
const DIRECTOR_EMAIL = 'rh.diretor@example.com';
const NOPERM_EMAIL = 'sem.permissao@example.com';
const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';
const CPF_A = '11144477735';
const CPF_B = '52998224725';

const body = (over: Record<string, unknown> = {}) => ({
  name: 'Maria Silva',
  email: 'maria@bemcomum.org',
  cpf: CPF_A,
  occupationArea: 'PARC',
  role: 'Analista',
  startOfContract: '2026-01-10',
  employmentRelationship: 'CLT',
  ...over,
});

// #1029: port do auth injetado — qualquer usuário autenticado resolve para este nome.
const EDITOR_NAME = 'Ana Revisora';
const fakeAuthUserReadPort = {
  getUserName: (id: string) => Promise.resolve(ok({ id, name: EDITOR_NAME })),
};

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: WRITER_EMAIL, password: STRONG, permissions: [COLLABORATOR_PERMISSION.write] },
        {
          email: DIRECTOR_EMAIL,
          password: STRONG,
          permissions: [COLLABORATOR_PERMISSION.write, 'collaborator:edit-sensitive'],
        },
      ],
    },
  });
  const partnersDeps = await buildPartnersHttpDeps({
    driver: 'memory',
    authUserReadPort: fakeAuthUserReadPort,
  });
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
    await partnersDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, teardown, partnersDeps };
};

const login = async (app: Awaited<ReturnType<typeof buildApp>>, email: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const registerAndLogin = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  email: string,
): Promise<string> => {
  await app.inject({
    method: 'POST',
    url: '/api/v2/auth/register',
    payload: { email, password: STRONG },
  });
  return login(app, email);
};

const create = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  over: Record<string, unknown>,
): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/collaborators',
    headers: { authorization: `Bearer ${token}` },
    payload: body(over),
  });
  return (res.headers['location'] ?? '').slice('/api/v1/collaborators/'.length);
};

const put = (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  id: string,
  payload: Record<string, unknown>,
) =>
  app.inject({
    method: 'PUT',
    url: `/api/v1/collaborators/${id}`,
    headers: { authorization: `Bearer ${token}` },
    payload,
  });

describe('COLLABORATORS-HTTP-EDIT — PUT /api/v1/collaborators/:id', () => {
  it('CA: sem Authorization -> 401; sem write -> 403', async () => {
    const { app, teardown } = await makeApp();
    assert.equal(
      (
        await app.inject({
          method: 'PUT',
          url: `/api/v1/collaborators/${UUID_INEXISTENTE}`,
          payload: body(),
        })
      ).statusCode,
      401,
    );
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    assert.equal((await put(app, token, UUID_INEXISTENTE, body())).statusCode, 403);
    await teardown();
  });

  it('CA: :id não-UUID -> 400; inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    assert.equal((await put(app, token, 'nao-uuid', body())).statusCode, 400);
    assert.equal((await put(app, token, UUID_INEXISTENTE, body())).statusCode, 404);
    await teardown();
  });

  it('CA: write, sem mudar cpf (muda name) -> 200', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, {});
    assert.equal(
      await put(app, token, id, body({ name: 'Maria S. Renomeada' })).then((r) => r.statusCode),
      200,
    );
    await teardown();
  });

  it('CA: write, mudando cpf -> 403 (sensitive-forbidden)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, {});
    assert.equal(await put(app, token, id, body({ cpf: CPF_B })).then((r) => r.statusCode), 403);
    await teardown();
  });

  it('CA: director, mudando cpf -> 200; cpf novo já usado -> 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, DIRECTOR_EMAIL);
    const id = await create(app, token, {});
    assert.equal(await put(app, token, id, body({ cpf: CPF_B })).then((r) => r.statusCode), 200);
    const other = await create(app, token, { email: 'outro@bemcomum.org', cpf: CPF_A });
    assert.equal(
      await put(app, token, other, body({ email: 'outro@bemcomum.org', cpf: CPF_B })).then(
        (r) => r.statusCode,
      ),
      409,
    );
    await teardown();
  });

  it('CA: write, email já usado por outro -> 409 (não-vital)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, {});
    await create(app, token, { email: 'ocupado@bemcomum.org', cpf: CPF_B });
    assert.equal(
      await put(app, token, id, body({ email: 'ocupado@bemcomum.org' })).then((r) => r.statusCode),
      409,
    );
    await teardown();
  });

  it('CA: name vazio -> 422; cpf curto -> 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, {});
    assert.equal(await put(app, token, id, body({ name: '   ' })).then((r) => r.statusCode), 422);
    assert.equal(await put(app, token, id, body({ cpf: '123' })).then((r) => r.statusCode), 400);
    await teardown();
  });
});

// #1029 — banco/PIX no PUT. Os migrados do legado vieram sem; incluir e trocar passam por aqui.
describe('COLLABORATORS-HTTP-EDIT — banco/PIX no PUT (#1029)', () => {
  const BANK = { bank: '237', agency: '1234', accountNumber: '56789', checkDigit: '0' };
  const PIX = { keyType: 'email', key: 'maria@bemcomum.org' };

  const historyOf = async (
    deps: Awaited<ReturnType<typeof makeApp>>['partnersDeps'],
    id: string,
  ) => {
    const r = await deps.listCollaboratorHistory(id);
    assert.ok(r.ok);
    return r.value;
  };

  it('CA: write inclui banco/PIX em quem veio sem → 200, histórico com autor', async () => {
    const { app, teardown, partnersDeps } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, {});
    const res = await put(app, token, id, body({ bankAccount: BANK, pixKey: PIX }));
    assert.equal(res.statusCode, 200, res.body);

    const bank = (await historyOf(partnersDeps, id)).find((e) => e.fieldName === 'bankAccount');
    assert.ok(bank, 'esperava linha de bankAccount');
    assert.equal(bank.fieldLabel, 'Dados bancários');
    assert.equal(bank.valueAfter, '237/1234/56789-0');
    assert.ok((bank.changedByUserId ?? '').length > 0, 'autor (userId) ausente');
    assert.equal(bank.changedByName, EDITOR_NAME);
    await teardown();
  });

  it('CA: troca a conta que já existia → linha antes/depois', async () => {
    const { app, teardown, partnersDeps } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, { bankAccount: BANK });
    const res = await put(
      app,
      token,
      id,
      body({ bankAccount: { ...BANK, accountNumber: '99999', checkDigit: '9' } }),
    );
    assert.equal(res.statusCode, 200, res.body);

    const bank = (await historyOf(partnersDeps, id)).find((e) => e.fieldName === 'bankAccount');
    assert.equal(bank?.valueBefore, '237/1234/56789-0');
    assert.equal(bank?.valueAfter, '237/1234/99999-9');
    await teardown();
  });

  it('CA: body do front atual (bankAccount/pixKey null) → 200 e NÃO apaga nem registra banco/PIX', async () => {
    const { app, teardown, partnersDeps } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, { bankAccount: BANK, pixKey: PIX });
    const res = await put(
      app,
      token,
      id,
      body({ role: 'Coordenadora', territory: null, bankAccount: null, pixKey: null }),
    );
    assert.equal(res.statusCode, 200, res.body);

    const fields = (await historyOf(partnersDeps, id)).map((e) => e.fieldName);
    assert.deepEqual(fields, ['role']);

    // Prova de que o dado ficou: trocar só o DV agora registra antes = o banco original.
    await put(
      app,
      token,
      id,
      body({ role: 'Coordenadora', bankAccount: { ...BANK, checkDigit: '1' } }),
    );
    const bank = (await historyOf(partnersDeps, id)).find((e) => e.fieldName === 'bankAccount');
    assert.equal(bank?.valueBefore, '237/1234/56789-0');
    assert.equal(bank?.valueAfter, '237/1234/56789-1');
    await teardown();
  });

  it('CA: agência inválida → 422; keyType fora do enum → 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, {});
    const agency = await put(app, token, id, body({ bankAccount: { ...BANK, agency: '12' } }));
    assert.equal(agency.statusCode, 422, agency.body);
    const pix = await put(app, token, id, body({ pixKey: { keyType: 'fax', key: 'x' } }));
    assert.equal(pix.statusCode, 400, pix.body);
    await teardown();
  });

  it('CA: campo maior que a coluna (DV com 6 caracteres) → 400 na borda, não 5xx', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, {});
    const res = await put(app, token, id, body({ bankAccount: { ...BANK, checkDigit: '123456' } }));
    assert.equal(res.statusCode, 400, res.body);
    await teardown();
  });
});

// #1053 — Território no PUT. Território pode ser SUBSTITUÍDO, nunca APAGADO (decisão da P.O.).
// A captura PUT→diff→histórico é inspecionada via `listCollaboratorHistory` (porta compartilhada,
// escrita pelo PUT). O export CSV é coberto ponta a ponta em `collaborators-history.routes.test.ts`.
describe('COLLABORATORS-HTTP-EDIT — território no PUT (#1053)', () => {
  const CE = { uf: 'CE', municipality: 'Fortaleza' };
  const SP = { uf: 'SP', municipality: 'Campinas' };

  const historyOf = async (
    deps: Awaited<ReturnType<typeof makeApp>>['partnersDeps'],
    id: string,
  ) => {
    const r = await deps.listCollaboratorHistory(id);
    assert.ok(r.ok);
    return r.value;
  };
  const territoryLine = (entries: Awaited<ReturnType<typeof historyOf>>) =>
    entries.find((e) => e.fieldName === 'territory');

  it('CA: troca o território (CE/Fortaleza → SP/Campinas) → 200, linha de histórico com autor', async () => {
    const { app, teardown, partnersDeps } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, { territory: CE });
    const res = await put(app, token, id, body({ territory: SP }));
    assert.equal(res.statusCode, 200, res.body);

    const line = territoryLine(await historyOf(partnersDeps, id));
    assert.ok(line, 'esperava linha de territory');
    assert.equal(line.fieldLabel, 'Território');
    assert.equal(line.valueBefore, 'CE/Fortaleza');
    assert.equal(line.valueAfter, 'SP/Campinas');
    assert.ok((line.changedByUserId ?? '').length > 0, 'autor (userId) ausente');
    assert.equal(line.changedByName, EDITOR_NAME);
    await teardown();
  });

  it('CA: sem → com território → 200 e historico_antes vazio (valueBefore null)', async () => {
    const { app, teardown, partnersDeps } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, {}); // criado sem território
    const res = await put(app, token, id, body({ territory: CE }));
    assert.equal(res.statusCode, 200, res.body);

    const line = territoryLine(await historyOf(partnersDeps, id));
    assert.equal(line?.valueBefore, null);
    assert.equal(line?.valueAfter, 'CE/Fortaleza');
    await teardown();
  });

  it('CA: territory ausente ou null NÃO gera linha de Território', async () => {
    const { app, teardown, partnersDeps } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, { territory: CE });
    assert.equal((await put(app, token, id, body({ role: 'Coord.' }))).statusCode, 200); // ausente
    assert.equal(
      (await put(app, token, id, body({ role: 'Coord.', territory: null }))).statusCode,
      200,
    ); // null
    const fields = (await historyOf(partnersDeps, id)).map((e) => e.fieldName);
    assert.ok(
      !fields.includes('territory'),
      `não devia haver linha de territory: ${fields.join(',')}`,
    );
    await teardown();
  });

  it('CA: substituição parcial (troca UF e zera município) → 200 e depois = "SP/"', async () => {
    const { app, teardown, partnersDeps } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, { territory: CE });
    const res = await put(app, token, id, body({ territory: { uf: 'SP', municipality: '' } }));
    assert.equal(res.statusCode, 200, res.body);
    const line = territoryLine(await historyOf(partnersDeps, id));
    assert.equal(line?.valueBefore, 'CE/Fortaleza');
    assert.equal(line?.valueAfter, 'SP/');
    await teardown();
  });

  it('CA: zerar os dois com território gravado → 422 (removal-forbidden), nada muda', async () => {
    const { app, teardown, partnersDeps } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, { territory: CE });
    for (const terr of [
      { uf: '', municipality: '' },
      { uf: null, municipality: null },
      { uf: '  ', municipality: '  ' },
    ]) {
      const res = await put(app, token, id, body({ territory: terr }));
      assert.equal(res.statusCode, 422, res.body);
    }
    const fields = (await historyOf(partnersDeps, id)).map((e) => e.fieldName);
    assert.ok(!fields.includes('territory'), 'recusa não devia escrever histórico');
    await teardown();
  });

  it('CA: zerar os dois SEM território gravado → 200 (mantém null), sem linha', async () => {
    const { app, teardown, partnersDeps } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, {}); // criado sem território
    const res = await put(app, token, id, body({ territory: { uf: '', municipality: '' } }));
    assert.equal(res.statusCode, 200, res.body);
    const fields = (await historyOf(partnersDeps, id)).map((e) => e.fieldName);
    assert.ok(!fields.includes('territory'), 'não devia haver linha de territory');
    await teardown();
  });

  it('CA: UF que não é sigla BR → 422 (territory-uf-invalid)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, {});
    const res = await put(
      app,
      token,
      id,
      body({ territory: { uf: 'XX', municipality: 'Qualquer' } }),
    );
    assert.equal(res.statusCode, 422, res.body);
    await teardown();
  });

  it('CA: funciona no colaborador COMPLETE (registrationStatus preservado)', async () => {
    const { app, teardown, partnersDeps } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, { territory: CE });
    const completed = await app.inject({
      method: 'PATCH',
      url: `/api/v1/collaborators/${id}/complete-registration`,
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    assert.equal(completed.statusCode, 200, completed.body);

    const res = await put(app, token, id, body({ territory: SP }));
    assert.equal(res.statusCode, 200, res.body);
    const line = territoryLine(await historyOf(partnersDeps, id));
    assert.equal(line?.valueAfter, 'SP/Campinas');
    await teardown();
  });
});

describe('COLLABORATORS-HTTP-EDIT — RG, nascimento e raça preenchidos uma vez (P.O. 19/10)', () => {
  const historyOf = async (
    deps: Awaited<ReturnType<typeof makeApp>>['partnersDeps'],
    id: string,
  ) => {
    const r = await deps.listCollaboratorHistory(id);
    assert.ok(r.ok);
    return r.value;
  };

  // Caso real: cadastro completado com os três em branco.
  const createCompleteWithout = async (
    app: Awaited<ReturnType<typeof buildApp>>,
    token: string,
  ) => {
    const id = await create(app, token, {});
    const completed = await app.inject({
      method: 'PATCH',
      url: `/api/v1/collaborators/${id}/complete-registration`,
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    assert.equal(completed.statusCode, 200, completed.body);
    return id;
  };

  const FILLED = { rg: '12.345.678-9', dateOfBirth: '1990-05-20', race: 'PARDO' };

  it('CA: completo com os três vazios → PUT preenche → 200, histórico com label PT e autor', async () => {
    const { app, teardown, partnersDeps } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createCompleteWithout(app, token);

    const res = await put(app, token, id, body(FILLED));
    assert.equal(res.statusCode, 200, res.body);

    const entries = await historyOf(partnersDeps, id);
    const byField = (f: string) => entries.find((e) => e.fieldName === f);
    assert.equal(byField('rg')?.fieldLabel, 'RG');
    assert.equal(byField('rg')?.valueBefore, null);
    assert.equal(byField('rg')?.valueAfter, '12.345.678-9');
    assert.equal(byField('dateOfBirth')?.fieldLabel, 'Data de Nascimento');
    assert.equal(byField('dateOfBirth')?.valueAfter, '1990-05-20');
    assert.equal(byField('race')?.fieldLabel, 'Raça/Cor');
    assert.equal(byField('race')?.valueAfter, 'PARDO');
    assert.equal(byField('race')?.changedByName, EDITOR_NAME);
    await teardown();
  });

  it('CA: depois de gravado, reenviar o mesmo valor → 200 sem linha nova; trocar → 409', async () => {
    const { app, teardown, partnersDeps } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createCompleteWithout(app, token);
    assert.equal((await put(app, token, id, body(FILLED))).statusCode, 200);
    const before = (await historyOf(partnersDeps, id)).length;

    // O PUT é total: o front reenvia o que leu — não pode virar recusa nem linha de histórico.
    assert.equal((await put(app, token, id, body(FILLED))).statusCode, 200);
    assert.equal((await historyOf(partnersDeps, id)).length, before);

    for (const change of [
      { rg: '00.000.000-0' },
      { dateOfBirth: '1991-01-01' },
      { race: 'BRANCO' },
    ]) {
      const res = await put(app, token, id, body({ ...FILLED, ...change }));
      assert.equal(res.statusCode, 409, res.body);
      assert.equal(
        (res.json() as { error: { code: string } }).error.code,
        'collaborator-personal-data-immutable',
      );
    }
    assert.equal(
      (await historyOf(partnersDeps, id)).length,
      before,
      'recusa não escreve histórico',
    );
    await teardown();
  });

  it('CA: o body atual do front (sem os três) → 200 e não mexe em nada', async () => {
    const { app, teardown, partnersDeps } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createCompleteWithout(app, token);
    assert.equal((await put(app, token, id, body(FILLED))).statusCode, 200);

    const res = await put(
      app,
      token,
      id,
      body({ role: 'Coordenadora', rg: null, dateOfBirth: null, race: null }),
    );
    assert.equal(res.statusCode, 200, res.body);
    // Se `null` tivesse apagado, o reenvio do valor original voltaria a gravar (sem 409).
    const swap = await put(app, token, id, body({ race: 'BRANCO' }));
    assert.equal(swap.statusCode, 409, swap.body);
    const fields = (await historyOf(partnersDeps, id)).map((e) => e.fieldName);
    assert.equal(fields.filter((f) => f === 'race').length, 1, 'só a linha do preenchimento');
    await teardown();
  });

  it('CA: raça fora do enum → 422; data inválida → 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createCompleteWithout(app, token);
    assert.equal((await put(app, token, id, body({ race: 'XYZ' }))).statusCode, 422);
    assert.equal((await put(app, token, id, body({ dateOfBirth: 'não-é-data' }))).statusCode, 400);
    await teardown();
  });
});

describe('#1072 — dado pessoal normalizado e "preenche uma vez" em todo comando (borda)', () => {
  const historyOf = async (
    deps: Awaited<ReturnType<typeof makeApp>>['partnersDeps'],
    id: string,
  ) => {
    const r = await deps.listCollaboratorHistory(id);
    assert.ok(r.ok);
    return r.value;
  };
  const patchComplete = (
    app: Awaited<ReturnType<typeof buildApp>>,
    token: string,
    id: string,
    payload: Record<string, unknown>,
  ) =>
    app.inject({
      method: 'PATCH',
      url: `/api/v1/collaborators/${id}/complete-registration`,
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
  const codeOf = (res: { json: () => unknown }): string =>
    (res.json() as { error: { code: string } }).error.code;
  const createCompleteWithout = async (
    app: Awaited<ReturnType<typeof buildApp>>,
    token: string,
  ): Promise<string> => {
    const id = await create(app, token, {});
    const completed = await patchComplete(app, token, id, {});
    assert.equal(completed.statusCode, 200, completed.body);
    return id;
  };

  it('CA1: PUT grava o RG em PreRegistration; complete-registration sem rg NÃO apaga; com rg diferente → 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, {});
    assert.equal((await put(app, token, id, body({ rg: '123' }))).statusCode, 200);

    const conflict = await patchComplete(app, token, id, { rg: '999' });
    assert.equal(conflict.statusCode, 409, conflict.body);
    assert.equal(codeOf(conflict), 'collaborator-personal-data-immutable');

    const completed = await patchComplete(app, token, id, {});
    assert.equal(completed.statusCode, 200, completed.body);
    // Se o complete tivesse apagado o RG, o PUT abaixo preencheria (200) em vez de recusar.
    const swap = await put(app, token, id, body({ rg: '999' }));
    assert.equal(swap.statusCode, 409, swap.body);
    assert.equal((await put(app, token, id, body({ rg: '123' }))).statusCode, 200);
    await teardown();
  });

  it('CA4: RG com 21 caracteres → 400 na borda (PUT e complete-registration), nunca 503', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, {});
    const rg21 = '1'.repeat(21);
    assert.equal((await put(app, token, id, body({ rg: rg21 }))).statusCode, 400);
    assert.equal((await patchComplete(app, token, id, { rg: rg21 })).statusCode, 400);
    assert.equal((await put(app, token, id, body({ rg: '1'.repeat(20) }))).statusCode, 200);
    await teardown();
  });

  it('CA5: data com fuso -03:00 grava o dia civil digitado; reenviar a data pura → 200 sem mudança', async () => {
    const { app, teardown, partnersDeps } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createCompleteWithout(app, token);

    const first = await put(app, token, id, body({ dateOfBirth: '1990-05-10T22:00:00-03:00' }));
    assert.equal(first.statusCode, 200, first.body);
    const entries = await historyOf(partnersDeps, id);
    const dob = entries.filter((e) => e.fieldName === 'dateOfBirth');
    assert.equal(dob.length, 1);
    assert.equal(dob[0]?.valueAfter, '1990-05-10');

    const again = await put(app, token, id, body({ dateOfBirth: '1990-05-10' }));
    assert.equal(again.statusCode, 200, again.body);
    assert.equal((await historyOf(partnersDeps, id)).length, entries.length, 'sem linha nova');
    await teardown();
  });

  it("CA5: dateOfBirth '' mantém o gravado (contrato do #1070), não 400", async () => {
    const { app, teardown, partnersDeps } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createCompleteWithout(app, token);
    assert.equal((await put(app, token, id, body({ dateOfBirth: '1990-05-10' }))).statusCode, 200);
    const before = (await historyOf(partnersDeps, id)).length;

    const blank = await put(app, token, id, body({ dateOfBirth: '' }));
    assert.equal(blank.statusCode, 200, blank.body);
    assert.equal((await historyOf(partnersDeps, id)).length, before);
    // Se '' tivesse apagado, a troca abaixo preencheria (200) em vez de recusar.
    assert.equal((await put(app, token, id, body({ dateOfBirth: '1991-01-01' }))).statusCode, 409);
    await teardown();
  });

  it('CA5: data futura → 422 (domínio); calendário impossível, número e texto livre → 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createCompleteWithout(app, token);

    const future = await put(app, token, id, body({ dateOfBirth: '2090-01-01' }));
    assert.equal(future.statusCode, 422, future.body);
    assert.equal(codeOf(future), 'collaborator-date-of-birth-in-future');

    for (const dateOfBirth of ['2026-02-30', 0, '10/05/1990', '1990-05-10T25:00:00Z']) {
      const res = await put(app, token, id, body({ dateOfBirth }));
      assert.equal(res.statusCode, 400, `${String(dateOfBirth)}: ${res.body}`);
    }

    // Abaixo do piso do DATETIME: o domínio recusa (422), em vez do MySQL recusar e virar 503.
    // '0050' é o caso traiçoeiro: `Date.UTC(50, …)` vira 1950 — teria passado como data válida.
    for (const dateOfBirth of ['0500-01-01', '0050-01-01']) {
      const ancient = await put(app, token, id, body({ dateOfBirth }));
      assert.equal(ancient.statusCode, 422, `${dateOfBirth}: ${ancient.body}`);
      assert.equal(codeOf(ancient), 'collaborator-date-of-birth-invalid');
    }
    await teardown();
  });

  it('contrato: /docs/json gera e documenta rg (maxLength 20) e dateOfBirth (string) no PUT', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    assert.equal(res.statusCode, 200, res.body);
    const doc = res.json() as {
      paths: Record<string, Record<string, { requestBody?: unknown }>>;
    };
    const putBody = JSON.stringify(doc.paths['/api/v1/collaborators/{id}']?.['put']?.requestBody);
    assert.match(putBody, /"rg":\{[^}]*"maxLength":20/);
    assert.match(putBody, /"dateOfBirth":\{[^}]*"string"/);
    await teardown();
  });
});
