/**
 * 010-partner-contract-counts — T006 (W0 RED) — counts nos 3 grids (collaborator/supplier/act).
 *
 * DEVE FALHAR: `PartnersCompositionConfig` ainda não aceita `contractCountRead`, e os list items
 * não trazem `contractsCount`/`amendmentsCount`. GREEN quando o W1 (T007) injetar o read port em
 * `PartnersHttpDeps` e compor as contagens reais nos itens de lista, com **1** chamada de
 * `countByContractor` por página (batch — FR-003/SC-002).
 *
 * Driver memory: o read port é injetado via `seed.contractCountRead`, envolto num spy que conta
 * as invocações de `countByContractor`. As contagens vêm do store in-memory semeado.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import type { FastifyPluginAsync } from 'fastify';

import { buildApp } from '#src/shared/http/app.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
} from '#src/modules/auth/public-api/http.ts';
import {
  collaboratorsHttpPlugin,
  suppliersHttpPlugin,
  actHttpPlugin,
  buildPartnersHttpDeps,
} from '#src/modules/partners/public-api/http.ts';
import {
  COLLABORATOR_PERMISSION,
  SUPPLIER_PERMISSION,
  ACT_PERMISSION,
} from '#src/modules/partners/public-api/permissions.ts';
import {
  makeInMemoryContractCountReadPort,
  type ContractCountReadPort,
  type InMemoryContractCountRow,
} from '#src/modules/contracts/public-api/index.ts';

import type { CollaboratorReadRecord } from '#src/modules/partners/application/ports/collaborator-reader.ts';
import type { Collaborator as CollaboratorEntity } from '#src/modules/partners/domain/collaborator/types.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import type { SupplierReadRecord } from '#src/modules/partners/application/ports/supplier-reader.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import type { ActReadRecord } from '#src/modules/partners/application/ports/act-reader.ts';
import * as Act from '#src/modules/partners/domain/act/act.ts';
import * as ActId from '#src/modules/partners/domain/act/act-id.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const EMAIL = 'grid.leitor@example.com';
const NOW = new Date('2026-01-10T08:00:00.000Z');

// ─── Spy de contagem: conta as invocações de countByContractor ────────────────
type CountSpy = ContractCountReadPort & { calls: () => number };

const spyOf = (port: ContractCountReadPort): CountSpy => {
  let calls = 0;
  return {
    countByContractor: (type, ids) => {
      calls += 1;
      return port.countByContractor(type, ids);
    },
    contractorIdsWithContractStatus: port.contractorIdsWithContractStatus,
    contractorIdsWithAnyContract: port.contractorIdsWithAnyContract,
    calls: () => calls,
  };
};

// ─── Fixtures de parceiros ────────────────────────────────────────────────────
const mkCollab = (name: string, cpf: string): CollaboratorEntity => {
  const r = Collaborator.register({
    id: CollaboratorId.generate(),
    name,
    email: `${name.toLowerCase()}@bemcomum.org`,
    cpf,
    occupationArea: 'PARC',
    role: 'Analista',
    startOfContract: new Date('2026-01-10T00:00:00.000Z'),
    employmentRelationship: 'CLT',
    registeredAt: NOW,
  });
  assert.ok(r.ok, `fixture collab: ${r.ok ? '' : r.error}`);
  return r.value.collaborator;
};

const collabRecord = (c: CollaboratorEntity, legacyId: number): CollaboratorReadRecord => ({
  collaborator: c,
  legacyId,
  createdAt: NOW,
  updatedAt: NOW,
});

const mkSupplier = (name: string, cnpj: string) => {
  const r = Supplier.register({
    id: SupplierId.generate(),
    name,
    email: `${name.toLowerCase()}@fornecedor.com.br`,
    cnpj,
    corporateName: `${name} LTDA`,
    fantasyName: name,
    serviceCategory: 'INFORMATICA',
    bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
    pixKey: null,
    registeredAt: NOW,
  });
  assert.ok(r.ok, `fixture supplier: ${r.ok ? '' : r.error}`);
  return r.value.supplier;
};

const supplierRecord = (
  supplier: SupplierReadRecord['supplier'],
  legacyId: number,
): SupplierReadRecord => ({ supplier, legacyId, createdAt: NOW, updatedAt: NOW });

const mkAct = (name: string, actNumber: string, cnpj: string, emailLocal: string) => {
  const r = Act.register({
    id: ActId.generate(),
    actNumber,
    name,
    email: `${emailLocal}@acordo.org`,
    cnpj,
    corporateName: `${name} LTDA`,
    fantasyName: name,
    occupationArea: 'PARC',
    legalRepresentative: 'Fulano',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    hasFinancialTransfer: false,
    bankAccount: null,
    pixKey: null,
    registeredAt: NOW,
  });
  assert.ok(r.ok, `fixture act: ${r.ok ? '' : r.error}`);
  return r.value.act;
};

const actRecord = (act: ActReadRecord['act'], legacyId: number): ActReadRecord => ({
  act,
  legacyId,
  createdAt: NOW,
  updatedAt: NOW,
});

// ─── App builder genérico (1 plugin por vez) ──────────────────────────────────
type Seed = NonNullable<Parameters<typeof buildPartnersHttpDeps>[0]['seed']>;
type PartnersDeps = Awaited<ReturnType<typeof buildPartnersHttpDeps>>;
type GridHooks = Readonly<{
  requireAuth: ReturnType<typeof makeRequireAuth>;
  authorize: Awaited<ReturnType<typeof buildAuthHttpDeps>>['authorize'];
  hasPermission: Awaited<ReturnType<typeof buildAuthHttpDeps>>['hasPermission'];
}>;
type GridPlugin = (deps: PartnersDeps, hooks: GridHooks) => FastifyPluginAsync;

const makeApp = async (
  permission: string,
  plugin: GridPlugin,
  opts: Readonly<{ seed: Seed; contractCountRead: ContractCountReadPort }>,
) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: { users: [{ email: EMAIL, password: STRONG, permissions: [permission] }] },
  });
  const partnersDeps = await buildPartnersHttpDeps({
    driver: 'memory',
    seed: opts.seed,
    contractCountRead: opts.contractCountRead,
  });
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const hooks: GridHooks = {
    requireAuth,
    authorize: authDeps.authorize,
    hasPermission: authDeps.hasPermission,
  };
  const app = await buildApp({
    routes: [authHttpPlugin(authDeps), { plugin: plugin(partnersDeps, hooks), prefix: '/api/v1' }],
  });
  const teardown = async (): Promise<void> => {
    await app.close();
    await partnersDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, teardown };
};

const login = async (app: Awaited<ReturnType<typeof buildApp>>): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: EMAIL, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

interface Item {
  id: string;
  contractsCount: number;
  amendmentsCount: number;
}
interface Body {
  items: readonly Item[];
}

const get = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  url: string,
): Promise<Body> => {
  const res = await app.inject({
    method: 'GET',
    url,
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(res.statusCode, 200);
  return res.json() as Body;
};

describe('010 T006 — counts no grid de Colaboradores', () => {
  it('item traz contractsCount/amendmentsCount reais; 0/0 para sem contrato; 1 chamada batch', async () => {
    const ana = mkCollab('Ana', '11144477735');
    const bruno = mkCollab('Bruno', '52998224725');
    const rows: readonly InMemoryContractCountRow[] = [
      {
        contractorType: 'collaborator',
        contractorId: String(ana.id),
        status: 'Active',
        amendments: 2,
      },
      {
        contractorType: 'collaborator',
        contractorId: String(ana.id),
        status: 'Active',
        amendments: 1,
      },
      // Bruno: sem contrato → 0/0
    ];
    const spy = spyOf(makeInMemoryContractCountReadPort(rows));
    const { app, teardown } = await makeApp(COLLABORATOR_PERMISSION.read, collaboratorsHttpPlugin, {
      seed: { collaborators: [collabRecord(ana, 1), collabRecord(bruno, 2)] },
      contractCountRead: spy,
    });
    const token = await login(app);
    const body = await get(app, token, '/api/v1/collaborators');
    const byId = new Map(body.items.map((i) => [i.id, i]));
    const anaItem = byId.get(String(ana.id))!;
    const brunoItem = byId.get(String(bruno.id))!;
    assert.equal(anaItem.contractsCount, 2);
    assert.equal(anaItem.amendmentsCount, 3);
    assert.equal(brunoItem.contractsCount, 0);
    assert.equal(brunoItem.amendmentsCount, 0);
    assert.equal(spy.calls(), 1, 'exatamente 1 chamada de countByContractor por página');
    await teardown();
  });
});

describe('010 T006 — counts no grid de Fornecedores', () => {
  it('item traz contagens reais; 0/0 sem contrato; 1 chamada batch', async () => {
    const alpha = mkSupplier('Alpha', '11.222.333/0001-81');
    const beta = mkSupplier('Beta', '11.444.777/0001-61');
    const rows: readonly InMemoryContractCountRow[] = [
      {
        contractorType: 'supplier',
        contractorId: String(alpha.id),
        status: 'Active',
        amendments: 5,
      },
    ];
    const spy = spyOf(makeInMemoryContractCountReadPort(rows));
    const { app, teardown } = await makeApp(SUPPLIER_PERMISSION.read, suppliersHttpPlugin, {
      seed: { suppliers: [supplierRecord(alpha, 1), supplierRecord(beta, 2)] },
      contractCountRead: spy,
    });
    const token = await login(app);
    const body = await get(app, token, '/api/v1/suppliers');
    const byId = new Map(body.items.map((i) => [i.id, i]));
    assert.equal(byId.get(String(alpha.id))!.contractsCount, 1);
    assert.equal(byId.get(String(alpha.id))!.amendmentsCount, 5);
    assert.equal(byId.get(String(beta.id))!.contractsCount, 0);
    assert.equal(byId.get(String(beta.id))!.amendmentsCount, 0);
    assert.equal(spy.calls(), 1);
    await teardown();
  });
});

describe('010 T006 — counts no grid de Acordos (act)', () => {
  it('item traz contagens reais; 0/0 sem contrato; 1 chamada batch', async () => {
    const a1 = mkAct('Acordo Um', 'ACT-001', '11.222.333/0001-81', 'acordo-um');
    const a2 = mkAct('Acordo Dois', 'ACT-002', '11.444.777/0001-61', 'acordo-dois');
    const rows: readonly InMemoryContractCountRow[] = [
      { contractorType: 'act', contractorId: String(a1.id), status: 'Active', amendments: 0 },
    ];
    const spy = spyOf(makeInMemoryContractCountReadPort(rows));
    const { app, teardown } = await makeApp(ACT_PERMISSION.read, actHttpPlugin, {
      seed: { acts: [actRecord(a1, 1), actRecord(a2, 2)] },
      contractCountRead: spy,
    });
    const token = await login(app);
    const body = await get(app, token, '/api/v1/acts');
    const byId = new Map(body.items.map((i) => [i.id, i]));
    assert.equal(byId.get(String(a1.id))!.contractsCount, 1);
    assert.equal(byId.get(String(a1.id))!.amendmentsCount, 0);
    assert.equal(byId.get(String(a2.id))!.contractsCount, 0);
    assert.equal(spy.calls(), 1);
    await teardown();
  });
});
