/**
 * Regression guard estrutural — CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX.
 *
 * Origem: handbook/interviews/0001-functional-ddd-domain-refresh.md §Bloco C
 *   - DO §32: "Exhaustive switch: omitir default (preferível) OU
 *              default: { const _: never = x; return _; }. NUNCA throw."
 *   - DON'T §29: "default: throw new Error(...) no exhaustive switch viola
 *                 'zero throw' do CLAUDE.md raiz."
 *
 * Este teste escaneia os arquivos do módulo `contracts` que historicamente
 * combinavam `const _exhaustive: never` com `throw new Error` e falha se o
 * padrão proibido voltar (regression guard, não TDD canônico).
 *
 * Forma proibida:
 *     default: {
 *       const _exhaustive: never = x;
 *       throw new Error(`unreachable: ${JSON.stringify(_exhaustive)}`);
 *     }
 *
 * Forma canônica (DO C§32):
 *     default: {
 *       const _exhaustive: never = x;
 *       return _exhaustive;
 *     }
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

const WATCHED_FILES: readonly string[] = [
  // (cli/formatters/period.ts removido com a CLI embutida — CLI-RETIRE-EMBEDDED.)
  'src/modules/contracts/application/use-cases/homologate-amendment.ts',
];

const FORBIDDEN_PATTERN =
  /default\s*:\s*\{\s*const\s+_exhaustive\s*:\s*never[^}]*throw\s+new\s+Error/s;

describe('regression: no throw new Error in exhaustive default', () => {
  for (const rel of WATCHED_FILES) {
    it(`${rel} não contém o padrão proibido`, async () => {
      // Arrange
      const abs = resolve(repoRoot, rel);

      // Act
      const content = await readFile(abs, 'utf8');
      const match = FORBIDDEN_PATTERN.exec(content);

      // Assert
      assert.equal(
        match,
        null,
        `Forma proibida encontrada em ${rel}.\n` +
          `Trecho:\n${match?.[0] ?? '(none)'}\n\n` +
          `Substituir por:\n` +
          `  default: { const _exhaustive: never = x; return _exhaustive; }\n` +
          `Razão: entrevista 0001 Bloco C DO §32 + DON'T §29 + CLAUDE.md raiz Anti-padrão #7.`,
      );
    });
  }
});
