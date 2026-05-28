/**
 * mapS3Error - traduz Error cru do @aws-sdk/client-s3 (ou rede Node.js) em
 * DocumentStorageError tagged.
 *
 * Ticket: CTR-STORAGE-S3-ADAPTER (W1).
 *
 * Heuristica:
 *   1. Inspeciona `error.name` (S3ServiceException expoe via name, AWS XML/JSON
 *      error code casa com `name` no SDK v3).
 *   2. Inspeciona `error.code` (NodeJS.ErrnoException, ex.: ECONNREFUSED).
 *   3. Catch-all retorna storage-upload-failed.
 *
 * Funcao pura - sem dependencia do SDK em runtime. Opera por inspecao de
 * `unknown`, robusta contra mudancas de major do SDK.
 *
 * ASCII puro.
 */

import type { DocumentStorageError } from '../../application/ports/document-storage.ts';

const NOT_FOUND_NAMES = new Set(['NoSuchKey', 'NotFound']);

const PERMISSION_NAMES = new Set(['AccessDenied', 'InvalidAccessKeyId', 'SignatureDoesNotMatch']);

const INTEGRITY_NAMES = new Set(['BadDigest', 'InvalidDigest', 'XAmzContentSHA256Mismatch']);

const NETWORK_NAMES = new Set(['NetworkingError']);

const NETWORK_CODES = new Set([
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
]);

export const mapS3Error = (caught: unknown): DocumentStorageError => {
  if (!(caught instanceof Error)) {
    return 'storage-upload-failed';
  }

  const name = caught.name;
  if (NOT_FOUND_NAMES.has(name)) return 'storage-not-found';
  if (PERMISSION_NAMES.has(name)) return 'storage-permission-denied';
  if (INTEGRITY_NAMES.has(name)) return 'storage-integrity-mismatch';
  if (NETWORK_NAMES.has(name)) return 'storage-unavailable';

  const code = (caught as NodeJS.ErrnoException).code;
  if (typeof code === 'string' && NETWORK_CODES.has(code)) {
    return 'storage-unavailable';
  }

  return 'storage-upload-failed';
};
