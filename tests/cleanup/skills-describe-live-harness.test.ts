/**
 * Skill descreve o harness VIGENTE, nunca o que foi removido.
 *
 * Skill não é documentação passiva: ela entra no contexto do agente como INSTRUÇÃO, competindo
 * com o CLAUDE.md no mesmo turno e com a autoridade de ter sido invocada de propósito. Quando ela
 * descreve um processo que não existe, o agente não erra por descuido — ele obedece.
 *
 * Três artefatos saíram do projeto em 2026-08-06 (pipeline W0→W3, `.pipeline/<TICKET>/` e o
 * spec-kit). O CLAUDE.md foi atualizado; `.claude/skills/` não. Nada ligava as duas coisas, então
 * a divergência não tinha como aparecer — e o agente que seguisse `code-reviewer` ao pé da letra
 * escrevia num diretório inexistente, enquanto quem seguisse `nodejs-fs-scripter` rodava `npm` e
 * era barrado pelo hook, longe da causa.
 *
 * O gate distingue **instrução vigente** de **menção histórica**. A distinção não é decorativa:
 * `ts-quality-checker/SKILL.md` cita os três no próprio changelog, registrando que foram
 * removidos — é o comportamento correto, e reprová-lo provaria que o gate lê nomes em vez de ler
 * sentido. Ver `.claude/rules/testing.md` § "Gate estrutural pergunta ao git, não ao disco".
 *
 * Refs: #807
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

/** Este arquivo cita os três padrões para detectá-los — é a única exceção legítima. */
const SELF = 'tests/cleanup/skills-describe-live-harness.test.ts';

/**
 * Pergunta ao git, não ao disco: só entra o que está versionado.
 *
 * O escopo é por NATUREZA do artefato, não por lista de arquivos. Entram `skills/`, `agents/` e
 * `rules/` — os três são INSTRUÇÃO carregada no contexto, e é instrução que dirige o agente.
 * Ficam de fora `agent-memory/` (registro do que um agente aprendeu, da mesma natureza de um
 * changelog: fala do passado) e o `README.md` do harness (que DECLARA o que existe, e por isso
 * precisa nomear o que foi removido). A fronteira é o que o artefato faz, e por isso não envelhece
 * quando um arquivo novo entra em qualquer um dos lados.
 */
const INSTRUCTION_DIRS = ['.claude/skills', '.claude/agents', '.claude/rules'];

const trackedInstructionDocs = (): readonly string[] =>
  execFileSync('git', ['ls-files', ...INSTRUCTION_DIRS], { encoding: 'utf8' })
    .split('\n')
    .filter((path) => path.endsWith('.md') && path !== SELF);

/**
 * Os três removidos em 2026-08-06. `instead` existe porque uma mensagem que só diz o proibido
 * deixa quem tropeça sem saída — o gate tem de apontar o substituto.
 */
interface RemovedArtefact {
  readonly what: string;
  readonly pattern: RegExp;
  readonly instead: string;
  readonly contrast?: RegExp;
}

const REMOVED_ARTEFACTS: readonly RemovedArtefact[] = [
  {
    what: 'diretório `.pipeline/<TICKET>/`',
    pattern: /\.pipeline\//,
    instead: 'não há artefato de pipeline — o veredito da skill volta no próprio turno',
  },
  {
    what: 'gerenciador `npm`/`npx`',
    pattern: /\b(?:npm\s+(?:run|install|ci|test|exec)|npx)\b/,
    instead: 'sempre `pnpm` — anti-padrão nº 1 do CLAUDE.md, barrado por hook',
    /**
     * `npm` é o único dos três que tem substituto CITÁVEL, e a proibição sempre o nomeia:
     * "`npm install` ⇒ substituir por `pnpm install`". Uma linha que traz os dois está
     * contrastando, não instruindo — é o CA2. Os outros dois não têm par lexical, e para eles
     * a seção decide sozinha.
     */
    contrast: /\bpnpm\b/,
  },
  {
    what: 'wave `W0`→`W3`',
    pattern: /\bW[0-3]\b/,
    instead: 'não há waves — faz a mudança, roda o gate, commita',
  },
];

interface Offence {
  readonly file: string;
  readonly line: number;
  readonly what: string;
  readonly instead: string;
  readonly text: string;
}

const HEADING = /^#{1,6}\s/;

/**
 * Seções onde nomear o artefato removido é o comportamento CORRETO: o changelog registra que ele
 * saiu, e a seção de anti-padrões ensina a recusá-lo. Nas duas, a ocorrência é o objeto do texto,
 * nunca o processo a seguir.
 */
const LEGITIMATE_HEADING =
  /^#{1,6}\s+.*\b(?:changelog|hist[óo]ric[oa]|anti-padr(?:ão|ões|ao|oes))/i;

/**
 * Decide se a ocorrência na linha `index` vive numa SEÇÃO onde nomear o removido é legítimo.
 *
 * O critério é a seção, não a redação da linha: sobe até o heading markdown mais próximo e
 * pergunta o que ele é. Isso mede uma propriedade estrutural do documento, que sobrevive a
 * qualquer reescrita da frase. As duas alternativas descartadas erravam por medir outra coisa:
 * procurar palavras como "removido" na linha adivinha intenção pela prosa, e uma sentinela
 * `<!-- -->` por ocorrência é allowlist com outro nome — vira dívida silenciosa no dia em que a
 * sexta entrar.
 *
 * Ocorrência antes de qualquer heading (frontmatter, `description:`) é instrução vigente: é o
 * texto que o harness lê para decidir quando carregar a skill.
 */
const livesInLegitimateSection = (lines: readonly string[], index: number): boolean => {
  for (let cursor = index; cursor >= 0; cursor -= 1) {
    const line = lines[cursor];
    if (line !== undefined && HEADING.test(line)) return LEGITIMATE_HEADING.test(line);
  }
  return false;
};

/**
 * O parágrafo a que a linha pertence — bloco contíguo até a linha em branco de cada lado.
 *
 * O contraste se mede aqui, e não na linha, porque markdown quebra um mesmo parágrafo em várias
 * linhas: `ts-quality-checker/SKILL.md` diz "**Sempre `pnpm`**" numa linha e nomeia o `npm`
 * proibido duas linhas abaixo. Ler linha isolada acusaria a segunda metade de uma frase correta.
 */
const paragraphAt = (lines: readonly string[], index: number): string => {
  let start = index;
  let end = index;
  while (start > 0 && (lines[start - 1] ?? '').trim() !== '') start -= 1;
  while (end < lines.length - 1 && (lines[end + 1] ?? '').trim() !== '') end += 1;
  return lines.slice(start, end + 1).join(' ');
};

/**
 * Toda ocorrência de artefato removido que instrui, em vez de falar sobre.
 *
 * Dois sinais absolvem, e os dois são estruturais: a seção onde a linha vive, e o contraste com
 * o substituto vigente no mesmo parágrafo. Fora deles, a ocorrência dirige o agente.
 */
const scanDocument = (file: string): readonly Offence[] => {
  const lines = readFileSync(file, 'utf8').split('\n');

  return lines.flatMap((text, index) =>
    REMOVED_ARTEFACTS.filter(
      ({ pattern, contrast }) =>
        pattern.test(text) && contrast?.test(paragraphAt(lines, index)) !== true,
    )
      .filter(() => !livesInLegitimateSection(lines, index))
      .map(({ what, instead }) => ({ file, line: index + 1, what, instead, text: text.trim() })),
  );
};

const render = (offences: readonly Offence[]): string =>
  offences
    .map((o) => `  ${o.file}:${o.line} — ${o.what}\n      ${o.text}\n      → ${o.instead}`)
    .join('\n');

describe('skill descreve o harness vigente', () => {
  it('nenhuma instrução de .claude/ manda seguir processo removido em 2026-08-06', () => {
    const offences = trackedInstructionDocs().flatMap(scanDocument);

    assert.deepEqual(
      offences,
      [],
      `Estes documentos instruem o agente a seguir o que não existe mais:\n${render(offences)}\n\n` +
        `Menção histórica (changelog registrando a remoção) é legítima e não deveria aparecer aqui.`,
    );
  });

  it('detecta a violação quando ela existe', () => {
    const violation = [
      '## Fronteira',
      '',
      '> Escreve **apenas** em `.pipeline/<TICKET>/004-code-review/REVIEW.md`.',
    ];

    assert.ok(
      !livesInLegitimateSection(violation, 2),
      'o detector classificou instrução vigente como legítima — o gate estaria vazio',
    );
  });

  it('não acusa o changelog que registra a remoção (CA5)', () => {
    const legitimate = [
      '## Changelog',
      '',
      '- **2026-08-17:** Reescrita. A versão anterior mandava rodar `npm`/`npx`, escrevia em',
      '  `.pipeline/<TICKET>/005-quality/REPORT.md`, falava em waves W0→W3 e apontava para um',
      '  diretório `ERP-CONTRACTS` que não existe — tudo removido em 2026-08-06.',
    ];

    assert.ok(
      livesInLegitimateSection(legitimate, 3),
      'o detector acusou um changelog que apenas registra a remoção — é o contra-exemplo do CA5',
    );
  });

  // CA2 — a proibição nomeia o proibido, e é o único jeito de ensinar a recusá-lo. O sinal que a
  // separa da instrução é estrutural: ela traz o substituto na mesma linha.
  it('não acusa a linha que proíbe npm citando o substituto', () => {
    const prohibition = [
      '## Heurísticas rápidas',
      '',
      '- `npm install` num doc/PR ⇒ `pnpm install`.',
    ];

    assert.deepEqual(
      REMOVED_ARTEFACTS.filter(
        ({ pattern, contrast }) =>
          pattern.test(prohibition[2] ?? '') && contrast?.test(prohibition[2] ?? '') !== true,
      ),
      [],
      'o detector acusou quem PROÍBE npm — quem converte para pnpm é a norma, não a violação',
    );
  });

  it('o contra-exemplo real do repositório passa', () => {
    const offences = scanDocument('.claude/skills/ts-quality-checker/SKILL.md');

    assert.deepEqual(
      offences,
      [],
      `ts-quality-checker foi corrigida em 2026-08-17 e só cita os três no changelog. ` +
        `Reprová-la prova que o gate não distingue menção de uso:\n${render(offences)}`,
    );
  });
});
