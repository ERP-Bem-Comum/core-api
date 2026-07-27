/**
 * W0 — REP-3 Slice C (#446). Compositor puro do RÓTULO do Plano Orçamentário.
 *
 * Decisão da P.O.: um plano não tem "nome". O rótulo é:
 *   label = scenarioName ?? `Programa ${programName} ${year} v${versionMajor}.${versionMinor}`
 * Fallback gracioso quando o nome do programa não resolve: `Plano ${year} v${maj}.${min}`.
 *
 * RED por inexistência de `composePlanLabel`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { composePlanLabel } from '#src/modules/budget-plans/adapters/persistence/repos/plan-label.ts';

describe('composePlanLabel — rótulo do Plano Orçamentário (REP-3 · #446)', () => {
  it('usa scenarioName quando presente (precede o rótulo derivado)', () => {
    assert.equal(
      composePlanLabel({
        scenarioName: 'Cenário Otimista',
        programName: 'Educação',
        year: 2026,
        versionMajor: 1,
        versionMinor: 2,
      }),
      'Cenário Otimista',
    );
  });

  it('sem cenário → `Programa {nome} {ano} v{maj}.{min}`', () => {
    assert.equal(
      composePlanLabel({
        scenarioName: null,
        programName: 'Educação',
        year: 2026,
        versionMajor: 1,
        versionMinor: 0,
      }),
      'Programa Educação 2026 v1.0',
    );
  });

  it('programa não resolvido (null) → fallback `Plano {ano} v{maj}.{min}`', () => {
    assert.equal(
      composePlanLabel({
        scenarioName: null,
        programName: null,
        year: 2027,
        versionMajor: 2,
        versionMinor: 3,
      }),
      'Plano 2027 v2.3',
    );
  });

  it('scenarioName vazio é tratado como ausente (cai no derivado)', () => {
    assert.equal(
      composePlanLabel({
        scenarioName: '',
        programName: 'Saúde',
        year: 2026,
        versionMajor: 3,
        versionMinor: 1,
      }),
      'Programa Saúde 2026 v3.1',
    );
  });
});
