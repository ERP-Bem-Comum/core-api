/**
 * CA4 da #881 — o teste de rota que roda SEM o seed de dev.
 *
 * A #881 diagnosticou que a aprovação está inoperante em produção e apontou a causa de o defeito
 * ter passado: todos os testes de aprovação rodam contra `fakeAuthorityPort` ou contra o seed de
 * dev, que concede `PermissionCatalog.all` ao admin. Nenhum exercita a junção real
 * `auth_user_role ⋈ auth_role ⋈ auth_role_permission ⋈ auth_permission` que o gate do #609 lê.
 *
 * Este arquivo percorre o caminho INTEIRO de provisionamento, só por HTTP, contra MySQL real:
 *
 *   1. admin autentica                                POST /api/v2/auth/login
 *   2. admin cria um papel aprovador                  POST /api/v1/roles
 *   3. admin cria uma conta nova                      POST /api/v1/users
 *   4. admin atribui o papel à conta nova             POST /api/v1/users/:id/roles
 *   5. a conta nova ativa a senha pelo convite        POST /api/v2/auth/reset-password
 *   6. a conta nova autentica                         POST /api/v2/auth/login
 *   7. admin lança um documento (Open)                POST /api/v2/financial/documents
 *   8. a CONTA NOVA aprova                            POST /api/v2/financial/documents/:id/approve
 *
 * `rbacMode: 'enforced'` de propósito: sob `bypass` o guard vira no-op e o teste não provaria nada
 * sobre permissão. Aqui, só passa quem de fato tem `payable:approve` na tabela.
 *
 * O token de ativação é lido do `auth_outbox` — a mesma fonte que o worker `email-dispatch` lê
 * (ADR-0047). Nenhum minter fake: o convite percorre o mecanismo real.
 *
 * GATE: só roda com `MYSQL_INTEGRATION=1`.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
  usersHttpPlugin,
  rolesHttpPlugin,
} from '#src/modules/auth/public-api/http.ts';
import {
  financialHttpPlugin,
  buildFinancialHttpDeps,
} from '#src/modules/financial/public-api/http.ts';
import { applyMigrations as applyAuthMigrations } from '#src/modules/auth/public-api/migrate.ts';
import { applyMigrations as applyFinancialMigrations } from '#src/modules/financial/public-api/migrate.ts';
import { openAuthMysql } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import type { AuthMysqlHandle } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import { adminDevPermissions } from '#src/modules/auth/adapters/http/dev-seed.ts';
import { mysqlTestUrl } from '#tests/support/mysql-conn.ts';
import { sql } from 'drizzle-orm';

// Fonte ÚNICA da conn de teste (#500). Interpolar a porta à mão reintroduz o bug que o helper
// existe para impedir: `MYSQL_PORT=''` passa pelo `??` e produz `mysql://…@127.0.0.1:/core`.
const CONN = mysqlTestUrl();
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';

const ADMIN_EMAIL = 'admin.provision@example.com';
const ADMIN_PASSWORD = 'Str0ng-Passphrase-2026!';
const NOVA_EMAIL = 'aprovadora.nova@example.com';
const NOVA_PASSWORD = 'Outr4-Passphrase-2026!';
// CPF sintético de teste (checksum válido, não corresponde a pessoa) — o repositório é público.
const NOVA_CPF = '52998224725';

const GROSS_CENTS = '100000'; // R$ 1.000,00
const ACTIVATION_BASE = 'https://app.exemplo.test/ativar';

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

if (!integrationEnabled()) {
  process.stdout.write('[financial:approve-provisioned] MYSQL_INTEGRATION != 1 — pulando.\n');
} else {
  let app: AppHandle;
  let handle: AuthMysqlHandle | undefined;

  // Fechamento INCREMENTAL: cada recurso registra seu closer assim que nasce. Um `teardown` montado
  // só no fim do `before` não fecha nada quando o `before` falha no meio — os pools já abertos
  // seguram o event loop, o processo nunca sai, e o resumo de falhas (que só é impresso na saída)
  // nunca aparece. O sintoma vira "o teste travou" quando o fato é "o teste falhou e não morreu".
  const closers: (() => Promise<void>)[] = [];
  const teardown = async (): Promise<void> => {
    for (const close of closers.reverse()) {
      await close().catch(() => undefined);
    }
    closers.length = 0;
  };

  /** Handle já inicializado. Falha alto e claro em vez de espalhar `!` pelo arquivo. */
  const openHandle = (): AuthMysqlHandle => {
    if (handle === undefined) throw new Error('handle nao inicializado — before falhou antes dele');
    return handle;
  };

  // Este arquivo também ESCREVE em `fin_*` (dois documentos + seus títulos e trilha). A rule de
  // testes exige limpar na entrada toda tabela cujo espaço de chave o arquivo escreve — e a segunda
  // prova (passar duas vezes sem recriar o banco) depende disso. Filhas antes das mães, por causa
  // das FKs. `fin_categories`/`fin_cost_centers` NÃO entram: têm seed de migration, que não volta.
  const resetFinancialTables = async (): Promise<void> => {
    for (const table of ['fin_document_timeline', 'fin_payables', 'fin_documents', 'fin_outbox']) {
      await openHandle().db.execute(sql.raw(`DELETE FROM \`${table}\``));
    }
  };

  before(async () => {
    // Os `build*HttpDeps` com driver mysql NÃO migram (CORE-MIGRATE-BOOT-INVERT) — o schema é
    // provisionado antes, como o job `migrate` faz em produção.
    const authMig = await applyAuthMigrations(CONN);
    if (!authMig.ok) throw new Error(`migrate auth: ${authMig.error}`);
    const finMig = await applyFinancialMigrations(CONN);
    if (!finMig.ok) throw new Error(`migrate financial: ${finMig.error}`);

    const h = await openAuthMysql({ connectionString: CONN, applyMigrations: false });
    if (!h.ok) throw new Error(`openAuthMysql: ${h.error}`);
    const open = h.value;
    handle = open;
    closers.push(() => open.close());

    // Limpeza na ENTRADA, por tabela (rules/testing.md).
    await open.db.delete(open.schema.authUserRole);
    await open.db.delete(open.schema.authRolePermission);
    await open.db.delete(open.schema.authRefreshToken);
    await open.db.delete(open.schema.authPasswordReset);
    await open.db.delete(open.schema.authOutbox);
    await open.db.delete(open.schema.authUser);
    await open.db.delete(open.schema.authRole);
    await open.db.delete(open.schema.authPermission);
    await resetFinancialTables();

    const authDeps = await buildAuthHttpDeps({
      driver: 'mysql',
      connectionString: CONN,
      rbacMode: 'enforced',
      activationBaseUrl: ACTIVATION_BASE,
      sensitiveRateLimit: { max: 1000, timeWindow: '1 minute' },
      // O admin é o único semeado — espelha o `scripts/seed/admin-user.ts`, que é o ÚNICO
      // caminho do repositório que atribui papel a um usuário.
      seed: {
        users: [
          { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, permissions: [...adminDevPermissions] },
        ],
      },
    });

    closers.push(() => authDeps.shutdown());
    // Sem `authUserReadPort` injetado: o financial constrói o real e a junção passa a valer.
    // ⚠️ O financial nomeia o campo `writerUrl` (não `connectionString`, como o auth). Passar o nome
    // errado NÃO falha: `config.writerUrl ?? ''` (composition.ts:777) vira string vazia e o mysql2
    // fica pendurado sem erro — o teste trava em silêncio, sem uma linha no log.
    const finDeps = await buildFinancialHttpDeps({ driver: 'mysql', writerUrl: CONN });
    closers.push(() => finDeps.shutdown());

    const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
    const hooks = { requireAuth, authorize: authDeps.authorize };
    app = await buildApp({
      config: readHttpConfig({ RATE_LIMIT_MAX: '10000' }),
      routes: [
        authHttpPlugin(authDeps),
        {
          plugin: usersHttpPlugin(
            {
              listUsers: authDeps.listUsers,
              getUser: authDeps.getUser,
              createUserByAdmin: authDeps.createUserByAdmin,
              updateUserProfile: authDeps.updateUserProfile,
              activateUser: authDeps.activateUser,
              deactivateUser: authDeps.deactivateUser,
              setProfilePhoto: authDeps.setProfilePhoto,
              removeProfilePhoto: authDeps.removeProfilePhoto,
              getProfilePhoto: authDeps.getProfilePhoto,
            },
            hooks,
          ),
          prefix: '/api/v1',
        },
        {
          plugin: rolesHttpPlugin(
            {
              getUserPermissions: authDeps.getUserPermissions,
              listPermissionCatalog: authDeps.listPermissionCatalog,
              listRoles: authDeps.listRoles,
              createRole: authDeps.createRole,
              updateRole: authDeps.updateRole,
              archiveRole: authDeps.archiveRole,
              assignRole: authDeps.assignRole,
              revokeRole: authDeps.revokeRole,
            },
            hooks,
          ),
          prefix: '/api/v1',
        },
        financialHttpPlugin(finDeps, hooks),
      ],
    });

    closers.push(() => app.close());
  });

  after(async () => {
    // `handle` só existe se o `before` passou das migrations. Sem o guard, um `before` que falhe
    // antes disso faz este hook estourar TypeError síncrono — que o `.catch` NÃO intercepta — e o
    // `teardown()` da última linha nunca roda: exatamente o travamento que o fechamento incremental
    // existe para evitar. Por isso o `try/finally`.
    try {
      if (handle !== undefined) {
        // Este arquivo é o ÚNICO fora do `reset-lockout` que escreve em `auth_password_reset` (o
        // token do convite). Seis suítes irmãs fazem `delete from auth_user` SEM limpar essa filha,
        // e a FK é RESTRICT: o resíduo daqui as derrubaria com `ER_ROW_IS_REFERENCED_2` (1451). A
        // limpeza na entrada protege ESTE arquivo; esta, na saída, protege os vizinhos.
        await handle.db.delete(handle.schema.authPasswordReset).catch(() => undefined);
        await handle.db.delete(handle.schema.authOutbox).catch(() => undefined);
        await resetFinancialTables().catch(() => undefined);
      }
    } finally {
      await teardown();
    }
  });

  const login = async (email: string, password: string): Promise<string> => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/login',
      payload: { email, password },
    });
    assert.equal(res.statusCode, 200, `login ${email}: ${res.statusCode} ${res.body}`);
    return (res.json() as { accessToken: string }).accessToken;
  };

  /** Lê o token de ativação do `auth_outbox` — a mesma fonte do worker `email-dispatch`. */
  const activationTokenOf = async (userId: string): Promise<string> => {
    const open = openHandle();
    const rows = await open.db.select().from(open.schema.authOutbox);
    const mine = rows.filter((r) => r.aggregateId === userId);
    assert.ok(mine.length > 0, 'nenhum evento no auth_outbox para o usuario criado');
    const withUrl = mine
      .map((r) => {
        try {
          return JSON.parse(r.payload) as Record<string, unknown>;
        } catch {
          return {};
        }
      })
      .find((p) => typeof p['activationUrl'] === 'string');
    assert.ok(withUrl !== undefined, 'evento de convite sem activationUrl no payload');
    const url = new URL(String(withUrl['activationUrl']));
    const token = url.searchParams.get('token');
    assert.ok(token !== null && token.length > 0, 'activationUrl sem token');
    return token;
  };

  describe('#881 CA4 — conta provisionada por HTTP aprova pagamento (MySQL real, RBAC enforced)', () => {
    it('o caminho inteiro: criar papel, criar conta, atribuir, ativar, logar e APROVAR', async () => {
      const adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);

      // 1. Papel aprovador. Sem `approvalLimitCents` => sem teto (regra binaria da #299).
      const roleRes = await app.inject({
        method: 'POST',
        url: '/api/v1/roles',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Aprovador Financeiro',
          permissions: ['payable:approve', 'contract:mass-approve'],
        },
      });
      assert.equal(roleRes.statusCode, 201, `criar papel: ${roleRes.statusCode} ${roleRes.body}`);
      const roleId = (roleRes.json() as { id: string }).id;

      // 2. Conta nova. Nasce com hash inutilizavel e um convite pendente.
      const userRes = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Aprovadora Nova',
          cpf: NOVA_CPF,
          email: NOVA_EMAIL,
          telephone: '15997133502',
        },
      });
      assert.equal(userRes.statusCode, 201, `criar usuario: ${userRes.statusCode} ${userRes.body}`);
      const novaUserId = (userRes.json() as { id: string }).id;

      // 3. Vinculo usuario<->papel: a linha que NAO existe em producao para ninguem alem do admin.
      const assignRes = await app.inject({
        method: 'POST',
        url: `/api/v1/users/${novaUserId}/roles`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { roleId },
      });
      assert.ok(
        assignRes.statusCode === 200 || assignRes.statusCode === 204,
        `atribuir papel: ${assignRes.statusCode} ${assignRes.body}`,
      );

      // 4. Ativacao pelo convite: define a senha com o token emitido na criacao.
      const activationToken = await activationTokenOf(novaUserId);
      const resetRes = await app.inject({
        method: 'POST',
        url: '/api/v2/auth/reset-password',
        payload: { token: activationToken, newPassword: NOVA_PASSWORD },
      });
      assert.equal(
        resetRes.statusCode,
        204,
        `ativar senha: ${resetRes.statusCode} ${resetRes.body}`,
      );

      // 5. A conta nova autentica com a propria senha.
      const novaToken = await login(NOVA_EMAIL, NOVA_PASSWORD);

      // 6. O documento e lancado pelo ADMIN: criar exige `fiscal-document:write`, que o papel
      //    aprovador nao tem — separacao de funcoes (Operador != Aprovador).
      const docRes = await app.inject({
        method: 'POST',
        url: '/api/v2/financial/documents',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          type: 'Boleto',
          documentNumber: 'BOL-PROVISION-881',
          supplierRef: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          paymentMethod: 'PIX',
          grossValueCents: GROSS_CENTS,
          sourceDiscountsCents: '0',
          discountsCents: '0',
          penaltyCents: '0',
          interestCents: '0',
          retentions: [],
          registeredTaxes: [],
          dueDate: '2026-12-31',
          asDraft: false,
        },
      });
      assert.equal(docRes.statusCode, 201, `criar documento: ${docRes.statusCode} ${docRes.body}`);
      const doc = docRes.json() as { id: string; version: number };

      // 7. O ATO: a conta nova aprova. Passa pelo guard (payable:approve) E pelo gate do #609,
      //    que le a alcada da juncao real. E o desfecho que a #881 diz nao existir hoje.
      const approveRes = await app.inject({
        method: 'POST',
        url: `/api/v2/financial/documents/${doc.id}/approve`,
        headers: { authorization: `Bearer ${novaToken}` },
        payload: { version: doc.version },
      });

      assert.equal(
        approveRes.statusCode,
        200,
        `APROVAR: ${approveRes.statusCode} ${approveRes.body}`,
      );
      assert.equal((approveRes.json() as { status: string }).status, 'Approved');
    });

    it('controle: conta SEM o papel aprovador e recusada no mesmo caminho', async () => {
      const adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);

      const userRes = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Sem Papel',
          cpf: '71428793860',
          email: 'sem.papel@example.com',
          telephone: '15997133503',
        },
      });
      assert.equal(userRes.statusCode, 201, `criar usuario: ${userRes.statusCode} ${userRes.body}`);
      const semPapelId = (userRes.json() as { id: string }).id;

      const activationToken = await activationTokenOf(semPapelId);
      const resetRes = await app.inject({
        method: 'POST',
        url: '/api/v2/auth/reset-password',
        payload: { token: activationToken, newPassword: NOVA_PASSWORD },
      });
      assert.equal(resetRes.statusCode, 204, `ativar senha: ${resetRes.statusCode}`);
      const semPapelToken = await login('sem.papel@example.com', NOVA_PASSWORD);

      const docRes = await app.inject({
        method: 'POST',
        url: '/api/v2/financial/documents',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          type: 'Boleto',
          documentNumber: 'BOL-PROVISION-881-CTRL',
          supplierRef: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          paymentMethod: 'PIX',
          grossValueCents: GROSS_CENTS,
          sourceDiscountsCents: '0',
          discountsCents: '0',
          penaltyCents: '0',
          interestCents: '0',
          retentions: [],
          registeredTaxes: [],
          dueDate: '2026-12-31',
          asDraft: false,
        },
      });
      assert.equal(docRes.statusCode, 201, `criar documento: ${docRes.statusCode} ${docRes.body}`);
      const doc = docRes.json() as { id: string; version: number };

      const approveRes = await app.inject({
        method: 'POST',
        url: `/api/v2/financial/documents/${doc.id}/approve`,
        headers: { authorization: `Bearer ${semPapelToken}` },
        payload: { version: doc.version },
      });

      // Sob `enforced`, o guard da rota barra ANTES do use case: 403, e nada mais.
      // `notEqual(200)` não serviria: passaria com 401 (token ruim), 404 (documento errado) ou 500,
      // nenhum dos quais prova que foi o RBAC que negou — o teste ficaria verde pelo motivo errado.
      assert.equal(
        approveRes.statusCode,
        403,
        `esperado 403 do guard: ${approveRes.statusCode} ${approveRes.body}`,
      );

      // E o documento não pode ter mudado de estado por uma tentativa recusada.
      const releitura = await app.inject({
        method: 'GET',
        url: `/api/v2/financial/documents/${doc.id}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      assert.equal(releitura.statusCode, 200);
      assert.equal((releitura.json() as { status: string }).status, 'Open');
    });
  });
}
