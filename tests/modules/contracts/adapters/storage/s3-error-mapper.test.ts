/**
 * W0 (RED) - Tests para mapS3Error.
 *
 * Ticket: CTR-STORAGE-S3-ADAPTER.
 *
 * Cobre CA-T23..T29 (mapeamento AWS SDK exception -> DocumentStorageError):
 *   T23 - NoSuchKey -> storage-not-found
 *   T24 - AccessDenied -> storage-permission-denied
 *   T25 - InvalidAccessKeyId -> storage-permission-denied
 *   T26 - BadDigest -> storage-integrity-mismatch
 *   T27 - XAmzContentSHA256Mismatch -> storage-integrity-mismatch
 *   T28 - codigo de rede (ECONNREFUSED) -> storage-unavailable
 *   T29 - excecao desconhecida -> storage-upload-failed
 *   T30 - caught nao-Error -> storage-upload-failed
 *
 * Heuristica baseada em (a) `.name` da Error (S3ServiceException expoe via name),
 * (b) `.Code` (AWS XML/JSON error code), (c) `.code` (Node.js NodeJS.ErrnoException).
 *
 * Estes tests DEVEM FALHAR em W0 - s3-error-mapper.ts ainda nao existe.
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { mapS3Error } from '#src/modules/contracts/adapters/storage/s3-error-mapper.ts';

// Helper: monta erro AWS-like via Error com `name` setado.
const awsError = (name: string, extra: Record<string, unknown> = {}): Error => {
  const e = new Error(`mock ${name}`);
  e.name = name;
  Object.assign(e, extra);
  return e;
};

// Helper: monta erro Node.js-like via Error com `code` setado.
const nodeError = (code: string): Error => {
  const e = new Error(`mock ${code}`);
  Object.assign(e, { code });
  return e;
};

describe('mapS3Error', () => {
  it('CA-T23: NoSuchKey -> storage-not-found', () => {
    assert.equal(mapS3Error(awsError('NoSuchKey')), 'storage-not-found');
    assert.equal(mapS3Error(awsError('NotFound')), 'storage-not-found');
  });

  it('CA-T24: AccessDenied -> storage-permission-denied', () => {
    assert.equal(mapS3Error(awsError('AccessDenied')), 'storage-permission-denied');
  });

  it('CA-T25: InvalidAccessKeyId / SignatureDoesNotMatch -> storage-permission-denied', () => {
    assert.equal(mapS3Error(awsError('InvalidAccessKeyId')), 'storage-permission-denied');
    assert.equal(mapS3Error(awsError('SignatureDoesNotMatch')), 'storage-permission-denied');
  });

  it('CA-T26: BadDigest / InvalidDigest -> storage-integrity-mismatch', () => {
    assert.equal(mapS3Error(awsError('BadDigest')), 'storage-integrity-mismatch');
    assert.equal(mapS3Error(awsError('InvalidDigest')), 'storage-integrity-mismatch');
  });

  it('CA-T27: XAmzContentSHA256Mismatch -> storage-integrity-mismatch', () => {
    assert.equal(mapS3Error(awsError('XAmzContentSHA256Mismatch')), 'storage-integrity-mismatch');
  });

  it('CA-T28: codigos de rede -> storage-unavailable', () => {
    assert.equal(mapS3Error(nodeError('ECONNREFUSED')), 'storage-unavailable');
    assert.equal(mapS3Error(nodeError('ETIMEDOUT')), 'storage-unavailable');
    assert.equal(mapS3Error(nodeError('ECONNRESET')), 'storage-unavailable');
    assert.equal(mapS3Error(awsError('NetworkingError')), 'storage-unavailable');
  });

  it('CA-T29: excecao desconhecida -> storage-upload-failed', () => {
    assert.equal(mapS3Error(awsError('SomethingWeird')), 'storage-upload-failed');
    assert.equal(mapS3Error(new Error('plain error')), 'storage-upload-failed');
  });

  it('CA-T30: caught nao-Error -> storage-upload-failed', () => {
    assert.equal(mapS3Error('string thrown'), 'storage-upload-failed');
    assert.equal(mapS3Error(undefined), 'storage-upload-failed');
    assert.equal(mapS3Error(null), 'storage-upload-failed');
    assert.equal(mapS3Error({ foo: 'bar' }), 'storage-upload-failed');
  });
});
