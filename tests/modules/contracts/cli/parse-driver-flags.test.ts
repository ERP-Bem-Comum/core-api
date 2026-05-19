// Tests do parser de --driver / --connection-string / --state / --no-state.
// SQLite foi removido em CTR-CLEANUP-SQLITE (#5) — drivers vivos são `memory` e `mysql`.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  parseDriverFlags,
  DEFAULT_MEMORY_STATE_PATH,
} from '#src/modules/contracts/cli/parse-driver-flags.ts';

describe('parseDriverFlags — defaults', () => {
  it('sem flags: default = memory com state file padrão', () => {
    const r = parseDriverFlags([]);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.driver.kind, 'memory');
      if (r.value.driver.kind === 'memory') {
        assert.equal(r.value.driver.statePath, DEFAULT_MEMORY_STATE_PATH);
      }
      assert.deepEqual([...r.value.rest], []);
    }
  });

  it('--driver memory sem outras flags: state path padrão', () => {
    const r = parseDriverFlags(['--driver', 'memory']);
    assert.equal(r.ok, true);
    if (r.ok && r.value.driver.kind === 'memory') {
      assert.equal(r.value.driver.statePath, DEFAULT_MEMORY_STATE_PATH);
    }
  });
});

describe('parseDriverFlags — memory driver', () => {
  it('--state <path>: usa path informado', () => {
    const r = parseDriverFlags(['--state', '/tmp/foo.json']);
    assert.equal(r.ok, true);
    if (r.ok && r.value.driver.kind === 'memory') {
      assert.equal(r.value.driver.statePath, '/tmp/foo.json');
    }
  });

  it('--state=<path>: forma com = também funciona', () => {
    const r = parseDriverFlags(['--state=/tmp/bar.json']);
    assert.equal(r.ok, true);
    if (r.ok && r.value.driver.kind === 'memory') {
      assert.equal(r.value.driver.statePath, '/tmp/bar.json');
    }
  });

  it('--no-state: statePath null', () => {
    const r = parseDriverFlags(['--no-state']);
    assert.equal(r.ok, true);
    if (r.ok && r.value.driver.kind === 'memory') {
      assert.equal(r.value.driver.statePath, null);
    }
  });

  it('--state + --no-state: conflito', () => {
    const r = parseDriverFlags(['--state', '/tmp/a.json', '--no-state']);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cli-driver-flag-conflict');
  });
});

describe('parseDriverFlags — mysql driver', () => {
  it('--driver mysql --connection-string <url>: parse OK, kind mysql', () => {
    const r = parseDriverFlags([
      '--driver',
      'mysql',
      '--connection-string',
      'mysql://app:pass@127.0.0.1:3306/core',
    ]);
    assert.equal(r.ok, true);
    if (r.ok && r.value.driver.kind === 'mysql') {
      assert.equal(r.value.driver.connectionString, 'mysql://app:pass@127.0.0.1:3306/core');
    }
  });

  it('--driver mysql --connection-string=<url>: forma com = também funciona', () => {
    const r = parseDriverFlags(['--driver', 'mysql', '--connection-string=mysql://x:y@h:3306/d']);
    assert.equal(r.ok, true);
    if (r.ok && r.value.driver.kind === 'mysql') {
      assert.equal(r.value.driver.connectionString, 'mysql://x:y@h:3306/d');
    }
  });

  it('--driver mysql sem --connection-string: erro de valor ausente', () => {
    const r = parseDriverFlags(['--driver', 'mysql']);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cli-driver-missing-value');
  });

  it('--driver mysql + --state: conflito', () => {
    const r = parseDriverFlags([
      '--driver',
      'mysql',
      '--connection-string',
      'mysql://x:y@h:3306/d',
      '--state',
      '/tmp/y.json',
    ]);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cli-driver-flag-conflict');
  });
});

describe('parseDriverFlags — drivers removidos', () => {
  it('--driver sqlite: erro driver desconhecido (removido em #5)', () => {
    const r = parseDriverFlags(['--driver', 'sqlite']);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cli-driver-unknown');
  });

  it('--driver foo: erro driver desconhecido', () => {
    const r = parseDriverFlags(['--driver', 'foo']);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cli-driver-unknown');
  });

  it('--driver sem valor: erro de valor ausente', () => {
    const r = parseDriverFlags(['--driver']);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cli-driver-missing-value');
  });
});

describe('parseDriverFlags — separação driver vs rest', () => {
  it('flags do driver são removidas, restantes vão para `rest`', () => {
    const r = parseDriverFlags([
      '--driver',
      'mysql',
      '--connection-string',
      'mysql://x:y@h:3306/d',
      '--numero',
      '001/2026',
      '--titulo',
      'Foo',
    ]);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.deepEqual([...r.value.rest], ['--numero', '001/2026', '--titulo', 'Foo']);
    }
  });

  it('flags do comando antes do driver: ordem preservada em rest', () => {
    const r = parseDriverFlags([
      '--numero',
      '042/2026',
      '--driver',
      'memory',
      '--no-state',
      '--titulo',
      'Bar',
    ]);
    assert.equal(r.ok, true);
    if (r.ok && r.value.driver.kind === 'memory') {
      assert.equal(r.value.driver.statePath, null);
      assert.deepEqual([...r.value.rest], ['--numero', '042/2026', '--titulo', 'Bar']);
    }
  });
});
