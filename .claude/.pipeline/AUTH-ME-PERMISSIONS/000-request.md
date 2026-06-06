# AUTH-ME-PERMISSIONS — /me expõe permissões do usuário (pedido P1 do front)

Size: M · Módulo: auth. O front precisa das permissões para o `can()` (mostrar/ocultar ações de
escrita); hoje GET /api/v2/auth/me = { userId } só (JWT não carrega permissões). Decisão: estender o
/me (não inchar o JWT) → { userId, permissions: string[] }. O backend já resolve permissões no
authorize (userReader + ActiveUser.roles); só falta um caminho de LEITURA + expor no /me.

## Escopo
- domínio: helper puro listPermissions(ActiveUser): readonly Permission[] (achata roles, dedup)
- application: use-case listUserPermissions(deps:{userReader})(userId) → Result<string[], _>
- schema: meResponseSchema += permissions: z.array(z.string())
- plugin: /me retorna { userId, permissions }
- wiring: AuthHttpDeps + makeDeps

## CAs: /me sem auth→401; operador→200 com suas permissões; user sem roles→200 permissions:[] (degradação graciosa).
