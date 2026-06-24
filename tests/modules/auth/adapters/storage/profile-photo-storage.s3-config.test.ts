/**
 * Tests de config do ProfilePhotoS3Config (issue #244 — IAM Role).
 *
 * Verifica que o tipo aceita credenciais opcionais e que o adapter
 * e instanciado sem lancar (smoke de construcao). Nao testa chamadas S3
 * (isso e coberto pelo integration test gateado STORAGE_INTEGRATION=1).
 *
 * Cenarios:
 *   T1 - credenciais presentes -> config com accessKeyId/secretAccessKey
 *   T2 - credenciais ausentes  -> config sem campos (provider chain)
 *   T3 - tipo aceita forcePathStyle=true sem credenciais (Magalu sem chave)
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  createS3ProfilePhotoStorage,
  type ProfilePhotoS3Config,
} from '#src/modules/auth/adapters/storage/profile-photo-storage.s3.ts';

describe('ProfilePhotoS3Config — IAM Role (issue #244)', () => {
  it('T1: credenciais presentes -> config inclui accessKeyId e secretAccessKey', () => {
    // Arrange
    const config: ProfilePhotoS3Config = {
      endpoint: 'http://localhost:9000',
      region: 'us-east-1',
      accessKeyId: 'AKIA-FAKE',
      secretAccessKey: 'sekret-fake',
      bucket: 'auth-photos',
      forcePathStyle: true,
    };

    // Act — smoke: instanciar sem lancar
    assert.doesNotThrow(() => createS3ProfilePhotoStorage(config));
    // Assert — campos presentes no tipo
    assert.equal(config.accessKeyId, 'AKIA-FAKE');
    assert.equal(config.secretAccessKey, 'sekret-fake');
  });

  it('T2: credenciais ausentes -> config sem accessKeyId/secretAccessKey (provider chain)', () => {
    // Arrange — prod AWS ECS: sem credenciais estaticas
    const config: ProfilePhotoS3Config = {
      endpoint: 'https://s3.us-east-1.amazonaws.com',
      region: 'us-east-1',
      bucket: 'auth-photos',
      forcePathStyle: false,
    };

    // Act — smoke: instanciar sem lancar
    assert.doesNotThrow(() => createS3ProfilePhotoStorage(config));
    // Assert — campos ausentes (exactOptionalPropertyTypes: nao podem ser undefined explicito)
    assert.equal(config.accessKeyId, undefined);
    assert.equal(config.secretAccessKey, undefined);
  });

  it('T3: forcePathStyle=true sem credenciais (Magalu Cloud via IAM Role futuro)', () => {
    // Arrange
    const config: ProfilePhotoS3Config = {
      endpoint: 'https://br-ne1.magaluobjects.com',
      region: 'br-ne1',
      bucket: 'auth-photos',
      forcePathStyle: true,
    };

    // Act
    assert.doesNotThrow(() => createS3ProfilePhotoStorage(config));
    assert.equal(config.forcePathStyle, true);
    assert.equal(config.accessKeyId, undefined);
  });
});
