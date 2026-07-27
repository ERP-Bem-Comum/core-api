/**
 * W0 — REP-3 Slice C (#446). Compositor puro do RÓTULO do Plano Orçamentário.
 *
 * Decisão da P.O.: um plano não tem "nome"; segue o PADRÃO do sistema (programa pela SIGLA):
 *   label = scenarioName ?? `${programAbbreviation} — ${programName}`   (ex.: "PARC — Parceria pela Alfabetização")
 * Fallbacks graciosos: só o nome quando falta a sigla; `Plano ${year} v${maj}.${min}` quando falta o programa.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { composePlanLabel } from '#src/modules/budget-plans/adapters/persistence/repos/plan-label.ts';

describe('composePlanLabel — rótulo do Plano Orçamentário (REP-3 · #446)', () => {
  it('usa scenarioName quando presente (precede o rótulo derivado)', () => {
    assert.equal(
      composePlanLabel({
        scenarioName: 'Cenário Otimista',
        programAbbreviation: 'PARC',
        programName: 'Parceria pela Alfabetização',
        year: 2026,
        versionMajor: 1,
        versionMinor: 2,
      }),
      'Cenário Otimista',
    );
  });

  it('sem cenário → `{sigla} — {nome}` (padrão do sistema)', () => {
    assert.equal(
      composePlanLabel({
        scenarioName: null,
        programAbbreviation: 'PARC',
        programName: 'Parceria pela Alfabetização',
        year: 2026,
        versionMajor: 1,
        versionMinor: 0,
      }),
      'PARC — Parceria pela Alfabetização',
    );
  });

  it('sem sigla mas com nome → só o nome (gracioso)', () => {
    assert.equal(
      composePlanLabel({
        scenarioName: null,
        programAbbreviation: null,
        programName: 'Parceria pela Alfabetização',
        year: 2026,
        versionMajor: 1,
        versionMinor: 0,
      }),
      'Parceria pela Alfabetização',
    );
  });

  it('programa não resolvido (null) → fallback `Plano {ano} v{maj}.{min}`', () => {
    assert.equal(
      composePlanLabel({
        scenarioName: null,
        programAbbreviation: null,
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
        programAbbreviation: 'SAUDE',
        programName: 'Saúde',
        year: 2026,
        versionMajor: 3,
        versionMinor: 1,
      }),
      'SAUDE — Saúde',
    );
  });
});
