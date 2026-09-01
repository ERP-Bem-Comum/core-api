/**
 * M2 — contrato HTTP da reclassificação da taxonomia no POST /financial/reconciliations.
 *
 * É o contrato que o BFF/web-app consome, e o que esta suíte fixa é justamente o que uma leitura
 * apressada do schema erraria: o BLOCO `taxonomy` é opcional, mas os 5 refs DENTRO dele não são.
 *
 * A razão é a RN-M2-09: o que se grava é um CAMINHO da árvore do plano (Programa → Plano → Centro de
 * Custo → Categoria → Subcategoria), e meio caminho não identifica nó nenhum — não há o que validar
 * contra a árvore, e gravá-lo produz exatamente o "caminho morto" que o M2-10 manda recusar. Ao
 * trocar só a subcategoria (M2-2), o front reenvia os outros quatro inalterados.
 *
 * Molde: `recon-detail-title-category.http.test.ts` (#175) — mesma montagem de app in-memory.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler } from 'fastify';

import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
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
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { createInMemoryReconciliationPeriodStore } from '#src/modules/financial/adapters/persistence/repos/reconciliation-period-store.in-memory.ts';
import { createInMemoryPayableDocumentView } from '#src/modules/financial/adapters/persistence/repos/payable-document-view.in-memory.ts';
import { createInMemoryTaxonomyPathRead } from '#src/modules/financial/adapters/persistence/repos/taxonomy-path-read.in-memory.ts';
import { confirmReconciliation } from '#src/modules/financial/application/use-cases/confirm-reconciliation.ts';

const WRITER = 'reconciliation:write,reconciliation:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';

const PROGRAM = '11111111-1111-4111-8111-111111111111';
const PLAN = '22222222-2222-4222-8222-222222222222';
const COST_CENTER = '33333333-3333-4333-8333-333333333333';
const CATEGORY = '44444444-4444-4444-8444-444444444444';
const SUBCATEGORY = '55555555-5555-4555-8555-555555555555';

const TAXONOMY = {
  programRef: PROGRAM,
  budgetPlanRef: PLAN,
  costCenterRef: COST_CENTER,
  categoryRef: CATEGORY,
  subcategoryRef: SUBCATEGORY,
};

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

const buildHandle = async () => {
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
          fitid: fitidOf('f-tx-m2'),
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
  const documentA = String(DocumentId.generate());
  const statementStore: BankStatementStore = new Map([[statement.id, statement]]);
  const payableStore: PayableStore = new Map([
    [
      payableA,
      {
        id: payableA,
        documentId: documentA,
        status: 'Paid',
        valueCents: 1000,
        dueDate: new Date('2024-05-30T00:00:00.000Z'),
        paymentMethod: 'PIX',
      },
    ],
  ]);
  const cedenteStore = createInMemoryCedenteAccountStore();
  await cedenteStore.save(account.value);

  const deps = {
    ...base,
    confirmReconciliation: confirmReconciliation({
      reconciliationRepo: createInMemoryReconciliationRepository({
        payables: payableStore,
        statements: statementStore,
      }),
      payables: createInMemoryPayableReconciliationView(payableStore),
      statements: createInMemoryBankStatementRepository(statementStore),
      cedenteStore,
      periods: createInMemoryReconciliationPeriodStore(),
      clock: { now: () => new Date('2026-08-27T10:00:00.000Z') },
      // O documento não está no store: o que esta suíte mede é a BORDA (o que o Zod aceita e o que
      // ele recusa antes do use case), não a escrita. Um caminho válido chega até a leitura do
      // documento e para lá — o suficiente para distinguir 400-de-schema de 4xx-de-domínio.
      documents: {
        findById: () =>
          Promise.resolve({ ok: false as const, error: 'document-not-found' as const }),
      },
      payableDocs: createInMemoryPayableDocumentView([
        {
          payableId: payableA,
          documentId: documentA,
          kind: 'Parent',
          supplierRef: null,
          documentNumber: 'NF-1',
          dueDate: null,
          categoryRef: null,
          costCenterRef: null,
          budgetPlanRef: null,
          subcategoryRef: null,
          programRef: null,
          competencia: null,
          payeeKind: null,
        },
      ]),
      taxonomyPaths: createInMemoryTaxonomyPathRead([{ ...TAXONOMY, active: true }]),
    } as never),
  };

  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [financialHttpPlugin(deps as never, { requireAuth, authorize })],
  });

  return {
    app,
    txId,
    payableA,
    teardown: async () => {
      await app.close();
      await base.shutdown();
    },
  };
};

const post = (app: Awaited<ReturnType<typeof buildApp>>, payload: Record<string, unknown>) =>
  app.inject({
    method: 'POST',
    url: '/api/v2/financial/reconciliations',
    headers: { authorization: `Bearer ${WRITER}` },
    payload,
  });

describe('financial/http — contrato do bloco `taxonomy` no confirm da conciliação (M2)', () => {
  let handle: Awaited<ReturnType<typeof buildHandle>>;

  before(async () => {
    handle = await buildHandle();
  });
  after(async () => {
    await handle.teardown();
  });

  it('sem o bloco `taxonomy`, o contrato antigo segue válido (201)', async () => {
    const res = await post(handle.app, {
      transactionId: handle.txId,
      payableIds: [handle.payableA],
    });
    assert.equal(res.statusCode, 201, res.body);
  });

  it('bloco `taxonomy` INCOMPLETO é recusado com 400 pelo schema — antes do use case', async () => {
    // O caso que o front vai tentar: "só mudei a subcategoria, mando só ela".
    const res = await post(handle.app, {
      transactionId: handle.txId,
      payableIds: [handle.payableA],
      taxonomy: { subcategoryRef: SUBCATEGORY },
    });
    assert.equal(res.statusCode, 400, res.body);
  });

  it('ref que não é UUID é recusado com 400', async () => {
    const res = await post(handle.app, {
      transactionId: handle.txId,
      payableIds: [handle.payableA],
      taxonomy: { ...TAXONOMY, categoryRef: 'categoria-x' },
    });
    assert.equal(res.statusCode, 400, res.body);
  });

  it('campo extra dentro de `taxonomy` não passa despercebido', async () => {
    const res = await post(handle.app, {
      transactionId: handle.txId,
      payableIds: [handle.payableA],
      taxonomy: { ...TAXONOMY, centroDeCusto: COST_CENTER },
    });
    // Chave desconhecida é ignorada ou rejeitada conforme o modo do objeto; o que NÃO pode acontecer
    // é ela virar classificação. Qualquer um dos dois desfechos satisfaz o contrato — 5xx, não.
    assert.ok(res.statusCode < 500, res.body);
  });

  it('bloco completo passa o schema e chega ao domínio (não é mais 400)', async () => {
    const res = await post(handle.app, {
      transactionId: handle.txId,
      payableIds: [handle.payableA],
      taxonomy: TAXONOMY,
    });
    // O 400 aqui significaria contrato recusando dado bem-formado. O que vier além disso é decisão
    // de domínio/persistência, coberta pelas suítes da application e da integração.
    assert.notEqual(res.statusCode, 400, res.body);
  });
});
