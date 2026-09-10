/**
 * Sob `AUTH_RBAC_MODE=bypass` (ADR-0052), aprovar deixa de exigir `payable:approve` — borda HTTP de
 * `POST /api/v2/financial/documents/:id/approve`.
 *
 * A contradição que este arquivo fixa como resolvida: em bypass o `/me` anuncia o catálogo inteiro
 * (`list-user-permissions.ts:35`) e o `authorize` das rotas é no-op, mas a `approval-policy` do
 * domínio lia `payable:approve` do banco cru e recusava. O usuário recebia uma negativa que
 * contradizia o que o sistema acabara de lhe prometer.
 *
 * O par (bypass ligado × desligado) sobre a MESMA autoridade (`canApprove: false`) é o que prova que
 * o flag é a variável — e não outra diferença de montagem.
 *
 * Molde: `approve-document-authority.http.test.ts` (#609), que cobre o mesmo gate com o bypass
 * desligado. Documento criado SEM `approverRef`, para que o único gate exercitado seja o do approve.
 *
 * Driver memory, sem `MYSQL_INTEGRATION`.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok } from '#src/shared/primitives/result.ts';
import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
} from '#src/modules/auth/public-api/http.ts';
import {
  financialHttpPlugin,
  buildFinancialHttpDeps,
} from '#src/modules/financial/public-api/http.ts';
import type {
  AuthUserReadPort,
  ApproverAuthorityReadPort,
} from '#src/modules/auth/public-api/read.ts';
import { adminDevPermissions } from '#src/modules/auth/adapters/http/dev-seed.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const EMAIL = 'sem.papel.aprovador@example.com';

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

/**
 * Autoridade de quem NÃO tem papel com `payable:approve`: é exatamente o que o
 * `user-read.drizzle.ts` devolve nesse caso — `canApprove: false` e, por não haver papel algum,
 * `limitCents: null` (que a policy lê como SEM TETO).
 */
const withoutApproverRole = (): AuthUserReadPort & ApproverAuthorityReadPort => ({
  getUserName: () => Promise.resolve(ok(null)),
  getApproverAuthority: (userId: string) =>
    Promise.resolve(ok({ userId, canApprove: false, limitCents: null })),
  listApproversWithAuthority: () => Promise.resolve(ok([])),
});

const makeApp = async (
  rbacBypass: boolean,
): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    sensitiveRateLimit: { max: 1000, timeWindow: '1 minute' },
    seed: { users: [{ email: EMAIL, password: STRONG, permissions: [...adminDevPermissions] }] },
  });
  // O seed dá as permissões de ROTA de propósito: o guard não pode ser o que recusa, senão o teste
  // provaria o `authorize` em vez da policy do domínio.
  const finDeps = await buildFinancialHttpDeps({
    driver: 'memory',
    authUserReadPort: withoutApproverRole(),
    rbacBypass,
  });

  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const app = await buildApp({
    config: readHttpConfig({ RATE_LIMIT_MAX: '10000' }),
    routes: [
      authHttpPlugin(authDeps),
      financialHttpPlugin(finDeps, { requireAuth, authorize: authDeps.authorize }),
    ],
  });

  const teardown = async (): Promise<void> => {
    await app.close();
    await finDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, teardown };
};

const login = async (app: AppHandle): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: EMAIL, password: STRONG },
  });
  assert.equal(res.statusCode, 200, `login: ${res.statusCode} ${res.body}`);
  return (res.json() as { accessToken: string }).accessToken;
};

/** Boleto sem retenções: líquido = bruto = 100000 (R$ 1.000,00). `approverRef` opcional. */
const createDocument = (app: AppHandle, token: string, numero: string, approverRef?: string) =>
  app.inject({
    method: 'POST',
    url: '/api/v2/financial/documents',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      ...(approverRef !== undefined ? { approverRef } : {}),
      type: 'Boleto',
      documentNumber: numero,
      supplierRef: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      paymentMethod: 'PIX',
      grossValueCents: '100000',
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

/** Cria e exige 201 — para os casos em que a criação é setup, não o que está sob teste. */
const createOpenDocument = async (
  app: AppHandle,
  token: string,
  numero: string,
): Promise<{ id: string; version: number }> => {
  const res = await createDocument(app, token, numero);
  assert.equal(res.statusCode, 201, `create: ${res.statusCode} ${res.body}`);
  const body = res.json() as { id: string; version: number };
  return { id: body.id, version: body.version };
};

const approve = (app: AppHandle, token: string, id: string, version: number) =>
  app.inject({
    method: 'POST',
    url: `/api/v2/financial/documents/${id}/approve`,
    headers: { authorization: `Bearer ${token}` },
    payload: { version },
  });

describe('ADR-0052 — a alçada sob bypass do RBAC (borda HTTP)', () => {
  describe('bypass LIGADO', () => {
    let app: AppHandle;
    let teardown: () => Promise<void>;

    before(async () => {
      ({ app, teardown } = await makeApp(true));
    });
    after(async () => {
      await teardown();
    });

    it('quem nao tem papel aprovador aprova: 200 e documento Approved', async () => {
      const token = await login(app);
      const { id, version } = await createOpenDocument(app, token, 'BOL-BYPASS-1');

      const res = await approve(app, token, id, version);

      assert.equal(res.statusCode, 200, `approve: ${res.statusCode} ${res.body}`);
      assert.equal((res.json() as { status: string }).status, 'Approved');
    });

    /**
     * O limite que separa este arquivo de um bypass que vaza. O MESMO port responde a duas perguntas:
     * "o CHAMADOR pode aprovar?" (ato — afrouxado) e "o `approverRef` INDICADO tem alçada?"
     * (roteamento — enforçado). Afrouxar a segunda gravaria `approverRef` apontando para quem não é
     * aprovador — e a linha SOBREVIVE ao religar da flag, porque o #634 não desfaz dado persistido.
     *
     * É o mesmo motivo que deixa `list` intacto, e por isso a recusa aqui é a asserção que impede
     * alguém de "simplificar" a composição envolvendo o reader do `deps` compartilhado.
     */
    it('a INDICACAO continua enforcada: approverRef sem alcada nao entra, nem sob bypass', async () => {
      const token = await login(app);

      const res = await createDocument(
        app,
        token,
        'BOL-BYPASS-4',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      );

      assert.equal(
        res.statusCode,
        422,
        `o bypass vazou para o gate de indicacao: ${res.statusCode} ${res.body}`,
      );
    });
  });

  describe('bypass DESLIGADO (controle — o #609 intacto)', () => {
    let app: AppHandle;
    let teardown: () => Promise<void>;

    before(async () => {
      ({ app, teardown } = await makeApp(false));
    });
    after(async () => {
      await teardown();
    });

    it('a MESMA autoridade e recusada: 422 sem vazar o slug interno', async () => {
      const token = await login(app);
      const { id, version } = await createOpenDocument(app, token, 'BOL-BYPASS-2');

      const res = await approve(app, token, id, version);

      assert.equal(res.statusCode, 422, `approve: ${res.statusCode} ${res.body}`);
      assert.equal(
        res.body.includes('approver-missing-permission'),
        false,
        'o slug interno vazou no body',
      );
    });

    it('o documento permanece Open apos a recusa', async () => {
      const token = await login(app);
      const { id, version } = await createOpenDocument(app, token, 'BOL-BYPASS-3');

      await approve(app, token, id, version);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v2/financial/documents/${id}`,
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(res.statusCode, 200);
      assert.equal((res.json() as { status: string }).status, 'Open');
    });
  });
});
