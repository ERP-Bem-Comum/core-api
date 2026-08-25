/**
 * RULES-SELF-VERIFY — as rules de `.claude/rules/` se verificam contra o código.
 *
 * Origem: spec 040 (Fase 4). As 12 rules originais foram destiladas de ADRs sem confrontar `src/`,
 * e 11 afirmações eram FALSAS — instrução que um agente obedece. Rule que não se verifica envelhece
 * em silêncio, e o custo é código escrito a partir de premissa errada.
 *
 * Este gate cobre DUAS propriedades distintas:
 *
 *   1. ESTRUTURA  — todo glob de `paths:` casa com pelo menos um arquivo real. Um glob morto faz a
 *                   rule nunca carregar, inclusive no arquivo que ela mesma governa.
 *   2. ATUALIDADE — cada entrada de `verify:` ainda descreve o repositório. Note que este gate falha
 *                   tanto na PIORA quanto na MELHORA: se alguém escrever o teste que hoje falta, a
 *                   afirmação "não há teste" deixa de ser verdade e a linha tem de sair da rule.
 *                   Nos dois casos a ação é a mesma — revisar a rule.
 *
 * NÃO cobre obediência: quando uma norma é mecanizável, ela vira teste próprio (ver
 * `pool-builder-single-source.test.ts`) e SAI do texto da rule. Rule é o estágio anterior ao
 * mecanismo, nunca o acompanhante dele — a mesma verdade em dois lugares é a fábrica de drift
 * diagnosticada no ADR-0040.
 *
 * ESCOPO: apenas as rules que DECLARAM `verify:` — hoje as reconstruídas pela spec 040. As demais
 * seguem fora até a fatia delas, para que dívida conhecida de uma rule não deixe o gate vermelho
 * para todas. Quando a última for reconstruída, este escopo passa a ser o conjunto inteiro.
 *
 * Verificação declarativa, sem shell: o front-matter descreve CONJUNTOS de arquivos, não comandos.
 * Este repositório é público — um gate que executasse comando declarado num `.md` seria execução
 * arbitrária via pull request.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync, globSync } from 'node:fs';
import { join, sep } from 'node:path';
import { parse } from 'yaml';

import { PROJECT_ROOT, filesContaining } from '../support/source-scan.ts';

const RULES_DIR = join(PROJECT_ROOT, '.claude', 'rules');

/**
 * Dois modos de descrever um conjunto de arquivos, ambos declarativos:
 *   - `contains` — arquivos sob `root` cujo conteúdo inclui `pattern`
 *   - `glob`     — arquivos que casam `glob` (expressa AUSÊNCIA: `expect: []` num diretório
 *                  que não deve existir, como um mirror de teste ainda não criado)
 */
type VerifyEntry = Readonly<{ claim: string; expect: readonly string[] }> &
  (
    | Readonly<{ mode: 'contains'; root: string; pattern: string }>
    | Readonly<{ mode: 'glob'; glob: string }>
  );

type RuleDoc = Readonly<{
  file: string;
  paths: readonly string[];
  verify: readonly VerifyEntry[];
}>;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const asStringArray = (v: unknown): readonly string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

const asVerifyEntries = (v: unknown): readonly VerifyEntry[] => {
  if (!Array.isArray(v)) return [];
  const out: VerifyEntry[] = [];
  for (const raw of v) {
    if (!isRecord(raw)) continue;
    const { claim, root, pattern, glob } = raw;
    if (typeof claim !== 'string') continue;
    const expect = asStringArray(raw['expect']);
    if (typeof glob === 'string') {
      out.push({ claim, expect, mode: 'glob', glob });
    } else if (typeof root === 'string' && typeof pattern === 'string') {
      out.push({ claim, expect, mode: 'contains', root, pattern });
    }
  }
  return out;
};

/** Extrai o bloco YAML entre os dois `---` de abertura do arquivo. */
const frontMatter = (content: string): unknown => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
  if (match?.[1] === undefined) return undefined;
  return parse(match[1]) as unknown;
};

const readRules = (): readonly RuleDoc[] => {
  const out: RuleDoc[] = [];
  for (const entry of readdirSync(RULES_DIR).sort()) {
    if (!entry.endsWith('.md')) continue;
    const fm = frontMatter(readFileSync(join(RULES_DIR, entry), 'utf-8'));
    if (!isRecord(fm)) continue;
    const verify = asVerifyEntries(fm['verify']);
    // Opt-in: sem `verify:` a rule ainda não foi reconstruída e fica fora deste gate.
    if (verify.length === 0) continue;
    out.push({ file: entry, paths: asStringArray(fm['paths']), verify });
  }
  return out;
};

const resolveEntry = (entry: VerifyEntry): readonly string[] =>
  entry.mode === 'glob'
    ? globSync(entry.glob, { cwd: PROJECT_ROOT })
        .map((p) => p.split(sep).join('/'))
        .sort()
    : filesContaining(join(PROJECT_ROOT, entry.root), entry.pattern);

const RULES = readRules();

describe('RULES-SELF-VERIFY — rules reconstruídas se sustentam contra o código', () => {
  it('há ao menos uma rule no gate (guarda contra escopo que esvaziou)', () => {
    // Sem esta guarda, um erro de parse tornaria todo o resto verde por vacuidade.
    assert.ok(RULES.length > 0, 'nenhuma rule com `verify:` encontrada em .claude/rules/');
  });

  for (const rule of RULES) {
    describe(rule.file, () => {
      it('todo glob de `paths:` casa com pelo menos um arquivo real', () => {
        const dead = rule.paths.filter((p) => globSync(p, { cwd: PROJECT_ROOT }).length === 0);
        assert.deepEqual(
          dead,
          [],
          `globs de \`paths:\` que não casam nada em ${rule.file} — a rule nunca carrega neles:\n` +
            dead.join('\n'),
        );
      });

      for (const entry of rule.verify) {
        it(`afirmação ainda vale: ${entry.claim}`, () => {
          const found = resolveEntry(entry);
          assert.deepEqual(
            found,
            [...entry.expect].sort(),
            `A afirmação de ${rule.file} deixou de descrever o repositório.\n` +
              `  afirmação: ${entry.claim}\n` +
              `  esperado:  ${entry.expect.length > 0 ? entry.expect.join(', ') : '(nenhum arquivo)'}\n` +
              `  encontrado: ${found.length > 0 ? found.join(', ') : '(nenhum arquivo)'}\n` +
              'Atualize ou remova a linha da rule — inclusive se a mudança foi uma melhoria.',
          );
        });
      }
    });
  }
});
