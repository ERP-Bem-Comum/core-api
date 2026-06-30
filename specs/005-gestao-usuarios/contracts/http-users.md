# Contrato HTTP — Gestão de Usuários (`/api/v1`)

Borda Fastify + Zod/OpenAPI (ADR-0025/0027/0028), sob `src/modules/auth/adapters/http`. Todas as rotas
administrativas exigem sessão + permission correspondente (fail-closed, FR-014); `/me/*` exige só sessão.

> Schemas descritos em alto nível; a forma Zod canônica é definida na implementação (W1). Erros seguem o
> envelope de erro padrão do projeto (problem+json), com `Result<T,E>` mapeado na borda.

## Administração

### `GET /api/v1/users`

- **Query**: `page` (int ≥ 1, default 1), `pageSize` (5|10|25, default 5), `search` (string?, parcial/CI), `status` (`active`|`inactive`|`all`, default `all`).
- **200**: `{ items: UserListItem[], meta: { currentPage, pageSize, totalItems, totalPages } }`.
- `UserListItem`: `{ id, name, email, status }`.
- **Permission**: `user:list`.

### `GET /api/v1/users/:id`

- **200**: `{ id, name, email, cpf, telephone, imageUrl|null, active, massApprovalPermission, collaboratorId|null }`
  - `cpf`/`telephone` retornam normalizados (dígitos); formatação é do cliente.
  - `massApprovalPermission` e `collaboratorId` são **read-only**.
- **404**: usuário inexistente (sem vazar dados).
- **Permission**: `user:read`.

### `POST /api/v1/users`

- **Body**: `{ name, cpf, email, telephone, photo?: <upload|ref> }`.
- **201**: `{ id }` — criado **ativo**, sem senha; dispara convite de ativação por email.
- **409**: email já em uso.
- **422**: validação por campo (`name`/`email` obrigatórios; `cpf`/`email`/`telephone` formato).
- **Permission**: `user:create`.

### `PUT /api/v1/users/:id`

- **Body**: campos de perfil editáveis. Atômico.
- **200**: detalhe atualizado · **409**: conflito de email · **422**: validação.
- **Permission**: `user:update`.

### `PATCH /api/v1/users/:id/activate` · `PATCH /api/v1/users/:id/deactivate`

- **200**: idempotente em relação ao status-alvo.
- **422**: tentativa de auto-desativação (proteção de lockout).
- **Permission**: `user:activate` / `user:deactivate`.

### `PUT /api/v1/users/:id/photo` · `DELETE /api/v1/users/:id/photo`

- **PUT body**: multipart imagem (`image/jpeg|png|webp`, ≤ limite definido).
- **200**: detalhe com nova `imageUrl` · **422**: tipo/tamanho inválido.
- **Permission**: `user:update`.

## Autosserviço (Minha Conta)

### `GET /api/v1/me` · `PUT /api/v1/me`

- Lê/edita o **próprio** perfil; nega edição de terceiros (não-self) com 403.
- **Permission**: apenas sessão válida (self).

### `POST /api/v1/me/password-reset`

- Inicia redefinição de senha reusando `request-password-reset` do `auth`.
- **202**: aceito (fluxo de email assíncrono).

## Notas de contrato

- Versionado sob `/api/v1`; nenhuma rota existente do `auth` é alterada.
- Nomes de permission (`user:*`) são **provisórios** — alinhar com `006-gestao-acessos`.
