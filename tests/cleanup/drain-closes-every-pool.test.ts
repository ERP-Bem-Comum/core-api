/**
 * DRAIN-CLOSES-EVERY-POOL — no caminho fatal, todo pool fecha, mesmo se outro falhar.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Norma (#632): o `drain` passado a `installLastResortHandlers` MUST tentar fechar TODOS os pools,
 * independentemente de qualquer um deles rejeitar. Sequência de `await` curto-circuita: se o
 * primeiro `close()` rejeita, o segundo nunca executa e aquele pool fica pendurado até o
 * `wait_timeout` — o [Incident-0001](../../handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md)
 * de novo, justamente no caminho onde a drenagem é a ÚNICA defesa: em `uncaughtException` o `finally`
 * do fluxo normal não roda.
 *
 * ## Por que este gate existe além do teste unitário
 *
 * O `.catch()` de `src/shared/runtime/last-resort.ts` (mesmo ticket) impede que a rejeição vire
 * `unhandledRejection` e garante o `exit(1)`. **Ele NÃO faz o segundo pool fechar** — foi medido:
 * com um `close()` rejeitando, o drain para em `abort → close:contracts` e o segundo pool nunca é
 * tocado. São dois defeitos, e o teste unitário do `last-resort` mede só o primeiro.
 *
 * Este gate mede o segundo, e mede na FORMA em vez de no comportamento: um `drain` com dois `await
 * x.close()` em sequência é sequencial por construção, e nenhuma quantidade de rede em volta muda
 * isso. `Promise.allSettled` é a forma que satisfaz.
 *
 * ⚠️ Escopo: só `drain` com DOIS OU MAIS `close()`. Um `drain` de pool único não tem o que
 * curto-circuitar, e exigir `allSettled` dele seria cerimônia.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { join, relative } from 'node:path';

import { PROJECT_ROOT, walkFiles, readSource } from '../support/source-scan.ts';

/** O corpo do `drain`, da declaração até o fecho do bloco. */
const DRAIN_BODY = /const drain = async \(\): Promise<void> => \{([\s\S]*?)\n {2}\};/;

/** `await x.close()` — a forma sequencial. `Promise.allSettled([...])` não casa. */
const SEQUENTIAL_CLOSE = /await\s+[\w.]*\w+\.close\(\)/g;

const entrypoints = (): readonly string[] =>
  [join(PROJECT_ROOT, 'src', 'workers'), join(PROJECT_ROOT, 'src', 'modules')]
    .flatMap((d) => walkFiles(d, { ext: '.ts' }))
    .filter((f) => /\/(workers|worker)\/[^/]+\/run\.ts$|\/worker\/run\.ts$/.test(f))
    .map((f) => relative(PROJECT_ROOT, f))
    .sort();

/** Quantos `close()` sequenciais o `drain` de cada entrypoint encadeia. */
const sequentialCloses = (): ReadonlyMap<string, number> => {
  const out = new Map<string, number>();
  for (const rel of entrypoints()) {
    const body = DRAIN_BODY.exec(readSource(rel))?.[1];
    if (body === undefined) continue;
    out.set(rel, [...body.matchAll(SEQUENTIAL_CLOSE)].length);
  }
  return out;
};

describe('DRAIN-CLOSES-EVERY-POOL — pool não vaza porque o vizinho falhou', () => {
  it('nenhum drain encadeia dois ou mais `close()` sequenciais', () => {
    const offenders = [...sequentialCloses()]
      .filter(([, n]) => n > 1)
      .map(([file, n]) => `${file}: ${n} \`await x.close()\` em sequência`)
      .sort();
    assert.deepEqual(
      offenders,
      [],
      'Drain sequencial com múltiplos pools. Se o primeiro `close()` rejeitar, os seguintes NUNCA ' +
        'executam e aqueles pools ficam pendurados até o `wait_timeout` — e isto é o caminho fatal, ' +
        'onde a drenagem é a única defesa. Use `await Promise.allSettled([a.close(), b.close()])`:\n' +
        offenders.join('\n'),
    );
  });

  it('a varredura enxerga os drains (guarda contra regex que casa nada)', () => {
    const n = sequentialCloses().size;
    assert.ok(n > 3, `esperado 4+ entrypoints com \`drain\`, encontrado ${n}`);
  });
});
