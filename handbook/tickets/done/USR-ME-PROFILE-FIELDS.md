# Request — USR-ME-PROFILE-FIELDS

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: módulo Gestão de Usuários → **Minha Conta** → modal **Editar Perfil**. Verificado contra
> `core-api@dev` em 2026-06-09.

## Título
Permitir editar **CPF** e **E-mail** no autosserviço (`PUT /api/v1/me`) — ou confirmar que são imutáveis

## Size
S

## Contexto
O design de "Editar Perfil" (print do legado) mostra **4 campos editáveis**: Nome, CPF, E-mail, Telefone.

## Estado atual (verificado)
- `PUT /api/v1/me` aceita **apenas** `name` e `telephone` (`meUpdateBodySchema = { name?, telephone? }`).
- `GET /api/v1/me` **retorna** `cpf` e `email` (e `imageUrl`, `active`, `massApprovalPermission`,
  `collaboratorId`), mas não há como alterá-los pelo autosserviço.
- O `PUT /api/v1/users/:id` (admin) **aceita** `cpf` e `email` — ou seja, a edição existe para admin, não
  para o próprio usuário.

## Pedido ao backend
Definir a regra de produto e, se for o caso, **incluir `cpf` e/ou `email` no `meUpdateBodySchema`**
(`PUT /me`), com as mesmas validações de VO já usadas no `PUT /users/:id` (cpf/email inválido → 422;
`email-already-registered` → 409). Se a decisão for mantê-los imutáveis no autosserviço, basta confirmar
para documentarmos como definitivo.

## Impacto no front (hoje)
- No modal Editar Perfil, **Nome e Telefone** são editáveis e salvam (`PUT /me`); **CPF e E-mail** ficam
  **somente-leitura (desabilitados)**.
- Quando o backend aceitar os campos, basta habilitar os inputs e incluí-los no payload de `updateMe`.
