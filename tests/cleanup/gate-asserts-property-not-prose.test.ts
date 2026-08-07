/**
 * Gate assegura PROPRIEDADE, nunca REDAÇÃO.
 *
 * Um teste que exige a PRESENÇA de um identificador (`ADR-NNNN`) dentro de um `.md` mede o
 * vestígio de um fato, não o fato. Isso erra nas duas direções:
 *
 *   - falso positivo: reescrever a documentação sem tocar no sistema deixa o gate vermelho;
 *   - falso negativo: quebrar o sistema sem tocar no texto deixa o gate verde.
 *
 * Aconteceu de verdade: `docs-update.test.ts` exigia que o CLAUDE.md citasse `ADR-0020`, e a
 * poda do CLAUDE.md — que não mudou uma linha de `src/` — derrubou o gate. O mesmo gate teria
 * passado com `better-sqlite3` de volta no `package.json`, porque a palavra continuaria escrita
 * no markdown. A correção não foi apagar: foi mover cada asserção para o artefato que É o fato
 * (o `Status:` do próprio ADR, o `package.json`), onde nenhuma redação a afeta.
 *
 * Este teste impede a reincidência. O critério é estreito de propósito — só barra a combinação
 * "lê `.md`" + "exige presença de `ADR-NNNN`", que é a forma comprovadamente frágil. Verificar
 * AUSÊNCIA num `.md` (`assert.doesNotMatch`) continua livre: é robusto, sobrevive a qualquer
 * reescrita, e é como os casos saudáveis do mesmo arquivo já funcionam.
 *
 * Ver `.claude/rules/testing.md` § "Gate estrutural pergunta ao git, não ao disco".
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

// Este arquivo é a única exceção legítima: ele precisa citar o padrão para detectá-lo.
const SELF = 'tests/cleanup/gate-asserts-property-not-prose.test.ts';

const trackedTestFiles = (): readonly string[] =>
  execFileSync('git', ['ls-files', 'tests'], { encoding: 'utf8' })
    .split('\n')
    .filter((p) => p.endsWith('.test.ts') && p !== SELF);

/** Cada `it(...)`/`test(...)` vira um bloco isolado, para não cruzar sinais de casos vizinhos. */
const blocks = (source: string): readonly string[] => source.split(/\b(?:it|test)\s*\(/);

/**
 * Ler um ADR não conta: o ADR **é** o registro da decisão, e o `Supersedes:` do cabeçalho dele é
 * a declaração formal, não uma menção de passagem. Vestígio é um documento QUALQUER citar o ADR.
 * Esta distinção foi encontrada pela própria prova abaixo, que acusou um caso legítimo primeiro.
 */
const isAdr = (path: string): boolean => /architecture\/adr\/\d{4}-/.test(path);

const readsMarkdown = (block: string): boolean =>
  [...block.matchAll(/['"`]([^'"`]*\.md)['"`]/g)].some(
    ([, path]) => path !== undefined && !isAdr(path),
  );

/** `assert.match(...)` cujo padrão procura o identificador de um ADR — o vestígio. */
const demandsAdrMention = (block: string): boolean =>
  block
    .split('assert.match')
    .slice(1)
    .some((call) => /ADR-(?:\d|\\d)/.test(call.slice(0, call.indexOf(');') + 1 || 400)));

describe('gate assegura propriedade, não redação', () => {
  it('nenhum teste exige que um .md cite um ADR', () => {
    const offenders = trackedTestFiles().filter((file) =>
      blocks(readFileSync(file, 'utf8')).some(
        (block) => readsMarkdown(block) && demandsAdrMention(block),
      ),
    );

    assert.deepEqual(
      offenders,
      [],
      `Estes testes exigem que um .md CITE um ADR — vestígio, não propriedade:\n` +
        offenders.map((f) => `  - ${f}`).join('\n') +
        `\n\nVerifique o fato onde ele mora: o \`Status:\`/\`Supersedes:\` do próprio ADR, ` +
        `o \`package.json\`, o código em \`src/\`. Checar AUSÊNCIA num .md continua permitido.`,
    );
  });

  it('detecta a violação quando ela existe', () => {
    const violation = `
      it('exemplo que deveria ser barrado', () => {
        const content = read('handbook/architecture/06-persistence-strategy.md');
        assert.match(content, /ADR-0020/, 'banner ausente');
      });
    `;
    const [, block] = blocks(violation);
    assert.ok(block !== undefined, 'o parser de blocos não reconheceu o caso');
    assert.ok(
      readsMarkdown(block) && demandsAdrMention(block),
      'o detector deixou passar uma violação conhecida — o gate estaria vazio',
    );
  });

  it('não acusa quem verifica ausência num .md', () => {
    const legitimate = `
      it('exemplo legítimo', () => {
        const content = read('handbook/architecture/README.md');
        assert.doesNotMatch(content, /Dual-dialect/, 'índice desatualizado');
      });
    `;
    const [, block] = blocks(legitimate);
    assert.ok(block !== undefined, 'o parser de blocos não reconheceu o caso');
    assert.ok(
      !demandsAdrMention(block),
      'o detector acusou uma verificação de ausência, que é legítima',
    );
  });

  // Regressão: a primeira versão deste gate acusou justamente o caso que ele deveria proteger —
  // um teste que abre o ADR e confere o `Supersedes:` do cabeçalho. Ler o ADR é ler o fato.
  it('não acusa quem confere o cabeçalho do próprio ADR', () => {
    const legitimate = `
      it('a supersessão está declarada nos dois ADRs', () => {
        const superseded = read('handbook/architecture/adr/0018-persistence-dual-dialect-drizzle.md');
        assert.match(superseded, /\\*\\*Status:\\*\\*\\s*Superseded by \\[ADR-0020\\]/i);
      });
    `;
    const [, block] = blocks(legitimate);
    assert.ok(block !== undefined, 'o parser de blocos não reconheceu o caso');
    assert.ok(
      !readsMarkdown(block),
      'o detector voltou a acusar leitura de ADR, que é verificação do fato e não do vestígio',
    );
  });
});
