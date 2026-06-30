/**
 * W0 (RED) - download no adapter in-memory do ProfilePhotoStorage (USR-ME-PHOTO-DISPLAY).
 *
 * DEVE FALHAR em W0 - `download` ainda nao existe no port nem no adapter. Round-trip
 * upload -> download preserva bytes + contentType (o mimeType do upload); key ausente ->
 * photo-object-missing (distinto de photo-storage-unavailable: mapeia 404, nao 503). ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { makeInMemoryProfilePhotoStorage } from '#src/modules/auth/adapters/storage/profile-photo-storage.in-memory.ts';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02]);

describe('makeInMemoryProfilePhotoStorage.download', () => {
  it('round-trip: upload -> download devolve os mesmos bytes e o contentType do upload', async () => {
    const storage = makeInMemoryProfilePhotoStorage();
    const up = await storage.upload({ key: 'users/u1', bytes: PNG, mimeType: 'image/png' });
    assert.equal(up.ok, true);

    const down = await storage.download('users/u1');
    assert.equal(down.ok, true);
    if (down.ok) {
      assert.deepEqual(down.value.bytes, PNG);
      assert.equal(down.value.contentType, 'image/png');
    }
  });

  it('key ausente -> photo-object-missing', async () => {
    const storage = makeInMemoryProfilePhotoStorage();
    const down = await storage.download('users/ghost');
    assert.equal(down.ok, false);
    if (!down.ok) assert.equal(down.error, 'photo-object-missing');
  });

  it('apos remove, download volta a photo-object-missing', async () => {
    const storage = makeInMemoryProfilePhotoStorage();
    await storage.upload({ key: 'users/u2', bytes: PNG, mimeType: 'image/png' });
    await storage.remove('users/u2');
    const down = await storage.download('users/u2');
    assert.equal(down.ok, false);
    if (!down.ok) assert.equal(down.error, 'photo-object-missing');
  });
});
