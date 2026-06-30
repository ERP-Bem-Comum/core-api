/**
 * Tests de config do LogoS3Config (issue #244 — IAM Role).
 *
 * Verifica que o tipo aceita credenciais opcionais e que o adapter
 * e instanciado sem lancar (smoke de construcao). Nao testa chamadas S3
 * (isso e coberto pelo integration test gateado STORAGE_INTEGRATION=1).
 *
 * Cenarios:
 *   T1 - credenciais presentes -> config com accessKeyId/secretAccessKey
 *   T2 - credenciais ausentes  -> config sem campos (provider chain)
 *   T3 - tipo aceita forcePathStyle=true sem credenciais
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  createS3LogoStorage,
  type LogoS3Config,
} from '#src/modules/programs/adapters/storage/logo-storage.s3.ts';

describe('LogoS3Config — IAM Role (issue #244)', () => {
  it('T1: credenciais presentes -> config inclui accessKeyId e secretAccessKey', () => {
    // Arrange
    const config: LogoS3Config = {
      endpoint: 'http://localhost:9000',
      region: 'us-east-1',
      accessKeyId: 'AKIA-FAKE',
      secretAccessKey: 'sekret-fake',
      bucket: 'programs-logos',
      forcePathStyle: true,
    };

    // Act — smoke: instanciar sem lancar
    assert.doesNotThrow(() => createS3LogoStorage(config));
    // Assert — campos presentes no tipo
    assert.equal(config.accessKeyId, 'AKIA-FAKE');
    assert.equal(config.secretAccessKey, 'sekret-fake');
  });

  it('T2: credenciais ausentes -> config sem accessKeyId/secretAccessKey (provider chain)', () => {
    // Arrange — prod AWS ECS: sem credenciais estaticas
    const config: LogoS3Config = {
      endpoint: 'https://s3.us-east-1.amazonaws.com',
      region: 'us-east-1',
      bucket: 'programs-logos',
      forcePathStyle: false,
    };

    // Act — smoke: instanciar sem lancar
    assert.doesNotThrow(() => createS3LogoStorage(config));
    // Assert — campos ausentes
    assert.equal(config.accessKeyId, undefined);
    assert.equal(config.secretAccessKey, undefined);
  });

  it('T3: forcePathStyle=true sem credenciais (Magalu Cloud via IAM Role futuro)', () => {
    // Arrange
    const config: LogoS3Config = {
      endpoint: 'https://br-ne1.magaluobjects.com',
      region: 'br-ne1',
      bucket: 'programs-logos',
      forcePathStyle: true,
    };

    // Act
    assert.doesNotThrow(() => createS3LogoStorage(config));
    assert.equal(config.forcePathStyle, true);
    assert.equal(config.accessKeyId, undefined);
  });
});
