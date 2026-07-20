/**
 * BGP-ETL-READER-MAPPER (fatia 3/3) · W0 — mapper PURO do legado -> inputs `bgp_*`.
 * DEVE FALHAR em W0 (modulo `scripts/etl/budget-plans/mapper.ts` inexistente).
 *
 * Fonte da verdade das regras: `.claude/.pipeline/ETL-BUDGET-PLANS/000-request.md` (mapa
 * campo a campo, numeros medidos no dump `Cloud_SQL_Export_2026-04-30`). Cada `it` abaixo
 * prova uma linha do mapa. O mapper e' funcao pura: sem I/O, retorna Result / discriminated
 * quarentena. Refs (siglas de programa, auth legacy_id, launchType por subcategoria) sao
 * injetados como Map, resolvidos pelo `main.ts` a partir do reader (fatia 3).
 *
 * ADR-0006: a ETL so conhece a public-api do modulo (os *EtlInput plain rows) — nunca
 * domain/ nem application/. Estes testes so exercitam funcoes puras de `scripts/`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  mapBudgetPlanRow,
  mapBudgetRow,
  mapCostCenterRow,
  mapCategoryRow,
  mapSubcategoryRow,
  mapBudgetResultRow,
  type BudgetPlanMapRefs,
  type BudgetResultMapRefs,
  type LegacyBudgetPlanRow,
  type LegacyBudgetRow,
  type LegacyCostCenterRow,
  type LegacyCategoryRow,
  type LegacySubcategoryRow,
  type LegacyBudgetResultRow,
} from '#scripts/etl/budget-plans/mapper.ts';

const CREATED = new Date('2026-01-10T12:00:00.000Z');
const UPDATED = new Date('2026-02-01T09:00:00.000Z');

const PROGRAM_PARC_UUID = '11111111-1111-4111-8111-111111111111';
const PROGRAM_EPV_UUID = '22222222-2222-4222-8222-222222222222';
const USER_UUID = '33333333-3333-4333-8333-333333333333';

// ── Factories (AAA: cada teste ajusta so o campo sob prova) ───────────────────

const planRefs = (over: Partial<BudgetPlanMapRefs> = {}): BudgetPlanMapRefs => ({
  // programs.abbreviation (sigla legada) -> prg_programs.id (uuid). Medido: so PARC e EPV.
  programRefBySigla: new Map([
    ['PARC', PROGRAM_PARC_UUID],
    ['EPV', PROGRAM_EPV_UUID],
  ]),
  // auth.legacy_id -> user uuid. Medido: so 2 usuarios referenciados.
  updatedByByLegacyId: new Map([[7, USER_UUID]]),
  ...over,
});

const planRow = (over: Partial<LegacyBudgetPlanRow> = {}): LegacyBudgetPlanRow => ({
  id: 13,
  year: 2026,
  scenarioName: null,
  version: 1,
  status: 'APROVADO',
  programSigla: 'PARC',
  updatedById: 7,
  parentId: null,
  createdAt: CREATED,
  updatedAt: UPDATED,
  ...over,
});

const budgetRow = (over: Partial<LegacyBudgetRow> = {}): LegacyBudgetRow => ({
  id: 100,
  budgetPlanId: 13,
  // Estado SEMPRE presente no legado; municipio so quando municipal (medido: Fortaleza/CE).
  stateAbbreviation: 'CE',
  municipalityCod: null,
  municipalityUf: null,
  ...over,
});

const costCenterRow = (over: Partial<LegacyCostCenterRow> = {}): LegacyCostCenterRow => ({
  id: 50,
  budgetPlanId: 13,
  name: 'Folha',
  type: 'A PAGAR',
  active: true,
  ...over,
});

const categoryRow = (over: Partial<LegacyCategoryRow> = {}): LegacyCategoryRow => ({
  id: 70,
  costCenterId: 50,
  name: 'Pessoal',
  active: true,
  ...over,
});

const subcategoryRow = (over: Partial<LegacySubcategoryRow> = {}): LegacySubcategoryRow => ({
  id: 90,
  costCenterCategoryId: 70,
  name: 'Salarios',
  releaseType: 'DESPESAS_PESSOAIS',
  type: 'REDE',
  active: true,
  ...over,
});

const resultRefs = (over: Partial<BudgetResultMapRefs> = {}): BudgetResultMapRefs => ({
  // subcategoria.legacy_id -> launchType (releaseType) da subcategoria. Origem do `model` derivado.
  launchTypeBySubcategoryLegacyId: new Map([
    [90, 'DESPESAS_PESSOAIS'],
    [91, 'IPCA'],
    [92, 'DESPESAS_LOGISTICAS'],
  ]),
  ...over,
});

const resultRow = (over: Partial<LegacyBudgetResultRow> = {}): LegacyBudgetResultRow => ({
  id: 5000,
  budgetId: 100,
  costCenterSubCategoryId: 90,
  month: 3,
  valueInCents: 51500,
  ...over,
});

// ── 1. budget_plans -> bgp_budget_plans ───────────────────────────────────────

describe('mapBudgetPlanRow — version float, sigla de programa, updatedBy', () => {
  it('version 1 -> (1,0); 1.1 -> (1,1); 2 -> (2,0) [mapa §1 version]', () => {
    for (const [version, major, minor] of [
      [1, 1, 0],
      [1.1, 1, 1],
      [2, 2, 0],
    ] as const) {
      const r = mapBudgetPlanRow(planRow({ version }), planRefs());
      assert.ok(r.ok, `esperava ok p/ version ${String(version)}`);
      assert.equal(r.value.input.versionMajor, major);
      assert.equal(r.value.input.versionMinor, minor);
    }
  });

  it('version com >1 casa decimal (1.25) -> QUARENTENA field version, sem arredondar [CA6]', () => {
    const r = mapBudgetPlanRow(planRow({ version: 1.25 }), planRefs());
    assert.ok(!r.ok, 'nao pode migrar 1.25 (float nao distingue 1.10 de 1.1)');
    assert.ok(
      r.error.some((e) => e.field === 'version'),
      'quarentena deve identificar o campo version (nao descarta em silencio)',
    );
  });

  it('programSigla resolve -> programRef = uuid do programa [mapa §1 programId via sigla]', () => {
    const parc = mapBudgetPlanRow(planRow({ programSigla: 'PARC' }), planRefs());
    assert.ok(parc.ok);
    assert.equal(parc.value.input.programRef, PROGRAM_PARC_UUID);

    const epv = mapBudgetPlanRow(planRow({ programSigla: 'EPV' }), planRefs());
    assert.ok(epv.ok);
    assert.equal(epv.value.input.programRef, PROGRAM_EPV_UUID);
  });

  it('propaga createdAt/updatedAt do legado (nunca a data da migracao) [BGP-ETL-PRESERVE-DATES CA1]', () => {
    const r = mapBudgetPlanRow(planRow(), planRefs());
    assert.ok(r.ok);
    // A "Ultima Alteracao" da tela le updatedAt; tem de ser a data do legado, nao clock.now() da ETL.
    assert.equal(r.value.input.createdAt.getTime(), CREATED.getTime());
    assert.equal(r.value.input.updatedAt.getTime(), UPDATED.getTime());
  });

  it('sigla de programa que NAO resolve -> QUARENTENA (nunca inventa programa) [CA7]', () => {
    const r = mapBudgetPlanRow(planRow({ programSigla: 'XYZ' }), planRefs());
    assert.ok(!r.ok);
    assert.ok(
      r.error.some((e) => e.tag === 'RequiredFieldMissing' && e.field === 'program_ref'),
      'sigla orfa vira RequiredFieldMissing program_ref (reusa reason.ts)',
    );
  });

  it('updatedById resolve -> updatedBy uuid; miss -> null (nullable, NAO quarentena) [mapa §1]', () => {
    const hit = mapBudgetPlanRow(planRow({ updatedById: 7 }), planRefs());
    assert.ok(hit.ok);
    assert.equal(hit.value.input.updatedBy, USER_UUID);

    const missId = mapBudgetPlanRow(planRow({ updatedById: 999 }), planRefs());
    assert.ok(missId.ok, 'miss de updatedBy NAO quarentena (coluna nullable)');
    assert.equal(missId.value.input.updatedBy, null);

    const nullId = mapBudgetPlanRow(planRow({ updatedById: null }), planRefs());
    assert.ok(nullId.ok);
    assert.equal(nullId.value.input.updatedBy, null);
  });

  it('status/scenarioName direto; parentId legado carregado p/ 2a passada [mapa §1]', () => {
    const r = mapBudgetPlanRow(
      planRow({ status: 'EM_CALIBRACAO', scenarioName: 'Cenario á', parentId: 13 }),
      planRefs(),
    );
    assert.ok(r.ok);
    assert.equal(r.value.input.status, 'EM_CALIBRACAO');
    assert.equal(r.value.input.scenarioName, 'Cenario á');
    assert.equal(r.value.input.year, 2026);
    assert.equal(r.value.legacyId, 13);
    assert.equal(r.value.parentLegacyId, 13);
  });
});

// ── 2. budgets -> bgp_budgets (Rede: estado XOR municipio) ─────────────────────

describe('mapBudgetRow — Rede (partnerKind/partnerRef) e guarda de UF', () => {
  it('municipio preenchido -> (municipality, IBGE cod) [mapa §2]', () => {
    const r = mapBudgetRow(
      budgetRow({ municipalityCod: '2304400', municipalityUf: 'CE', stateAbbreviation: 'CE' }),
    );
    assert.ok(r.ok);
    assert.equal(r.value.input.partnerKind, 'municipality');
    assert.equal(r.value.input.partnerRef, '2304400');
    assert.equal(r.value.budgetPlanLegacyId, 13);
  });

  it('sem municipio -> (state, UF abbreviation) [mapa §2]', () => {
    const r = mapBudgetRow(budgetRow({ municipalityCod: null, stateAbbreviation: 'CE' }));
    assert.ok(r.ok);
    assert.equal(r.value.input.partnerKind, 'state');
    assert.equal(r.value.input.partnerRef, 'CE');
  });

  it('municipio com m.uf != s.abbreviation -> QUARENTENA (nao descarta em silencio) [CA6]', () => {
    const r = mapBudgetRow(
      budgetRow({ municipalityCod: '3550308', municipalityUf: 'SP', stateAbbreviation: 'CE' }),
    );
    assert.ok(!r.ok, 'UF do municipio divergente do estado e' + ' inconsistencia migravel');
    assert.ok(
      r.error.some((e) => e.field === 'partner_uf'),
      'quarentena deve identificar o campo partner_uf',
    );
  });
});

// ── 3. cost_centers -> bgp_cost_centers ───────────────────────────────────────

describe('mapCostCenterRow — type -> direction direto', () => {
  it('A PAGAR / A RECEBER -> direction identico; active e nome direto [mapa §3]', () => {
    const pagar = mapCostCenterRow(costCenterRow({ type: 'A PAGAR', active: true }));
    assert.ok(pagar.ok);
    assert.equal(pagar.value.input.direction, 'A PAGAR');
    assert.equal(pagar.value.input.name, 'Folha');
    assert.equal(pagar.value.input.active, true);
    assert.equal(pagar.value.budgetPlanLegacyId, 13);

    const receber = mapCostCenterRow(costCenterRow({ type: 'A RECEBER', active: false }));
    assert.ok(receber.ok);
    assert.equal(receber.value.input.direction, 'A RECEBER');
    assert.equal(receber.value.input.active, false);
  });
});

// ── 4. cost_centers_categories -> bgp_categories ──────────────────────────────

describe('mapCategoryRow — direto', () => {
  it('id/costCenterId/name/active direto [mapa §4]', () => {
    const r = mapCategoryRow(categoryRow());
    assert.ok(r.ok);
    assert.equal(r.value.legacyId, 70);
    assert.equal(r.value.costCenterLegacyId, 50);
    assert.equal(r.value.input.name, 'Pessoal');
    assert.equal(r.value.input.active, true);
  });
});

// ── 5. cost_centers_sub_categories -> bgp_subcategories ───────────────────────

describe('mapSubcategoryRow — releaseType -> launchType e guarda INSTITUCIONAL', () => {
  it('releaseType -> launchType direto (IPCA/DESPESAS_PESSOAIS/DESPESAS_LOGISTICAS) [mapa §5]', () => {
    for (const releaseType of ['IPCA', 'DESPESAS_PESSOAIS', 'DESPESAS_LOGISTICAS'] as const) {
      const r = mapSubcategoryRow(subcategoryRow({ releaseType, type: 'REDE' }));
      assert.ok(r.ok, `esperava ok p/ ${releaseType}`);
      assert.equal(r.value.input.launchType, releaseType);
    }
  });

  it('sub_category_type = INSTITUCIONAL -> QUARENTENA (alvo so guarda REDE) [CA8]', () => {
    const r = mapSubcategoryRow(subcategoryRow({ type: 'INSTITUCIONAL' }));
    assert.ok(!r.ok, 'INSTITUCIONAL nao tem onde ser guardado -> quarentena, nao descarte');
    assert.ok(
      r.error.some((e) => e.tag === 'EnumUnknown' && e.field === 'sub_category_type'),
      'reusa EnumUnknown com o valor tentado (INSTITUCIONAL)',
    );
  });
});

// ── 6. budget_results -> bgp_budget_results (o volume: 4.679; `model` DERIVADO) ─

describe('mapBudgetResultRow — model derivado da subcategoria; sem memoria de calculo', () => {
  it('model DERIVADO do launchType da subcategoria (nao existe no legado) [CA4]', () => {
    const pessoais = mapBudgetResultRow(resultRow({ costCenterSubCategoryId: 90 }), resultRefs());
    assert.ok(pessoais.ok);
    assert.equal(pessoais.value.input.model, 'DESPESAS_PESSOAIS');

    const ipca = mapBudgetResultRow(resultRow({ costCenterSubCategoryId: 91 }), resultRefs());
    assert.ok(ipca.ok);
    assert.equal(ipca.value.input.model, 'IPCA');

    const log = mapBudgetResultRow(resultRow({ costCenterSubCategoryId: 92 }), resultRefs());
    assert.ok(log.ok);
    assert.equal(log.value.input.model, 'DESPESAS_LOGISTICAS');
  });

  it('month e valueInCents -> valueCents direto; refs legadas carregadas [mapa §6]', () => {
    const r = mapBudgetResultRow(
      resultRow({ month: 3, valueInCents: 51500, budgetId: 100, costCenterSubCategoryId: 90 }),
      resultRefs(),
    );
    assert.ok(r.ok);
    assert.equal(r.value.input.month, 3);
    assert.equal(r.value.input.valueCents, 51500);
    assert.equal(r.value.budgetLegacyId, 100);
    assert.equal(r.value.subcategoryLegacyId, 90);
  });

  it('NENHUM insumo de calculo atravessa: input so {month, model, valueCents} [CA7/CA9]', () => {
    const r = mapBudgetResultRow(resultRow(), resultRefs());
    assert.ok(r.ok);
    // O `data` (json), costCenterCategoryId e afins NAO podem existir no destino.
    assert.deepEqual(Object.keys(r.value.input).sort(), ['model', 'month', 'valueCents']);
    assert.ok(!('data' in r.value.input));
  });

  it('subcategoria sem launchType nas refs -> QUARENTENA (model nao inventavel)', () => {
    const r = mapBudgetResultRow(resultRow({ costCenterSubCategoryId: 404 }), resultRefs());
    assert.ok(!r.ok, 'sem launchType da subcategoria o model nao pode ser derivado');
    assert.ok(
      r.error.some((e) => e.field === 'model' || e.field === 'subcategory_ref'),
      'quarentena identifica a falha de derivacao do model (nao descarta em silencio)',
    );
  });
});
