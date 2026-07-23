/**
 * CTR-TAXONOMY-REFS — W0 (RED) — os 3 refs de taxonomia na borda HTTP (S3 do épico #502).
 *
 * Dois blocos:
 *   A) DTO unit (puro) — `contractToListItem` inclui costCenterRef/categoryRef/subcategoryRef (CA6).
 *   B) Borda inject (driver memory) — create E update aceitam os 3 (z.uuid().optional()),
 *      malformado → 400, opcional → null, DTO de resposta os ecoa (CA2/CA3/CA4/CA5/CA6).
 *
 * DEVE FALHAR (RED pelo motivo certo):
 *  - CA6 DTO: `contractToListItem` não copia os 3 refs (e `registrationShape` não os declara) →
 *    o DTO não tem os campos → `dto.costCenterRef` é `undefined`.
 *  - CA2/CA6 create: `contractWriteShape` (z.object, não strict) DESCARTA a chave desconhecida →
 *    o use case nunca a vê → o detalhe não a ecoa → GET devolve `undefined`, não o UUID.
 *  - CA4: sem o campo no create, o eco `null` (nasce nulo) também é `undefined`.
 *  - CA5 (create): ref malformado é descartado (não validado) → hoje 201, não 400.
 *  - CA5 (update): PATCH com os 3 refs válidos → hoje `patchContractMetadataBodySchema.strict()`
 *    rejeita a chave desconhecida → 400; o alvo é 200 + eco. (NÃO se testa PATCH-malformado→400
 *    aqui: `.strict()` já devolve 400 para QUALQUER chave desconhecida — passaria pelo motivo
 *    errado, mascarando regressão. A validação de formato UUID é coberta pelo create malformado.)
 *
 * Bloco A é puro; bloco B usa repositório InMemory — ambos rodam em `pnpm test` sem MySQL.
 * Regressão zero (CA8): não edita nenhuma suíte/fixture existente.
 * Código EN, comentários PT-BR.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { contractToListItem } from '#src/modules/contracts/adapters/http/contract-dto.ts';
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

// UUID v4 válidos (version=4, variant=8, todos hex — conferido literal a literal).
const COST_CENTER_REF = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const CATEGORY_REF = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const SUBCATEGORY_REF = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

// ─────────────────────────────────────────────────────────────────────────────
// A) DTO unit (puro) — CA6: contractToListItem inclui os 3 refs.
// ─────────────────────────────────────────────────────────────────────────────
describe('contractToListItem — inclui os 3 refs de taxonomia (CTR-TAXONOMY-REFS · CA6)', () => {
  it('serializa costCenterRef/categoryRef/subcategoryRef crus do agregado', () => {
    // Arrange — costura os 3 refs no agregado Active (W1 fará via fixtures/domínio).
    const contract = {
      ...buildContract(),
      costCenterRef: COST_CENTER_REF,
      categoryRef: CATEGORY_REF,
      subcategoryRef: SUBCATEGORY_REF,
    };
    // Act
    const dto = contractToListItem(contract as unknown as Parameters<typeof contractToListItem>[0]);
    // Assert (RED hoje: undefined)
    const d = dto as unknown as {
      costCenterRef?: string | null;
      categoryRef?: string | null;
      subcategoryRef?: string | null;
    };
    assert.equal(d.costCenterRef, COST_CENTER_REF);
    assert.equal(d.categoryRef, CATEGORY_REF);
    assert.equal(d.subcategoryRef, SUBCATEGORY_REF);
  });

  it('CA4: contrato sem os refs → DTO com os 3 campos null', () => {
    // Act
    const dto = contractToListItem(buildContract());
    // Assert
    const d = dto as unknown as {
      costCenterRef?: string | null;
      categoryRef?: string | null;
      subcategoryRef?: string | null;
    };
    assert.equal(d.costCenterRef, null);
    assert.equal(d.categoryRef, null);
    assert.equal(d.subcategoryRef, null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B) Borda inject (driver memory) — CA2/CA3/CA4/CA5/CA6.
// ─────────────────────────────────────────────────────────────────────────────
const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'writer@example.com'; // contract:write + contract:read (create + GET/PATCH echo)
const SEEDED_ID = '11111111-1111-4111-8111-111111111111';

const CONTRACTOR_BODY = { type: 'supplier', id: '55555555-5555-4555-8555-555555555555' };

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: WRITER_EMAIL,
          password: STRONG,
          permissions: ['contract:write', 'contract:read'],
        },
      ],
    },
  });
  const contractsDeps = await buildContractsHttpDeps({
    driver: 'memory',
    seed: { contracts: [buildContract({ id: SEEDED_ID, sequentialNumber: '001/2026' })] },
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

const login = async (app: App, email: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const bearer = (t: string): Record<string, string> => ({ authorization: `Bearer ${t}` });

const activeBody = (overrides: Record<string, unknown> = {}) => ({
  mode: 'Active',
  title: 'Contrato taxonomia',
  objective: 'Objetivo',
  signedAt: '2026-01-15',
  originalValueCents: 10_000_000,
  periodStart: '2026-02-01',
  periodEnd: '2026-12-31',
  contractor: CONTRACTOR_BODY,
  costCenterRef: COST_CENTER_REF,
  categoryRef: CATEGORY_REF,
  subcategoryRef: SUBCATEGORY_REF,
  ...overrides,
});

const createContract = (app: App, token: string, body: Record<string, unknown>) =>
  app.inject({ method: 'POST', url: '/api/v2/contracts', headers: bearer(token), payload: body });

const getContract = (app: App, token: string, id: string) =>
  app.inject({ method: 'GET', url: `/api/v2/contracts/${id}`, headers: bearer(token) });

const patchContract = (app: App, token: string, id: string, body: Record<string, unknown>) =>
  app.inject({
    method: 'PATCH',
    url: `/api/v2/contracts/${id}`,
    headers: bearer(token),
    payload: body,
  });

interface DetailRefs {
  status: string;
  costCenterRef: string | null;
  categoryRef: string | null;
  subcategoryRef: string | null;
  programId: string | null;
  budgetPlanId: string | null;
  categorizacao: string | null;
  centroDeCusto: string | null;
}

describe('CTR-TAXONOMY-REFS — borda HTTP: create aceita e ecoa os 3 refs', () => {
  it('CA2+CA6: POST /contracts com os 3 refs → 201 e GET ecoa os 3', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app, WRITER_EMAIL);
      const createRes = await createContract(app, token, activeBody());
      assert.equal(createRes.statusCode, 201, createRes.body);
      const id = (createRes.json() as { id: string }).id;

      const getRes = await getContract(app, token, id);
      assert.equal(getRes.statusCode, 200, getRes.body);
      const detail = getRes.json() as DetailRefs;
      assert.equal(detail.costCenterRef, COST_CENTER_REF);
      assert.equal(detail.categoryRef, CATEGORY_REF);
      assert.equal(detail.subcategoryRef, SUBCATEGORY_REF);
    } finally {
      await teardown();
    }
  });

  it('CA3: os 3 refs convivem com programId/budgetPlanId e texto livre (todos ecoados)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app, WRITER_EMAIL);
      const createRes = await createContract(
        app,
        token,
        activeBody({
          programId: '77777777-7777-4777-8777-777777777777',
          budgetPlanId: '88888888-8888-4888-8888-888888888888',
          categorizacao: 'Investimento',
          centroDeCusto: 'CC-100',
        }),
      );
      assert.equal(createRes.statusCode, 201, createRes.body);
      const id = (createRes.json() as { id: string }).id;

      const detail = (await getContract(app, token, id)).json() as DetailRefs;
      // Novos:
      assert.equal(detail.costCenterRef, COST_CENTER_REF);
      assert.equal(detail.categoryRef, CATEGORY_REF);
      assert.equal(detail.subcategoryRef, SUBCATEGORY_REF);
      // Antigos coexistem (regressão zero):
      assert.equal(detail.programId, '77777777-7777-4777-8777-777777777777');
      assert.equal(detail.budgetPlanId, '88888888-8888-4888-8888-888888888888');
      assert.equal(detail.categorizacao, 'Investimento');
      assert.equal(detail.centroDeCusto, 'CC-100');
    } finally {
      await teardown();
    }
  });

  it('CA4: create sem os refs → nascem null (back-compat)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app, WRITER_EMAIL);
      const createRes = await createContract(
        app,
        token,
        activeBody({ costCenterRef: undefined, categoryRef: undefined, subcategoryRef: undefined }),
      );
      assert.equal(createRes.statusCode, 201, createRes.body);
      const id = (createRes.json() as { id: string }).id;

      const detail = (await getContract(app, token, id)).json() as DetailRefs;
      assert.equal(detail.costCenterRef, null);
      assert.equal(detail.categoryRef, null);
      assert.equal(detail.subcategoryRef, null);
    } finally {
      await teardown();
    }
  });

  it('CA5 (borda): subcategoryRef malformado no create → 400 (rejeitado no Zod, não chega ao domínio)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app, WRITER_EMAIL);
      const res = await createContract(app, token, activeBody({ subcategoryRef: 'not-a-uuid' }));
      assert.equal(res.statusCode, 400, res.body);
    } finally {
      await teardown();
    }
  });

  it('CA5 (borda): costCenterRef malformado no create → 400', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app, WRITER_EMAIL);
      const res = await createContract(app, token, activeBody({ costCenterRef: 'xyz' }));
      assert.equal(res.statusCode, 400, res.body);
    } finally {
      await teardown();
    }
  });
});

describe('CTR-TAXONOMY-REFS — borda HTTP: update (PATCH) aceita e ecoa os 3 refs', () => {
  it('CA5+CA6: PATCH /contracts/:id com os 3 refs → 200 e ecoa os 3', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app, WRITER_EMAIL);
      const res = await patchContract(app, token, SEEDED_ID, {
        costCenterRef: COST_CENTER_REF,
        categoryRef: CATEGORY_REF,
        subcategoryRef: SUBCATEGORY_REF,
      });
      // Hoje: patchContractMetadataBodySchema.strict() rejeita as chaves → 400. Alvo: 200 + eco.
      assert.equal(res.statusCode, 200, res.body);
      const detail = res.json() as DetailRefs;
      assert.equal(detail.costCenterRef, COST_CENTER_REF);
      assert.equal(detail.categoryRef, CATEGORY_REF);
      assert.equal(detail.subcategoryRef, SUBCATEGORY_REF);
    } finally {
      await teardown();
    }
  });
});
