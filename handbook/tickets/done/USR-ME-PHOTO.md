# Request — USR-ME-PHOTO

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: Gestão de Usuários → **Minha Conta** → Editar Perfil → **"Alterar Imagem"**; também no
> form de **inclusão** ("Foto de Perfil"). Verificado contra `core-api@dev` em 2026-06-09.

## Título
Endpoint de **foto de perfil no autosserviço** (`/api/v1/me/photo`)

## Size
M

## Contexto
O design prevê **foto de perfil** tanto na inclusão de usuário quanto na própria conta (botão
"Alterar Imagem"). O `GET /me` e o `GET /users/:id` já retornam `imageUrl`.

## Estado atual (verificado)
- Existe upload/remoção de foto **só para admin por id**: `PUT /api/v1/users/:id/photo` (octet-stream +
  `?mimeType=`) e `DELETE /api/v1/users/:id/photo` (spec 005 US6).
- **Não há** rota de autosserviço `/api/v1/me/photo` — o próprio usuário não consegue trocar a foto sem a
  permissão administrativa `user:update` sobre o próprio id.
- O `POST /api/v1/users` (criação) **não** aceita foto no corpo (só `name/cpf/email/telephone`); a foto é
  sempre um 2º passo (PUT após criar).

## Pedido ao backend
1. **`PUT /api/v1/me/photo`** (octet-stream + `?mimeType=`, allowlist image/jpeg|png|webp → 422) e
   **`DELETE /api/v1/me/photo`**, espelhando as rotas de `/users/:id/photo`, mas com o id derivado da
   sessão (sem exigir `user:update`).
2. (Opcional) Confirmar o fluxo de foto na **inclusão**: como o `POST /users` não recebe imagem, o front
   faria *create → PUT photo*. Se preferirem aceitar a imagem no create, avisar.

## Impacto no front (hoje)
- "Alterar Imagem" (Editar Perfil) e "Foto de Perfil" (inclusão) estão **gated** (desabilitados, com dica).
- O avatar usa **iniciais** do nome enquanto não há `imageUrl`/upload.
- Com a rota, basta ligar o picker a uma mutation de upload (octet-stream) + invalidar `['users','me']`.
