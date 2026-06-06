# W1 — Impl · AUTH-ME-PERMISSIONS (🟡→🟢)
- domain/authorization/list-permissions.ts: listPermissions(ActiveUser) puro (achata roles, dedup)
- application/use-cases/list-user-permissions.ts: (userReader)(userId)→Result<string[],never>; degradação graciosa (id inválido/user inexistente/inativo → [])
- schemas.ts: meResponseSchema += permissions: string[]
- plugin.ts: GET /me retorna { userId, permissions }
- composition.ts: AuthHttpDeps + makeDeps wiring (listUserPermissions)
Teste /me: 3 pass.
