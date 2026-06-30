# AUTH-HTTP-PHOTO — Rotas PUT/DELETE foto de perfil (US6)

**Size:** M · **Spec:** `specs/005-gestao-usuarios/` (US6, contracts/http-users.md §photo, tasks T043–T044) · **Branch:** `005-gestao-usuarios`

> Borda HTTP da US6. Consome `setProfilePhoto`/`removeProfilePhoto` (ticket `AUTH-USECASE-SET-PHOTO`,
> closed-green). Adiciona o adapter S3/MinIO e o wiring.

## Decisões

1. **Rotas** `PUT /api/v1/users/:id/photo` e `DELETE .../photo` (`user:update`, conforme contrato).
2. **Upload binário** (espelha contracts): `addContentTypeParser('application/octet-stream', parseAs:'buffer')`
   no escopo do plugin; `mimeType` na querystring (Zod `string`, validado no use case → 422). bodyLimit 6 MiB
   (use case corta em 5 MiB → 422; acima de 6 MiB → 413 do Fastify).
3. **Magic bytes (defesa em profundidade)** na borda: confere assinatura JPEG/PNG/WebP × `mimeType`
   declarado → `422` se divergir (anti content-type spoofing).
4. **Resposta 200 = detalhe** (reusa `getUser`), com `imageUrl` atualizado.
5. **Adapter S3** próprio do auth (`profile-photo-storage.s3.ts`, `@aws-sdk/client-s3`: PutObject/DeleteObject).
   Wiring: memory → in-memory; mysql → S3 se env configurado, senão in-memory (fallback seguro). Integração
   MinIO real é opt-in (T044).
6. **Mapa de erros**: `user-id-invalid`→400; `user-not-found`→404; `photo-type-unsupported`/`photo-empty`/
   `photo-too-large`/`photo-ref-*`→422; `photo-storage-unavailable`→503.

## Arquivos

| Ação | Arquivo |
|---|---|
| Modificar | `adapters/http/users-schemas.ts` — query mimeType |
| Modificar | `adapters/http/users-plugin.ts` — parser + magic bytes + rotas PUT/DELETE + deps |
| Criar | `adapters/storage/profile-photo-storage.s3.ts` |
| Modificar | `adapters/http/composition.ts` — storage + use cases |
| Modificar | `src/server.ts` + 6 testes irmãos — novo shape de `UsersHttpDeps` |
| Criar (teste) | `tests/modules/auth/adapters/http/users-photo.route.test.ts` |
| Criar | `api-collections/auth/2-users/` requests de foto (Bruno) |

## Critérios de aceite (W0 — RED, inject)

- **CA1**: PUT photo sem token → 401.
- **CA2**: PUT photo sem `user:update` (bare) → 403.
- **CA3**: PUT photo JPEG válido → 200; detalhe `imageUrl != null`.
- **CA4**: PUT photo `mimeType` não suportado (application/pdf) → 422.
- **CA5**: PUT photo magic bytes divergentes do `mimeType` → 422.
- **CA6**: DELETE photo → 200; detalhe `imageUrl == null`.
- **CA7**: PUT photo id inexistente → 404.
