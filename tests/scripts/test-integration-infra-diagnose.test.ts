/**
 * #1103 — quando o `docker compose up --wait` falha, o runner de integração tem de dizer que a
 * INFRA não subiu (e não que um teste falhou) e deixar no log a evidência para medir a causa:
 * o estado de saúde do container (com a saída das sondas) e o log do serviço.
 *
 * Antes desta correção o runner só repassava o exit code do `up`: o CI mostrava
 * `container core-api-mailpit is unhealthy` seguido de `exit code 1`, sem nenhum dado que
 * distinguisse as hipóteses da issue.
 *
 * Estilo: inspeção de args (módulo puro, sem Docker) — mesmo molde de
 * `test-integration-non-destructive.test.ts`.
 */

import { describe, it } from 'bun:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  TEST_COMPOSE_PROJECT,
  composeLogsArgs,
  composePsIdsArgs,
  infraFailureMessage,
  inspectStateArgs,
} from '#scripts/ci/compose-project.ts';

describe('diagnóstico da infra quando o `up --wait` falha (#1103)', () => {
  it('lista TODOS os containers do projeto isolado, inclusive os que saíram', () => {
    assert.deepEqual(composePsIdsArgs(), ['compose', '-p', TEST_COMPOSE_PROJECT, 'ps', '-a', '-q']);
  });

  it('o inspect traz nome + State completo (Health.Log carrega a saída de cada sonda)', () => {
    const args = inspectStateArgs(['abc', 'def']);
    assert.equal(args[0], 'inspect');
    assert.ok(args.includes('{{.Name}} {{json .State}}'), 'formato sem o State em JSON');
    assert.deepEqual(args.slice(-2), ['abc', 'def']);
  });

  it('os logs vêm do projeto isolado, sem cor e com cauda limitada', () => {
    const args = composeLogsArgs();
    assert.deepEqual(args.slice(0, 4), ['compose', '-p', TEST_COMPOSE_PROJECT, 'logs']);
    assert.ok(args.includes('--no-color'));
    assert.ok(args.includes('--tail'));
  });

  it('CA3: a mensagem diz que a INFRA não subiu, nomeia os serviços e o exit code', () => {
    const msg = infraFailureMessage(['mailpit'], 1);
    assert.match(msg, /INFRA NÃO SUBIU/);
    assert.match(msg, /mailpit/);
    assert.match(msg, /exit 1/);
    assert.match(msg, /nenhum teste/i);
  });
});

describe('o runner usa o diagnóstico no caminho de falha do `up` (#1103)', () => {
  const runner = readFileSync(
    fileURLToPath(new URL('../../scripts/ci/test-integration.ts', import.meta.url)),
    'utf-8',
  );

  it('chama o diagnóstico antes de devolver o exit code do `up`', () => {
    assert.match(runner, /if \(up !== 0\) \{[\s\S]*?diagnoseInfra\([\s\S]*?return up;/);
  });
});
