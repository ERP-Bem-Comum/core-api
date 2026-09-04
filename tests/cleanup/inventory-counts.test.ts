/**
 * INVENTORY-COUNTS — contagem do próprio repositório escrita na doc canônica tem de bater.
 *
 * A auditoria de 03/09/2026 encontrou a mesma frase — "as 16 rules de `.claude/rules/`" — em SEIS
 * lugares (`CLAUDE.md`, `.claude/settings.json`, dois hooks, um teste), enquanto o disco tinha 17.
 * Nenhum deles estava errado quando foi escrito; envelheceram juntos, em silêncio, porque contagem
 * copiada à mão não tem quem a cobre. O mesmo padrão aparecia em `docs/01-architecture.md`, cujo
 * índice de ADR parava em 0028 num repositório que já ia ao 0068 — no mesmo arquivo em que o
 * `docs/README.md` avisava que "contagem copiada envelhece no dia seguinte".
 *
 * A tentação era proibir o número. Este gate faz o contrário: ele **verifica**. Proibir empurra o
 * autor para a vaguidão ("várias rules"), que informa menos e continua sem gate. Verificar deixa o
 * número onde ele ajuda — e o transforma numa afirmação que o repositório sabe conferir.
 *
 * ⚠️ Existência pelo git, nunca pelo disco (`.claude/rules/testing.md`). Um `.claude/skills/` a mais
 * na máquina de quem escreve — worktree, rascunho não commitado — mudaria a contagem aqui e não no
 * CI, e um gate cuja resposta depende de onde roda não verifica nada.
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

/**
 * Os inventários que a doc canônica costuma citar, contados no repositório VERSIONADO.
 * `git ls-files` responde a mesma coisa aqui e no runner — `globSync` não.
 */
const INVENTORIES: Readonly<Record<string, () => number>> = {
  rules: () => git('ls-files', '.claude/rules/*.md').length,
  skills: () => git('ls-files', '.claude/skills/*/SKILL.md').length,
  agents: () => git('ls-files', '.claude/agents/*.md').length,
  hooks: () => git('ls-files', '.claude/hooks/*.sh').length,
  // ⚠️ Chave em minúsculas, sempre. `claimsIn` normaliza o substantivo capturado com
  // `.toLowerCase()`; uma chave `ADRs` nunca casaria com `'adrs'`, e o `flatMap` do gate descarta
  // substantivo desconhecido em SILÊNCIO — o gate ficava verde sem nunca verificar nada.
  // Custo real: `README.md` afirmou "48 ADRs" durante todo o PR que criou este arquivo, num
  // repositório de 68, e a suíte passou. Era o caso citado no próprio docstring como motivação.
  adrs: () => git('ls-files', 'handbook/architecture/adr/*.md').length,
  módulos: () =>
    new Set(
      git('ls-files', 'src/modules/*')
        .map((p) => p.split('/')[2])
        .filter((m): m is string => m !== undefined),
    ).size,
};

/**
 * A doc que carrega sozinha, instrui a edição ou é a primeira coisa que se lê no repositório — onde
 * um número errado custa mais caro. O `README.md` entrou porque foi lá que "48 ADRs IMUTÁVEIS"
 * sobreviveu até 03/09/2026, num repositório de 68.
 */
const CANONICAL = [
  'CLAUDE.md',
  'README.md',
  'llms.txt',
  '.claude/settings.json',
  ...git('ls-files', '.claude/rules/*.md'),
];

const NOUNS = Object.keys(INVENTORIES).join('|');
/** "as 16 rules", "17 skills", "os 8 módulos" — número colado no substantivo do inventário. */
const CLAIM = new RegExp(`\\b(\\d{1,4})\\s+(${NOUNS})\\b`, 'giu');

interface Claim {
  readonly file: string;
  readonly line: number;
  readonly near: string;
  readonly stated: number;
  readonly noun: string;
}

const claimsIn = (file: string): readonly Claim[] =>
  readFileSync(resolve(PROJECT_ROOT, file), 'utf-8')
    .split('\n')
    .flatMap((text, i) =>
      [...text.matchAll(CLAIM)].map((m) => ({
        file,
        line: i + 1,
        // Janela ao redor da ocorrência, não a linha toda: em markdown uma "linha" é um parágrafo
        // inteiro, e uma data em qualquer ponto dele isentaria contagens a 300 caracteres dali.
        // Foi o que aconteceu na primeira execução — o parágrafo do `CLAUDE.md` que diz "as 16
        // rules" também diz "Medido em 18/08/2026", trinta palavras adiante, e o gate calou.
        near: text.slice(Math.max(0, (m.index ?? 0) - 40), (m.index ?? 0) + 40),
        stated: Number(m[1]),
        noun: (m[2] ?? '').toLowerCase(),
      })),
    );

/**
 * Nem toda contagem é afirmação sobre o AGORA. A `.claude/rules/testing.md` registra, de propósito,
 * que a suíte "era 169 em 19/08, 175 em 21/08 e 204 em 24/08" — e o faz para ensinar que a contagem
 * NÃO é o invariante. Acusar esse registro faria o autor apagar a lição para calar o gate.
 *
 * O sinal é a DATA EXPLÍCITA JUNTO da contagem — `19/08`, `18/08/2026` ou `2026-08-19` dentro de
 * ~40 caracteres. Quem escreve "eram 169 em 19/08" data a observação; quem escreve "as 17 rules"
 * afirma o presente.
 *
 * ⚠️ A proximidade não é detalhe de implementação, é a regra. A primeira versão perguntava pela
 * linha inteira e produziu falso-negativo na estreia: o parágrafo do `CLAUDE.md` que afirma "as 16
 * rules" também contém "Medido em 18/08/2026" bem adiante, e a data de uma frase isentou a
 * contagem de outra.
 *
 * ⚠️ A isenção continua fácil de escrever — datar a frase cala o gate. Foi escolhida assim porque o
 * repositório JÁ usa data como marcador de registro (`testing.md`, `domain.md`, os hooks), e uma
 * convenção nova exigiria retroalimentar o acervo inteiro. Se o abuso aparecer, o conserto é exigir
 * também verbo no passado — não remover a data.
 */
const DATED = /\b(\d{1,2}\/\d{1,2}(\/\d{2,4})?|\d{4}-\d{2}-\d{2})\b/u;
const isHistoricalRecord = (line: string): boolean => DATED.test(line);

describe('INVENTORY-COUNTS — número escrito na doc canônica bate com o repositório', () => {
  it('toda contagem afirmada como atual confere', () => {
    const wrong = CANONICAL.flatMap(claimsIn)
      .filter((c) => !isHistoricalRecord(c.near))
      .flatMap((c) => {
        const count = INVENTORIES[c.noun];
        if (count === undefined) return [];
        const actual = count();
        return actual === c.stated
          ? []
          : [`${c.file}:${c.line} diz "${c.stated} ${c.noun}", são ${actual}`];
      })
      .sort();

    assert.deepEqual(
      wrong,
      [],
      'contagem cravada divergiu do repositório — corrija o número, ou reescreva a frase sem ele ' +
        'se a contagem não for o que importa:\n' +
        wrong.join('\n'),
    );
  });

  it('todo substantivo do padrão tem inventário que responde (guarda contra gate mudo)', () => {
    // A guarda que faltava: um substantivo em `NOUNS` sem entrada correspondente em `INVENTORIES`
    // faz o gate descartar aquelas ocorrências sem dizer nada. Foi assim que `ADRs`/`adrs` deixou o
    // gate mudo sobre a contagem que ele mais precisava verificar.
    const orphans = NOUNS.split('|').filter((n) => INVENTORIES[n.toLowerCase()] === undefined);
    assert.deepEqual(
      orphans,
      [],
      'substantivo do padrão sem inventário — as ocorrências dele passam sem verificação:\n' +
        orphans.join('\n'),
    );
  });

  it('a varredura enxerga a doc canônica (guarda contra verde por vacuidade)', () => {
    assert.ok(
      CANONICAL.length >= 10,
      `só ${CANONICAL.length} arquivos canônicos lidos — o \`git ls-files\` falhou e a asserção ` +
        'acima passaria sobre nada',
    );
    assert.ok(
      Object.values(INVENTORIES).every((count) => count() > 0),
      'algum inventário contou zero — o glob do `git ls-files` não casou, e uma contagem errada ' +
        'na doc passaria despercebida',
    );
  });
});
