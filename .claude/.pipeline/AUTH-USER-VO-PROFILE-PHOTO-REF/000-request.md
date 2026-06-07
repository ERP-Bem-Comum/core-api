# AUTH-USER-VO-PROFILE-PHOTO-REF — Value Object `ProfilePhotoRef`

**Size:** S · **Spec:** `specs/005-gestao-usuarios/` (Foundational, task T006/T010) · **Branch:** `005-gestao-usuarios`

## Escopo

Criar o VO `ProfilePhotoRef` em `src/modules/auth/domain/identity/profile-photo-ref.ts` (padrão `cpf.ts`).
Representa a **chave de um objeto** no storage (S3/MinIO, ADR-0019) — **não** o binário. O upload e a
validação de tipo/tamanho ocorrem no use case via `StoragePort`; aqui só validamos a chave.

Fora de escopo: upload, binário, validação de mime/tamanho (são do use case `set-profile-photo`).

## Regras da chave

- Não-vazia (após `trim`).
- Comprimento ≤ 1024 (limite prático de key S3).
- Sem path traversal (`..`) nem barra inicial (`/`) — defesa em profundidade.

## Critérios de aceite (viram `it()` no W0)

- **CA1**: chave válida (ex.: `"users/abc123/photo.png"`) → `ok` (com `trim`).
- **CA2**: vazia / só espaços → `err('photo-ref-empty')`.
- **CA3**: comprimento > 1024 → `err('photo-ref-too-long')`.
- **CA4**: contém `..` (traversal) ou começa com `/` → `err('photo-ref-invalid')`.
- **CA5**: `parse` nunca lança — sempre `Result`.

## Contrato de tipos

```ts
export type ProfilePhotoRef = Brand<string, 'ProfilePhotoRef'>;
export type ProfilePhotoRefError = 'photo-ref-empty' | 'photo-ref-too-long' | 'photo-ref-invalid';
export const parse = (raw: string): Result<ProfilePhotoRef, ProfilePhotoRefError> => { ... };
```
