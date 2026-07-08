/**
 * BGP-PLAN-CRUD — W0 (RED) — use case getBudgetPlanOptions (issue #315, CA5).
 *
 * DECISÃO DE CONTRATO (000-request.md): diverge do legado de propósito — a CA
 * da issue pede programas/anos/redes para a tela de criação (o legado retornava
 * planos APROVADOS). years = anos distintos dos planos ∪ {anoCorrente, anoCorrente+1}.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOk } from '#src/shared/index.ts';
import { getBudgetPlanOptions } from '#src/modules/budget-plans/application/use-cases/get-budget-plan-options.ts';
import {
  makeDeps,
  createPlanOrFail,
  PROGRAM_ETI_REF,
  STATE_CE_REF,
  MUN_FORTALEZA_REF,
} from './_support.ts';

describe('getBudgetPlanOptions', () => {
  it('CA5: retorna programas ativos, anos e redes (estados+municípios)', async () => {
    const r = await getBudgetPlanOptions(makeDeps())();
    assert.ok(isOk(r));

    // Programas: só os ativos do catálogo (inativo fica de fora do select).
    const abbreviations = r.value.programs.map((p) => p.abbreviation).sort();
    assert.deepEqual(abbreviations, ['ETI', 'PARC']);
    const eti = r.value.programs.find((p) => p.abbreviation === 'ETI');
    assert.ok(eti);
    assert.equal(eti.ref, PROGRAM_ETI_REF);
    assert.equal(eti.name, 'Ensino em Tempo Integral');

    // Anos: clock fixo em 2026 -> ano corrente e seguinte, sem planos ainda.
    assert.deepEqual(r.value.years, [2026, 2027]);

    // Redes: estados e municípios parceiros com discriminador kind.
    const state = r.value.redes.find((n) => n.kind === 'state');
    assert.ok(state);
    assert.equal(state.ref, STATE_CE_REF);
    assert.equal(state.name, 'Ceará');
    assert.equal(state.uf, 'CE');
    const mun = r.value.redes.find((n) => n.kind === 'municipality');
    assert.ok(mun);
    assert.equal(mun.ref, MUN_FORTALEZA_REF);
    assert.equal(mun.name, 'Fortaleza');
  });

  it('anos incluem os anos de planos existentes (dedup + ordenado asc)', async () => {
    const deps = makeDeps();
    await createPlanOrFail(deps, { year: 2024, programRef: PROGRAM_ETI_REF });
    await createPlanOrFail(deps, { year: 2026, programRef: PROGRAM_ETI_REF });

    const r = await getBudgetPlanOptions(deps)();
    assert.ok(isOk(r));
    assert.deepEqual(r.value.years, [2024, 2026, 2027]);
  });
});
