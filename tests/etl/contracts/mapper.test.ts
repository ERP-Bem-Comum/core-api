/**
 * ETL-CONTRACTS-WRITER · W0 — mapper de contratos/programas legados → planos de domínio.
 * DEVE FALHAR em W0 (módulo `scripts/etl/contracts/mapper.ts` inexistente).
 *
 * Decisões ratificadas (2026-07-02, relatorio-decisao-3-marteladas.md):
 *   (a) número normalizado p/ forma do gerador: '000000001/2025' → '0001/2025';
 *   (c) exclusões por allowlist explícita → quarentena ExcludedByDecision.
 * Premissas documentadas: signedAt = contractPeriodStart; endedAt = updatedAt (Finalizado).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  normalizeSequentialNumber,
  mapLegacyProgramRow,
  mapLegacyContractRow,
  type ContractMapRefs,
} from '#scripts/etl/contracts/mapper.ts';
import type { LegacyContractRow, LegacyProgramRow } from '#scripts/etl/legacy/rows.ts';

const CREATED = new Date('2025-09-29T12:00:00.000Z');
const UPDATED = new Date('2026-01-07T09:00:00.000Z');
const PERIOD_START = new Date('2025-02-20T03:00:00.000Z');
const PERIOD_END = new Date('2025-12-31T03:00:00.000Z');

const SUPPLIER_UUID = '11111111-1111-4111-8111-111111111111';
const PROGRAM_UUID = '22222222-2222-4222-8222-222222222222';

const refs = (over: Partial<ContractMapRefs> = {}): ContractMapRefs => ({
  supplierRefByLegacyId: new Map([[4, SUPPLIER_UUID]]),
  programRefByLegacyId: new Map([[5, PROGRAM_UUID]]),
  ...over,
});

const baseContract = (over: Partial<LegacyContractRow> = {}): LegacyContractRow => ({
  id: 10,
  contractCode: '000000007/2026',
  contractType: 'Fornecedor',
  contractModel: 'Serviço',
  contractStatus: 'Em andamento',
  object: 'Prestação de serviços de limpeza',
  totalValue: 90750.5,
  supplierId: 4,
  collaboratorId: null,
  financierId: null,
  programId: 5,
  budgetPlanId: 7,
  contractPeriodStart: PERIOD_START,
  contractPeriodEnd: PERIOD_END,
  contractPeriodIsIndefinite: 0,
  signedContractUrl: 'https://legado/arquivo.pdf',
  pixInfoKeyType: null,
  pixInfoKey: null,
  bancaryInfoBank: null,
  bancaryInfoAgency: null,
  bancaryInfoAccountnumber: null,
  bancaryInfoDv: null,
  createdAt: CREATED,
  updatedAt: UPDATED,
  ...over,
});

describe('normalizeSequentialNumber (Pacote A)', () => {
  it('normaliza 9 dígitos → forma do gerador (4 dígitos)', () => {
    const r = normalizeSequentialNumber('000000001/2025');
    assert.ok(r.ok);
    assert.equal(r.value, '0001/2025');
  });

  it('seq 38 → 0038/2026', () => {
    const r = normalizeSequentialNumber('000000038/2026');
    assert.ok(r.ok);
    assert.equal(r.value, '0038/2026');
  });

  it('malformado → EnumUnknown em contract_code', () => {
    const r = normalizeSequentialNumber('CT-12-A/2019');
    assert.ok(!r.ok);
    assert.equal(r.error.tag, 'EnumUnknown');
    assert.equal(r.error.field, 'contract_code');
  });

  it('seq acima de 9999 (não cabe no gerador) → Overflow', () => {
    const r = normalizeSequentialNumber('000012345/2026');
    assert.ok(!r.ok);
    assert.equal(r.error.tag, 'Overflow');
  });

  it('seq zero → EnumUnknown (número lógico inexistente)', () => {
    const r = normalizeSequentialNumber('000000000/2026');
    assert.ok(!r.ok);
    assert.equal(r.error.tag, 'EnumUnknown');
  });
});

describe('mapLegacyContractRow — Em andamento → plano Active', () => {
  it('monta CreateContractInput completo via VOs do domínio', () => {
    const r = mapLegacyContractRow(baseContract(), refs());
    assert.ok(r.ok, 'esperava plano ok');
    const plan = r.value;
    assert.equal(plan.legacyId, 10);
    assert.equal(plan.kind, 'active');
    assert.equal(plan.createInput.sequentialNumber, '0007/2026');
    assert.equal(plan.createInput.title, 'Prestação de serviços de limpeza');
    assert.equal(plan.createInput.objective, 'Prestação de serviços de limpeza');
    // signedAt = contractPeriodStart (premissa documentada)
    assert.equal(plan.createInput.signedAt.getTime(), PERIOD_START.getTime());
    // Money em centavos (round de float)
    assert.equal(plan.createInput.originalValue.cents, 9075050);
    // contractor remapeado p/ uuid do partners
    assert.equal(plan.createInput.contractor.type, 'supplier');
    assert.equal(String(plan.createInput.contractor.id), SUPPLIER_UUID);
    // programId remapeado; budgetPlan fica no artefato (D5)
    assert.equal(plan.createInput.programId, PROGRAM_UUID);
    assert.equal(plan.createInput.budgetPlanId ?? null, null);
    assert.equal(plan.createInput.classification, 'CT');
    assert.equal(plan.terminate, null);
    // artefato carrega o que não entra pelo create
    assert.equal(plan.artifact.legacyContractCode, '000000007/2026');
    assert.equal(plan.artifact.legacyBudgetPlanId, 7);
    assert.equal(plan.artifact.signedContractUrl, 'https://legado/arquivo.pdf');
  });

  it('período: start/end viram Period Fixed com as datas do legado', () => {
    const r = mapLegacyContractRow(baseContract(), refs());
    assert.ok(r.ok);
    const period = r.value.createInput.originalPeriod;
    assert.equal(period.kind, 'Fixed');
    assert.equal(period.start.year, 2025);
    assert.equal(period.start.month, 2);
    assert.equal(period.start.day, 20);
  });
});

describe('mapLegacyContractRow — Finalizado → plano Terminated', () => {
  it('kind=terminated com endedAt = updatedAt do legado', () => {
    const r = mapLegacyContractRow(baseContract({ contractStatus: 'Finalizado' }), refs());
    assert.ok(r.ok);
    assert.equal(r.value.kind, 'terminated');
    assert.ok(r.value.terminate);
    assert.equal(r.value.terminate.at.getTime(), UPDATED.getTime());
  });
});

describe('mapLegacyContractRow — quarentenas', () => {
  it('allowlist (decisão c): legacy_id excluído → ExcludedByDecision com decisionRef', () => {
    const r = mapLegacyContractRow(baseContract({ id: 3 }), refs());
    assert.ok(!r.ok);
    const reason = r.error.find((e) => e.tag === 'ExcludedByDecision');
    assert.ok(reason, 'esperava ExcludedByDecision');
    assert.ok('decisionRef' in reason && reason.decisionRef.length > 0);
  });

  it('supplier sem remap (legacy_id desconhecido no partners) → RequiredFieldMissing supplier_ref', () => {
    const r = mapLegacyContractRow(baseContract({ supplierId: 999 }), refs());
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'RequiredFieldMissing' && e.field === 'supplier_ref'));
  });

  it('program sem remap → RequiredFieldMissing program_ref', () => {
    const r = mapLegacyContractRow(baseContract({ programId: 999 }), refs());
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'RequiredFieldMissing' && e.field === 'program_ref'));
  });

  it('valor <= 0 fora da allowlist → RequiredFieldMissing total_value (domínio rejeitaria)', () => {
    const r = mapLegacyContractRow(baseContract({ totalValue: 0 }), refs());
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'RequiredFieldMissing' && e.field === 'total_value'));
  });

  it('status desconhecido do mapa → EnumUnknown contract_status', () => {
    const r = mapLegacyContractRow(baseContract({ contractStatus: 'Pendente' }), refs());
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'EnumUnknown' && e.field === 'contract_status'));
  });

  it('sem contractor nenhum → RequiredFieldMissing contractor', () => {
    const r = mapLegacyContractRow(
      baseContract({ supplierId: null, collaboratorId: null }),
      refs(),
    );
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'RequiredFieldMissing' && e.field === 'contractor'));
  });
});

describe('mapLegacyProgramRow', () => {
  const program = (over: Partial<LegacyProgramRow> = {}): LegacyProgramRow => ({
    id: 5,
    name: 'Parcerias',
    abbreviation: 'PARC',
    director: 'Diretora X',
    description: 'Programa de parcerias',
    logo: null,
    active: 1,
    createdAt: CREATED,
    updatedAt: UPDATED,
    ...over,
  });

  it('mapeia para CreateProgramCommand (logo legado vai ao artefato, não ao cmd)', () => {
    const r = mapLegacyProgramRow(program({ logo: 'https://legado/logo.png' }));
    assert.ok(r.ok);
    assert.equal(r.value.legacyId, 5);
    assert.equal(r.value.cmd.name, 'Parcerias');
    assert.equal(r.value.cmd.sigla, 'PARC');
    assert.equal(r.value.cmd.director, 'Diretora X');
    assert.equal(r.value.cmd.generalCharacteristics, 'Programa de parcerias');
    assert.equal(r.value.cmd.logoKey, null);
    assert.equal(r.value.artifact.legacyLogoUrl, 'https://legado/logo.png');
  });

  it('name vazio → RequiredFieldMissing name', () => {
    const r = mapLegacyProgramRow(program({ name: '  ' }));
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'RequiredFieldMissing' && e.field === 'name'));
  });
});
