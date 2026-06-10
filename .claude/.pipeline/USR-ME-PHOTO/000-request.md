# Request — USR-ME-PHOTO

> Origem: handbook/tickets `USR-ME-PHOTO` (handoff front). Espelha as rotas admin de foto no autosserviço.

## Título

Foto de perfil no autosserviço: `PUT /api/v1/me/photo` + `DELETE /api/v1/me/photo`

## Size

M

## Estado atual (verificado)

- Upload/remoção de foto existe **só p/ admin**: `PUT`/`DELETE /api/v1/users/:id/photo` (exige `user:update`).
- Use cases `setProfilePhoto`/`removeProfilePhoto` já existem e estão nas deps do auth (`composition.ts`).
- O `meHttpPlugin` ainda **não** recebe essas deps nem tem rotas de foto.
- O parser octet-stream + `magicBytesMatch` + error-maps vivem **locais** no `users-plugin.ts`.

## Escopo

1. **Extrair** para `adapters/http/photo-upload.ts` (DRY): `magicBytesMatch`, `registerPhotoBodyParser(scope)`
   (octet-stream → Buffer, 6 MiB) e os error-maps de foto (set/remove). Refatorar `users-plugin.ts` p/ consumir.
2. **`me-plugin.ts`**: deps ganham `setProfilePhoto`/`removeProfilePhoto`; registrar o parser; rotas
   **`PUT /me/photo`** (octet-stream + `?mimeType=`, allowlist jpeg/png/webp; magic-bytes 422) e
   **`DELETE /me/photo`** — `targetId = req.userId` (self por construção, **sem** `user:update`).
3. **`server.ts`**: passar `setProfilePhoto`/`removeProfilePhoto` ao `meHttpPlugin`.

## Critérios de Aceitação

- **CA1:** `PUT /api/v1/me/photo` (PNG válido, `?mimeType=image/png`) autenticado → **200**; `GET /me` reflete `imageUrl`.
- **CA2:** `PUT /me/photo` sem token → **401** (self exige sessão, mas **não** `user:update`).
- **CA3:** `PUT /me/photo` com `mimeType` fora da allowlist → **422** (`photo-type-unsupported`).
- **CA4:** `PUT /me/photo` com bytes que não casam o mimeType (magic bytes) → **422** (`photo-content-mismatch`).
- **CA5:** `DELETE /api/v1/me/photo` autenticado → **200**.
- **CA6:** sem regressão nas rotas admin de foto (`/users/:id/photo`) após o refactor.

## Fora de Escopo

- Aceitar imagem no `POST /users` (create) — mantém o fluxo create → PUT (ticket marca como opcional).
