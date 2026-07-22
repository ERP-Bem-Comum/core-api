/**
 * CTR-TAXONOMY-REFS — W0 (RED) — round-trip do mapper para os 3 refs de taxonomia
 * (`costCenterRef`/`categoryRef`/`subcategoryRef`) em `ctr_contracts` (S3 do épico #502).
 *
 * Teste PURO (sem MySQL): exercita `contractToInsert` (domínio → row) e `contractFromRow`
 * (row → domínio), espelhando `contract.mapper.test.ts`. Os 3 refs seguem o padrão de
 * `programId`/`budgetPlanId` — `string | null` cru, copiado 1:1 em ambas as direções.
 *
 * DEVE FALHAR (RED pelo motivo certo):
 *  - `contractToInsert`: hoje NÃO copia os 3 refs para a row → `row.costCenterRef` é `undefined`.
 *  - `contractFromRow`: hoje NÃO lê os 3 refs da row → o domínio reidratado não os expõe.
 * GREEN no W1 (schema ganha as 3 colunas + mapper copia nas duas direções).
 *
 * Roda em `pnpm test` puro. Regressão zero (CA8): não edita `contract.mapper.test.ts`.
 * Código EN, comentários PT-BR.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import {
  contractFromRow,
  contractToInsert,
} from '#src/modules/contracts/adapters/persistence/mappers/contract.mapper.ts';
import type { ContractRow } from '#src/modules/contracts/adapters/persistence/mappers/contract.mapper.ts';
import { buildContract } from './fixtures.ts';

// UUID v4 válidos (version=4, variant=8, todos hex — sem typo não-hex).
const COST_CENTER_REF = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const CATEGORY_REF = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const SUBCATEGORY_REF = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const PROGRAM_ID = '77777777-7777-4777-8777-777777777777';
const BUDGET_PLAN_ID = '88888888-8888-4888-8888-888888888888';

// Acesso strip-safe às propriedades novas (a row/domínio ainda não as tipa em W0).
interface Refs {
  costCenterRef?: string | null;
  categoryRef?: string | null;
  subcategoryRef?: string | null;
  programId?: string | null;
  budgetPlanId?: string | null;
  categorizacao?: string | null;
  centroDeCusto?: string | null;
}
const asRefs = (o: unknown): Refs => o as Refs;

describe('contractToInsert — grava os 3 refs de taxonomia (CTR-TAXONOMY-REFS)', () => {
  it('CA2/CA3: row leva costCenterRef/categoryRef/subcategoryRef e mantém program/budget/texto livre', () => {
    // Arrange — Active com program/budget/texto livre + os 3 refs novos costurados no agregado.
    const base = buildContract();
    const contract = {
      ...base,
      programId: PROGRAM_ID,
      budgetPlanId: BUDGET_PLAN_ID,
      categorizacao: 'Investimento',
      centroDeCusto: 'CC-100',
      costCenterRef: COST_CENTER_REF,
      categoryRef: CATEGORY_REF,
      subcategoryRef: SUBCATEGORY_REF,
    };
    // Act
    const { row } = contractToInsert(contract as unknown as Parameters<typeof contractToInsert>[0]);
    // Assert — novos (RED hoje: undefined):
    const r = asRefs(row);
    assert.equal(r.costCenterRef, COST_CENTER_REF);
    assert.equal(r.categoryRef, CATEGORY_REF);
    assert.equal(r.subcategoryRef, SUBCATEGORY_REF);
    // Coexistência (regressão zero): os antigos seguem na row.
    assert.equal(r.programId, PROGRAM_ID);
    assert.equal(r.budgetPlanId, BUDGET_PLAN_ID);
    assert.equal(r.categorizacao, 'Investimento');
    assert.equal(r.centroDeCusto, 'CC-100');
  });

  it('CA4: contrato sem os refs → row com os 3 campos null', () => {
    // Arrange
    const contract = buildContract();
    // Act
    const { row } = contractToInsert(contract);
    // Assert
    const r = asRefs(row);
    assert.equal(r.costCenterRef, null);
    assert.equal(r.categoryRef, null);
    assert.equal(r.subcategoryRef, null);
  });
});

// Base de row Active válida (espelha BASE_ROW de contract.mapper.test.ts) + as 3 colunas
// novas. Tipada frouxa e cast `as unknown as ContractRow`: em W0 `ContractRow` ainda não
// declara os 3 refs (o schema Drizzle não os tem) — o strip-types ignora o cast.
const activeRowWithRefs = (): ContractRow =>
  ({
    id: '11111111-1111-4111-8111-111111111111',
    sequentialNumber: '001/2026',
    title: 'Contrato mapper refs',
    objective: 'Round-trip dos 3 refs de taxonomia',
    signedAt: new Date('2026-01-15T00:00:00.000Z'),
    originalValueCents: 10_000_000,
    originalPeriodKind: 'Fixed',
    originalPeriodStart: new Date('2026-01-15T00:00:00.000Z'),
    originalPeriodEnd: new Date('2026-12-31T00:00:00.000Z'),
    currentValueCents: 10_000_000,
    currentPeriodKind: 'Fixed',
    currentPeriodStart: new Date('2026-01-15T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-12-31T00:00:00.000Z'),
    status: 'Active',
    endedAt: null,
    terminationReason: null,
    contractorType: 'supplier',
    contractorId: '55555555-5555-4555-8555-555555555555',
    classification: 'CT',
    programId: PROGRAM_ID,
    budgetPlanId: BUDGET_PLAN_ID,
    categorizacao: 'Investimento',
    centroDeCusto: 'CC-100',
    // Colunas novas (W1):
    costCenterRef: COST_CENTER_REF,
    categoryRef: CATEGORY_REF,
    subcategoryRef: SUBCATEGORY_REF,
    observations: null,
    email: null,
    telephone: null,
  }) as unknown as ContractRow;

describe('contractFromRow — lê os 3 refs de taxonomia (CTR-TAXONOMY-REFS)', () => {
  it('CA2/CA3: domínio reidratado expõe os 3 refs e mantém program/budget/texto livre', () => {
    // Arrange
    const row = activeRowWithRefs();
    // Act
    const r = contractFromRow(row, []);
    // Assert
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const c = asRefs(r.value);
    // Novos (RED hoje: undefined):
    assert.equal(c.costCenterRef, COST_CENTER_REF);
    assert.equal(c.categoryRef, CATEGORY_REF);
    assert.equal(c.subcategoryRef, SUBCATEGORY_REF);
    // Antigos preservados (regressão zero):
    assert.equal(c.programId, PROGRAM_ID);
    assert.equal(c.budgetPlanId, BUDGET_PLAN_ID);
    assert.equal(c.categorizacao, 'Investimento');
    assert.equal(c.centroDeCusto, 'CC-100');
  });

  it('CA4: row com os 3 refs null → domínio com os 3 refs null', () => {
    // Arrange
    const row = {
      ...activeRowWithRefs(),
      costCenterRef: null,
      categoryRef: null,
      subcategoryRef: null,
    } as unknown as ContractRow;
    // Act
    const r = contractFromRow(row, []);
    // Assert
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const c = asRefs(r.value);
    assert.equal(c.costCenterRef, null);
    assert.equal(c.categoryRef, null);
    assert.equal(c.subcategoryRef, null);
  });
});
