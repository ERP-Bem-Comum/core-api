/**
 * JOBS-ONESHOT-DISCIPLINE — job é one-shot; worker é contínuo. A diferença é deliberada.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Norma de origem: ADR-0041. Um job periódico conecta, executa numa transação, fecha o pool e sai.
 * Ele NÃO instala listener de sinal e NÃO faz loop — e isso não é descuido:
 *
 *   - Sem `SIGTERM` listener: se o processo morrer no meio, o MySQL faz ROLLBACK e o próximo
 *     disparo do cron refaz. A garantia é a IDEMPOTÊNCIA, não o graceful shutdown. Instalar o
 *     listener trocaria uma garantia forte (transação atômica) por uma fraca (fechar bonito).
 *   - Sem `setInterval`: o agendamento é externo (cron/systemd timer). Um job que faz o próprio
 *     loop vira um worker mal-feito — sem supervisão, sem restart policy, sem healthcheck.
 *
 * O worker contínuo é o oposto exato, e por isso o teste checa as DUAS direções: ausência em
 * `src/jobs/` só significa disciplina se a presença em `src/workers/` for confirmada no mesmo
 * passo. Um refactor que apagasse o shutdown dos workers deixaria a primeira metade verde.
 *
 * Os padrões exigem a FORMA DE USO (`new AbortController(`, `process.once('SIG`), nunca o nome
 * solto: `src/jobs/contracts/sweeper/run.ts:4` documenta em comentário "SEM AbortController /
 * SIGTERM listener — one-shot", e um padrão por nome acusaria justamente o arquivo que melhor
 * explica a regra. Foi a armadilha que a auditoria do inventário registrou duas vezes.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..', '..');

// Uso real, não menção. `new AbortController(` e `process.once('SIG` não aparecem em prosa.
const SIGNAL_USE = /new AbortController\(|process\.(once|on)\(['"]SIG/;
const SELF_SCHEDULING = /\bsetInterval\(/;

const walk = (rel: string): readonly string[] => {
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
  visit(join(PROJECT_ROOT, rel));
  return out;
};

const matching = (rel: string, re: RegExp): readonly string[] =>
  walk(rel)
    .filter((f) => re.test(readFileSync(join(PROJECT_ROOT, f), 'utf-8')))
    .sort();

describe('JOBS-ONESHOT — job não vira worker por acidente', () => {
  it('nenhum job instala listener de sinal ou AbortController', () => {
    const offenders = matching('src/jobs', SIGNAL_USE);
    assert.deepEqual(
      offenders,
      [],
      'Job com shutdown cooperativo troca a garantia de rollback+idempotência por fechar bonito ' +
        '(ADR-0041):\n' +
        offenders.join('\n'),
    );
  });

  it('nenhum job se auto-agenda com setInterval', () => {
    const offenders = matching('src/jobs', SELF_SCHEDULING);
    assert.deepEqual(
      offenders,
      [],
      'Job que faz o próprio loop é um worker sem supervisão, restart policy nem healthcheck ' +
        '— o agendamento é externo (cron):\n' +
        offenders.join('\n'),
    );
  });
});

describe('JOBS-ONESHOT — worker contínuo mantém o shutdown cooperativo', () => {
  it('os entrypoints de worker instalam AbortController/sinal', () => {
    // A outra metade da invariante: sem esta asserção, apagar o shutdown de TODOS os workers
    // deixaria o teste acima verde e a suíte inteira em silêncio.
    const withShutdown = [
      ...matching('src/workers', SIGNAL_USE),
      ...matching('src/modules', SIGNAL_USE),
    ];
    assert.ok(
      withShutdown.length > 0,
      'nenhum worker instala shutdown cooperativo — o loop deixaria de encerrar em SIGTERM',
    );
  });
});
