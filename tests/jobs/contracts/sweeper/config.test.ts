import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ok, err, isOk, isErr } from '#src/shared/index.ts';
import {
  readJobConfig,
  defaultConnectionFileReader,
  type ConnectionFileReader,
} from '#src/jobs/contracts/sweeper/config.ts';

// CTR-SWEEPER-DBURL-FILE (decisão CA5 da issue #50): readJobConfig passa a aceitar
// `CONTRACTS_DATABASE_URL_FILE` (Docker secret com a connection string completa),
// mutuamente exclusivo com `CONTRACTS_DATABASE_URL`. A leitura de arquivo é injetada
// como dependência (`ConnectionFileReader`) — testes puros usam fakes; só CA2 toca FS
// real para exercitar o `.trim()` do default reader.

const URL = 'mysql://core_app:pw@mysql:3306/core';

const fakeReaderOk =
  (value: string): ConnectionFileReader =>
  () =>
    ok(value);
const fakeReaderErr: ConnectionFileReader = () => err('unreadable');

describe('readJobConfig — CONTRACTS_DATABASE_URL_FILE (CTR-SWEEPER-DBURL-FILE)', () => {
  it('CA1: env direta setada, _FILE ausente → usa a env (inalterado)', () => {
    // Arrange / Act
    const r = readJobConfig({ CONTRACTS_DATABASE_URL: URL }, fakeReaderErr);
    // Assert
    assert.ok(isOk(r));
    if (r.ok) assert.equal(r.value.connectionString, URL);
  });

  it('CA1b: CONTRACTS_DATABASE_URL = "" conta como ausente → usa _FILE (não é ambíguo)', () => {
    const r = readJobConfig(
      { CONTRACTS_DATABASE_URL: '', CONTRACTS_DATABASE_URL_FILE: '/run/secrets/x' },
      fakeReaderOk(URL),
    );
    assert.ok(isOk(r), `esperava ok, veio ${JSON.stringify(r)}`);
    if (r.ok) assert.equal(r.value.connectionString, URL);
  });

  it('CA2: _FILE → conteúdo do arquivo com trailing \\n removido (default reader, FS real)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sweeper-secret-'));
    const file = join(dir, 'db_url.txt');
    try {
      writeFileSync(file, `${URL}\n`); // trailing newline (echo > / Docker secret)
      const r = readJobConfig({ CONTRACTS_DATABASE_URL_FILE: file }, defaultConnectionFileReader);
      assert.ok(isOk(r), `esperava ok, veio ${JSON.stringify(r)}`);
      if (r.ok) assert.equal(r.value.connectionString, URL); // sem \n
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('CA3: ambas setadas → err(sweeper-ambiguous-connection-config)', () => {
    const r = readJobConfig(
      { CONTRACTS_DATABASE_URL: URL, CONTRACTS_DATABASE_URL_FILE: '/run/secrets/x' },
      fakeReaderOk(URL),
    );
    assert.ok(isErr(r));
    if (!r.ok) assert.equal(r.error, 'sweeper-ambiguous-connection-config');
  });

  it('CA4: nenhuma setada → err(sweeper-missing-connection-string)', () => {
    const r = readJobConfig({}, fakeReaderErr);
    assert.ok(isErr(r));
    if (!r.ok) assert.equal(r.error, 'sweeper-missing-connection-string');
  });

  it('CA5: _FILE setada mas arquivo ilegível → err(sweeper-unreadable-connection-file)', () => {
    const r = readJobConfig({ CONTRACTS_DATABASE_URL_FILE: '/run/secrets/nope' }, fakeReaderErr);
    assert.ok(isErr(r));
    if (!r.ok) assert.equal(r.error, 'sweeper-unreadable-connection-file');
  });

  it('CA6: _FILE setada mas arquivo vazio (reader devolve "") → err(sweeper-unreadable-connection-file)', () => {
    const r = readJobConfig(
      { CONTRACTS_DATABASE_URL_FILE: '/run/secrets/empty' },
      fakeReaderOk(''),
    );
    assert.ok(isErr(r));
    if (!r.ok) assert.equal(r.error, 'sweeper-unreadable-connection-file');
  });

  it('CA7: URL via _FILE + SWEEP_BATCH_SIZE → batchSize respeitado', () => {
    const r = readJobConfig(
      { CONTRACTS_DATABASE_URL_FILE: '/run/secrets/x', SWEEP_BATCH_SIZE: '50' },
      fakeReaderOk(URL),
    );
    assert.ok(isOk(r));
    if (r.ok) {
      assert.equal(r.value.connectionString, URL);
      assert.equal(r.value.batchSize, 50);
    }
  });
});
