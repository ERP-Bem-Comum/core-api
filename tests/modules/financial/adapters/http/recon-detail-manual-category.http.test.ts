/**
 * FIN-RECON-DETAIL-MANUAL-CATEGORY — W0 (RED) — fatia 1: categoria do lançamento manual no detalhe.
 *
 * O modal "Conciliação realizada — lançamento manual" mostra Categoria "—". O detalhe
 * (`GET /statement-transactions/:id/reconciliation`) não expõe a categoria do lançamento manual.
 * Aqui: cria manual entry com `categoryRef` da seed → `GET` do detalhe → resposta ecoa `category`
 * = NOME resolvido. RED hoje: o DTO não tem `category`. In-memory (mesmo reconRepo p/ criar e ler).
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler } from 'fastify';

import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import {
  financialHttpPlugin,
  buildFinancialHttpDeps,
} from '#src/modules/financial/public-api/http.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create as createCedente } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import type { ParsedTransaction } from '#src/modules/financial/domain/statement/types.ts';
import {
  createInMemoryBankStatementRepository,
  type BankStatementStore,
} from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.in-memory.ts';
import { createInMemoryReconciliationRepository } from '#src/modules/financial/adapters/persistence/repos/reconciliation-repository.in-memory.ts';
import { createInMemoryExpectedCounterpartStore } from '#src/modules/financial/adapters/persistence/repos/expected-counterpart-store.in-memory.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { createInMemoryReconciliationPeriodStore } from '#src/modules/financial/adapters/persistence/repos/reconciliation-period-store.in-memory.ts';
import { recordManualEntry } from '#src/modules/financial/application/use-cases/record-manual-entry.ts';
import { getTransactionReconciliation } from '#src/modules/financial/application/use-cases/get-transaction-reconciliation.ts';
import { confirmBatch } from '#src/modules/financial/application/use-cases/confirm-batch.ts';

const WRITER = 'reconciliation:write,reconciliation:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';
// Categoria da seed de referência (composition) — "Tarifas bancárias".
const CAT_TARIFAS = 'f1ca7e90-0000-4000-8000-000000000003';

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

const fitidOf = (raw: string) => {
  const f = Fitid.fromNative(raw);
  if (!f.ok) throw new Error('setup: fitid');
  return f.value;
};
const D = new Date('2024-05-18T00:00:00.000Z');
const tx = (raw: string): ParsedTransaction => ({
  fitid: fitidOf(raw),
  date: D,
  movement: 'Debit',
  entryType: 'Fee',
  payeeName: 'BANCO',
  memo: 'tarifa',
  valueCents: 540,
  balanceAfterCents: 0,
});

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;
const txIds: string[] = [];

before(async () => {
  const base = await buildFinancialHttpDeps({ driver: 'memory' });
  const cedenteId = CedenteAccountId.generate();
  const account = createCedente({
    id: cedenteId,
    bankCode: '237',
    agency: '1234',
    accountNumber: '567890',
    accountDigit: '1',
    convenio: '9999999',
    document: '12345678000190',
  });
  if (!account.ok) throw new Error('setup: cedente');

  const imported = importStatement(
    {
      debitAccountRef: String(cedenteId),
      period: { start: D, end: D },
      file: { name: 'e.ofx', format: 'OFX', hash: 'h1' },
      openingBalanceCents: 0,
      closingBalanceCents: 0,
      transactions: [tx('f0'), tx('f1')],
      occurredAt: D,
    },
    new Set(),
  );
  if (!imported.ok) throw new Error('setup: importStatement');
  const statement = imported.value.statement;
  for (const t of statement.transactions) txIds.push(String(t.id));

  const statementStore: BankStatementStore = new Map([[statement.id, statement]]);
  const statementRepo = createInMemoryBankStatementRepository(statementStore);
  const cedenteStore = createInMemoryCedenteAccountStore();
  await cedenteStore.save(account.value);
  // Mesmo reconRepo para CRIAR (recordManualEntry) e LER (getTransactionReconciliation).
  const reconRepo = createInMemoryReconciliationRepository({
    payables: new Map(),
    statements: statementStore,
  });
  const record = recordManualEntry({
    reconciliationRepo: reconRepo,
    statements: statementRepo,
    cedenteStore,
    periods: createInMemoryReconciliationPeriodStore(),
    clock: ClockReal(),
    expectedCounterpartStore: createInMemoryExpectedCounterpartStore(),
  });
  const getDetail = getTransactionReconciliation({ reconciliationRepo: reconRepo });

  const deps = {
    ...base,
    recordManualEntry: record,
    confirmBatch: confirmBatch({ record }),
    getTransactionReconciliation: getDetail,
  };
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [financialHttpPlugin(deps, { requireAuth, authorize })],
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

const postManualEntry = (txId: string, payload: Record<string, unknown>) =>
  handle.app.inject({
    method: 'POST',
    url: `/api/v2/financial/statement-transactions/${txId}/manual-entry`,
    headers: { authorization: `Bearer ${WRITER}` },
    payload,
  });
const getDetailReq = (txId: string) =>
  handle.app.inject({
    method: 'GET',
    url: `/api/v2/financial/statement-transactions/${txId}/reconciliation`,
    headers: { authorization: `Bearer ${WRITER}` },
  });

interface DetailDto {
  type: string;
  category: string | null;
}

describe('FIN-RECON-DETAIL-MANUAL-CATEGORY — categoria do lançamento manual (#fatia 1)', () => {
  it('CA1: manual entry com categoryRef → detalhe ecoa `category` = nome resolvido', async () => {
    const created = await postManualEntry(String(txIds[0]), {
      type: 'Payment',
      categoryRef: CAT_TARIFAS,
    });
    assert.equal(created.statusCode, 201, created.body);

    const res = await getDetailReq(String(txIds[0]));
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as DetailDto;
    assert.equal(body.type, 'ManualEntry');
    assert.equal(body.category, 'Tarifas bancárias');
  });

  it('CA2: manual entry sem categoryRef → category null', async () => {
    const created = await postManualEntry(String(txIds[1]), { type: 'Payment' });
    assert.equal(created.statusCode, 201, created.body);

    const res = await getDetailReq(String(txIds[1]));
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as DetailDto;
    assert.equal(body.category, null);
  });
});
