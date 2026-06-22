# FIN-APPROVER-LISTING — GET /api/v1/approvers (lado pendente de #148)

> Follow-up F2 do épico Lançar Documento (#64). Decisão: "não abrir issues, resolver tudo". Size **S**. Módulo **auth**.

## Escopo
Listar usuários ATIVOS com `payable:approve` p/ o front popular o dropdown "Aprovador" (o `approverRef` no create já existe — ticket FIN-CREATE-APPROVER).

- `UserQuery.listByPermission(permission)` (port) + impls in-memory (via `listPermissions` sobre roles) e drizzle (join user→role→permission, DISTINCT, ORDER BY name).
- Plugin **separado** `approversHttpPlugin` (aditivo — evita mudar a assinatura de `UsersHttpDeps`, 10 callers): `GET /api/v1/approvers`, gate `user:list`, projeção `{id,name,email}`.
- Wiring: `buildAuthHttpDeps` expõe `listUsersByPermission`; `server.ts` registra; public-api exporta.

## CA
- CA1 401 sem token; CA2 403 sem `user:list`; CA3 200 → só usuários com `payable:approve`.

## Fora de escopo
- Permissão dedicada mais estreita que `user:list` (default razoável; follow-up se a P.O. quiser).
