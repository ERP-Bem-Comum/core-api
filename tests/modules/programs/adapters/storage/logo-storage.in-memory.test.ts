/**
 * W0 (RED) - download no adapter in-memory do LogoStorage (PRG-LOGO-CONTENT).
 *
 * DEVE FALHAR em W0 - `download` ainda nao existe no port nem no adapter. Round-trip
 * upload -> download preserva bytes + contentType (o mimeType do upload); key ausente ->
 * logo-object-missing (distinto de logo-storage-unavailable: mapeia 404, nao 503). ASCII puro.
 * Espelha tests/modules/auth/adapters/storage/profile-photo-storage.in-memory.test.ts.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { makeInMemoryLogoStorage } from '#src/modules/programs/adapters/storage/logo-storage.in-memory.ts';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02]);

describe('makeInMemoryLogoStorage.download', () => {
  it('round-trip: upload -> download devolve os mesmos bytes e o contentType do upload', async () => {
    const storage = makeInMemoryLogoStorage();
    const up = await storage.upload({
      key: 'programs/p1/logo',
      bytes: PNG,
      mimeType: 'image/png',
    });
    assert.equal(up.ok, true);

    const down = await storage.download('programs/p1/logo');
    assert.equal(down.ok, true);
    if (down.ok) {
      assert.deepEqual(down.value.bytes, PNG);
      assert.equal(down.value.contentType, 'image/png');
    }
  });

  it('key ausente -> logo-object-missing', async () => {
    const storage = makeInMemoryLogoStorage();
    const down = await storage.download('programs/ghost/logo');
    assert.equal(down.ok, false);
    if (!down.ok) assert.equal(down.error, 'logo-object-missing');
  });

  it('apos remove, download volta a logo-object-missing', async () => {
    const storage = makeInMemoryLogoStorage();
    await storage.upload({ key: 'programs/p2/logo', bytes: PNG, mimeType: 'image/png' });
    await storage.remove('programs/p2/logo');
    const down = await storage.download('programs/p2/logo');
    assert.equal(down.ok, false);
    if (!down.ok) assert.equal(down.error, 'logo-object-missing');
  });
});
