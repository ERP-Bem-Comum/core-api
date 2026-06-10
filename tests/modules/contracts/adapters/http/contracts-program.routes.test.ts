/**
 * CTR-NUMBER-PROGRAM — W1 — borda HTTP: classificação + metadados + bloco `program`.
 *
 * Cobre o wiring da rota (composition.ts + plugin.ts + schemas.ts):
 *   - POST /contracts (Pending e Active) aceita classification + metadados → persiste + retorna.
 *   - GET /contracts (lista) compõe o bloco `program` em BATCH (uma chamada ao port por página).
 *   - GET /contracts/:id (detalhe) compõe o bloco `program` (single).
 *   - Sem `programReadPort` (degrada) → `program: null`, nunca 500.
 *
 * Driver memory + `ProgramReadPort` fake (sem MySQL/programs real).
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
import type { ProgramReadPort, ProgramView } from '#src/modules/programs/public-api/index.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'writer@example.com'; // seed RBAC: contract:read + contract:write
const PROG_A = '77777777-7777-4777-8777-777777777777';
const CONTRACTOR_ID = '55555555-5555-4555-8555-555555555555';

const viewA: ProgramView = {
  id: PROG_A,
  name: 'Programa Mãe Atende',
  sigla: 'PMA',
  programNumber: 7,
};

// Port fake contável — só conhece PROG_A; registra nº de chamadas para provar batch (sem N+1).
const countingPort = (): { port: ProgramReadPort; calls: () => number } => {
  let calls = 0;
  return {
    calls: () => calls,
    port: {
      getProgramViews: (ids) => {
        calls += 1;
        const map = new Map<string, ProgramView>();
        for (const id of ids) if (id === PROG_A) map.set(PROG_A, viewA);
        return Promise.resolve(ok(map));
      },
    },
  };
};

const makeApp = async (programReadPort?: ProgramReadPort) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: WRITER_EMAIL, password: STRONG, permissions: ['contract:read', 'contract:write'] },
      ],
    },
  });
  const contractsDeps = await buildContractsHttpDeps({
    driver: 'memory',
    ...(programReadPort !== undefined ? { programReadPort } : {}),
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

const bearer = (t: string): Record<string, string> => ({ authorization: `Bearer ${t}` });

const createPendingBody = (over: Record<string, unknown> = {}) => ({
  mode: 'Pending',
  title: 'Contrato com Programa',
  objective: 'Validar classificação + metadados',
  originalValueCents: 5_000_000,
  periodStart: '2026-02-01',
  periodEnd: '2026-12-31',
  contractor: { type: 'supplier', id: CONTRACTOR_ID },
  ...over,
});

describe('CTR-NUMBER-PROGRAM — POST /contracts aceita classification + metadados', () => {
  it('Pending: classification OS + programId/budgetPlanId/categorizacao/centroDeCusto persistem', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v2/contracts',
        headers: bearer(token),
        payload: createPendingBody({
          classification: 'OS',
          programId: PROG_A,
          budgetPlanId: '66666666-6666-4666-8666-666666666666',
          categorizacao: 'Custeio',
          centroDeCusto: 'CC-042',
        }),
      });
      assert.equal(res.statusCode, 201, res.body);
      const body = res.json() as Record<string, unknown>;
      assert.equal(body['classification'], 'OS');
      assert.equal(body['programId'], PROG_A);
      assert.equal(body['budgetPlanId'], '66666666-6666-4666-8666-666666666666');
      assert.equal(body['categorizacao'], 'Custeio');
      assert.equal(body['centroDeCusto'], 'CC-042');
    } finally {
      await teardown();
    }
  });

  it('Pending: sem classification → default CT + metadados null', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v2/contracts',
        headers: bearer(token),
        payload: createPendingBody(),
      });
      assert.equal(res.statusCode, 201, res.body);
      const body = res.json() as Record<string, unknown>;
      assert.equal(body['classification'], 'CT');
      assert.equal(body['programId'], null);
      assert.equal(body['budgetPlanId'], null);
    } finally {
      await teardown();
    }
  });
});

describe('CTR-NUMBER-PROGRAM — GET /contracts compõe bloco program em batch', () => {
  it('listagem: bloco program { id, snapshot:{sigla} } por item, UMA chamada ao port (sem N+1)', async () => {
    const { port, calls } = countingPort();
    const { app, teardown } = await makeApp(port);
    try {
      const token = await login(app);
      // 2 contratos com PROG_A (mesmo programa → batch dedup) + 1 sem programa.
      await app.inject({
        method: 'POST',
        url: '/api/v2/contracts',
        headers: bearer(token),
        payload: createPendingBody({ programId: PROG_A }),
      });
      await app.inject({
        method: 'POST',
        url: '/api/v2/contracts',
        headers: bearer(token),
        payload: createPendingBody({ programId: PROG_A }),
      });
      await app.inject({
        method: 'POST',
        url: '/api/v2/contracts',
        headers: bearer(token),
        payload: createPendingBody(),
      });

      const callsBefore = calls();
      const res = await app.inject({
        method: 'GET',
        url: '/api/v2/contracts',
        headers: bearer(token),
      });
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as { items: { programId: string | null; program: unknown }[] };

      const withProgram = body.items.filter((i) => i.programId === PROG_A);
      assert.equal(withProgram.length, 2);
      for (const item of withProgram) {
        assert.deepEqual(item.program, {
          id: PROG_A,
          snapshot: { name: 'Programa Mãe Atende', sigla: 'PMA', programNumber: 7 },
        });
      }
      const without = body.items.filter((i) => i.programId === null);
      assert.equal(without.length, 1);
      assert.equal(without[0]!.program, null);

      // Batch: a listagem fez no máximo UMA chamada ao port (não N+1).
      assert.equal(calls() - callsBefore, 1);
    } finally {
      await teardown();
    }
  });

  it('sem programReadPort (degrada): item com programId → program.snapshot null, nunca 500', async () => {
    const { app, teardown } = await makeApp(); // sem port
    try {
      const token = await login(app);
      await app.inject({
        method: 'POST',
        url: '/api/v2/contracts',
        headers: bearer(token),
        payload: createPendingBody({ programId: PROG_A }),
      });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v2/contracts',
        headers: bearer(token),
      });
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as { items: { programId: string | null; program: unknown }[] };
      const item = body.items.find((i) => i.programId === PROG_A);
      assert.ok(item !== undefined);
      assert.deepEqual(item.program, { id: PROG_A, snapshot: null });
    } finally {
      await teardown();
    }
  });
});

describe('CTR-NUMBER-PROGRAM — GET /contracts/:id compõe bloco program (single)', () => {
  it('detalhe: bloco program com snapshot resolvido', async () => {
    const { port } = countingPort();
    const { app, teardown } = await makeApp(port);
    try {
      const token = await login(app);
      const created = await app.inject({
        method: 'POST',
        url: '/api/v2/contracts',
        headers: bearer(token),
        payload: createPendingBody({ programId: PROG_A }),
      });
      const id = (created.json() as { id: string }).id;
      const res = await app.inject({
        method: 'GET',
        url: `/api/v2/contracts/${id}`,
        headers: bearer(token),
      });
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as { program: unknown };
      assert.deepEqual(body.program, {
        id: PROG_A,
        snapshot: { name: 'Programa Mãe Atende', sigla: 'PMA', programNumber: 7 },
      });
    } finally {
      await teardown();
    }
  });
});
