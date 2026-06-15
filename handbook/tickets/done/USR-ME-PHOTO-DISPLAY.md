# Request — USR-ME-PHOTO-DISPLAY

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: tentativa de destravar a **foto de perfil** (Minha Conta / inclusão de usuário) na fatia 024.
> Complementa o `USR-ME-PHOTO.md` (que pediu o **upload** de autosserviço, já entregue no #32).
> Verificado contra `core-api@dev` (commit do #32) em 2026-06-11.

## Título

**Servir a imagem da foto de perfil** (GET por bytes **ou** `imageUrl` renderável) — hoje só há upload

## Size

M

## Contexto

O #32 entregou o **upload/remoção** de foto no autosserviço (`PUT /api/v1/me/photo`, `DELETE /api/v1/me/photo`)
e por admin (`PUT|DELETE /api/v1/users/:id/photo`). O front consegue **enviar** a foto, mas **não consegue
exibi-la** — então a feature de foto fica inútil (o usuário sobe uma imagem que nunca vê) e permanece **gated**
no front (Minha Conta → "Alterar Imagem"; inclusão → "Foto de Perfil").

## Estado atual (verificado)

- `GET /api/v1/me` e `GET /api/v1/users/:id` retornam `imageUrl: string | null`, **mas** o valor é a
  **chave opaca de storage**, não uma URL renderável:
  - `application/use-cases/get-user.ts` → `imageUrl: user.photo === null ? null : String(user.photo)`
    (`user.photo` é um `ProfilePhotoRef`, ex.: `users/<userId>`).
  - persistido em `image_url varchar(1024)` (`adapters/persistence/schemas/mysql.ts`).
- **Não existe rota que sirva os bytes** da foto:
  - `/api/v1/me/photo` e `/api/v1/users/:id/photo` têm **apenas `PUT` e `DELETE`** (nenhum `GET`).
  - o port `ProfilePhotoStorage` (`application/ports/profile-photo-storage.ts`) só tem `upload` e `remove`
    — **sem `read`/`get`/presigned**.
  - o adapter S3/MinIO (`adapters/storage/profile-photo-storage.s3.ts`) implementa só `upload` e `remove`.
- Resultado: o front recebe uma chave que **não dá** para usar em `<img src>`, e não há endpoint para
  buscar os bytes (nem via server function/BFF, pois o core-api não expõe leitura).

## Pedido ao backend

Qualquer **uma** das opções resolve (preferência por #1 ou #2):

1. **`imageUrl` renderável**: transformar `imageUrl` numa **URL pública ou assinada (presigned)** nos
   payloads de `GET /me` e `GET /users/:id` (ex.: `imageUrl: "https://.../users/<id>?X-Amz-..."`). O front
   renderiza direto em `<img src={imageUrl}>`. (Mais simples no front; respeita "token nunca no browser"
   se a URL for assinada/curta.)
2. **Rota de bytes**: `GET /api/v1/me/photo` (e/ou `GET /api/v1/users/:id/photo`) devolvendo os **bytes**
   (`Content-Type` da imagem), espelhando o padrão de `GET .../documents/:id/content` dos contratos. O
   front faz proxy via server function (token server-side) e exibe como Blob URL.
3. (Combinação) manter `imageUrl` como chave **e** prover uma das rotas/URLs acima para resolução.

### Critérios de aceite

1. Dado um usuário com foto, o front consegue **exibir** a imagem (em Minha Conta e no avatar do topo)
   sem expor token no browser.
2. Dado um usuário sem foto (`imageUrl = null`), o front exibe o **fallback de iniciais** (já implementado).
3. A solução vale tanto para o **autosserviço** (`/me`) quanto, idealmente, para o **detalhe admin**
   (`/users/:id`).

## Impacto no front (hoje)

- "Alterar Imagem" (Minha Conta → Editar Perfil) e "Foto de Perfil" (inclusão) seguem **gated**
  (desabilitados, com dica), com o avatar usando **iniciais**.
- Assim que existir exibição (URL renderável ou rota de bytes), o front liga: (a) a **mutation de upload**
  (`PUT /me/photo`, octet-stream — padrão já usado em `attach-signed-document`), (b) o **delete**
  (`DELETE /me/photo`), (c) a **exibição** da imagem com fallback de iniciais, invalidando `['users','me']`.
- A fatia **024** foi reduzida a "municípios cross-state"; a foto volta ao backlog do front assim que este
  ticket for atendido.
