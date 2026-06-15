/**
 * CON-ACT-CONTRACTOR-RAZAO-SOCIAL — W0 (RED) — contratado ACT identifica-se pela razão social.
 *
 * Quando o contratado de um contrato é um **ACT**, o `contractor.snapshot.name` exposto pela
 * borda deve ser a **Razão Social** (`corporateName`) da instituição parceira — não o objeto
 * do acordo (`name`). Opção 1 do card (sobrescreve `name`, zero mudança no front).
 *
 * Direção `contracts → partners` via `ContractorReadPort` (ADR-0032), composta na borda.
 *
 * RED até o W1: `viewToSnapshot` no ramo `act` ainda usa `view.name` (objeto do acordo) em vez
 * de `view.corporateName`. Driver memory + port fake (sem MySQL/partners real).
 *
 * Cobertura:
 *   - GET /api/v2/contracts/:id (detalhe) com contratado act → snapshot.name = razão social.
 *   - POST /api/v2/contracts com contratado act → 201; o GET subsequente expõe snapshot.name =
 *     razão social (a resposta de criação é o list-item enxuto, sem snapshot — ver REPORT W0).
 *   - Degradação graciosa preservada: act ausente em Parceiros → snapshot null (200, nunca 500).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import { ok } from '#src/shared/primitives/result.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
} from '#src/modules/auth/public-api/http.ts';
import {
  contractsHttpPlugin,
  buildContractsHttpDeps,
} from '#src/modules/contracts/public-api/http.ts';
import type { ContractorReadPort } from '#src/modules/partners/public-api/index.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import { someContractor, someMoney, someFixedPeriod } from '../persistence/fixtures.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'writer@example.com'; // contract:write (cria) + contract:read (lê detalhe)
const CONTRACT_ID = '11111111-1111-4111-8111-111111111111';
const ACT_CONTRACTOR_ID = '55555555-5555-4555-8555-555555555555';
const UPDATED = new Date('2026-05-30T09:30:00.000Z');

// Identificação do ACT: razão social (corporateName) ≠ objeto do acordo (name).
const ACT_CORPORATE_NAME = 'Instituição Parceira LTDA';
const ACT_OBJECT_NAME = 'Acordo de Cooperação Técnica 2026';
const ACT_DOCUMENT = '11222333000181';

const fromOk = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }, label: string): T => {
  if (!r.ok) throw new Error(`fixture ${label}: ${JSON.stringify(r.error)}`);
  return r.value;
};

// Contrato cujo contratado é um ACT (buildContract fixa supplier; aqui montamos act).
const buildActContract = () =>
  fromOk(
    Contract.create({
      id: fromOk(ContractId.rehydrate(CONTRACT_ID), 'ContractId'),
      sequentialNumber: '001/2026',
      title: 'Contrato com ACT',
      objective: 'Validar identificação do contratado ACT pela razão social',
      signedAt: new Date('2026-01-15'),
      originalValue: someMoney(10_000_000),
      originalPeriod: someFixedPeriod('2026-02-01', '2026-12-31'),
      contractor: someContractor('act', ACT_CONTRACTOR_ID),
    }),
    'Contract.create',
  ).contract;

// Port que resolve o ACT com corporateName ≠ name. Demais getters → null.
const actPort = (): ContractorReadPort => ({
  getSupplierView: () => Promise.resolve(ok(null)),
  getFinancierView: () => Promise.resolve(ok(null)),
  getCollaboratorView: () => Promise.resolve(ok(null)),
  getActView: (id) =>
    Promise.resolve(
      ok(
        id === ACT_CONTRACTOR_ID
          ? {
              type: 'act',
              id,
              name: ACT_OBJECT_NAME, // objeto/título do acordo
              corporateName: ACT_CORPORATE_NAME, // razão social — vira o snapshot.name
              email: 'parceira@bemcomum.org',
              document: ACT_DOCUMENT,
              role: 'Representante Legal',
              occupationArea: 'PARC',
              updatedAt: UPDATED,
            }
          : null,
      ),
    ),
});

const emptyPort = (): ContractorReadPort => ({
  getSupplierView: () => Promise.resolve(ok(null)),
  getFinancierView: () => Promise.resolve(ok(null)),
  getCollaboratorView: () => Promise.resolve(ok(null)),
  getActView: () => Promise.resolve(ok(null)),
});

const makeApp = async (port: ContractorReadPort, seedContract = true) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: WRITER_EMAIL,
          password: STRONG,
          permissions: ['contract:read', 'contract:write'],
        },
      ],
    },
  });
  const contractsDeps = await buildContractsHttpDeps({
    driver: 'memory',
    seed: { contracts: seedContract ? [buildActContract()] : [] },
    contractorReadPort: port,
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

const login = async (app: App): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: WRITER_EMAIL, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const bearer = (token: string): Record<string, string> => ({ authorization: `Bearer ${token}` });

interface DetailBody {
  contractor: { type: string; id: string; snapshot: { name: string; document: string } | null };
}

describe('CON-ACT-CONTRACTOR-RAZAO-SOCIAL — GET /contracts/:id (detalhe, contratado act)', () => {
  it('CA1: contractor.snapshot.name = razão social (corporateName), não o objeto do acordo', async () => {
    const { app, teardown } = await makeApp(actPort());
    try {
      const token = await login(app);
      const res = await app.inject({
        method: 'GET',
        url: `/api/v2/contracts/${CONTRACT_ID}`,
        headers: bearer(token),
      });
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as DetailBody;
      assert.equal(body.contractor.type, 'act');
      assert.equal(body.contractor.id, ACT_CONTRACTOR_ID);
      assert.equal(body.contractor.snapshot?.name, ACT_CORPORATE_NAME);
      assert.notEqual(body.contractor.snapshot?.name, ACT_OBJECT_NAME);
      assert.equal(body.contractor.snapshot?.document, ACT_DOCUMENT);
    } finally {
      await teardown();
    }
  });

  it('CA5: act ausente em Parceiros → snapshot null (200, nunca 500) — degradação graciosa', async () => {
    const { app, teardown } = await makeApp(emptyPort());
    try {
      const token = await login(app);
      const res = await app.inject({
        method: 'GET',
        url: `/api/v2/contracts/${CONTRACT_ID}`,
        headers: bearer(token),
      });
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as DetailBody;
      assert.equal(body.contractor.type, 'act');
      assert.equal(body.contractor.id, ACT_CONTRACTOR_ID);
      assert.equal(body.contractor.snapshot, null);
    } finally {
      await teardown();
    }
  });
});

describe('CON-ACT-CONTRACTOR-RAZAO-SOCIAL — POST /contracts (criação, contratado act)', () => {
  it('CA2: cria contrato com contratado act -> 201; GET subsequente expõe snapshot.name = razão social', async () => {
    // Sem contrato seedado — criamos via POST e depois lemos o detalhe composto.
    const { app, teardown } = await makeApp(actPort(), false);
    try {
      const token = await login(app);
      const created = await app.inject({
        method: 'POST',
        url: '/api/v2/contracts',
        headers: bearer(token),
        payload: {
          mode: 'Active',
          title: 'Novo contrato com ACT',
          objective: 'Objetivo',
          signedAt: '2026-01-15',
          originalValueCents: 10_000_000,
          periodStart: '2026-02-01',
          periodEnd: '2026-12-31',
          contractor: { type: 'act', id: ACT_CONTRACTOR_ID },
        },
      });
      assert.equal(created.statusCode, 201, created.body);
      const id = (created.json() as { id: string }).id;

      const detail = await app.inject({
        method: 'GET',
        url: `/api/v2/contracts/${id}`,
        headers: bearer(token),
      });
      assert.equal(detail.statusCode, 200, detail.body);
      const body = detail.json() as DetailBody;
      assert.equal(body.contractor.type, 'act');
      assert.equal(body.contractor.snapshot?.name, ACT_CORPORATE_NAME);
      assert.notEqual(body.contractor.snapshot?.name, ACT_OBJECT_NAME);
    } finally {
      await teardown();
    }
  });
});
