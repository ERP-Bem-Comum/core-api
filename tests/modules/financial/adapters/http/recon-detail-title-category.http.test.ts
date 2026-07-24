/**
 * FIN-RECON-DETAIL-TITLE-CATEGORY — W0 (RED) — fatia 2: categoria do TÍTULO no detalhe.
 *
 * Espelha `reconciliation-executor-name.http.test.ts` (#175): cria conciliação de título via POST
 * /reconciliations e bate no detalhe. A categoria do título vem do documento conciliado
 * (`payableDocView.findByPayableIds` → categoryRef), resolvida para nome. RED hoje: a fatia 1 só resolve
 * `manualEntry.categoryRef`; para título, `category` vem null.
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
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create as createCedente } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import * as DocumentId from '#src/modules/financial/domain/shared/document-id.ts';
import {
  createInMemoryBankStatementRepository,
  type BankStatementStore,
} from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.in-memory.ts';
import {
  createInMemoryPayableReconciliationView,
  type PayableStore,
} from '#src/modules/financial/adapters/persistence/repos/payable-reconciliation-view.in-memory.ts';
import { createInMemoryReconciliationRepository } from '#src/modules/financial/adapters/persistence/repos/reconciliation-repository.in-memory.ts';
import { createInMemoryPayableDocumentView } from '#src/modules/financial/adapters/persistence/repos/payable-document-view.in-memory.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { createInMemoryReconciliationPeriodStore } from '#src/modules/financial/adapters/persistence/repos/reconciliation-period-store.in-memory.ts';
import { confirmReconciliation } from '#src/modules/financial/application/use-cases/confirm-reconciliation.ts';
import { getTransactionReconciliation } from '#src/modules/financial/application/use-cases/get-transaction-reconciliation.ts';

const WRITER = 'reconciliation:write,reconciliation:read';
const READER = 'reconciliation:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';
const CAT_TARIFAS = 'f1ca7e90-0000-4000-8000-000000000003'; // seed → "Tarifas bancárias"

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

const docRow = (payableId: string, categoryRef: string | null) => ({
  payableId,
  documentId: String(DocumentId.generate()),
  supplierRef: null,
  documentNumber: '43545',
  dueDate: null,
  categoryRef,
  costCenterRef: null,
  competencia: null,
  payeeKind: null,
});

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}

// Cria um handle com uma conciliação de título semeada; `categoryRef` é do documento conciliado.
const buildHandle = async (
  categoryRef: string | null,
): Promise<{ handle: AppHandle; txId: string }> => {
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
      period: {
        start: new Date('2024-05-01T00:00:00.000Z'),
        end: new Date('2024-05-31T00:00:00.000Z'),
      },
      file: { name: 'e.ofx', format: 'OFX', hash: 'h1' },
      openingBalanceCents: 0,
      closingBalanceCents: 1000,
      transactions: [
        {
          fitid: fitidOf('f-tx-1'),
          date: new Date('2024-05-18T00:00:00.000Z'),
          movement: 'Debit',
          entryType: 'TED',
          payeeName: 'FORNECEDOR X',
          memo: 'pagamento',
          valueCents: 1000,
          balanceAfterCents: 0,
        },
      ],
      occurredAt: new Date('2024-05-19T09:00:00.000Z'),
    },
    new Set(),
  );
  if (!imported.ok) throw new Error('setup: importStatement');
  const statement = imported.value.statement;
  const txDomain = statement.transactions[0];
  if (txDomain === undefined) throw new Error('setup: tx');
  const txId = String(txDomain.id);

  const payableA = String(PayableId.generate());
  const statementStore: BankStatementStore = new Map([[statement.id, statement]]);
  const payableStore: PayableStore = new Map([
    [
      payableA,
      {
        id: payableA,
        documentId: String(DocumentId.generate()),
        status: 'Paid',
        valueCents: 1000,
        dueDate: new Date('2024-05-30T00:00:00.000Z'),
        paymentMethod: 'PIX',
      },
    ],
  ]);
  const cedenteStore = createInMemoryCedenteAccountStore();
  await cedenteStore.save(account.value);
  const statementRepo = createInMemoryBankStatementRepository(statementStore);
  const payableView = createInMemoryPayableReconciliationView(payableStore);
  const reconRepo = createInMemoryReconciliationRepository({
    payables: payableStore,
    statements: statementStore,
  });
  const payableDocView = createInMemoryPayableDocumentView([docRow(payableA, categoryRef)]);

  const deps = {
    ...base,
    confirmReconciliation: confirmReconciliation({
      reconciliationRepo: reconRepo,
      payables: payableView,
      statements: statementRepo,
      cedenteStore,
      periods: createInMemoryReconciliationPeriodStore(),
      clock: ClockReal(),
    }),
    getTransactionReconciliation: getTransactionReconciliation({ reconciliationRepo: reconRepo }),
    // Novo dep (fatia 2) — o handler passa a usá-lo. strip-types ignora o tipo até o W1.
    resolveTitleCategoryRef: async (pid: string) => {
      const r = await payableDocView.findByPayableIds([pid]);
      return r.ok ? (r.value[0]?.categoryRef ?? null) : null;
    },
  };
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [financialHttpPlugin(deps, { requireAuth, authorize })],
  });
  const created = await app.inject({
    method: 'POST',
    url: '/api/v2/financial/reconciliations',
    headers: { authorization: `Bearer ${WRITER}` },
    payload: { transactionId: txId, payableIds: [payableA] },
  });
  if (created.statusCode !== 201) throw new Error(`setup: conciliação (${created.body})`);

  return {
    handle: {
      app,
      teardown: async () => {
        await app.close();
        await base.shutdown();
      },
    },
    txId,
  };
};

let withCat: { handle: AppHandle; txId: string };
let noCat: { handle: AppHandle; txId: string };

before(async () => {
  withCat = await buildHandle(CAT_TARIFAS);
  noCat = await buildHandle(null);
});
after(async () => {
  await withCat.handle.teardown();
  await noCat.handle.teardown();
});

const getDetail = (h: AppHandle, txId: string) =>
  h.app.inject({
    method: 'GET',
    url: `/api/v2/financial/statement-transactions/${txId}/reconciliation`,
    headers: { authorization: `Bearer ${READER}` },
  });

interface DetailDto {
  type: string;
  category: string | null;
}

describe('FIN-RECON-DETAIL-TITLE-CATEGORY — categoria do título (#fatia 2)', () => {
  it('CA1: conciliação de título cujo documento tem categoryRef → category = nome resolvido', async () => {
    const res = await getDetail(withCat.handle, withCat.txId);
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as DetailDto;
    assert.equal(body.type, 'Individual');
    assert.equal(body.category, 'Tarifas bancárias');
  });

  it('CA2: título sem categoryRef → category null', async () => {
    const res = await getDetail(noCat.handle, noCat.txId);
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as DetailDto;
    assert.equal(body.category, null);
  });
});
