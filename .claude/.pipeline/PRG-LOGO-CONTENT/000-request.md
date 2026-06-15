# 000-request — PRG-LOGO-CONTENT

> Card de origem: `handbook/tickets/todo/PRG-LOGO-CONTENT.md` (handoff do front, 2026-06-10;
> estado revisado 2026-06-15). Branch: `feat/usr-me-photo-display` (continuação, #36).

## Escopo

Servir os **bytes do logo** do programa, que hoje só tem upload (`POST /programs/:id/logo`).
Adotamos a **opção rota de bytes** — idêntica ao padrão recém-entregue `USR-ME-PHOTO-DISPLAY`
(`GET /me/photo`):

- `GET /api/v1/programs/:id/logo` devolve os **bytes** da imagem com o `Content-Type` real
  (`image/png|jpeg|webp`), espelhando `GET /me/photo` e `GET /contracts/:id/documents/:documentId/content`.
- `logoKey` nos payloads de `GET /programs` / `GET /programs/:id` **permanece a chave opaca**
  (sinal de presença: `null` = sem logo → front usa placeholder; não-null → front busca a rota de
  bytes). Mudança **aditiva, sem breaking**.

**Por que rota de bytes (e não presigned URL / `logoUrl`):** padrão idêntico já sancionado no repo
(foto de perfil + documents/content), zero dependência nova, não expõe host/credenciais do storage
ao browser, mesma auth Bearer das demais rotas.

## Mudanças

1. **Port** `LogoStorage` (`src/modules/programs/application/ports/logo-storage.ts`): + `download(key)`
   → `Promise<Result<DownloadedLogo, LogoDownloadError>>`, com `DownloadedLogo = { bytes, contentType }`
   e `LogoDownloadError = 'logo-object-missing' | 'logo-storage-unavailable'` (404 vs 503). Espelha
   `ProfilePhotoStorage` (`src/modules/auth/application/ports/profile-photo-storage.ts:30`).
2. **Adapters**: `logo-storage.s3.ts` (`GetObjectCommand`; `ContentType` do objeto) e
   `logo-storage.in-memory.ts` (bytes + contentType do upload). `NoSuchKey`/`NotFound` →
   `logo-object-missing`; resto → `logo-storage-unavailable`.
3. **Use case** `get-program-logo.ts` (NOVO, application): validar `programId` → fetch program
   (404 `program-not-found`) → sem `logoKey` → `program-logo-not-found` → `storage.download(logoKey)`.
   Read puro, sem evento. Espelha `getProfilePhoto`.
4. **Rota HTTP** `GET /programs/:id/logo` (`plugin.ts`): `requireAuth` + `authorize(PROGRAM_PERMISSION.read)`
   (mesma permissão do `GET /programs/:id`); corpo binário (`reply.header('content-type').send(Buffer.from(bytes))`),
   sem `response` schema (convenção de corpo binário); mapa `LOGO_GET_ERROR_STATUS`
   (`program-not-found`/`program-logo-not-found`/`logo-object-missing` → 404; `logo-storage-unavailable`
   → 503). `Cache-Control: no-store` já vem do hook `onSend` global (toda rota `/api/*`).
5. **`composition.ts` + `server.ts`**: `getProgramLogo` nas deps + wiring (`programReader` + `logoStorage`;
   read-only).

## Decisão de design — criação com logo (2026-06-15)

Avaliada a criação do programa **com o logo num único request no backend** e **descartada**:
`@fastify/multipart` é vetado (ADR-0002, dependências mínimas); "metadados na query" não serve
(`generalCharacteristics` é texto livre potencialmente longo); base64 no JSON exigiria subir o
`bodyLimit` do `POST /programs` de 1 MiB → ~7 MiB (superfície de DoS no endpoint de criação).

**Decisão: o fluxo `create → POST /:id/logo` é o oficial.** A UX "criar com logo num clique" fica no
**front** (duas chamadas encadeadas). Vantagem: se o upload falhar, o programa já existe (logo
editável depois) — sem perder o formulário. Nenhuma mudança no `POST /programs`.

## Fora de escopo

- Criação com logo num único request backend (multipart/base64) — ver "Decisão de design" acima.
- Presigned URL / `logoUrl` renderável; thumbnail/redimensionamento; ETag/cache condicional.
- Qualquer mudança no upload/remoção existentes.

## Critérios de aceitação

1. `GET /programs/:id/logo`, programa **com** logo → **200**, body = bytes idênticos ao upload,
   `Content-Type` = mimetype do upload.
2. `GET /programs/:id/logo`, programa **sem** logo (`logoKey` null) → **404** (`program-logo-not-found`,
   envelope padrão).
3. `GET /programs/:id/logo` exige `PROGRAM_PERMISSION.read` (**403** sem permissão); **404**
   `program-not-found` para programa inexistente; id malformado → **400** na borda.
4. Falha do storage: objeto ausente (`logo-object-missing`) → **404**; indisponibilidade
   (`logo-storage-unavailable`) → **503** padrão — sem vazar detalhes internos; `GET /programs` e
   `/:id` não são afetados.
5. Round-trip de integração S3 (MinIO): upload → download bytes iguais (gated por
   `STORAGE_INTEGRATION=1`, espelhando o teste de `logo-storage.s3`).
6. Gate W3 verde (typecheck + format:check + lint + test) — regressão zero.
