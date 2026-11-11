/**
 * Expansão dos caminhos de uma suíte de integração (`scripts/ci/test-integration.ts`).
 *
 * Antes da épica Bun, o `node --test` recebia o caminho direto e falhava ao não achar o arquivo.
 * Com a expansão por `globSync`, um caminho LITERAL inexistente (renomeado, digitado errado)
 * virava lista vazia e sumia sem aviso — a suíte ficava verde com o teste ausente, que é
 * exatamente o órfão que o gate `integration-orphans` caça na direção oposta.
 *
 * Padrão COM curinga que casa zero continua permitido: "zero ou mais" é o contrato de um glob,
 * e a suíte inteira vazia segue barrada no `main`.
 */

import { afterAll, beforeAll, describe, it } from 'bun:test';
import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expandPaths, missingPathsMessage } from '../../scripts/ci/test-integration.ts';

let root = '';

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'expand-paths-'));
  mkdirSync(join(root, 'tests/a'), { recursive: true });
  writeFileSync(join(root, 'tests/a/one.test.ts'), '');
  writeFileSync(join(root, 'tests/a/two.test.ts'), '');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('expandPaths', () => {
  it('caminho literal existente e curinga viram caminhos `./…` ordenados', () => {
    const result = expandPaths(['tests/a/two.test.ts', 'tests/a/*.test.ts'], root);
    assert.deepEqual(result, {
      ok: true,
      paths: ['./tests/a/two.test.ts', './tests/a/one.test.ts', './tests/a/two.test.ts'],
    });
  });

  it('caminho literal inexistente é acusado, não descartado', () => {
    const result = expandPaths(['tests/a/one.test.ts', 'tests/a/renamed.test.ts'], root);
    assert.deepEqual(result, { ok: false, missing: ['tests/a/renamed.test.ts'] });
  });

  it('curinga que casa zero arquivos não é erro por si só', () => {
    const result = expandPaths(['tests/a/one.test.ts', 'tests/nada/**/*.test.ts'], root);
    assert.deepEqual(result, { ok: true, paths: ['./tests/a/one.test.ts'] });
  });

  it('`?`, `[` e `{` também são curinga — casar zero não acusa', () => {
    for (const pattern of ['tests/a/?.test.ts', 'tests/a/[xy].test.ts', 'tests/a/{x,y}.test.ts']) {
      assert.deepEqual(expandPaths([pattern], root), { ok: true, paths: [] }, pattern);
    }
  });
});

describe('missingPathsMessage', () => {
  it('nomeia a suíte e cada caminho ausente, em PT-BR', () => {
    const message = missingPathsMessage('financial', ['tests/x.test.ts', 'tests/y.test.ts']);
    assert.match(message, /suíte "financial"/);
    assert.match(message, /tests\/x\.test\.ts/);
    assert.match(message, /tests\/y\.test\.ts/);
    assert.match(message, /não existe/);
  });
});
