/**
 * FIN-STRICT-RESPONSE-SCHEMAS — W0 RED (#384, ADR-0027 contract-first).
 *
 * Os `*ResponseSchema` sensíveis do financial (`schemas.ts`) devem usar `.strict()` p/ detecção
 * precoce de drift: um campo não-declarado adicionado a um DTO no futuro deve virar
 * `500 FST_ERR_RESPONSE_SERIALIZATION` em CI (fail loud), em vez de ser descartado silenciosamente
 * pelo modo `strip` (default do Zod 4 `.object()`).
 *
 * `.strict()` é RASO — só o nível do objeto onde é chamado. Por isso cada schema aninhado
 * (item de array, objeto inline) precisa do seu próprio `.strict()`, testado aqui via o
 * schema-pai quando o aninhado não é exportado.
 *
 * RED enquanto os schemas usam o modo `strip` padrão: os casos "campo extra → rejeitado"
 * falham (safeParse.success ainda é `true`, pois o extra é descartado silenciosamente).
 * Os casos "fixture válido → aceito" já passam hoje e continuam passando após `.strict()`
 * (regressão — nenhuma resposta legítima quebra).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  documentResponseSchema,
  documentSummarySchema,
  cedenteAccountResponseSchema,
  cedenteAccountListItemSchema,
  accountStatementResponseSchema,
  statementTransactionsResponseSchema,
  payableListResponseSchema,
  payableSummarySchema,
  payablesBatchResponseSchema,
  payableBatchItemSchema,
  documentsBatchResponseSchema,
  documentBatchItemSchema,
  recentPaymentSchema,
  paidPayablesResponseSchema,
  transactionReconciliationResponseSchema,
  timelineEntrySchema,
  documentTimelineResponseSchema,
  reconciliationPeriodsResponseSchema,
} from '#src/modules/financial/adapters/http/schemas.ts';

const UUID_1 = '11111111-1111-4111-8111-111111111111';
const UUID_2 = '22222222-2222-4222-8222-222222222222';
const UUID_3 = '33333333-3333-4333-8333-333333333333';
const UUID_4 = '44444444-4444-4444-8444-444444444444';

/** Assert de sanity: o fixture válido continua aceito (garante que `.strict()` não quebrou nada). */
const assertAccepted = (
  schema: { safeParse: (v: unknown) => { success: boolean } },
  fixture: unknown,
) => {
  assert.ok(schema.safeParse(fixture).success);
};

/** Assert do contrato: campo extra no nível indicado deve ser rejeitado. */
const assertRejected = (
  schema: { safeParse: (v: unknown) => { success: boolean } },
  fixture: unknown,
) => {
  assert.ok(!schema.safeParse(fixture).success);
};

// ─── 1. documentResponseSchema + payableResponseSchema + payeeBank(.bankAccount/.pixKey) ────────

describe('documentResponseSchema — .strict() (#384)', () => {
  const payableFixture = {
    id: UUID_1,
    kind: 'Parent',
    retentionType: null,
    valueCents: '1000',
    status: 'Open',
  };

  const bankAccountFixture = {
    bank: '237',
    agency: '0001',
    accountNumber: '12345',
    checkDigit: '6',
  };

  const pixKeyFixture = {
    keyType: 'cnpj',
    key: '12345678000190',
  };

  const documentFixture = {
    id: UUID_1,
    status: 'Open',
    documentNumber: 'NF-001',
    series: '1',
    type: 'NFS-e',
    supplierRef: UUID_2,
    payeeKind: 'supplier',
    approverRef: null,
    contractRef: null,
    budgetPlanRef: null,
    categoryRef: null,
    subcategoryRef: null,
    costCenterRef: null,
    programRef: null,
    paymentMethod: 'PIX',
    grossValueCents: '1000',
    netValueCents: '1000',
    dueDate: '2026-08-01',
    issueDate: '2026-07-01',
    description: 'teste',
    accessKey: null,
    competencia: '2026-07',
    contaDebitoRef: null,
    paymentDetail: null,
    payables: [payableFixture],
    version: 0,
    payeeBank: {
      bankAccount: bankAccountFixture,
      pixKey: null,
    },
  };

  it('fixture válido é aceito (regressão)', () => {
    assertAccepted(documentResponseSchema, documentFixture);
  });

  it('campo extra no topo é rejeitado', () => {
    assertRejected(documentResponseSchema, { ...documentFixture, extraField: 'x' });
  });

  it('campo extra em payables[0] (payableResponseSchema) é rejeitado', () => {
    assertRejected(documentResponseSchema, {
      ...documentFixture,
      payables: [{ ...payableFixture, extraField: 'x' }],
    });
  });

  it('campo extra em payeeBank é rejeitado', () => {
    assertRejected(documentResponseSchema, {
      ...documentFixture,
      payeeBank: { ...documentFixture.payeeBank, extraField: 'x' },
    });
  });

  it('campo extra em payeeBank.bankAccount é rejeitado', () => {
    assertRejected(documentResponseSchema, {
      ...documentFixture,
      payeeBank: {
        bankAccount: { ...bankAccountFixture, extraField: 'x' },
        pixKey: null,
      },
    });
  });

  it('campo extra em payeeBank.pixKey é rejeitado', () => {
    assertRejected(documentResponseSchema, {
      ...documentFixture,
      payeeBank: {
        bankAccount: null,
        pixKey: { ...pixKeyFixture, extraField: 'x' },
      },
    });
  });
});

// ─── 2. documentSummarySchema ────────────────────────────────────────────────

describe('documentSummarySchema — .strict() (#384)', () => {
  const fixture = {
    id: UUID_1,
    status: 'Open',
    documentNumber: 'NF-001',
    type: 'NFS-e',
    supplierRef: UUID_2,
    series: '1',
    grossValueCents: '1000',
    paymentMethod: 'PIX',
    contractRef: null,
    netValueCents: '1000',
    dueDate: '2026-08-01',
    issueDate: '2026-07-01',
    version: 0,
    supplierName: 'Fornecedor Teste',
    supplierDocument: '12345678000190',
  };

  it('fixture válido é aceito (regressão)', () => {
    assertAccepted(documentSummarySchema, fixture);
  });

  it('campo extra é rejeitado', () => {
    assertRejected(documentSummarySchema, { ...fixture, extraField: 'x' });
  });
});

// ─── 3. cedenteAccountResponseSchema (+ cedenteAccountListItemSchema via extend) ─────────────────

describe('cedenteAccountResponseSchema — .strict() (#384)', () => {
  const fixture = {
    id: UUID_1,
    bankCode: '237',
    bankName: 'Bradesco',
    type: 'corrente',
    typeLabel: null,
    agency: '0001',
    accountNumber: '12345',
    accountDigit: '6',
    convenio: '',
    document: '12345678000190',
    status: 'Active',
    nickname: null,
    openingBalanceCents: '0',
    openingBalanceDate: '2026-01-01',
  };

  it('fixture válido é aceito (regressão)', () => {
    assertAccepted(cedenteAccountResponseSchema, fixture);
  });

  it('campo extra é rejeitado', () => {
    assertRejected(cedenteAccountResponseSchema, { ...fixture, extraField: 'x' });
  });

  describe('cedenteAccountListItemSchema — herda o modo via .extend()', () => {
    const listItemFixture = { ...fixture, currentBalanceCents: '1000' };

    it('fixture válido é aceito (regressão)', () => {
      assertAccepted(cedenteAccountListItemSchema, listItemFixture);
    });

    it('campo extra é rejeitado (herdado da base)', () => {
      assertRejected(cedenteAccountListItemSchema, { ...listItemFixture, extraField: 'x' });
    });
  });
});

// ─── 4. accountStatementResponseSchema + statementViewDaySchema + statementViewLineSchema ───────

describe('accountStatementResponseSchema — .strict() (#384)', () => {
  const lineFixture = {
    id: 'line-1',
    date: '2026-07-01T12:00:00.000Z',
    movement: 'Debit',
    entryType: 'Payment',
    payeeName: 'Fornecedor Teste',
    memo: 'pagamento',
    valueCents: '1000',
    runningBalanceCents: '9000',
    reconciliationStatus: 'Pending',
  };

  const dayFixture = {
    date: '2026-07-01',
    lines: [lineFixture],
    inCents: '0',
    outCents: '1000',
    dayBalanceCents: '9000',
  };

  const fixture = {
    openingBalanceCents: '10000',
    closingBalanceCents: '9000',
    counters: { all: 1, in: 0, out: 1, reconciled: 0, pending: 1 },
    days: [dayFixture],
  };

  it('fixture válido é aceito (regressão)', () => {
    assertAccepted(accountStatementResponseSchema, fixture);
  });

  it('campo extra no topo é rejeitado', () => {
    assertRejected(accountStatementResponseSchema, { ...fixture, extraField: 'x' });
  });

  it('campo extra em days[0] (statementViewDaySchema) é rejeitado', () => {
    assertRejected(accountStatementResponseSchema, {
      ...fixture,
      days: [{ ...dayFixture, extraField: 'x' }],
    });
  });

  it('campo extra em days[0].lines[0] (statementViewLineSchema) é rejeitado', () => {
    assertRejected(accountStatementResponseSchema, {
      ...fixture,
      days: [{ ...dayFixture, lines: [{ ...lineFixture, extraField: 'x' }] }],
    });
  });
});

// ─── 5. statementTransactionsResponseSchema + statementTransactionSchema ────────────────────────

describe('statementTransactionsResponseSchema — .strict() (#384)', () => {
  const transactionFixture = {
    id: UUID_1,
    fitid: 'FITID-1',
    date: '2026-07-01T12:00:00.000Z',
    movement: 'Debit',
    entryType: 'Payment',
    payeeName: 'Fornecedor Teste',
    memo: 'pagamento',
    valueCents: '1000',
    balanceAfterCents: '9000',
    reconciliationStatus: 'Pending',
  };

  const fixture = { items: [transactionFixture] };

  it('fixture válido é aceito (regressão)', () => {
    assertAccepted(statementTransactionsResponseSchema, fixture);
  });

  it('campo extra no topo é rejeitado', () => {
    assertRejected(statementTransactionsResponseSchema, { ...fixture, extraField: 'x' });
  });

  it('campo extra em items[0] (statementTransactionSchema) é rejeitado', () => {
    assertRejected(statementTransactionsResponseSchema, {
      items: [{ ...transactionFixture, extraField: 'x' }],
    });
  });
});

// ─── 6. payableListResponseSchema + payableSummarySchema ────────────────────────────────────────

describe('payableSummarySchema — .strict() (#384)', () => {
  const fixture = {
    payableId: UUID_1,
    documentId: UUID_2,
    documentNumber: 'NF-001',
    series: '1',
    documentType: 'NFS-e',
    kind: 'Parent',
    retentionType: null,
    valueCents: '1000',
    dueDate: '2026-08-01',
    status: 'Open',
    supplierRef: UUID_3,
    contractRef: null,
    issueDate: '2026-07-01',
    paymentMethod: 'PIX',
    version: 0,
    grossValueCents: '1000',
    netValueCents: '1000',
    paidAt: null,
  };

  it('fixture válido é aceito (regressão)', () => {
    assertAccepted(payableSummarySchema, fixture);
  });

  it('campo extra é rejeitado', () => {
    assertRejected(payableSummarySchema, { ...fixture, extraField: 'x' });
  });

  describe('payableListResponseSchema', () => {
    const listFixture = { items: [fixture], page: 1, pageSize: 20, total: 1 };

    it('fixture válido é aceito (regressão)', () => {
      assertAccepted(payableListResponseSchema, listFixture);
    });

    it('campo extra no topo é rejeitado', () => {
      assertRejected(payableListResponseSchema, { ...listFixture, extraField: 'x' });
    });

    it('campo extra em items[0] é rejeitado', () => {
      assertRejected(payableListResponseSchema, {
        ...listFixture,
        items: [{ ...fixture, extraField: 'x' }],
      });
    });
  });
});

// ─── 7. payablesBatchResponseSchema + payableBatchItemSchema ────────────────────────────────────

describe('payableBatchItemSchema — .strict() (#384)', () => {
  const fixture = {
    ref: UUID_1,
    documentId: UUID_2,
    documentNumber: 'NF-001',
    documentType: 'NFS-e',
    valueCents: '1000',
    dueDate: '2026-08-01',
    status: 'Open',
    paymentMethod: 'PIX',
    supplierRef: UUID_3,
    supplierName: 'Fornecedor Teste',
    supplierDocument: '12345678000190',
  };

  it('fixture válido é aceito (regressão)', () => {
    assertAccepted(payableBatchItemSchema, fixture);
  });

  it('campo extra é rejeitado', () => {
    assertRejected(payableBatchItemSchema, { ...fixture, extraField: 'x' });
  });

  describe('payablesBatchResponseSchema', () => {
    const batchFixture = { items: [fixture], missing: [] };

    it('fixture válido é aceito (regressão)', () => {
      assertAccepted(payablesBatchResponseSchema, batchFixture);
    });

    it('campo extra no topo é rejeitado', () => {
      assertRejected(payablesBatchResponseSchema, { ...batchFixture, extraField: 'x' });
    });

    it('campo extra em items[0] é rejeitado', () => {
      assertRejected(payablesBatchResponseSchema, {
        ...batchFixture,
        items: [{ ...fixture, extraField: 'x' }],
      });
    });
  });
});

// ─── 8. documentsBatchResponseSchema + documentBatchItemSchema ──────────────────────────────────

describe('documentBatchItemSchema — .strict() (#384)', () => {
  const fixture = {
    ref: UUID_1,
    documentNumber: 'NF-001',
    type: 'NFS-e',
    status: 'Open',
    supplierRef: UUID_2,
    supplierName: 'Fornecedor Teste',
    supplierDocument: '12345678000190',
    netValueCents: '1000',
    dueDate: '2026-08-01',
  };

  it('fixture válido é aceito (regressão)', () => {
    assertAccepted(documentBatchItemSchema, fixture);
  });

  it('campo extra é rejeitado', () => {
    assertRejected(documentBatchItemSchema, { ...fixture, extraField: 'x' });
  });

  describe('documentsBatchResponseSchema', () => {
    const batchFixture = { items: [fixture], missing: [] };

    it('fixture válido é aceito (regressão)', () => {
      assertAccepted(documentsBatchResponseSchema, batchFixture);
    });

    it('campo extra no topo é rejeitado', () => {
      assertRejected(documentsBatchResponseSchema, { ...batchFixture, extraField: 'x' });
    });

    it('campo extra em items[0] é rejeitado', () => {
      assertRejected(documentsBatchResponseSchema, {
        ...batchFixture,
        items: [{ ...fixture, extraField: 'x' }],
      });
    });
  });
});

// ─── 9. recentPaymentSchema ──────────────────────────────────────────────────

describe('recentPaymentSchema — .strict() (#384)', () => {
  const fixture = {
    payableId: UUID_1,
    documentId: UUID_2,
    supplierRef: UUID_3,
    debitAccountRef: UUID_4,
    valueCents: '1000',
    paidAt: '2026-07-01',
  };

  it('fixture válido é aceito (regressão)', () => {
    assertAccepted(recentPaymentSchema, fixture);
  });

  it('campo extra é rejeitado', () => {
    assertRejected(recentPaymentSchema, { ...fixture, extraField: 'x' });
  });
});

// ─── 10. paidPayablesResponseSchema + paidPayableSchema ─────────────────────────────────────────

describe('paidPayablesResponseSchema — .strict() (#384)', () => {
  const paidPayableFixture = {
    id: UUID_1,
    documentId: UUID_2,
    valueCents: '1000',
    dueDate: '2026-08-01',
    paymentMethod: 'PIX',
  };

  const fixture = { items: [paidPayableFixture] };

  it('fixture válido é aceito (regressão)', () => {
    assertAccepted(paidPayablesResponseSchema, fixture);
  });

  it('campo extra no topo é rejeitado', () => {
    assertRejected(paidPayablesResponseSchema, { ...fixture, extraField: 'x' });
  });

  it('campo extra em items[0] (paidPayableSchema) é rejeitado', () => {
    assertRejected(paidPayablesResponseSchema, {
      items: [{ ...paidPayableFixture, extraField: 'x' }],
    });
  });
});

// ─── 11. transactionReconciliationResponseSchema + items[] inline ───────────────────────────────

describe('transactionReconciliationResponseSchema — .strict() (#384)', () => {
  const itemFixture = { payableId: UUID_4, reconciledValueCents: '1000' };

  const fixture = {
    id: UUID_1,
    transactionId: UUID_2,
    type: 'Individual',
    status: 'Active',
    reconciledBy: UUID_3,
    reconciledByName: 'Fulano',
    reconciledAt: '2026-07-01T12:00:00.000Z',
    differenceCents: null,
    items: [itemFixture],
  };

  it('fixture válido é aceito (regressão)', () => {
    assertAccepted(transactionReconciliationResponseSchema, fixture);
  });

  it('campo extra no topo é rejeitado', () => {
    assertRejected(transactionReconciliationResponseSchema, { ...fixture, extraField: 'x' });
  });

  it('campo extra em items[0] (inline) é rejeitado', () => {
    assertRejected(transactionReconciliationResponseSchema, {
      ...fixture,
      items: [{ ...itemFixture, extraField: 'x' }],
    });
  });
});

// ─── 12. timelineEntrySchema + target inline / 13. documentTimelineResponseSchema ───────────────

describe('timelineEntrySchema — .strict() (#384)', () => {
  const targetFixture = { kind: 'Document', id: UUID_1 };

  const fixture = {
    eventType: 'DocumentSaved',
    target: targetFixture,
    occurredAt: '2026-07-01T12:00:00.000Z',
    actor: null,
    changes: [{ field: 'netValueCents', before: null, after: '1000' }],
  };

  it('fixture válido é aceito (regressão)', () => {
    assertAccepted(timelineEntrySchema, fixture);
  });

  it('campo extra no topo é rejeitado', () => {
    assertRejected(timelineEntrySchema, { ...fixture, extraField: 'x' });
  });

  it('campo extra em target (inline) é rejeitado', () => {
    assertRejected(timelineEntrySchema, {
      ...fixture,
      target: { ...targetFixture, extraField: 'x' },
    });
  });

  it('campo extra em changes[0] (item aninhado) é rejeitado (W2 Major)', () => {
    assertRejected(timelineEntrySchema, {
      ...fixture,
      changes: [{ field: 'netValueCents', before: null, after: '1000', extraField: 'x' }],
    });
  });

  describe('documentTimelineResponseSchema', () => {
    const wrapperFixture = { entries: [fixture] };

    it('fixture válido é aceito (regressão)', () => {
      assertAccepted(documentTimelineResponseSchema, wrapperFixture);
    });

    it('campo extra no topo é rejeitado', () => {
      assertRejected(documentTimelineResponseSchema, { ...wrapperFixture, extraField: 'x' });
    });

    it('campo extra em entries[0] é rejeitado', () => {
      assertRejected(documentTimelineResponseSchema, {
        entries: [{ ...fixture, extraField: 'x' }],
      });
    });
  });
});

// ─── 14. reconciliationPeriodItemSchema (item de reconciliationPeriodsResponseSchema) ───────────

describe('reconciliationPeriodItemSchema — .strict() (#384)', () => {
  const fixture = {
    id: UUID_1,
    debitAccountRef: UUID_2,
    periodStart: '2026-07-01',
    periodEnd: '2026-07-31',
    status: 'Open',
    closedAt: null,
    closedBy: null,
    closedByName: null,
  };

  it('fixture válido é aceito (regressão)', () => {
    assertAccepted(reconciliationPeriodsResponseSchema, [fixture]);
  });

  it('campo extra é rejeitado', () => {
    assertRejected(reconciliationPeriodsResponseSchema, [{ ...fixture, extraField: 'x' }]);
  });
});
