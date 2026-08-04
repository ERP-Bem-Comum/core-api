/**
 * DOMAIN-NO-THROW — o domínio devolve `Result`, nunca lança.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Norma: erro de domínio é VALOR, não fluxo de controle. `Result<T, E>` põe a falha na assinatura,
 * e o compilador cobra que ela seja tratada — o `E` é uma string literal union que o `switch`
 * exaustivo obriga a cobrir. Um `throw` desfaz as duas coisas de uma vez: some da assinatura e
 * atravessa quantas camadas quiser até alguém lembrar de um `try`.
 *
 * O custo é assimétrico e por isso a regra é absoluta aqui. Esquecer de tratar um `Result` é erro
 * de compilação; esquecer de capturar uma exceção é incidente em produção.
 *
 * Este gate cobre a lacuna real: `class`, `any` e `switch` não-exaustivo JÁ são barrados por ESLint
 * (`no-restricted-syntax`, `no-explicit-any`, `switch-exhaustiveness-check`) e pelo `tsconfig`
 * (`noFallthroughCasesInSwitch`) — mas NADA barrava `throw`. A norma se sustentava por disciplina,
 * com adesão de 100% em ~180 arquivos de domínio e kernel.
 *
 * Escopo: o `domain/` de cada módulo e `src/shared/kernel/`. Os adapters podem lançar
 * internamente, desde que convertam para `Result` na borda — ver `.claude/rules/adapters.md`.
 *
 * Comentário é ignorado: vários arquivos de domínio escrevem "throw proibido" na prosa para
 * ensinar a regra, e um padrão que os acusasse reprovaria justamente quem a documenta.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { PROJECT_ROOT, filesUsing, walkFiles } from '../support/source-scan.ts';

/** `throw` como palavra, em linha de código. Não casa `throwing`, `rethrow` nem prosa. */
const THROW_STATEMENT = /\bthrow\b/;

/** Diretórios de domínio puro: os `domain/` de cada módulo, mais o shared kernel. */
const pureDirs = (): readonly string[] => {
  const modulesRoot = join(PROJECT_ROOT, 'src', 'modules');
  const domains = readdirSync(modulesRoot)
    .map((m) => join(modulesRoot, m, 'domain'))
    .filter((d) => {
      try {
        return statSync(d).isDirectory();
      } catch {
        return false;
      }
    });
  return [...domains, join(PROJECT_ROOT, 'src', 'shared', 'kernel')];
};

describe('DOMAIN-NO-THROW — erro de domínio é valor, não exceção', () => {
  it('nenhum arquivo de domínio ou do kernel usa throw', () => {
    const offenders = pureDirs()
      .flatMap((d) => filesUsing(d, THROW_STATEMENT, { ext: '.ts' }))
      .sort();
    assert.deepEqual(
      offenders,
      [],
      'Domínio lançando exceção — a falha sai da assinatura e o compilador para de cobrar que ' +
        'seja tratada. Devolver `Result<T, E>` com erro em string literal union:\n' +
        offenders.join('\n'),
    );
  });

  it('a varredura enxerga o domínio (guarda contra verde por vacuidade)', () => {
    const scanned = pureDirs().flatMap((d) => walkFiles(d, { ext: '.ts' })).length;
    assert.ok(scanned > 100, `esperado 100+ arquivos de domínio varridos, encontrado ${scanned}`);
  });
});
