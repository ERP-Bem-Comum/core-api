/**
 * LONGRUNNING-DRAINS-POOL — processo long-running com pool instala os handlers de último recurso.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Norma: todo entrypoint que fica no ar segurando conexões precisa drenar o pool em erro FORA da
 * cadeia de promise — throw síncrono num callback de driver, `EventEmitter` sem catch,
 * `setImmediate`. Sem os handlers, o Node encerra com exit 1 sem rodar o `finally`, e o pool fica
 * pendurado no servidor até o `wait_timeout` expirar.
 *
 * Isso não é hipótese: é a mecânica do Incident-0001 (56 de 60 conexões no RDS de produção). O
 * `src/shared/runtime/last-resort.ts` foi escrito para isso e documenta o custo — mas até esta
 * mudança **só o `src/server.ts` o instalava**. Os sete workers long-running tratavam `SIGTERM`
 * (shutdown cooperativo) e ficavam descobertos exatamente no caminho não-cooperativo.
 *
 * Escopo: entrypoints de `src/workers/` e `src/modules/<m>/worker/`, mais o `src/server.ts`. Os
 * jobs de `src/jobs/` ficam FORA por desenho — são one-shot, o processo morre em segundos e a
 * transação sofre rollback; instalar shutdown cooperativo neles seria violar o ADR-0041 (ver
 * `jobs-oneshot-discipline.test.ts`).
 *
 * O `shutdown` passado ao handler tem de ser o que DRENA, não o que apenas aborta o loop: em
 * `uncaughtException` o `finally` do `try` nunca roda, então quem fecha o pool no caminho normal
 * não é chamado.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';

import { PROJECT_ROOT, walkFiles, filesUsing } from '../support/source-scan.ts';

/** Entrypoints long-running: `run.ts` sob workers/, worker/ de módulo, e o server. */
const longRunningEntrypoints = (): readonly string[] => {
  const workers = walkFiles(join(PROJECT_ROOT, 'src', 'workers'), { ext: 'run.ts' });
  const moduleWorkers = walkFiles(join(PROJECT_ROOT, 'src', 'modules'), { ext: 'run.ts' }).filter(
    (f) => f.includes('/worker/'),
  );
  return [...workers, ...moduleWorkers, 'src/server.ts'].sort();
};

const installsLastResort = (rel: string): boolean =>
  filesUsing(
    join(PROJECT_ROOT, rel.split('/').slice(0, -1).join('/')),
    'installLastResortHandlers',
    {
      ext: '.ts',
    },
  ).includes(rel);

describe('LONGRUNNING — quem segura pool drena em falha fatal', () => {
  it('todo entrypoint long-running instala installLastResortHandlers', () => {
    const offenders = longRunningEntrypoints()
      .filter((f) => !installsLastResort(f))
      .sort();
    assert.deepEqual(
      offenders,
      [],
      'Entrypoint long-running sem handler de último recurso — um throw fora da cadeia de promise ' +
        'encerra o processo sem drenar o pool, que fica pendurado até o wait_timeout ' +
        '(Incident-0001):\n' +
        offenders.join('\n'),
    );
  });

  it('a varredura enxerga os entrypoints (guarda contra verde por vacuidade)', () => {
    const found = longRunningEntrypoints();
    assert.ok(
      found.length >= 6,
      `esperado 6+ entrypoints long-running, encontrado ${found.length}`,
    );
  });

  it('nenhum job one-shot instala o handler (ADR-0041)', () => {
    // A outra direção da invariante: job morre rápido e conta com rollback. Instalar shutdown
    // cooperativo ali trocaria a garantia forte (transação atômica) pela fraca (fechar bonito).
    const jobs = filesUsing(join(PROJECT_ROOT, 'src', 'jobs'), 'installLastResortHandlers', {
      ext: '.ts',
    });
    assert.deepEqual(jobs, [], `job one-shot não instala handler de shutdown: ${jobs.join(', ')}`);
  });
});
