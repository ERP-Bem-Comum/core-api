/**
 * DOMAIN-CLOCK-INJECTION — o domínio nunca lê o relógio; o instante é injetado.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Norma: `new Date()` SEM argumento lê o relógio do sistema e torna a função impura — o mesmo
 * input passa a produzir output diferente conforme a hora. No domínio isso custa duas coisas:
 * o teste vira flaky-por-construção (ou precisa congelar o relógio global) e a operação deixa de
 * ser reproduzível a partir dos seus argumentos.
 *
 * A resposta do projeto é o port `Clock` (`src/shared/ports/clock.ts`, consumido por ~100
 * arquivos) com dois adapters: `ClockReal` em produção e `ClockFixed` em teste — este último
 * usado por 78 arquivos de `tests/`, o que mostra que a disciplina é praticada, não aspiracional.
 * O use case recebe o `Clock` e passa o instante já resolvido (`at`) para o domínio.
 *
 * O que NÃO é violação, e por isso o padrão exige o parêntese vazio:
 *   - `new Date(at.getTime() + minutes * 60_000)` — deriva de um instante já injetado;
 *   - `new Date(Date.UTC(year, month, 1))` — constrói data a partir de valores, não do relógio.
 *
 * Comentários são ignorados de propósito: QUATRO arquivos de domínio documentam a regra escrevendo
 * `new Date()` na prosa ("`at` é injetado pelo caller, sem `new Date()` no domínio"). Um padrão que
 * não filtrasse comentário acusaria exatamente os arquivos que melhor ensinam a norma — a mesma
 * armadilha que o inventário de decisões registrou duas vezes.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { PROJECT_ROOT, filesUsing, walkFiles } from '../support/source-scan.ts';

const CLOCK_READ = /new Date\(\s*\)/;

/** Diretórios de domínio puro: os `domain/` de cada módulo, mais o shared kernel. */
const domainDirs = (): readonly string[] => {
  const modulesRoot = join(PROJECT_ROOT, 'src', 'modules');
  const dirs = readdirSync(modulesRoot)
    .map((m) => join(modulesRoot, m, 'domain'))
    .filter((d) => {
      try {
        return statSync(d).isDirectory();
      } catch {
        return false;
      }
    });
  return [...dirs, join(PROJECT_ROOT, 'src', 'shared', 'kernel')];
};

const clockReaders = (): readonly string[] =>
  domainDirs()
    .flatMap((d) => filesUsing(d, CLOCK_READ, { ext: '.ts' }))
    .sort();

describe('DOMAIN-CLOCK — o domínio recebe o instante, não o lê', () => {
  it('nenhum arquivo de domínio ou do kernel chama new Date() sem argumento', () => {
    const offenders = clockReaders();
    assert.deepEqual(
      offenders,
      [],
      'Domínio lendo o relógio do sistema — a operação deixa de ser reproduzível a partir dos ' +
        'seus argumentos. Injetar o instante via port Clock (ClockReal/ClockFixed):\n' +
        offenders.join('\n'),
    );
  });

  it('a varredura enxerga arquivos de domínio (guarda contra verde por vacuidade)', () => {
    const scanned = domainDirs().flatMap((d) => walkFiles(d, { ext: '.ts' })).length;
    assert.ok(scanned > 50, `esperado 50+ arquivos de domínio varridos, encontrado ${scanned}`);
  });
});
