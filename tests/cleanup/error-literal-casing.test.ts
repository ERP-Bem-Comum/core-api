/**
 * ERROR-LITERAL-CASING — erro interno é EN kebab-case, e nada verificava isso.
 *
 * A tabela de idioma do `CLAUDE.md` fixa a forma: erro interno é string literal union em
 * **EN kebab-case** — `'contract-not-active'`. É o que faz o `E` do `Result` ser exaustivo no
 * `switch` do chamador, e o que separa o erro INTERNO (que o código casa) da mensagem AO HUMANO
 * (PT-BR, formatada na borda).
 *
 * O `@typescript-eslint/naming-convention` cobre o casing de IDENTIFICADOR — `const`, `type`,
 * `function`. Ele não vê o VALOR de uma string literal, que é exatamente onde o erro vive. Um
 * `'ContractNotActive'` ou `'contrato_nao_ativo'` atravessava o repositório inteiro sem um vermelho.
 *
 * ESCOPO — os membros de string literal de um `type …Error = …`, em `src/`. É onde a convenção tem
 * consequência: esse literal vira chave de `switch`, chave de mapa de tradução na borda e, por tabela
 * do ADR-0027, parte do contrato HTTP.
 *
 * ⚠️ Union de OBJETOS não entra: `type OutboxQueryError = OutboxQueryUnavailable | …` compõe tipos
 * nomeados, e ali o PascalCase é o certo — é identificador, não literal. O gate só olha o que está
 * entre aspas.
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

const SOURCES = git('ls-files', 'src/*.ts', 'src/**/*.ts');

/** Onde cada `type XError =` começa. O corpo é extraído por varredura, não por regex. */
const ERROR_UNION_START = /\btype\s+(\w*Error)\s*=\s*/gu;
/**
 * Membro que é UM LITERAL INTEIRO, não um literal em algum lugar do membro.
 *
 * A primeira versão pegava qualquer coisa entre aspas no corpo, e acusou dois erros CORRETOS:
 * `DocumentMapperError` e `InviteTokenMapperError` são discriminated unions de OBJETO, onde o
 * literal mora no discriminante (`Readonly<{ tag: 'DocumentMapperInvalidRow'; … }>`). Ali o
 * PascalCase é a convenção certa — é da família de `ContractCreated`, não de `'contract-not-active'`.
 *
 * Um gate que manda consertar código correto é pior que gate nenhum: gera trabalho errado com
 * autoridade. Por isso a checagem parte do membro inteiro, não de uma varredura de aspas.
 */
const WHOLE_LITERAL = /^'([^']+)'$/u;

/**
 * Comentário à direita não muda o que o membro É.
 *
 * ⚠️ `WHOLE_LITERAL` exige que o membro INTEIRO seja o literal, então `'x' // motivo` não casava e o
 * literal saía da checagem em silêncio. Trinta e oito literais de `src/` estavam fora do gate por
 * isso — `budget-not-found`, `collaborator-cpf-duplicate`, `remittance-without-payables` entre eles.
 * Um `'ContractNotActive' // motivo` passaria verde.
 *
 * É a MESMA classe de buraco que a correção anterior fechou na delimitação do CORPO (o `;` seguido
 * de `//`): comentário quebrando um delimitador. Fechei num lugar e deixei no outro.
 */
const stripComment = (member: string): string =>
  member
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/\/\/.*$/gmu, '')
    .trim();
/** EN kebab-case: minúsculas e dígitos, separados por hífen simples. */
const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/u;

interface Offender {
  readonly where: string;
  readonly type: string;
  readonly literal: string;
}

/**
 * Membros da union em PROFUNDIDADE ZERO, varrendo o texto a partir do `=`.
 *
 * ⚠️ Duas versões anteriores tentaram delimitar o corpo por regex e as duas erraram:
 *
 *   • `[^;]+` parava no primeiro `;`, inclusive num `;` interno a `Readonly<{ tag: 'x'; … }>`.
 *   • `[\s\S]*?;\s*(?:\n|$)` não casava quando o `;` vinha seguido de comentário `//`, e então
 *     capturava por cima das declarações seguintes — cinco literais de `src/` PERDERAM cobertura
 *     (`geography-repo-unavailable`, `collaborator-email-duplicate` e outros três). Um deles em
 *     PascalCase teria passado verde.
 *
 * Delimitar sintaxe aninhada com regex não funciona porque regex não conta. Este contador conta:
 * `{`, `<`, `(`, `[` sobem, os fechamentos descem, e só o que está em profundidade 0 é membro da
 * union. O corpo acaba no `;` de profundidade 0.
 */
const membersOf = (content: string, from: number): readonly string[] => {
  const members: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = from; i < content.length; i += 1) {
    const c = content[i] ?? '';
    if (c === ';' && depth === 0) break;
    // `>` tem dois papéis em TS: fecha genérico e forma a seta `=>`. Contar a seta como fechamento
    // levaria `depth` a negativo permanentemente — o `;` terminador nunca seria visto e a varredura
    // engoliria o resto do arquivo, derrubando todas as unions seguintes. Hoje nenhuma union de
    // `src/` tem seta, então é hazard e não defeito ativo; mas o piso de cobertura acusaria isso com
    // a mensagem errada, e o custo de prevenir é uma comparação.
    if (c === '>' && content[i - 1] === '=') {
      current += c;
      continue;
    }
    if ('{<(['.includes(c)) depth += 1;
    else if ('}>)]'.includes(c)) depth = Math.max(0, depth - 1);
    if (c === '|' && depth === 0) {
      members.push(current);
      current = '';
    } else current += c;
  }
  members.push(current);
  return members;
};

const badLiterals = (file: string): readonly Offender[] => {
  const content = readFileSync(resolve(PROJECT_ROOT, file), 'utf-8');
  return [...content.matchAll(ERROR_UNION_START)].flatMap((u) => {
    const name = u[1] ?? '';
    const start = (u.index ?? 0) + u[0].length;
    const line = content.slice(0, u.index ?? 0).split('\n').length;
    return membersOf(content, start)
      .map((member) => WHOLE_LITERAL.exec(stripComment(member))?.[1] ?? '')
      .filter((lit) => lit.length > 0 && !KEBAB.test(lit))
      .map((literal) => ({ where: `${file}:${line}`, type: name, literal }));
  });
};

describe('ERROR-LITERAL-CASING — erro interno é EN kebab-case', () => {
  it('todo literal de um type *Error está em kebab-case', () => {
    const bad = SOURCES.flatMap(badLiterals)
      .map((o) => `${o.where} — ${o.type} tem '${o.literal}'`)
      .sort();

    assert.deepEqual(
      bad,
      [],
      "erro interno fora de EN kebab-case ('contract-not-active') — este literal é chave de " +
        '`switch`, de tradução na borda e do contrato HTTP; a mensagem em PT-BR é outra coisa, e ' +
        'mora na borda:\n' +
        bad.join('\n'),
    );
  });

  it('a cobertura não encolhe em silêncio (guarda contra o gate que estreita sozinho)', () => {
    // A guarda que faltava. Duas versões da delimitação passaram verdes enquanto PERDIAM literais:
    // um gate que estreita não fica vermelho, ele fica mudo. O piso é a contagem medida em
    // 03/09/2026 com o parser por profundidade; se cair, alguém apertou o delimitador sem notar.
    const covered = SOURCES.flatMap((f) => {
      const content = readFileSync(resolve(PROJECT_ROOT, f), 'utf-8');
      return [...content.matchAll(ERROR_UNION_START)].flatMap((u) =>
        membersOf(content, (u.index ?? 0) + u[0].length)
          .map((m) => WHOLE_LITERAL.exec(stripComment(m))?.[1] ?? '')
          .filter((l) => l.length > 0),
      );
    }).length;

    assert.ok(
      // Piso com folga deliberada. A versão anterior fixou 879 contra um real de 880: apagar um
      // único erro obsoleto deixaria o gate vermelho com a mensagem "o delimitador estreitou" — um
      // diagnóstico FALSO, que mandaria o próximo dev caçar um parser que está certo. O piso existe
      // para pegar encolhimento de PARSER (dezenas de literais de uma vez), não flutuação de código.
      covered >= 850,
      `só ${covered} literais de erro sob verificação — eram 918 em 03/09/2026. Uma queda dessa ` +
        'ordem é o delimitador do corpo ou do membro tendo estreitado, e os literais que saíram ' +
        'passam sem conferência de casing.',
    );
  });

  it('a varredura enxerga as unions (guarda contra verde por vacuidade)', () => {
    const found = SOURCES.flatMap((f) => [
      ...readFileSync(resolve(PROJECT_ROOT, f), 'utf-8').matchAll(ERROR_UNION_START),
    ]).length;
    assert.ok(found >= 50, `só ${found} unions de erro encontradas — o padrão parou de casar`);
    assert.ok(KEBAB.test('contract-not-active'), 'o padrão rejeita a forma canônica');
    assert.ok(!KEBAB.test('ContractNotActive'), 'o padrão aceita PascalCase');
    // O parser tem de enxergar dentro de objeto sem confundir o `;` interno com o fim da union.
    assert.deepEqual(
      membersOf("Readonly<{ tag: 'A'; x: 1 }> | 'BadCasing';", 0).map((m) => m.trim()),
      ["Readonly<{ tag: 'A'; x: 1 }>", "'BadCasing'"],
      'o parser não separa membros em profundidade zero — union mista voltaria a passar verde',
    );
  });
});
