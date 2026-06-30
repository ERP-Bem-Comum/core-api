/**
 * PAR-COLLABORATOR-SELF-REGISTRATION (US5) — W0 (RED) — autocadastro público + convite.
 *
 * DEVE FALHAR: as rotas públicas `GET`/`POST /api/v1/collaborators/autocadastro`, o
 * mint+envio de convite no `POST /collaborators` e o seam de captura `partnersDeps.sentInvites`
 * ainda não existem. GREEN quando o W1 entregar: minter (`randomBytes(32)`+`sha256`, espelho do
 * `password-reset-token-minter.node.ts`), port/repo de invite-token (`consume` atômico),
 * mailer PRÓPRIO do partners adaptando `EmailSender` (notifications/public-api — sem importar
 * `auth`) e as 3 rotas — públicas (sem `requireAuth`), `404` uniforme anti-enumeração e
 * `400` cpf-mismatch.
 *
 * Contrato canônico: `specs/015-collaborator-complete-registration/contracts/http-contracts.md:37-46`.
 * OWASP Forgot Password Cheat Sheet: token uso-único + TTL, armazenado como HASH, resposta/tempo
 * consistentes para não vazar existência (anti-enumeração).
 *
 * Driver memory: o convite é capturado por um fake invite-mailer exposto em `deps.sentInvites`
 * (espelha como o bootstrap dirigiu `buildPartnersHttpDeps` a expor `listCollaborators`). O token
 * CLARO só é conhecido via captura do e-mail — igual ao fluxo real (o store guarda só o hash).
 * Expiração (TTL) é coberta no nível de domínio (`invite-token.test.ts`, já GREEN) + use-case no W1.
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
  collaboratorsHttpPlugin,
  buildPartnersHttpDeps,
} from '#src/modules/partners/public-api/http.ts';
import { COLLABORATOR_PERMISSION } from '#src/modules/partners/public-api/permissions.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'rh.editor@example.com';

const COLLAB_EMAIL = 'maria@bemcomum.org';
const COLLAB_CPF = '11144477735'; // DV válido; prefixo '111'
const VALID_BODY = {
  name: 'Maria Silva',
  email: COLLAB_EMAIL,
  cpf: COLLAB_CPF,
  occupationArea: 'PARC',
  role: 'Analista',
  startOfContract: '2026-01-10',
  employmentRelationship: 'CLT',
};

// Seam W1: o composition memory expõe os convites capturados pelo fake invite-mailer.
type SentInvite = Readonly<{ to: string; token: string }>;
type PartnersDepsWithInvites = Awaited<ReturnType<typeof buildPartnersHttpDeps>> & {
  readonly sentInvites: readonly SentInvite[];
};

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: WRITER_EMAIL, password: STRONG, permissions: [COLLABORATOR_PERMISSION.write] },
      ],
    },
  });
  const partnersDeps = (await buildPartnersHttpDeps({
    driver: 'memory',
  })) as PartnersDepsWithInvites;
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
  return { app, partnersDeps, teardown };
};

const login = async (app: Awaited<ReturnType<typeof buildApp>>): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: WRITER_EMAIL, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

/** CA1: operador autenticado cria pré-cadastro -> 201 + convite minteado/enviado. Retorna o token CLARO. */
const preRegisterAndCaptureInvite = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  partnersDeps: PartnersDepsWithInvites,
  body: typeof VALID_BODY = VALID_BODY,
): Promise<{ token: string }> => {
  const accessToken = await login(app);
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/collaborators',
    headers: { authorization: `Bearer ${accessToken}` },
    payload: body,
  });
  assert.equal(res.statusCode, 201, 'pré-cadastro deve responder 201');
  const sent = partnersDeps.sentInvites.filter((i) => i.to === body.email);
  assert.equal(sent.length, 1, 'CA1: exatamente um convite disparado para o e-mail do colaborador');
  return { token: sent[0]!.token };
};

describe('US5 autocadastro — CA1 POST /collaborators gera convite + e-mail', () => {
  it('CA1: pré-cadastro dispara convite uso-único para o e-mail do colaborador', async () => {
    const { app, partnersDeps, teardown } = await makeApp();
    const { token } = await preRegisterAndCaptureInvite(app, partnersDeps);
    assert.ok(typeof token === 'string' && token.length >= 32, 'token claro de alta entropia');
    await teardown();
  });
});

describe('US5 autocadastro — CA2 GET /collaborators/autocadastro (público, CPF mascarado)', () => {
  it('CA2: token válido -> 200 com CPF mascarado (sem vazar o CPF completo)', async () => {
    const { app, partnersDeps, teardown } = await makeApp();
    const { token } = await preRegisterAndCaptureInvite(app, partnersDeps);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators/autocadastro?token=${encodeURIComponent(token)}`,
    });
    assert.equal(res.statusCode, 200, 'rota pública não exige Authorization');
    const raw = res.body;
    assert.ok(!raw.includes(COLLAB_CPF), 'CA2: CPF completo NÃO pode aparecer na resposta');
    assert.ok(raw.includes('*'), 'CA2: CPF deve vir mascarado');
    await teardown();
  });
});

describe('US5 autocadastro — CA3 token expirado/usado/desconhecido -> 404 uniforme', () => {
  it('CA3: token desconhecido -> 404 (anti-enumeração, sem vazar existência)', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/collaborators/autocadastro?token=desconhecido-aaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('CA3: token já usado -> 404 collaborator-autocadastro-token-used', async () => {
    const { app, partnersDeps, teardown } = await makeApp();
    const { token } = await preRegisterAndCaptureInvite(app, partnersDeps);
    // Consome (CA4 happy path) e tenta reusar.
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators/autocadastro',
      payload: { token, cpfPrefix: '111', genderIdentity: 'MULHER_CIS' },
    });
    assert.equal(first.statusCode, 200, 'primeiro submit consome o token');
    const reused = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators/autocadastro?token=${encodeURIComponent(token)}`,
    });
    assert.equal(reused.statusCode, 404);
    assert.equal(
      (reused.json() as { error: { code: string } }).error.code,
      'collaborator-autocadastro-token-used',
    );
    await teardown();
  });
});

describe('US5 autocadastro — CA4 POST /collaborators/autocadastro (Complete + invalida token)', () => {
  it('CA4: submit válido -> 200 Complete; segundo submit -> 404 (uso-único)', async () => {
    const { app, partnersDeps, teardown } = await makeApp();
    const { token } = await preRegisterAndCaptureInvite(app, partnersDeps);
    const body = { token, cpfPrefix: '111', genderIdentity: 'MULHER_CIS' };
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators/autocadastro',
      payload: body,
    });
    assert.equal(first.statusCode, 200);
    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators/autocadastro',
      payload: body,
    });
    assert.equal(second.statusCode, 404, 'token consumido não completa de novo');
    await teardown();
  });
});

describe('US5 autocadastro — CA5 CPF não confere -> 400', () => {
  it('CA5: prefixo de CPF divergente -> 400 collaborator-autocadastro-cpf-mismatch (token preservado)', async () => {
    const { app, partnersDeps, teardown } = await makeApp();
    const { token } = await preRegisterAndCaptureInvite(app, partnersDeps);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators/autocadastro',
      payload: { token, cpfPrefix: '999', genderIdentity: 'MULHER_CIS' },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(
      (res.json() as { error: { code: string } }).error.code,
      'collaborator-autocadastro-cpf-mismatch',
    );
    // OWASP: não "queimar" o token por input inválido — segue válido após o 400.
    const stillValid = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators/autocadastro?token=${encodeURIComponent(token)}`,
    });
    assert.equal(stillValid.statusCode, 200, 'CA5: CPF errado NÃO invalida o token');
    await teardown();
  });
});
