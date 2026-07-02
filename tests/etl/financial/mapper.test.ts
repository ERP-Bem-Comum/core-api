/**
 * ETL-FINANCIAL-WRITER · W0 — mapper de accounts/payables legados → planos de domínio.
 * DEVE FALHAR em W0 (módulo `scripts/etl/financial/mapper.ts` inexistente).
 *
 * Evidências de origem (auditoria-transformacoes-legado.md §5): F3 liq=0 aprovado,
 * F4 sem dueDate, F5 parcelados de teste (allowlist 45/46), F6 retenção sem tipo,
 * F7 agência com DV embutido, F8 paymentType→contract_ref. Decisões D7 (mapas de
 * vocabulário) e (c) ratificadas em 2026-07-02.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  mapLegacyAccountRow,
  mapLegacyPayableRow,
  type PayableMapRefs,
} from '#scripts/etl/financial/mapper.ts';
import type { LegacyAccountRow, LegacyPayableRow } from '#scripts/etl/legacy/rows.ts';

const CREATED = new Date('2026-01-10T12:00:00.000Z');
const UPDATED = new Date('2026-02-01T09:00:00.000Z');
const DUE = new Date('2026-03-15T03:00:00.000Z');
const APPROVED_AT = new Date('2026-02-20T14:30:00.000Z');
const COMPETENCE = new Date('2026-02-01T03:00:00.000Z');

const SUPPLIER_UUID = '11111111-1111-4111-8111-111111111111';
const CONTRACT_UUID = '33333333-3333-4333-8333-333333333333';
const CEDENTE_UUID = '44444444-4444-4444-8444-444444444444';

const refs = (over: Partial<PayableMapRefs> = {}): PayableMapRefs => ({
  supplierRefByLegacyId: new Map([[9, SUPPLIER_UUID]]),
  contractRefByLegacyId: new Map([[4, CONTRACT_UUID]]),
  cedenteRefByLegacyId: new Map([[1, CEDENTE_UUID]]),
  approvedAtByPayableId: new Map([[20, APPROVED_AT]]),
  ...over,
});

const basePayable = (over: Partial<LegacyPayableRow> = {}): LegacyPayableRow => ({
  id: 20,
  identifierCode: 'NF-0042',
  debtorType: 'FORNECEDOR',
  supplierId: 9,
  collaboratorId: null,
  payableStatus: 'APROVADO',
  paymentType: 'SEM CONTRATO',
  obs: 'Observação do lançamento',
  liquidValue: 1234.56,
  taxValue: 0,
  totalValue: 1234.56,
  paymentMethod: 'BOLETO',
  barcode: '84670000001-1 43800138000-4',
  docType: 'NOTA FISCAL',
  accountId: 1,
  contractId: null,
  recurrent: 0,
  dueDate: DUE,
  paymentDate: null,
  competenceDate: COMPETENCE,
  createdAt: CREATED,
  updatedAt: UPDATED,
  ...over,
});

describe('mapLegacyAccountRow — accounts → plano de conta-cedente', () => {
  const account = (over: Partial<LegacyAccountRow> = {}): LegacyAccountRow => ({
    id: 1,
    name: 'PARC',
    bank: 'BRADESCO',
    agency: '0288-7',
    accountNumber: '12345',
    dv: '0',
    initialBalance: 1000.5,
    createdAt: CREATED,
    updatedAt: UPDATED,
    ...over,
  });

  it('mapeia Bradesco → bankCode 237, convenio placeholder D6, agência preservada (F7)', () => {
    const r = mapLegacyAccountRow(account());
    assert.ok(r.ok);
    assert.equal(r.value.legacyId, 1);
    assert.equal(r.value.input.bankCode, '237');
    assert.equal(r.value.input.agency, '0288-7');
    assert.equal(r.value.input.accountNumber, '12345');
    assert.equal(r.value.input.accountDigit, '0');
    assert.equal(r.value.input.convenio, 'LEGADO');
    assert.equal(r.value.input.nickname, 'PARC');
    assert.equal(r.value.input.openingBalanceCents, 100050);
    assert.equal(r.value.input.openingBalanceDate, '2026-01-10');
  });

  it('banco desconhecido → EnumUnknown bank (sem chute de código COMPE)', () => {
    const r = mapLegacyAccountRow(account({ bank: 'BANCO X' }));
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'EnumUnknown' && e.field === 'bank'));
  });
});

describe('mapLegacyPayableRow — vocabulário (D7) e refs', () => {
  it('APROVADO com registro de aprovação → kind approved com approvedAt histórico', () => {
    const r = mapLegacyPayableRow(basePayable(), refs());
    assert.ok(r.ok, 'esperava plano ok');
    const plan = r.value;
    assert.equal(plan.kind, 'approved');
    assert.equal(plan.legacyId, 20);
    assert.ok(plan.approvedAt);
    assert.equal(plan.approvedAt.getTime(), APPROVED_AT.getTime());
    assert.ok(plan.doc);
    assert.equal(plan.doc.documentNumber, 'NF-0042');
    assert.equal(plan.doc.type, 'NFS-e'); // NOTA FISCAL → NFS-e (modelo Serviço)
    assert.equal(plan.doc.paymentMethod, 'Boleto'); // BOLETO → Boleto
    assert.equal(plan.doc.supplierRef, SUPPLIER_UUID);
    assert.equal(plan.doc.grossValueCents, 123456);
    assert.equal(plan.doc.contractRef, null); // SEM CONTRATO (F8/R-5)
    assert.equal(plan.doc.contaDebitoRef, CEDENTE_UUID);
    assert.equal(plan.doc.competencia, '2026-02');
    assert.equal(plan.doc.paymentDetail, '84670000001-1 43800138000-4');
    assert.equal(plan.doc.description, 'Observação do lançamento');
  });

  it('APROVADO sem registro de aprovação (F2) → approvedAt = updatedAt (fallback documentado)', () => {
    const r = mapLegacyPayableRow(basePayable({ id: 21 }), refs());
    assert.ok(r.ok);
    assert.equal(r.value.kind, 'approved');
    assert.ok(r.value.approvedAt);
    assert.equal(r.value.approvedAt.getTime(), UPDATED.getTime());
  });

  it('LANÇADO e EM APROVAÇÃO → kind open', () => {
    for (const status of ['LANÇADO', 'EM APROVAÇÃO']) {
      const r = mapLegacyPayableRow(basePayable({ payableStatus: status }), refs());
      assert.ok(r.ok, `esperava ok p/ ${status}`);
      assert.equal(r.value.kind, 'open');
    }
  });

  it('COM CONTRATO → contractRef remapeado via de-para; sem remap → RequiredFieldMissing', () => {
    const ok1 = mapLegacyPayableRow(
      basePayable({ paymentType: 'COM CONTRATO', contractId: 4 }),
      refs(),
    );
    assert.ok(ok1.ok);
    assert.ok(ok1.value.doc);
    assert.equal(ok1.value.doc.contractRef, CONTRACT_UUID);

    const missing = mapLegacyPayableRow(
      basePayable({ paymentType: 'COM CONTRATO', contractId: 999 }),
      refs(),
    );
    assert.ok(!missing.ok);
    assert.ok(
      missing.error.some((e) => e.tag === 'RequiredFieldMissing' && e.field === 'contract_ref'),
    );
  });

  it('FATURA → Fatura; PIX/TED → PIX/TED', () => {
    const r = mapLegacyPayableRow(basePayable({ docType: 'FATURA', paymentMethod: 'PIX' }), refs());
    assert.ok(r.ok);
    assert.ok(r.value.doc);
    assert.equal(r.value.doc.type, 'Fatura');
    assert.equal(r.value.doc.paymentMethod, 'PIX');
  });

  it('docType/paymentMethod/status desconhecidos → EnumUnknown', () => {
    const doc = mapLegacyPayableRow(basePayable({ docType: 'RECIBO X' }), refs());
    assert.ok(!doc.ok);
    assert.ok(doc.error.some((e) => e.tag === 'EnumUnknown' && e.field === 'doc_type'));

    const met = mapLegacyPayableRow(basePayable({ paymentMethod: 'CHEQUE' }), refs());
    assert.ok(!met.ok);
    assert.ok(met.error.some((e) => e.tag === 'EnumUnknown' && e.field === 'payment_method'));

    const st = mapLegacyPayableRow(basePayable({ payableStatus: 'PAGO' }), refs());
    assert.ok(!st.ok);
    assert.ok(st.error.some((e) => e.tag === 'EnumUnknown' && e.field === 'payable_status'));
  });

  it('supplier sem remap → RequiredFieldMissing supplier_ref', () => {
    const r = mapLegacyPayableRow(basePayable({ supplierId: 999 }), refs());
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'RequiredFieldMissing' && e.field === 'supplier_ref'));
  });

  it('accountId sem cedente remapeado → RequiredFieldMissing debit_account_ref; null → null', () => {
    const missing = mapLegacyPayableRow(basePayable({ accountId: 999 }), refs());
    assert.ok(!missing.ok);
    assert.ok(
      missing.error.some(
        (e) => e.tag === 'RequiredFieldMissing' && e.field === 'debit_account_ref',
      ),
    );

    const none = mapLegacyPayableRow(basePayable({ accountId: null }), refs());
    assert.ok(none.ok);
    assert.ok(none.value.doc);
    assert.equal(none.value.doc.contaDebitoRef, null);
  });
});

describe('mapLegacyPayableRow — defeitos de origem (F3-F6)', () => {
  it('F3: líquido <= 0 → kind draft com motivo auditado (mesmo APROVADO no legado)', () => {
    const r = mapLegacyPayableRow(basePayable({ liquidValue: 0, totalValue: 0 }), refs());
    assert.ok(r.ok);
    assert.equal(r.value.kind, 'draft');
    assert.ok(r.value.draftReason?.includes('liquid') === true);
  });

  it('F4: sem dueDate → kind draft', () => {
    const r = mapLegacyPayableRow(basePayable({ dueDate: null }), refs());
    assert.ok(r.ok);
    assert.equal(r.value.kind, 'draft');
  });

  it('F5: allowlist (45/46, parcelados de teste) → ExcludedByDecision com decisionRef', () => {
    const r = mapLegacyPayableRow(basePayable({ id: 45 }), refs());
    assert.ok(!r.ok);
    const reason = r.error.find((e) => e.tag === 'ExcludedByDecision');
    assert.ok(reason && 'decisionRef' in reason && reason.decisionRef.includes('R-1'));
  });

  it('F6: taxValue > 0 sem tipo de retenção → RequiredFieldMissing retention_type (D7)', () => {
    const r = mapLegacyPayableRow(basePayable({ taxValue: 2, totalValue: 1236.56 }), refs());
    assert.ok(!r.ok);
    assert.ok(
      r.error.some((e) => e.tag === 'RequiredFieldMissing' && e.field === 'retention_type'),
    );
  });

  it('valueMismatchCents: liquid≠total com tax=0 → diferença auditada; iguais → null', () => {
    const equal = mapLegacyPayableRow(basePayable(), refs());
    assert.ok(equal.ok);
    assert.equal(equal.value.artifact.valueMismatchCents, null);

    const diff = mapLegacyPayableRow(basePayable({ liquidValue: 100, totalValue: 100.5 }), refs());
    assert.ok(diff.ok);
    assert.equal(diff.value.artifact.valueMismatchCents, 50);
  });

  it('competência null → competencia null (Draft e Open aceitam)', () => {
    const r = mapLegacyPayableRow(basePayable({ competenceDate: null }), refs());
    assert.ok(r.ok);
    assert.ok(r.value.doc);
    assert.equal(r.value.doc.competencia, null);
  });
});
