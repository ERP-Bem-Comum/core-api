/**
 * FIN-MANUAL-ENTRY-DOC-FIELDS — W0 (RED) — #370: campos de documento no lançamento manual.
 *
 * Espelha `manual-entry-taxonomy.http.test.ts`: mesmo harness (auth FAKE + extrato semeado com
 * transações Pending). A borda passa a ACEITAR `documentNumber/documentType/issueDate/documentValueCents`
 * e a ECOAR os 4 na resposta. `documentValueCents` default = valor da transação (`valueCents`).
 *
 * RED hoje: o `z.object` do `manualEntryBodySchema` descarta as chaves desconhecidas → use-case nunca as
 * vê → a resposta não tem os campos → `undefined`. Roda em `pnpm test` puro (InMemory).
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
import { confirmBatch } from '#src/modules/financial/application/use-cases/confirm-batch.ts';

const WRITER = 'reconciliation:write,reconciliation:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';
const TX_VALUE = 990;

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
  valueCents: TX_VALUE,
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
      transactions: [tx('f0'), tx('f1'), tx('f2'), tx('f3')],
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

  const deps = { ...base, recordManualEntry: record, confirmBatch: confirmBatch({ record }) };
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

interface ManualEntryDetail {
  type: string;
  documentNumber: string | null;
  documentType: string | null;
  issueDate: string | null;
  documentValueCents: string | null;
}

describe('FIN-MANUAL-ENTRY-DOC-FIELDS — campos de documento (#370)', () => {
  it('CA1: Payment com os 4 campos (valor divergente) → 201 e resposta ecoa os 4', async () => {
    const res = await postManualEntry(String(txIds[0]), {
      type: 'Payment',
      documentNumber: 'NF 001',
      documentType: 'NFS-e',
      issueDate: '2024-05-10',
      documentValueCents: '1500', // diverge da transação (990) — multa/complemento
    });
    assert.equal(res.statusCode, 201, res.body);
    const body = res.json() as ManualEntryDetail;
    assert.equal(body.documentNumber, 'NF 001');
    assert.equal(body.documentType, 'NFS-e');
    assert.equal(body.issueDate, '2024-05-10');
    assert.equal(body.documentValueCents, '1500');
  });

  it('CA2: sem documentValueCents → default = valor da transação (990)', async () => {
    const res = await postManualEntry(String(txIds[1]), {
      type: 'Payment',
      documentNumber: 'NF 002',
      documentType: 'DANFE',
      issueDate: '2024-05-11',
    });
    assert.equal(res.statusCode, 201, res.body);
    const body = res.json() as ManualEntryDetail;
    assert.equal(body.documentNumber, 'NF 002');
    assert.equal(body.documentValueCents, String(TX_VALUE));
  });

  it('CA3: sem nenhum campo de documento → nulls; documentValueCents cai no default (back-compat)', async () => {
    const res = await postManualEntry(String(txIds[2]), { type: 'Payment' });
    assert.equal(res.statusCode, 201, res.body);
    const body = res.json() as ManualEntryDetail;
    assert.equal(body.documentNumber, null);
    assert.equal(body.documentType, null);
    assert.equal(body.issueDate, null);
    assert.equal(body.documentValueCents, String(TX_VALUE));
  });

  it('CA4 (borda): documentType fora do enum → 400', async () => {
    const res = await postManualEntry(String(txIds[3]), {
      type: 'Payment',
      documentType: 'INVALIDO',
    });
    assert.equal(res.statusCode, 400, res.body);
  });

  it('CA4 (borda): issueDate mal-formada → 400', async () => {
    const res = await postManualEntry(String(txIds[3]), {
      type: 'Payment',
      issueDate: '10/05/2024',
    });
    assert.equal(res.statusCode, 400, res.body);
  });
});
