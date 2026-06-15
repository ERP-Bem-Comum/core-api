# Request — PRG-LOGO-CONTENT

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: Gestão de Programas → grid (coluna **Logo**) + telas de **inclusão/detalhe** (campo "Logo do
> Programa"). Verificado contra `core-api@dev` em 2026-06-10.

> ---
> **🔄 Estado verificado no core-api — 2026-06-15** · revisão pós-handoff (conteúdo abaixo = visão do front em 2026-06-09/14).
>
> - **Já implementado:** apenas o **upload** — `POST /api/v1/programs/:id/logo` (octet-stream `image/png|jpeg|webp`, ≤ 5 MiB) em `src/modules/programs/adapters/http/plugin.ts:203`, use case `uploadProgramLogo` (`src/modules/programs/application/use-cases/upload-program-logo.ts`). `GET /programs` e `GET /programs/:id` devolvem só o `logoKey` opaco (`src/modules/programs/adapters/http/schemas.ts:43,57`).
> - **Escopo real restante:** (1) **exibição dos bytes** — não há `GET /programs/:id/logo` (rotas em `plugin.ts` são só GET `/programs`, GET `/programs/:id`, POST create/`:id`/`deactivate`/`reactivate`/`:id/logo`) nem `logoUrl` no payload; o port `LogoStorage` (`src/modules/programs/application/ports/logo-storage.ts`) só tem `upload`/`remove`, **falta `download`**. (2) **criação com logo** — `POST /programs` segue sem binário no corpo (`schemas.ts:83-89`: só `name/sigla/director/generalCharacteristics/logoKey?`); fluxo continua create → `POST /:id/logo`.
>   - **Blueprint a espelhar — USR-ME-PHOTO-DISPLAY** (acabou de implementar exatamente este padrão de "rota de bytes" para foto de perfil em `src/modules/auth/`): use case `getProfilePhoto` em `src/modules/auth/application/use-cases/get-profile-photo.ts` (validar id → fetch → ref nula? 404 → `storage.download(ref)`); rotas que servem o binário via `reply.header('content-type', …).send(Buffer.from(bytes))` em `src/modules/auth/adapters/http/me-plugin.ts:165-179` (`GET /me/photo`) e `src/modules/auth/adapters/http/users-plugin.ts:336-351` (`GET /users/:id/photo`); o port `ProfilePhotoStorage` ganhou `download` (com `DownloadedPhoto = { bytes, contentType }`) e o mapa de status `PHOTO_GET_ERROR_STATUS` (`src/modules/auth/adapters/http/photo-upload.ts:62`, com `*-object-missing` → 404). Replicar 1:1 para o logo: adicionar `download` ao `LogoStorage`, criar `getProgramLogo`, expor `GET /programs/:id/logo`.
> - **Veredito:** PARCIAL (~50% feito) — upload pronto; falta a leitura de bytes (a metade que o front precisa para exibir)
> ---

## Título
Servir a **imagem do logo** do programa (GET por `logoKey`/URL) e, idealmente, aceitar logo na criação

## Size
M

## Contexto
O design mostra o **logo** do programa no grid (coluna Logo) e nas telas de inclusão/detalhe
("Logo do Programa", com ícone de upload). O `GET /programs` e o `GET /programs/:id` retornam `logoKey`.

## Estado atual (verificado)
- Existe **upload**: `POST /api/v1/programs/:id/logo` (octet-stream image/png|jpeg|webp, ≤ 5 MiB) → `{ logoKey }`.
- **Não há GET** que devolva os **bytes** nem uma **URL** renderizável a partir do `logoKey` — então o front
  não consegue **exibir** o logo (só teria a chave opaca).
- O `POST /programs` (criação) **não** aceita o binário do logo no corpo (só `name/sigla/director/
  generalCharacteristics/logoKey?`). O upload é sempre um 2º passo (após criar, com o id).

## Pedido ao backend
1. **Exibição**: uma rota `GET /api/v1/programs/:id/logo` (bytes) **ou** transformar `logoKey` numa **URL**
   pública/assinada no payload (`logoUrl`) do `GET /programs` e `GET /programs/:id`.
2. (Opcional) **Criação com logo**: permitir enviar a imagem junto do create (multipart) ou confirmar o
   fluxo *create → POST /:id/logo* como o oficial.

## Impacto no front (hoje)
- Grid: coluna **Logo** mostra um **placeholder** (ícone de imagem) — não há como renderizar o real.
- Inclusão/Detalhe: o campo **"Logo do Programa"** está **gated** (desabilitado, com ícone de upload) até
  existir exibição + fluxo definido. Ao haver a URL/rota, basta renderizar a imagem e ligar o upload
  (mutation octet-stream → invalidar `['programs']`).
