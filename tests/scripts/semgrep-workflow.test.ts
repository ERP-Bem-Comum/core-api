/**
 * SEMGREP-ADR-ENFORCER (#548) — W0 RED.
 *
 * Garante que o gate Semgrep (a criar no W1) existe como workflow do GitHub Actions, roda em PR
 * para dev/main, é SHA-pinado (ADR-0011), NÃO tem escape (`|| true` / `continue-on-error`), e que
 * o arquivo de rules `.semgrep/rules.yml` declara as rules precisas e ADR-ancoradas do MVP:
 *
 *   - `mysql-enum-forbidden`   — `mysqlEnum(` no schema Drizzle (ADR-0020: usar VARCHAR + CHECK).
 *   - `mysql-json-forbidden`   — coluna JSON nativa `json(` no schema Drizzle (ADR-0020).
 *
 * Escopo do MVP = SÓ rules **precisas** (AST TypeScript), verificado por grep que NÃO batem em
 * código existente (0 `mysqlEnum(`, 0 `json(` bare). São exatamente a classe de drift que nem o
 * tsc nem o ESLint nem os hooks pegam — o valor único deste gate.
 *
 * Diferidas COM RAZÃO (não silenciosamente):
 *   - `no-npm`                     — num scan estático falso-positiva no próprio `block-npm.sh`
 *                                    (o comentário dele documenta o ban) e em docs. O risco real de
 *                                    `npm` já é coberto pelo hook `block-npm.sh` (execução) + ADR-0012.
 *   - `nodenext-ts-extension`      — o tsc já barra (TS2835 sob NodeNext); Semgrep seria redundante.
 *   - `no-throw-exhaustive-default`— impreciso em Semgrep (falso-positivo em switch não-exaustivo).
 *
 * Estilo: asserção de ESTRUTURA sobre o texto do arquivo (molde de `integration-matrix-workflow.
 * test.ts`), via `tryRead` — devolve '' quando o arquivo ainda não existe. Sem parser YAML
 * (ADR-0011: zero dependência nova) — regex ancorada sobre o texto.
 *
 * POR QUE RED AGORA: nem o workflow nem o `rules.yml` existem → `tryRead` devolve '' → o guard
 * `present()`/`rulesPresent()` de cada `it()` falha com "... ausente".
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel: string): string =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf-8');
const tryRead = (rel: string): string => {
  try {
    return read(rel);
  } catch {
    return '';
  }
};

const wf = tryRead('../../.github/workflows/semgrep.yml');
const rules = tryRead('../../.semgrep/rules.yml');

const present = (): void => {
  assert.ok(
    wf.length > 0,
    'workflow .github/workflows/semgrep.yml ausente — o W1 ainda não o escreveu (RED esperado)',
  );
};
const rulesPresent = (): void => {
  assert.ok(
    rules.length > 0,
    'arquivo .semgrep/rules.yml ausente — o W1 ainda não o escreveu (RED esperado)',
  );
};

// Texto sem linhas de COMENTÁRIO (as que começam, após indentação, com `#`). As asserções de
// AUSÊNCIA (`|| true`, `continue-on-error`) precisam ignorar comentários que citem esses termos.
const body = wf
  .split('\n')
  .filter((line) => !line.trim().startsWith('#'))
  .join('\n');

const RULE_IDS = ['mysql-enum-forbidden', 'mysql-json-forbidden'] as const;

describe('semgrep.yml — CA1: job que roda o Semgrep sobre as rules locais', () => {
  it('define um job e invoca o semgrep apontando para a config .semgrep', () => {
    present();
    assert.match(wf, /^\s*semgrep:/m, 'job `semgrep` ausente');
    assert.match(wf, /runs-on:\s*ubuntu-latest/, '`runs-on: ubuntu-latest` ausente');
    assert.match(wf, /semgrep/i, 'invocação do semgrep ausente');
    assert.match(wf, /\.semgrep/, 'referência à config `.semgrep/` ausente');
  });

  it('exclui as fixtures do scan (senão o gate falha nos próprios testes de rule)', () => {
    present();
    assert.match(
      body,
      /--exclude[= ]\S*\.semgrep/,
      'scan precisa excluir `.semgrep/` (as fixtures têm findings de propósito)',
    );
  });
});

describe('semgrep.yml — CA2: gatilhos (on:)', () => {
  it('roda em PR para [dev, main] + workflow_dispatch', () => {
    present();
    assert.match(wf, /pull_request:/, '`on.pull_request` ausente');
    assert.match(wf, /branches:\s*\[dev,\s*main\]/, 'PR deve ser filtrado para [dev, main]');
    assert.match(wf, /workflow_dispatch/, '`on.workflow_dispatch` (run manual) ausente');
  });
});

describe('semgrep.yml — CA3: SHA-pin (ADR-0011) + sem escape de gate', () => {
  it('toda action é pinada por SHA de 40 hex, nunca por tag @vX', () => {
    present();
    const usesLines = body.split('\n').filter((l) => /^\s*(- )?uses:/.test(l));
    assert.ok(usesLines.length > 0, 'nenhum `uses:` — o job precisa de ao menos o checkout');
    for (const line of usesLines) {
      assert.match(
        line,
        /uses:\s*\S+@[0-9a-f]{40}/,
        `action sem SHA-pin de 40 hex (ADR-0011): ${line.trim()}`,
      );
    }
    assert.doesNotMatch(
      body,
      /uses:\s*\S+@v\d/,
      'action pinada por tag @vX em vez de SHA (ADR-0011)',
    );
  });

  it('não tem `|| true` nem `continue-on-error: true` (gate real, não report-only)', () => {
    present();
    assert.doesNotMatch(
      body,
      /\|\|\s*true/,
      '`|| true` mascara falha — o gate tem de falhar de verdade',
    );
    assert.doesNotMatch(
      body,
      /continue-on-error:\s*true/,
      '`continue-on-error: true` torna o gate report-only (CWE-703)',
    );
  });
});

describe('semgrep.yml — CA4: rules precisas e ADR-ancoradas em .semgrep/rules.yml', () => {
  it('declara as rules do MVP, cada uma com id/message/severity/languages', () => {
    rulesPresent();
    for (const id of RULE_IDS) {
      assert.match(rules, new RegExp(`id:\\s*${id}\\b`), `rule \`${id}\` ausente em rules.yml`);
    }
    assert.match(rules, /message:/, 'rules sem `message:` (o dev tem de saber por que falhou)');
    assert.match(rules, /severity:/, 'rules sem `severity:`');
    assert.match(rules, /languages:/, 'rules sem `languages:`');
    assert.match(rules, /ADR-0020/, 'rules devem ancorar no ADR-0020 (rastreabilidade)');
  });
});
