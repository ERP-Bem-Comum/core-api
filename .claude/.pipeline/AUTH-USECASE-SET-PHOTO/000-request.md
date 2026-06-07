# AUTH-USECASE-SET-PHOTO — Foto de perfil: use case + StoragePort (US6)

**Size:** M · **Spec:** `specs/005-gestao-usuarios/` (US6, FR-012, tasks T041–T042) · **Branch:** `005-gestao-usuarios`

> Camada application + port + adapter in-memory. As **rotas** `PUT/DELETE /api/v1/users/:id/photo`
> (multipart + S3/MinIO) são o ticket `AUTH-HTTP-PHOTO`. Reusa o domínio `User.setPhoto` (Foundational)
> e o VO `ProfilePhotoRef`.

## Decisões

1. **Port próprio do auth `ProfilePhotoStorage`** (ADR-0006: módulo não importa de `contracts/`).
   Mínimo: `upload({ key, bytes, mimeType })` + `remove(key)` → `Result<void, 'photo-storage-unavailable'>`.
   O adapter S3 real fica no ticket HTTP; aqui entra só o in-memory (testes + driver memory).
2. **Validação tipo/tamanho no use case (FR-012)**: MIME allowlist `image/jpeg|png|webp`
   (`photo-type-unsupported`); tamanho `0 < bytes ≤ 5 MiB` (`photo-empty`/`photo-too-large`).
   Magic bytes ficam como defesa na borda (ticket HTTP).
3. **Key determinística** `users/<userId>` → troca sobrescreve (idempotente). `ProfilePhotoRef.parse`
   valida a chave (defesa em profundidade).
4. **Sequência** (set): validar id → validar mime/size → fetch (404) → `storage.upload` → `User.setPhoto`
   → persist. Evento `UserProfileUpdated` após save. (remove): fetch → `storage.remove` → `setPhoto(null)` → persist.
5. **Dois use cases** num arquivo `set-profile-photo.ts`: `setProfilePhoto` + `removeProfilePhoto`.

## Arquivos

| Ação | Arquivo |
|---|---|
| Criar | `application/ports/profile-photo-storage.ts` |
| Criar | `application/use-cases/set-profile-photo.ts` (`setProfilePhoto` + `removeProfilePhoto`) |
| Criar | `adapters/storage/profile-photo-storage.in-memory.ts` |
| Criar (teste) | `tests/modules/auth/application/use-cases/set-profile-photo.test.ts` |

## Critérios de aceite (W0 — RED)

- **CA1**: foto válida (jpeg, 1 KB) → `storage.upload` chamado com `key=users/<id>`; `save` com `photo=ref`; evento `UserProfileUpdated`.
- **CA2**: MIME fora da allowlist (ex. `application/pdf`) → `err('photo-type-unsupported')`; `upload`/`save` não chamados.
- **CA3**: bytes > 5 MiB → `err('photo-too-large')`; sem efeito.
- **CA4**: bytes vazios → `err('photo-empty')`.
- **CA5**: id inexistente → `err('user-not-found')`; `upload` não chamado.
- **CA6**: falha no storage → propaga `err('photo-storage-unavailable')`; `save` não chamado.
- **CA7**: `removeProfilePhoto` → `storage.remove` chamado; `save` com `photo=null`.
