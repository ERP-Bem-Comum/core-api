# 000-request — USR-ME-PHOTO-DISPLAY

> Card de origem: `handbook/tickets/todo/USR-ME-PHOTO-DISPLAY.md` (handoff do front, 2026-06-11).
> Branch: `feat/usr-me-photo-display` (a partir de `feat/backlog-residual-sdd`).

## Escopo

Servir a **imagem da foto de perfil** que hoje só tem upload/remoção (entregue no #32 —
`USR-ME-PHOTO`). Das 3 opções do card, adotamos a **opção 2 — rota de bytes**:

- `GET /api/v1/me/photo` (autosserviço) e `GET /api/v1/users/:id/photo` (admin) devolvem os
  **bytes** da imagem com o `Content-Type` real (`image/png|jpeg|webp`), espelhando o padrão
  já existente de `GET /contracts/:id/documents/:documentId/content`
  (`src/modules/contracts/adapters/http/plugin.ts:709`).
- `imageUrl` nos payloads de `GET /me` / `GET /users/:id` **permanece a chave opaca** (sinal de
  presença: `null` = sem foto → front usa fallback de iniciais; não-null → front busca a rota de
  bytes via server function). Mudança aditiva, sem breaking.

**Por que a opção 2 (e não presigned URL):** padrão idêntico já sancionado no repo
(documents/content), zero dependência nova (`@aws-sdk/s3-request-presigner` não entra), não expõe
host/credenciais do storage ao browser, mesma auth Bearer das demais rotas (o front declarou no
card que faz proxy por server function — CA 1 "sem token no browser" atendido).

## Mudanças

1. **Port** `ProfilePhotoStorage` (`src/modules/auth/application/ports/profile-photo-storage.ts`):
   + `download(key) → Promise<Result<{ bytes: Uint8Array; contentType: string }, ProfilePhotoStorageError>>`
   (erro distinto para não-encontrado — seguir o shape de erro existente do port).
2. **Adapters**: `profile-photo-storage.s3.ts` (GetObjectCommand; `ContentType` do objeto, gravado
   no upload) e `profile-photo-storage.in-memory.ts` (guardar bytes+contentType no upload).
3. **Use case** de leitura da foto (application, auth): resolve usuário → sem foto → erro
   `user-photo-not-found`; com foto → download pela chave.
4. **Rotas HTTP**:
   - `GET /api/v1/me/photo` — auth obrigatória (mesmo guard do `PUT /me/photo`); 200 bytes +
     `Content-Type`; `Cache-Control: no-store` **já vem do hook `onSend` global** do `buildApp`
     (`src/shared/http/app.ts` — toda rota `/api/*`; revisado em W1: não redefinir no handler);
     404 se usuário sem foto ou objeto ausente no storage.
   - `GET /api/v1/users/:id/photo` — mesma permissão de leitura do `GET /users/:id` (`user:read`);
     404 usuário inexistente/sem foto.
5. **Docs**: `docs/05-frontend-api-handoff.md` (§2.2 Minha Conta e §2.3 Usuários) com as 2 rotas
   novas + semântica do `imageUrl` (chave opaca como sinal de presença).

## Fora de escopo

- Presigned URLs / `imageUrl` renderável (opção 1) — não entra.
- Redimensionamento/thumbnail, ETag/cache condicional.
- Qualquer mudança no upload/remoção existentes.

## Critérios de aceitação

1. `GET /api/v1/me/photo` com usuário **com** foto → **200**, body = bytes idênticos ao upload,
   `Content-Type` = mimetype do upload.
2. `GET /api/v1/me/photo` com usuário **sem** foto → **404** (envelope de erro padrão).
3. `GET /api/v1/users/:id/photo` exige `user:read` (403 sem permissão); 404 para usuário
   inexistente ou sem foto; 200 bytes para usuário com foto.
4. Falha do storage (objeto sumiu / erro S3) → **404** para chave inexistente e **503/502 padrão**
   para indisponibilidade — sem vazar detalhes internos; listagem/`GET /me` não são afetados.
5. Round-trip de integração S3 (MinIO): upload → download bytes iguais (gated por
   `STORAGE_INTEGRATION=1`, espelhando `profile-photo-storage.s3.integration.test.ts`).
6. Gate W3 verde (typecheck + format:check + lint + test) — regressão zero.
