import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// ETL-LEGACY-DIRECT-CONNECTION (W0 RED): o reader do legado passa a conectar por
// connection string (ETL_LEGACY_CONNECTION_STRING), sem Docker/dump. `resolveLegacyConnectOptions`
// é a função pura que valida a env e monta as opções mysql2. Ainda não existe → RED.
import { resolveLegacyConnectOptions } from '#scripts/etl/legacy/connect.ts';

describe('connect — resolveLegacyConnectOptions (ETL-LEGACY-DIRECT-CONNECTION)', () => {
  it('env ausente → err etl-legacy-connection-string-missing', () => {
    const r = resolveLegacyConnectOptions(undefined);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'etl-legacy-connection-string-missing');
  });

  it('string vazia ou só espaços → err etl-legacy-connection-string-missing', () => {
    for (const raw of ['', '   ', '\t\n']) {
      const r = resolveLegacyConnectOptions(raw);
      assert.equal(r.ok, false, `esperava err para ${JSON.stringify(raw)}`);
      if (!r.ok) assert.equal(r.error, 'etl-legacy-connection-string-missing');
    }
  });

  it('URL válida → ok com uri + flags de segurança do reader (rede privada, sem TLS)', () => {
    const uri = 'mysql://etl_ro:senha@legado-host:3306/legacy';
    const r = resolveLegacyConnectOptions(uri);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.uri, uri);
      // Flags preservadas do reader SELECT-only original (connect.ts).
      assert.equal(r.value.multipleStatements, false);
      assert.equal(r.value.dateStrings, false);
      assert.equal(r.value.timezone, 'Z');
      assert.equal(r.value.decimalNumbers, false);
    }
  });
});
