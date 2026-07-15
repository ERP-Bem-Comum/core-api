/**
 * BGP-MEMORY-SEED-CATALOG — W0 (RED) — parser de seed do budget-plans via env (#330).
 *
 * DEVE FALHAR: `parseE2eBudgetPlansSeed` ainda não existe em
 * `budget-plans/adapters/http/e2e-seed.ts`. Espelho de `parseE2eAuthSeed`
 * (`auth/adapters/http/e2e-seed.ts`): guarda dupla `CORE_API_E2E === '1'` +
 * `BUDGET_PLANS_SEED_JSON`; JSON malformado ou shape inválido sob a flag → throw
 * (falha de boot, ambiente controlado dev/test); produção (flag ausente) → undefined.
 *
 * Camada unit (entra no `pnpm test`): o parser é puro, sem I/O — recebe um
 * `Record<string, string | undefined>` no lugar de `process.env`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { parseE2eBudgetPlansSeed } from '#src/modules/budget-plans/adapters/http/e2e-seed.ts';

const PROGRAM_ETI_REF = '11111111-1111-4111-8111-111111111111';

const validProgram = {
  ref: PROGRAM_ETI_REF,
  name: 'Ensino em Tempo Integral',
  abbreviation: 'ETI',
  active: true,
};
const validState = { ref: 'CE', name: 'Ceará', uf: 'CE' };
const validMunicipality = { ref: '2304400', name: 'Fortaleza', uf: 'CE' };

describe('parseE2eBudgetPlansSeed — guarda dupla / inerte (CA4)', () => {
  it('CA4: CORE_API_E2E ausente → undefined (produção, jamais lido)', () => {
    assert.equal(parseE2eBudgetPlansSeed({}), undefined);
  });

  it('CA4: CORE_API_E2E ausente mesmo com BUDGET_PLANS_SEED_JSON presente → undefined', () => {
    assert.equal(
      parseE2eBudgetPlansSeed({
        BUDGET_PLANS_SEED_JSON: JSON.stringify({ programs: [validProgram] }),
      }),
      undefined,
    );
  });

  it('CA4: CORE_API_E2E="0" (não "1") → undefined', () => {
    assert.equal(
      parseE2eBudgetPlansSeed({
        CORE_API_E2E: '0',
        BUDGET_PLANS_SEED_JSON: JSON.stringify({ programs: [validProgram] }),
      }),
      undefined,
    );
  });

  it('CA4: flag ligada mas BUDGET_PLANS_SEED_JSON ausente → undefined (inerte)', () => {
    assert.equal(parseE2eBudgetPlansSeed({ CORE_API_E2E: '1' }), undefined);
  });

  it('CA4: flag ligada mas BUDGET_PLANS_SEED_JSON vazio ("") → undefined (inerte)', () => {
    assert.equal(
      parseE2eBudgetPlansSeed({ CORE_API_E2E: '1', BUDGET_PLANS_SEED_JSON: '' }),
      undefined,
    );
  });
});

describe('parseE2eBudgetPlansSeed — falha explícita de boot em malformado (CA3)', () => {
  it('CA3: JSON malformado sob a flag → lança SyntaxError', () => {
    assert.throws(
      () =>
        parseE2eBudgetPlansSeed({
          CORE_API_E2E: '1',
          BUDGET_PLANS_SEED_JSON: '{ programs: [', // JSON sintaticamente inválido
        }),
      SyntaxError,
    );
  });

  it('CA3: shape inválido (falta programs) → throw com mensagem clara', () => {
    assert.throws(
      () =>
        parseE2eBudgetPlansSeed({
          CORE_API_E2E: '1',
          BUDGET_PLANS_SEED_JSON: JSON.stringify({ partnerStates: [validState] }),
        }),
      /shape inválido|programs/i,
    );
  });

  it('CA3: shape inválido (programa sem ref) → throw', () => {
    assert.throws(
      () =>
        parseE2eBudgetPlansSeed({
          CORE_API_E2E: '1',
          BUDGET_PLANS_SEED_JSON: JSON.stringify({
            programs: [{ name: 'ETI', abbreviation: 'ETI', active: true }],
          }),
        }),
      Error,
    );
  });

  it('CA3: shape inválido (programa sem abbreviation) → throw', () => {
    assert.throws(
      () =>
        parseE2eBudgetPlansSeed({
          CORE_API_E2E: '1',
          BUDGET_PLANS_SEED_JSON: JSON.stringify({
            programs: [{ ref: PROGRAM_ETI_REF, name: 'ETI', active: true }],
          }),
        }),
      Error,
    );
  });

  it('CA3: shape inválido (programa com active não-boolean) → throw', () => {
    assert.throws(
      () =>
        parseE2eBudgetPlansSeed({
          CORE_API_E2E: '1',
          BUDGET_PLANS_SEED_JSON: JSON.stringify({
            programs: [{ ref: PROGRAM_ETI_REF, name: 'ETI', abbreviation: 'ETI', active: 'yes' }],
          }),
        }),
      Error,
    );
  });
});

describe('parseE2eBudgetPlansSeed — válido devolve BudgetPlansSeed', () => {
  it('programs + partnerStates + partnerMunicipalities → devolve o seed', () => {
    const seed = parseE2eBudgetPlansSeed({
      CORE_API_E2E: '1',
      BUDGET_PLANS_SEED_JSON: JSON.stringify({
        programs: [validProgram],
        partnerStates: [validState],
        partnerMunicipalities: [validMunicipality],
      }),
    });
    assert.ok(seed !== undefined);
    assert.equal(seed.programs?.length, 1);
    assert.equal(seed.programs?.[0]?.ref, PROGRAM_ETI_REF);
    assert.equal(seed.programs?.[0]?.abbreviation, 'ETI');
    assert.equal(seed.programs?.[0]?.active, true);
    assert.equal(seed.partnerStates?.[0]?.ref, 'CE');
    assert.equal(seed.partnerMunicipalities?.[0]?.ref, '2304400');
  });

  it('programs sem redes (partnerStates/Municipalities ausentes) → devolve seed só com programs', () => {
    const seed = parseE2eBudgetPlansSeed({
      CORE_API_E2E: '1',
      BUDGET_PLANS_SEED_JSON: JSON.stringify({ programs: [validProgram] }),
    });
    assert.ok(seed !== undefined);
    assert.equal(seed.programs?.length, 1);
    assert.equal(seed.programs?.[0]?.ref, PROGRAM_ETI_REF);
  });
});
