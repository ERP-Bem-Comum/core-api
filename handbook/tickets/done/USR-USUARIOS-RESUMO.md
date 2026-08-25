# Handoff Front → Core-API — Gestão de Usuários (resumo em texto)

> Resumo único para o tech lead, em **texto corrido** (sem tabela). Verificado contra `core-api@dev` em
> 2026-06-09 durante a validação em tela do novo módulo **Gestão de Usuários** (web-app v2), que cobre os
> slices **Usuários** (grid + inclusão + detalhe) e **Minha Conta**. Cada item abaixo tem um ticket
> próprio nesta pasta (padrão `000-request.md`).

## O que já está pronto e ligado ao backend

O módulo consome as rotas reais do core-api: o grid usa `GET /api/v1/users` (com filtros `search`/`status`
e paginação `page`/`pageSize` ∈ {5,10,25}); a inclusão usa `POST /api/v1/users` `{name,cpf,email,telephone}`
(com modal de confirmação antes de enviar); o detalhe usa `GET /api/v1/users/:id`, a edição inline usa
`PUT /api/v1/users/:id`, e ativar/desativar usa `PATCH /api/v1/users/:id/{activate|deactivate}`. O slice
**Minha Conta** usa `GET/PUT /api/v1/me` e `POST /api/v2/auth/change-password`. Toda a cadeia de erro é por
tag i18n (a UI nunca olha status HTTP); 403 vira "Você não tem permissão para esta ação." e o fluxo de
troca de senha, ao receber 204, faz logout automático (o backend revoga todas as sessões) e redireciona
para o login.

## Pendências de backend (4)

**1. USR-SEED-PERMISSIONS — permissões `user:*` (e `program:*`) no seed do admin.** Hoje o admin de dev
recebe **403** em `GET /api/v1/users` e nas ações de escrita, e também em `GET /api/v1/programs`. Isso
impede validar o grid/detalhe de Usuários ponta a ponta. Pedido: incluir o conjunto `USER_PERMISSIONS`
(list/read/create/update/activate/deactivate) e `program:*` no `AUTH_SEED_JSON` do admin, de forma
idempotente (sem depender de reset destrutivo `down -v`). A **Minha Conta** não depende disso — é
autosserviço via `/me`. O wiring do front já está pronto; concedidas as permissões, tudo funciona sem
mudança no front.

**2. USR-ME-PROFILE-FIELDS — CPF e E-mail no autosserviço.** O design de "Editar Perfil" mostra 4 campos
editáveis, mas o `PUT /api/v1/me` só aceita `name` e `telephone` (o `PUT /users/:id` de admin aceita cpf e
email). Pedido: decidir a regra de produto e, se for o caso, incluir `cpf`/`email` no `meUpdateBodySchema`
com as validações de VO já existentes (cpf/email inválido → 422, `email-already-registered` → 409); ou
confirmar que são imutáveis no autosserviço. Hoje o front deixa CPF e E-mail **somente-leitura** no modal.

**3. USR-ME-PHOTO — foto de perfil no autosserviço.** Existe upload/remoção de foto só por admin
(`PUT/DELETE /api/v1/users/:id/photo`); não há `/api/v1/me/photo`, e o `POST /users` não aceita imagem no
corpo. Pedido: criar `PUT/DELETE /api/v1/me/photo` (octet-stream + `?mimeType=`, allowlist image/jpeg|png|
webp) com o id derivado da sessão. Hoje "Alterar Imagem" (Minha Conta) e "Foto de Perfil" (inclusão) estão
**gated**; o avatar usa as iniciais do nome.

**4. USR-PASSWORD-POLICY — alinhar a política de senha.** O checklist do modal "Redefinir Senha" (design:
mín 8 / **máx 15** + maiúscula/minúscula/número/símbolo) é **mais rígido** que a policy do core-api (mín 8
/ **máx 128**, **sem** complexidade, **com** blocklist de senhas comuns). Como é mais rígido, não bloqueia
(toda senha aprovada no client é aceita no backend), mas há duas fontes da verdade. Pedido: definir a
política canônica — implementar a do design no backend, **ou** confirmar a atual para ajustarmos o
checklist do front — e, idealmente, expor a policy de forma consumível (ex.: `GET /auth/password-policy`).
O backend tem ainda a blocklist (`password-too-common`) que o checklist não mostra; o front a trata como
tag `password-weak` ("Senha muito comum ou fraca").

## Notas de modelagem (para validar)

O **"Aprovador em Massa"** é **read-only** no autosserviço/detalhe: o backend o expõe como
`massApprovalPermission` derivado dos papéis de acesso (não é setável na criação nem na edição). O front
exibe como informação somente-leitura (e gated no form de inclusão). Se a intenção for torná-lo editável,
seria preciso uma rota/decisão de produto — hoje está correto como somente-leitura.
