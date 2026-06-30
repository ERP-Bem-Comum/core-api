# Request — USR-SEED-PERMISSIONS

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: validação em tela do grid/detalhe de Usuários. Verificado contra `core-api@dev` em 2026-06-09.

## Título
Conceder permissões `user:*` (e `program:*`) ao perfil **admin** no seed de desenvolvimento

## Size
S

## Contexto
Para validar o módulo Gestão de Usuários ponta a ponta (grid, inclusão, detalhe, ativar/desativar) é
preciso um usuário com as permissões de usuário. O admin de dev (`admin@bemcomum.dev`) não as possui.

## Estado atual (verificado)
- `GET /api/v1/users` (e ações de escrita) retornam **403** para o admin de dev — o seed não concede
  `user:list` / `user:read` / `user:create` / `user:update` / `user:activate` / `user:deactivate`.
- Mesmo sintoma em `GET /api/v1/programs` (**403**) → falta `program:*` no seed.
- **Minha Conta** funciona normalmente (é autosserviço via `/api/v1/me`, sem RBAC de `user:*`).

## Pedido ao backend
Incluir no **seed de desenvolvimento** (`AUTH_SEED_JSON`) as permissões do conjunto `USER_PERMISSIONS`
(`user:list`, `user:read`, `user:create`, `user:update`, `user:activate`, `user:deactivate`) — e, no mesmo
movimento, `program:*` — no perfil/admin de dev.
- ⚠️ Não exige reset destrutivo se o seed for idempotente; **evitar** depender de `down -v`.

## Impacto no front (hoje)
- Grid e detalhe de Usuários exibem a tag de erro **"Você não tem permissão para esta ação."** (cadeia de
  erro funcionando: 403 → `forbidden` → i18n). O wiring está pronto; ao conceder as permissões, lista,
  inclusão, detalhe e ativar/desativar passam a funcionar **sem mudança no front**.
- O botão "Adicionar Usuário" e os itens de menu hoje aparecem **sem gate de RBAC** (TODO no código para
  reintroduzir o gate por `user:create`/`user:list` quando o seed conceder as permissões).
