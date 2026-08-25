/**
 * NO-INPROCESS-EVENT-BUS — cross-módulo é outbox ou `public-api`, nunca barramento em memória.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Norma (`ADR-0006-C8`, promovida a `accepted` em 2026-08-05): comunicação cross-módulo é
 * ASSÍNCRONA por outbox ([ADR-0015](../../handbook/architecture/adr/0015-mysql-outbox-pattern.md))
 * ou leitura SÍNCRONA por `public-api/`
 * ([ADR-0032](../../handbook/architecture/adr/0032-transient-http-composition-read-until-bff.md)).
 * Não há barramento de eventos in-process entre módulos.
 *
 * O ADR-0006 previa o oposto — `EventBus` in-process com contrato versionado, cuja falha esperada
 * era "deus-classe emergente". O que se construiu foi outra coisa: sete tabelas `*_outbox` e o
 * contrato versionado no PAYLOAD (`schema_version`), não em evento de memória. A Inquiry-0016
 * estudou EventBus/Pub-Sub/Observer nativos e foi arquivada como watchlist, sem adoção.
 *
 * Por que a proibição vale mesmo sem ninguém ter tentado: um barramento em memória atravessa a
 * fronteira SEM deixar rastro no schema. O `module-boundary.test.ts` pega import cross-módulo; um
 * emitter compartilhado não é import de módulo, é import de infra — passaria por ele, e o
 * acoplamento só apareceria em produção, como ordem de execução que ninguém declarou.
 *
 * ⚠️ O gate olha IMPORT e USO, nunca o nome solto. Nove arquivos do `auth` dizem "EventBus futuro"
 * em docblock — um grep por `EventBus` acusaria justamente quem documenta a decisão de NÃO ter um.
 * Ver o docstring de `filesUsing` em `tests/support/source-scan.ts`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { join, relative } from 'node:path';

import { PROJECT_ROOT, filesUsing, importSpecifiers, walkFiles } from '../support/source-scan.ts';

/** A primitiva de barramento do Node. Import é a forma de uso que importa aqui. */
const EVENTS_MODULE = /^node:events$/;

/** Instanciação direta, em linha de código — `filesUsing` já descarta comentário. */
const EMITTER_USE = /new\s+EventEmitter\s*\(/;

const SCANNED = ['src/modules', 'src/shared'] as const;

const scannedFiles = (): readonly string[] =>
  SCANNED.flatMap((d) => walkFiles(join(PROJECT_ROOT, d), { ext: '.ts' }));

describe('NO-INPROCESS-EVENT-BUS — o acoplamento cross-módulo passa pelo schema, não pela memória', () => {
  it('nenhum arquivo de módulo ou de shared importa `node:events`', () => {
    const offenders = scannedFiles()
      .filter((f) => importSpecifiers(relative(PROJECT_ROOT, f)).some((s) => EVENTS_MODULE.test(s)))
      .map((f) => relative(PROJECT_ROOT, f))
      .sort();
    assert.deepEqual(
      offenders,
      [],
      'Import de `node:events` em módulo ou shared. Cross-módulo é outbox (assíncrono) ou ' +
        '`public-api/` (síncrono) — um emitter compartilhado acopla sem deixar rastro no schema:\n' +
        offenders.join('\n'),
    );
  });

  it('nenhum arquivo instancia um EventEmitter', () => {
    const offenders = SCANNED.flatMap((d) => filesUsing(join(PROJECT_ROOT, d), EMITTER_USE))
      .map((f) => (f.startsWith(PROJECT_ROOT) ? relative(PROJECT_ROOT, f) : f))
      .sort();
    assert.deepEqual(
      offenders,
      [],
      '`new EventEmitter(` em linha de código. Se a necessidade é reagir a evento de outro ' +
        'módulo, o caminho é a outbox — ela sobrevive a restart, o emitter não:\n' +
        offenders.join('\n'),
    );
  });

  it('a varredura enxerga o fonte (guarda contra verde por vacuidade)', () => {
    const n = scannedFiles().length;
    assert.ok(n > 100, `esperado 100+ arquivos varridos em ${SCANNED.join(', ')}, encontrado ${n}`);
  });
});
