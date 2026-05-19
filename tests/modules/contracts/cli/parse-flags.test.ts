import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { parseFlags, validateAllowedFlags } from '#src/modules/contracts/cli/parse-flags.ts';

describe('parseFlags', () => {
  it('parses --flag value pairs', () => {
    const r = parseFlags(['--titulo', 'X', '--numero', '001/2026']);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value['titulo'], 'X');
      assert.equal(r.value['numero'], '001/2026');
    }
  });

  it('parses --flag=value form', () => {
    const r = parseFlags(['--titulo=X', '--numero=001/2026']);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value['titulo'], 'X');
      assert.equal(r.value['numero'], '001/2026');
    }
  });

  it('returns Ok empty object for empty argv', () => {
    const r = parseFlags([]);
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value, {});
  });

  it('handles flag with value containing spaces and special chars', () => {
    const r = parseFlags(['--titulo', 'Cooperativa Bem Comum — equipamentos']);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value['titulo'], 'Cooperativa Bem Comum — equipamentos');
    }
  });

  // REGR #9 (2026-05-15): mudança de contrato. Antes "last value wins"; agora
  // flag duplicada vira Err `cli-flag-duplicated`.
  it('rejects duplicated flag (REGR #9 — was silently overwritten before)', () => {
    const r = parseFlags(['--x', 'a', '--x', 'b']);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error.kind, 'cli-flag-duplicated');
      assert.equal(r.error.flag, 'x');
    }
  });

  it('rejects duplicated flag in --flag=value form', () => {
    const r = parseFlags(['--numero=300/2026', '--numero=999/2026']);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error.kind, 'cli-flag-duplicated');
      assert.equal(r.error.flag, 'numero');
    }
  });

  it('ignores positional args', () => {
    const r = parseFlags(['positional', '--flag', 'value']);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value['flag'], 'value');
  });
});

describe('validateAllowedFlags (REGR #10)', () => {
  it('returns Ok when all flags are in allowlist', () => {
    const r = validateAllowedFlags({ titulo: 'X', numero: '001/2026' }, ['titulo', 'numero']);
    assert.equal(r.ok, true);
  });

  it('returns Err cli-flag-unknown when a flag is not in allowlist', () => {
    const r = validateAllowedFlags({ titulo: 'X', xyz: '1' }, ['titulo', 'numero']);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error.kind, 'cli-flag-unknown');
      assert.equal(r.error.flag, 'xyz');
    }
  });

  it('detects typos like --no-stat (REGR #10 second case)', () => {
    const r = validateAllowedFlags({ 'no-stat': '' }, ['no-state', 'state']);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error.kind, 'cli-flag-unknown');
      assert.equal(r.error.flag, 'no-stat');
    }
  });
});
