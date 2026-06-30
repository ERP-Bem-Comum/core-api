# W1 — GREEN — USR-ME-PHOTO-DISPLAY

**Data:** 2026-06-11 · **Skill:** ports-and-adapters · **Resultado:** GREEN ✅ (`pnpm test`: 2604 pass / 0 fail)

## Arquivos alterados (src)

1. `src/modules/auth/application/ports/profile-photo-storage.ts` — `download(key)` no port +
   tipos `DownloadedPhoto` e `ProfilePhotoDownloadError` (`photo-object-missing` distinto de
   `photo-storage-unavailable`: 404 vs 503 na borda).
2. `src/modules/auth/adapters/storage/profile-photo-storage.in-memory.ts` — `download` lê o Map
   (bytes + mimeType do upload); ausente → `photo-object-missing`.
3. `src/modules/auth/adapters/storage/profile-photo-storage.s3.ts` — `download` via
   `GetObjectCommand` (`transformToByteArray`; `ContentType` do objeto, gravado no upload);
   `NoSuchKey`/`NotFound` → `photo-object-missing`; resto → `photo-storage-unavailable`.
4. `src/modules/auth/application/use-cases/get-profile-photo.ts` — **NOVO** use case: validar id →
   fetch user (404) → sem ref → `user-photo-not-found` → `storage.download(String(user.photo))`.
   Sem escrita, sem evento (read puro).
5. `src/modules/auth/adapters/http/photo-upload.ts` — `PHOTO_GET_ERROR_STATUS` (mapa de status
   compartilhado me/admin).
6. `src/modules/auth/adapters/http/me-plugin.ts` — dep `getProfilePhoto` + rota
   `GET /me/photo` (requireAuth; corpo binário, sem `response` schema — convenção do
   `documents/:id/content`).
7. `src/modules/auth/adapters/http/users-plugin.ts` — dep + rota `GET /users/:id/photo`
   (`requireAuth` + `authorize('user:read')`, mesma permissão do `GET /users/:id`;
   `userIdParamSchema` → id malformado 400 na borda).
8. `src/modules/auth/adapters/http/composition.ts` — `getProfilePhoto` em `AuthHttpDeps` + wiring
   (`userReader` + `profilePhotoStorage`; sem clock/repo — read-only).
9. `src/server.ts` — passa `getProfilePhoto` aos dois plugins.

## Testes existentes atualizados (consequência do port ampliado)

- 10 arquivos `tests/modules/auth/adapters/http/*.route.test.ts` — dep `getProfilePhoto` nas
  instanciações de `meHttpPlugin`/`usersHttpPlugin` (edit mecânico).
- `tests/modules/auth/application/use-cases/set-profile-photo.test.ts` — `download` no fake do port.

## Decisões de design

1. **`Cache-Control`:** o CA original pedia `private, no-store` no handler; descobrimos que o
   hook `onSend` global do `buildApp` (`src/shared/http/app.ts:174`) já força `no-store` em toda
   rota `/api/*` — política **mais forte** (no-store proíbe qualquer cache, incl. privado).
   Handler não redefine o header; teste CA1b ajustado para exigir a política real; 000-request
   anotado. Não é enfraquecimento: é remoção de redundância contra a política global.
2. **`photo-object-missing` → 404** (não 503): ref órfão (objeto sumiu do storage) é tratado como
   "sem foto" — o front cai no fallback de iniciais em vez de tela de erro (CA-2 do card).
3. **`imageUrl` intocado** nos payloads de `GET /me` / `GET /users/:id` (chave opaca como sinal de
   presença) — mudança 100% aditiva, conforme opção 2 + nota do card.
4. **Sem `response` schema nas rotas GET de foto** (corpo binário) — mesma convenção do
   `GET /contracts/:id/documents/:documentId/content`.

## Prova do verde

```
pnpm test → ℹ tests 2623* · pass 2604 · fail 0 · skipped 17
```

(*total da branch `feat/usr-me-photo-display`, base `origin/dev`.)
