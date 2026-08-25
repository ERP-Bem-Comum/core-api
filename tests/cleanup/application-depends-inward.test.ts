/**
 * APPLICATION-DEPENDS-INWARD — application conhece ports, nunca adapters.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Norma: a camada de aplicação depende para DENTRO — domínio e tipos de port. Nunca para fora,
 * onde vivem Drizzle, mysql2, S3 e o resto da infra. É a regra de dependência que torna o use case
 * testável sem banco: quem injeta o adapter é o composition root, não o próprio use case.
 *
 * Um único import de `adapters/` aqui inverte a seta e o efeito não é local — o use case passa a
 * exigir infra para rodar, o teste passa a exigir Docker, e a substituição do adapter deixa de ser
 * troca de argumento para virar edição de código.
 *
 * Por que este gate existe: o `ADR-0006` NOMEIA uma regra ESLint `no-cross-context-import` como o
 * mecanismo desta invariante, e ela NUNCA EXISTIU — `grep no-cross-context-import eslint.config.js`
 * devolve vazio. Duas rules (`application.md`, `contracts-module.md`) se apoiavam nela. A adesão
 * medida é de 247 arquivos e zero violações, sustentada só por disciplina.
 *
 * A segunda asserção cobre `interface` em port. `class` já é barrado globalmente por ESLint
 * (`no-restricted-syntax`), mas `interface` não é barrado por nada — e um port declarado como
 * `interface` aceita `implements`, o que reabre a porta para hierarquia de classes que o projeto
 * fechou ao escolher `type` + funções.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { PROJECT_ROOT, importSpecifiers, walkFiles, filesUsing } from '../support/source-scan.ts';

/** Import que alcança a camada de adapters, em qualquer forma de caminho. */
const REACHES_ADAPTERS = /(^|\/)adapters\//;

/** `interface Nome` — declaração, não a palavra solta em prosa. */
const INTERFACE_DECL = /\binterface\s+[A-Z]/;

const applicationDirs = (): readonly string[] => {
  const modulesRoot = join(PROJECT_ROOT, 'src', 'modules');
  return readdirSync(modulesRoot)
    .map((m) => join(modulesRoot, m, 'application'))
    .filter((d) => {
      try {
        return statSync(d).isDirectory();
      } catch {
        return false;
      }
    });
};

const applicationFiles = (): readonly string[] =>
  applicationDirs().flatMap((d) => walkFiles(d, { ext: '.ts' }));

describe('APPLICATION-DEPENDS-INWARD — a seta aponta para dentro', () => {
  it('nenhum arquivo de application importa de adapters/', () => {
    const offenders = applicationFiles()
      .filter((f) => importSpecifiers(f).some((s) => REACHES_ADAPTERS.test(s)))
      .sort();
    assert.deepEqual(
      offenders,
      [],
      'Application importando adapter — o use case passa a exigir infra para rodar e a troca de ' +
        'adapter deixa de ser injeção de dependência:\n' +
        offenders.join('\n'),
    );
  });

  it('nenhum port é declarado como `interface`', () => {
    const offenders = applicationDirs()
      .map((d) => join(d, 'ports'))
      .filter((d) => {
        try {
          return statSync(d).isDirectory();
        } catch {
          return false;
        }
      })
      .flatMap((d) => filesUsing(d, INTERFACE_DECL, { ext: '.ts' }))
      .sort();
    assert.deepEqual(
      offenders,
      [],
      'Port declarado como `interface` aceita `implements` e reabre a hierarquia de classes que o ' +
        'projeto fechou ao escolher `type` + funções:\n' +
        offenders.join('\n'),
    );
  });

  it('a varredura enxerga application (guarda contra verde por vacuidade)', () => {
    assert.ok(
      applicationFiles().length > 100,
      `esperado 100+ arquivos em application/, encontrado ${applicationFiles().length}`,
    );
  });
});
