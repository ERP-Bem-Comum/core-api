# W1 — Implementação · AUTH-HTTP-PHOTO

**Agente:** fastify-server-expert · **Outcome:** GREEN

## Mudanças

- `adapters/http/users-schemas.ts` — `uploadPhotoQuerySchema` (mimeType validado no use case → 422).
- `adapters/http/users-plugin.ts` — parser `application/octet-stream` (buffer, 6 MiB) no escopo;
  helper `magicBytesMatch` (JPEG/PNG/WebP); rotas `PUT`/`DELETE /users/:id/photo` (`user:update`,
  rate-limit de escrita); resposta 200 = detalhe (reusa `getUser`).
- `adapters/storage/profile-photo-storage.s3.ts` (novo) — adapter S3/MinIO (PutObject/DeleteObject).
- `adapters/http/composition.ts` — `profilePhotoStorage` nos stores (memory → in-memory; mysql → S3 via
  env `S3_*` com fallback in-memory seguro); `setProfilePhoto`/`removeProfilePhoto` nos deps.
- `src/server.ts` + 6 testes irmãos — novo shape de `UsersHttpDeps`.

## Verde

```
photo route: tests 7 · pass 7
suite completa: 2393 pass · 0 fail
```

CA1 (401) · CA2 (403) · CA3 (upload 200) · CA4 (mime 422) · CA5 (magic bytes 422) · CA6 (delete 200) · CA7 (404).

## Pendência (não-bloqueante)

Cobertura de foto via coleção Bruno (multipart binário) exige asset JPEG versionado + validação da
sintaxe `body:file` do bru CLI — agrupada com a integração MinIO real (T044, opt-in). A borda já é
coberta E2E pelo teste `inject`.
