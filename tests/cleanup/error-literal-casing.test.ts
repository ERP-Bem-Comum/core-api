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

/** `type XError =` / `export type XError =`, capturando o corpo até o `;`. */
const ERROR_UNION = /\btype\s+(\w*Error)\s*=\s*([^;]+);/gsu;
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
/** EN kebab-case: minúsculas e dígitos, separados por hífen simples. */
const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/u;

interface Offender {
  readonly where: string;
  readonly type: string;
  readonly literal: string;
}

const badLiterals = (file: string): readonly Offender[] => {
  const content = readFileSync(resolve(PROJECT_ROOT, file), 'utf-8');
  return [...content.matchAll(ERROR_UNION)].flatMap((u) => {
    const [name, body] = [u[1] ?? '', u[2] ?? ''];
    const line = content.slice(0, u.index ?? 0).split('\n').length;
    return body
      .split('|')
      .map((member) => WHOLE_LITERAL.exec(member.trim())?.[1] ?? '')
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

  it('a varredura enxerga as unions (guarda contra verde por vacuidade)', () => {
    const found = SOURCES.flatMap((f) => [
      ...readFileSync(resolve(PROJECT_ROOT, f), 'utf-8').matchAll(ERROR_UNION),
    ]).length;
    assert.ok(found >= 50, `só ${found} unions de erro encontradas — o padrão parou de casar`);
    assert.ok(KEBAB.test('contract-not-active'), 'o padrão rejeita a forma canônica');
    assert.ok(!KEBAB.test('ContractNotActive'), 'o padrão aceita PascalCase');
  });
});
