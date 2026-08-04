/**
 * MODULE-BOUNDARY — a fronteira do modular monolith (ADR-0006) é mecânica, não confiança.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Norma: um módulo consome outro EXCLUSIVAMENTE por `<outro>/public-api/`. Nunca por `domain/`,
 * `application/`, `adapters/` ou `worker/`. É o que sustenta a promessa do ADR-0006 — extrair um
 * módulo como serviço sem refactor traumático — porque o que atravessa a fronteira é a superfície
 * declarada, não o interior.
 *
 * Por que este gate existe: o inventário de decisões (`context/decisions/ADR-0006.yaml`) registrou
 * que esta é a alegação com 100% de adesão e ZERO proteção mecânica de todo o acervo. Adesão
 * perfeita por disciplina é exatamente o estado que se perde em silêncio no primeiro import
 * apressado — e o `no-cross-context-import` que o ADR nomeia nunca existiu no `eslint.config.js`
 * (verificado: grep vazio).
 *
 * ESCOPO — a fronteira vale ENTRE MÓDULOS. O composition root (`src/server.ts`, `src/workers/`,
 * `src/jobs/`) fica FORA dela por desenho: é ele quem monta as peças concretas, e alcançar
 * `adapters/` ali é a própria função do papel — o `workers/runner/specs.ts` liga repositórios
 * Drizzle de quatro módulos. Incluir o composition root reprovaria a arquitetura em vez do desvio.
 *
 * O parser lê o SPECIFIER do import (`from '...'`), não o texto solto: um caminho citado em
 * comentário não é violação. Essa distinção já custou um falso achado nesta série de fatias.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { PROJECT_ROOT, importSpecifiers, walkFiles } from '../support/source-scan.ts';

const MODULES_ROOT = join(PROJECT_ROOT, 'src', 'modules');

const CROSS_MODULE = /modules\/([a-z-]+)\/(.*)/;

const moduleNames = (): readonly string[] =>
  readdirSync(MODULES_ROOT)
    .filter((e) => statSync(join(MODULES_ROOT, e)).isDirectory())
    .sort();

const tsFilesOf = (moduleName: string): readonly string[] =>
  walkFiles(join(MODULES_ROOT, moduleName), { ext: '.ts' });

type Violation = Readonly<{ file: string; specifier: string }>;

const boundaryViolations = (): readonly Violation[] => {
  const mods = new Set(moduleNames());
  const out: Violation[] = [];
  for (const owner of mods) {
    for (const file of tsFilesOf(owner)) {
      for (const specifier of importSpecifiers(file)) {
        const hit = CROSS_MODULE.exec(specifier);
        if (hit === null) continue;
        const [, other, rest] = hit;
        if (other === undefined || rest === undefined) continue;
        if (other === owner || !mods.has(other)) continue;
        if (rest.startsWith('public-api')) continue;
        out.push({ file, specifier });
      }
    }
  }
  return out;
};

describe('MODULE-BOUNDARY — módulo só consome outro pela public-api (ADR-0006)', () => {
  it('nenhum import cross-módulo alcança domain/, application/, adapters/ ou worker/', () => {
    const violations = boundaryViolations();
    assert.deepEqual(
      violations.map((v) => `${v.file} → ${v.specifier}`),
      [],
      'Import cross-módulo furando a public-api — a promessa de extrair o módulo como serviço ' +
        'deixa de valer no momento em que o interior de um vira dependência do outro (ADR-0006)',
    );
  });

  it('a varredura enxerga os módulos e seus imports (guarda contra verde por vacuidade)', () => {
    // Sem esta guarda, um erro no walk ou na regex tornaria o teste acima verde sem ter lido nada.
    const mods = moduleNames();
    assert.ok(mods.length >= 2, `esperado 2+ módulos em src/modules/, encontrado ${mods.length}`);
    const anyCrossModuleImport = mods.some((m) =>
      tsFilesOf(m).some((f) =>
        importSpecifiers(f).some((s) => /modules\/[a-z-]+\/public-api/.test(s)),
      ),
    );
    assert.ok(
      anyCrossModuleImport,
      'nenhum import por public-api encontrado — o parser provavelmente parou de casar',
    );
  });
});
