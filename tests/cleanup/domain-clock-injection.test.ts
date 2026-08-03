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
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..', '..');

const CLOCK_READ = /new Date\(\s*\)/;

/** Linha de comentário de bloco (` * …`) ou de linha (`// …`). */
const isCommentLine = (line: string): boolean => {
  const t = line.trimStart();
  return t.startsWith('*') || t.startsWith('//') || t.startsWith('/*');
};

const walk = (absDir: string): readonly string[] => {
  const out: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith('.')) continue;
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) visit(full);
      else if (st.isFile() && entry.endsWith('.ts')) {
        out.push(relative(PROJECT_ROOT, full).split(sep).join('/'));
      }
    }
  };
  visit(absDir);
  return out;
};

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
    .flatMap((d) => walk(d))
    .filter((rel) =>
      readFileSync(join(PROJECT_ROOT, rel), 'utf-8')
        .split('\n')
        .some((line) => !isCommentLine(line) && CLOCK_READ.test(line)),
    )
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
    const scanned = domainDirs().flatMap((d) => walk(d)).length;
    assert.ok(scanned > 50, `esperado 50+ arquivos de domínio varridos, encontrado ${scanned}`);
  });
});
