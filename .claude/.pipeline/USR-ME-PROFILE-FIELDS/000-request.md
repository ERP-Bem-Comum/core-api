# Request — USR-ME-PROFILE-FIELDS

> Origem: handbook/tickets `USR-ME-PROFILE-FIELDS` (handoff front). **Decisão de produto** tomada em
> sessão 2026-06-10: **só e-mail editável** no autosserviço; **CPF imutável** (só admin altera via
> `PUT /users/:id`). Razão: e-mail é credencial/dado de contato editável; CPF é identidade fiscal.

## Título

Permitir editar **e-mail** no autosserviço (`PUT /api/v1/me`); manter **CPF imutável**

## Size

S

## Estado atual (verificado)

- `meUpdateBodySchema = { name?, telephone? }` — `PUT /me` ignora `email`/`cpf`.
- O use case `updateUserProfile` **já aceita** `email` (e `cpf`): valida VO de e-mail e unicidade
  (`email-already-registered`). O `PUT /users/:id` (admin) já expõe isso.
- O mapeamento de erro do `PUT /me` já lista `email-already-registered: 409` (preparado), mas faltam os
  status dos erros de VO de e-mail (422) e o campo no schema/handler.

## Escopo

1. `users-schemas.ts`: adicionar `email` (opcional) ao `meUpdateBodySchema`. **Não** adicionar `cpf`.
2. `me-plugin.ts`: extrair `email` do body e repassar ao `updateUserProfile`; incluir os erros de VO de
   e-mail (`email-empty`/`email-invalid-format`/`email-too-long` → 422) no mapa de status.
3. Atualizar o comentário do schema (deixa de ser "restrito a name/telephone").

## Critérios de Aceitação

- **CA1:** `meUpdateBodySchema` aceita `email` (string) e **não** aceita `cpf` (campo é descartado).
- **CA2:** `PUT /me` com `email` válido → **200**; `GET /me` reflete o novo e-mail.
- **CA3:** `PUT /me` com e-mail malformado → **422** (`email-invalid-format`).
- **CA4:** `PUT /me` com e-mail já usado por outro usuário → **409** (`email-already-registered`).
- **CA5:** `PUT /me` com `cpf` no body **não** altera o CPF (campo imutável no autosserviço).

## Fora de Escopo

- Edição de CPF no autosserviço (decisão: imutável — só admin).
- Fluxo de re-verificação de e-mail (não existe no projeto; troca é direta, como no `PUT /users/:id`).
