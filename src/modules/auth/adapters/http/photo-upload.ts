/**
 * Helpers de upload de foto de perfil — compartilhados entre o plugin admin (`/users/:id/photo`)
 * e o autosserviço (`/me/photo`). Mantém UMA fonte de verdade para o parser binário, a defesa de
 * magic bytes e os mapas de status de erro (USR-ME-PHOTO).
 */

// Body binario ate 6 MiB no parser (o use case corta em 5 MiB -> 422; acima do parser -> 413). Cada
// plugin registra o parser `application/octet-stream` no próprio escopo com este limite.
export const PHOTO_BODY_LIMIT = 6 * 1024 * 1024;

const startsWith = (bytes: Buffer, sig: readonly number[]): boolean =>
  sig.every((b, i) => bytes[i] === b);

/**
 * Magic bytes (defesa em profundidade contra content-type spoofing): confere a assinatura do arquivo
 * contra o mimeType declarado. MIME fora da allowlist é tratado pelo use case (`photo-type-unsupported`).
 */
export const magicBytesMatch = (mimeType: string, bytes: Buffer): boolean => {
  switch (mimeType) {
    case 'image/jpeg':
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case 'image/png':
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'image/webp':
      // RIFF....WEBP
      return (
        startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && bytes.subarray(8, 12).toString() === 'WEBP'
      );
    default:
      return true;
  }
};

/** Status dos erros de `setProfilePhoto` (PUT). */
export const PHOTO_SET_ERROR_STATUS = {
  'user-id-invalid': 400,
  'user-not-found': 404,
  'photo-content-mismatch': 422,
  'photo-type-unsupported': 422,
  'photo-empty': 422,
  'photo-too-large': 422,
  'photo-ref-empty': 422,
  'photo-ref-too-long': 422,
  'photo-ref-invalid': 422,
  'photo-storage-unavailable': 503,
  'user-repo-unavailable': 503,
} as const;

/** Status dos erros de `removeProfilePhoto` (DELETE). */
export const PHOTO_REMOVE_ERROR_STATUS = {
  'user-id-invalid': 400,
  'user-not-found': 404,
  'photo-storage-unavailable': 503,
  'user-repo-unavailable': 503,
} as const;
