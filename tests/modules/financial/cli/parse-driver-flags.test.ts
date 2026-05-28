/**
 * Testes do parser `parseDriverFlags` da CLI do módulo Financial.
 *
 * Ticket FIN-CLI-SCAFFOLD (W0 — RED).
 *
 * Cobre CA-7..CA-11 do `.claude/.pipeline/FIN-CLI-SCAFFOLD/000-request.md`:
 *   - Default sem `--driver` → memory + DEFAULT_MEMORY_STATE_PATH
 *   - `--driver memory --state <path>` → memory + path custom
 *   - `--driver memory --no-state` → memory + null
 *   - `--state <path> --no-state` → cli-driver-flag-conflict
 *   - `--driver mysql` → { kind: 'mysql' } (parser aceita; rejeição em buildContext)
 *   - `--driver desconhecido` → cli-driver-unknown
 *   - `--driver memory --state` (sem valor) → cli-driver-missing-value
 *   - `rest` preserva flags não-driver (subcomando + flags próprias)
 *
 * Pattern de referência: `tests/modules/contracts/cli/parse-driver-flags.test.ts` (não verificado).
 *
 * Estado esperado em W0: RED — `parse-driver-flags.ts` ainda não existe.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import {
  parseDriverFlags,
  DEFAULT_MEMORY_STATE_PATH,
} from '#src/modules/financial/cli/parse-driver-flags.ts';

describe('financial/cli parseDriverFlags', () => {
  it('CA-7: sem --driver retorna memory + DEFAULT_MEMORY_STATE_PATH', () => {
    const r = parseDriverFlags(['aprovar-titulo']);
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.driver.kind, 'memory');
      if (r.value.driver.kind === 'memory') {
        assert.equal(r.value.driver.statePath, DEFAULT_MEMORY_STATE_PATH);
      }
      assert.deepEqual(r.value.rest, ['aprovar-titulo']);
    }
  });

  it('CA-7: --driver memory --state custom.json retorna memory + path custom', () => {
    const r = parseDriverFlags(['--driver', 'memory', '--state', './custom.json']);
    assert.equal(isOk(r), true);
    if (r.ok && r.value.driver.kind === 'memory') {
      assert.equal(r.value.driver.statePath, './custom.json');
    }
  });

  it('CA-7: --driver memory --no-state retorna memory + null (efêmero)', () => {
    const r = parseDriverFlags(['--driver', 'memory', '--no-state']);
    assert.equal(isOk(r), true);
    if (r.ok && r.value.driver.kind === 'memory') {
      assert.equal(r.value.driver.statePath, null);
    }
  });

  it('CA-7: --state X --no-state simultâneos → cli-driver-flag-conflict', () => {
    const r = parseDriverFlags(['--driver', 'memory', '--state', 'foo.json', '--no-state']);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'cli-driver-flag-conflict');
  });

  it('CA-10: --driver mysql é aceito pelo parser (rejeição em buildContext)', () => {
    const r = parseDriverFlags(['--driver', 'mysql', 'aprovar-titulo']);
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.driver.kind, 'mysql');
      assert.deepEqual(r.value.rest, ['aprovar-titulo']);
    }
  });

  it('CA-9: --driver desconhecido → cli-driver-unknown', () => {
    const r = parseDriverFlags(['--driver', 'postgresql']);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'cli-driver-unknown');
  });

  it('CA-9: --driver memory --state (sem valor) → cli-driver-missing-value', () => {
    const r = parseDriverFlags(['--driver', 'memory', '--state']);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'cli-driver-missing-value');
  });

  it('CA-11: rest preserva subcomando + flags próprias (não-driver)', () => {
    const r = parseDriverFlags([
      '--driver',
      'memory',
      '--no-state',
      'aprovar-titulo',
      '--payable-id',
      'abc-123',
      '--approved-by',
      'user-xyz',
    ]);
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.deepEqual(r.value.rest, [
        'aprovar-titulo',
        '--payable-id',
        'abc-123',
        '--approved-by',
        'user-xyz',
      ]);
    }
  });
});
