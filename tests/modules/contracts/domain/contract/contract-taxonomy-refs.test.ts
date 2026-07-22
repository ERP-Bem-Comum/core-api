/**
 * CTR-TAXONOMY-REFS — W0 (RED) — Centro de Custo / Categoria / Subcategoria como
 * refs do plano no agregado Contract (S3 do épico #502 = issue #343).
 *
 * Espelha `contract-classification-metadata.test.ts` (CTR-NUMBER-PROGRAM): os 3 refs
 * novos seguem EXATAMENTE o padrão de `programId`/`budgetPlanId` — `string | null`,
 * ref leve validada só na borda, **NÃO VO branded** (decisão do módulo contracts;
 * a S1 do financial usou VO branded, aqui é string simples).
 *
 * DEVE FALHAR: hoje `Contract.create`/`createPending` não aceitam nem carregam
 * `costCenterRef`/`categoryRef`/`subcategoryRef` → o agregado não expõe os campos →
 * `c.costCenterRef` resolve `undefined` em runtime → asserção falha. GREEN no W1
 * (registration metadata estende `ContractRegistrationMetaInput` + `resolveMeta`).
 *
 * Código EN, comentários PT-BR.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';

const pd = (iso: string) => {
  const r = PlainDate.from(iso);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
const money = (c: number) => {
  const r = Money.fromCents(c);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
const period = () => {
  const r = Period.create(pd('2026-01-01'), pd('2026-12-31'));
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
const contractor = () => {
  const r = ContractorRef.make('supplier', '55555555-5555-4555-8555-555555555555');
  if (!r.ok) throw new Error('contractor');
  return r.value;
};

// UUID v4 válidos (version nibble = 4, variant nibble = 8, todos hex). A S1 teve typo
// `u` não-hex; aqui cada literal é conferido: c/d/e são dígitos hexadecimais.
const COST_CENTER_REF = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const CATEGORY_REF = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const SUBCATEGORY_REF = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

// Metadados de cadastro base (CTR-NUMBER-PROGRAM) + os 3 refs novos (CTR-TAXONOMY-REFS).
const refsInput = () => ({
  id: ContractId.generate(),
  sequentialNumber: '001/2026',
  title: 'Contrato',
  objective: 'Objetivo',
  originalValue: money(10_000_000),
  originalPeriod: period(),
  contractor: contractor(),
  // Refs da árvore do plano (Centro → Categoria → Subcategoria):
  costCenterRef: COST_CENTER_REF,
  categoryRef: CATEGORY_REF,
  subcategoryRef: SUBCATEGORY_REF,
});

describe('Contract.create — refs de taxonomia do plano (CTR-TAXONOMY-REFS)', () => {
  it('CA2: carrega costCenterRef + categoryRef + subcategoryRef', () => {
    // Arrange
    const input = { ...refsInput(), signedAt: new Date('2026-01-01') };
    // Act
    const r = Contract.create(input);
    // Assert
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const c = r.value.contract as unknown as {
      costCenterRef: string | null;
      categoryRef: string | null;
      subcategoryRef: string | null;
    };
    assert.equal(c.costCenterRef, COST_CENTER_REF);
    assert.equal(c.categoryRef, CATEGORY_REF);
    assert.equal(c.subcategoryRef, SUBCATEGORY_REF);
  });

  it('CA3: os 3 refs convivem com programId/budgetPlanId e com o texto livre (categorizacao/centroDeCusto)', () => {
    // Arrange — refs novos + refs/rótulos antigos no mesmo contrato
    const input = {
      ...refsInput(),
      signedAt: new Date('2026-01-01'),
      programId: '77777777-7777-4777-8777-777777777777',
      budgetPlanId: '88888888-8888-4888-8888-888888888888',
      categorizacao: 'Investimento',
      centroDeCusto: 'CC-100',
    };
    // Act
    const r = Contract.create(input);
    // Assert
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const c = r.value.contract as unknown as {
      costCenterRef: string | null;
      categoryRef: string | null;
      subcategoryRef: string | null;
      programId: string | null;
      budgetPlanId: string | null;
      categorizacao: string | null;
      centroDeCusto: string | null;
    };
    // Novos (RED hoje):
    assert.equal(c.costCenterRef, COST_CENTER_REF);
    assert.equal(c.categoryRef, CATEGORY_REF);
    assert.equal(c.subcategoryRef, SUBCATEGORY_REF);
    // Antigos permanecem intactos (regressão zero):
    assert.equal(c.programId, '77777777-7777-4777-8777-777777777777');
    assert.equal(c.budgetPlanId, '88888888-8888-4888-8888-888888888888');
    assert.equal(c.categorizacao, 'Investimento');
    assert.equal(c.centroDeCusto, 'CC-100');
  });

  it('CA4: os 3 refs são opcionais — ausentes nascem null (back-compat)', () => {
    // Arrange — omite os 3 refs (exactOptionalPropertyTypes: não passar undefined explícito)
    const { costCenterRef: _cc, categoryRef: _ca, subcategoryRef: _sc, ...rest } = refsInput();
    void _cc;
    void _ca;
    void _sc;
    // Act
    const r = Contract.create({ ...rest, signedAt: new Date('2026-01-01') });
    // Assert
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const c = r.value.contract as unknown as {
      costCenterRef: string | null;
      categoryRef: string | null;
      subcategoryRef: string | null;
    };
    assert.equal(c.costCenterRef, null);
    assert.equal(c.categoryRef, null);
    assert.equal(c.subcategoryRef, null);
  });
});

describe('Contract.createPending — refs de taxonomia do plano (CTR-TAXONOMY-REFS)', () => {
  it('CA2: PendingContract carrega os 3 refs', () => {
    // Arrange
    const input = { ...refsInput(), createdAt: new Date('2026-01-10') };
    // Act
    const r = Contract.createPending(input);
    // Assert
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const c = r.value.contract as unknown as {
      costCenterRef: string | null;
      categoryRef: string | null;
      subcategoryRef: string | null;
    };
    assert.equal(c.costCenterRef, COST_CENTER_REF);
    assert.equal(c.categoryRef, CATEGORY_REF);
    assert.equal(c.subcategoryRef, SUBCATEGORY_REF);
  });

  it('CA4: PendingContract sem os refs → nascem null', () => {
    // Arrange
    const { costCenterRef: _cc, categoryRef: _ca, subcategoryRef: _sc, ...rest } = refsInput();
    void _cc;
    void _ca;
    void _sc;
    // Act
    const r = Contract.createPending({ ...rest, createdAt: new Date('2026-01-10') });
    // Assert
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const c = r.value.contract as unknown as {
      costCenterRef: string | null;
      categoryRef: string | null;
      subcategoryRef: string | null;
    };
    assert.equal(c.costCenterRef, null);
    assert.equal(c.categoryRef, null);
    assert.equal(c.subcategoryRef, null);
  });
});
