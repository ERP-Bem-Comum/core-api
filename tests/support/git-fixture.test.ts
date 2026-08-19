/**
 * GIT-FIXTURE — a prova de que `cwd` não isola um repositório de fixture.
 *
 * O defeito medido em 19/08/2026: o `.githooks/pre-commit` roda a suíte inteira, e o git exporta
 * `GIT_DIR` no ambiente dos hooks. Os testes que criam repositório de fixture passavam `cwd`, mas
 * herdavam o ambiente — e `GIT_DIR` vence `cwd`. Uma tentativa de commit bastou para marcar o
 * repositório real como **bare** (derrubando `git status` no checkout principal e em toda worktree
 * linkada) e para gravar a identidade do fixture no `.git/config` de verdade.
 *
 * O teste tem as duas pontas de propósito. Sem a primeira — a que prova que o vazamento ACONTECE
 * quando o ambiente não é sanitizado — a segunda passaria mesmo que `gitFixtureEnv` devolvesse
 * qualquer coisa, e o gate ficaria verde sem verificar nada.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import { gitFixtureEnv } from './git-fixture.ts';

describe('GIT-FIXTURE — GIT_DIR herdado vence o cwd, e é por isso que o env é sanitizado', () => {
  it('sem sanitizar vaza para o repositório apontado por GIT_DIR; sanitizado, não', () => {
    const victim = mkdtempSync(join(tmpdir(), 'git-fixture-victim-'));
    const fixture = mkdtempSync(join(tmpdir(), 'git-fixture-'));

    try {
      const clean = gitFixtureEnv();
      execFileSync('git', ['init', '-q'], { cwd: victim, env: clean });
      execFileSync('git', ['init', '-q'], { cwd: fixture, env: clean });

      const victimConfig = join(victim, '.git', 'config');

      // Ponta 1 — o vazamento. `cwd` é o fixture, `GIT_DIR` é a vítima: quem manda é a variável.
      execFileSync('git', ['config', 'user.name', 'Contaminado'], {
        cwd: fixture,
        env: { ...clean, GIT_DIR: join(victim, '.git') },
      });
      assert.match(
        readFileSync(victimConfig, 'utf8'),
        /Contaminado/,
        'guarda contra verde por vacuidade: sem sanitizar, o vazamento tem de acontecer',
      );

      // Ponta 2 — o conserto. Mesmo cenário, com `GIT_DIR` de fato no ambiente do processo, que é
      // como o hook o entrega. `gitFixtureEnv()` é lido AQUI, com a variável já posta.
      process.env['GIT_DIR'] = join(victim, '.git');
      try {
        execFileSync('git', ['config', 'user.name', 'Isolado'], {
          cwd: fixture,
          env: gitFixtureEnv(),
        });
      } finally {
        delete process.env['GIT_DIR'];
      }

      assert.doesNotMatch(
        readFileSync(victimConfig, 'utf8'),
        /Isolado/,
        'o fixture escreveu no repositório real mesmo com o ambiente sanitizado',
      );
      assert.match(
        readFileSync(join(fixture, '.git', 'config'), 'utf8'),
        /Isolado/,
        'a escrita tem de ter ido para o fixture — não basta não vazar, precisa funcionar',
      );
    } finally {
      rmSync(victim, { recursive: true, force: true });
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('nenhuma variável GIT_* sobrevive à sanitização', () => {
    process.env['GIT_INDEX_FILE'] = '/tmp/qualquer-index';
    try {
      assert.equal(
        Object.keys(gitFixtureEnv()).some((key) => key.startsWith('GIT_')),
        false,
      );
    } finally {
      delete process.env['GIT_INDEX_FILE'];
    }
  });
});
