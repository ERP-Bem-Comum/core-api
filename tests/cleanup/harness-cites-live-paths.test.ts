/**
 * HARNESS-CITES-LIVE-PATHS — a instrução que forma o agente não aponta para código que não existe.
 *
 * O `claude-md-links.test.ts` já cobre os LINKS markdown do `CLAUDE.md` e das rules. Este gate cobre
 * o que sobra e que ninguém auditava: o path de `src/` citado dentro de skill e agent — em bloco de
 * código, em tabela de roteamento, em diagrama. Não é link, então nenhum gate o via.
 *
 * O custo disso foi medido em 03/09/2026, numa auditoria só:
 *
 *   • A skill `application-cli-builder` (330 linhas) ensinava a construir `src/modules/<X>/cli/`,
 *     diretório que o ADR-0037 retirou. Nenhum `cli/` existe em `src/`.
 *   • Oitenta e três ocorrências de `src/modules/contratos/` e `src/modules/financeiro/` — nomes em
 *     português que NUNCA existiram; os módulos sempre se chamaram `contracts` e `financial`.
 *   • A skill `modular-monolith`, canônica para fronteira de módulo, ensinava que a fronteira mora
 *     em `modules/<X>/contracts/` enquanto o anti-padrão #3 do `CLAUDE.md` manda `public-api/`.
 *
 * Os três são a mesma falha: doc canônica mentindo sobre o código, no lugar onde a mentira se
 * propaga mais rápido — a instrução lida pelo próximo agente antes de ele abrir o repositório.
 *
 * ⚠️ Uso ≠ menção. Changelog que narra "a skill ensinava um `cli/` por módulo" está CERTO e não pode
 * ser acusado; a isenção é a mesma do `inventory-counts.test.ts` — data explícita junto da citação.
 *
 * ⚠️ Existência pelo git, nunca pelo disco (`.claude/rules/testing.md`).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

const git = (...args: readonly string[]): readonly string[] =>
  execFileSync('git', ['-C', PROJECT_ROOT, ...args], { encoding: 'utf-8' })
    .split('\n')
    .filter((l) => l.length > 0);

/** Os módulos e as camadas que EXISTEM, lidos do repositório versionado. */
const tracked = git('ls-files', 'src/modules/*');
const MODULES = new Set(tracked.map((p) => p.split('/')[2]).filter((m): m is string => m !== ''));
const LAYERS = new Set(tracked.map((p) => p.split('/')[3]).filter((l): l is string => l !== ''));

const HARNESS = [
  ...git('ls-files', '.claude/skills/**/*.md'),
  ...git('ls-files', '.claude/agents/*.md'),
];

/**
 * `src/modules/<mod>/` e `modules/<mod>/`, com ou sem o `src/` na frente.
 *
 * ⚠️ O gate confere o NOME DO MÓDULO e para aí — não a camada seguinte. Foi uma escolha, tomada
 * depois que a primeira versão conferiu as duas e produziu dois falsos positivos legítimos:
 *
 *   • `modules/contracts/utils/` aparece numa tabela "❌ Errado | ✅ Certo" da `modular-monolith`.
 *     Citar um path inexistente como exemplo DO QUE NÃO FAZER é uso correto — acusar isso ensinaria
 *     a apagar o anti-exemplo, que é justamente a parte que educa.
 *   • `adapters/http/` é subpasta de camada, não camada; conferir profundidade variável exigiria o
 *     gate conhecer a anatomia interna de cada módulo, e ele passaria a acusar reorganização legítima.
 *
 * Nome de módulo é inequívoco: ou `financial` existe, ou não existe. Era onde estavam as 83
 * ocorrências de `contratos`/`financeiro` que motivaram este arquivo.
 */
const CITATION = /\b(?:src\/)?modules\/([A-Za-z][A-Za-z0-9-]*)\//giu;
const DATED = /\b(\d{1,2}\/\d{1,2}(\/\d{2,4})?|\d{4}-\d{2}-\d{2})\b/u;
/** `modules/X/`, `modules/Y/`, `modules/NNN/` — placeholder de template, não citação de módulo. */
const PLACEHOLDER = /^[A-Z][A-Za-z0-9]*$/u;

interface Dead {
  readonly where: string;
  readonly cited: string;
  readonly why: string;
}

const deadCitations = (file: string): readonly Dead[] =>
  readFileSync(resolve(PROJECT_ROOT, file), 'utf-8')
    .split('\n')
    .flatMap((text, i) =>
      [...text.matchAll(CITATION)].flatMap((m) => {
        const near = text.slice(Math.max(0, (m.index ?? 0) - 40), (m.index ?? 0) + 40);
        if (DATED.test(near)) return [];

        const mod = m[1] ?? '';
        if (mod.length === 0 || PLACEHOLDER.test(mod) || MODULES.has(mod)) return [];

        return [
          {
            where: `${file}:${i + 1}`,
            cited: m[0],
            why: `módulo "${mod}" não existe (são: ${[...MODULES].sort().join(', ')})`,
          },
        ];
      }),
    );

describe('HARNESS-CITES-LIVE-PATHS — skill e agent citam código que existe', () => {
  it('nenhum path de src/ citado por skill ou agent está morto', () => {
    const dead = HARNESS.flatMap(deadCitations)
      .map((d) => `${d.where} cita "${d.cited}" — ${d.why}`)
      .sort();

    assert.deepEqual(
      dead,
      [],
      'skill ou agent instrui sobre código que não existe — é a mentira que se propaga mais rápido, ' +
        'porque o próximo agente a lê antes de abrir o repositório:\n' +
        dead.join('\n'),
    );
  });

  it('a varredura enxerga o harness e o código (guarda contra verde por vacuidade)', () => {
    assert.ok(HARNESS.length >= 20, `só ${HARNESS.length} arquivos de harness lidos`);
    assert.ok(MODULES.size >= 5, `só ${MODULES.size} módulos lidos de src/modules/`);
    assert.ok(
      LAYERS.has('domain') && LAYERS.has('public-api'),
      'camadas conhecidas não apareceram',
    );
  });
});
