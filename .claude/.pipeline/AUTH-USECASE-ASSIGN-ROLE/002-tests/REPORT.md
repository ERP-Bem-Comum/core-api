# W0 (RED) — AUTH-USECASE-ASSIGN-ROLE

**Skill:** `tdd-strategist` · **Resultado:** RED (módulo inexistente)

## Teste escrito

`tests/modules/auth/application/use-cases/assign-role.test.ts` — `makeCtx` (userStore + roleStore + register +
assign); `makeRole(name, perms)` constrói `Role` via `Role.create`; `makeAuthorizedActor` dá ao ator a permissão
`user:assign-role` no arrange (`Role.create` + `User.assignRole` + save).

| Caso | Cobre |
| :-- | :-- |
| CA1 | ator autorizado + target ativo + role existe → `ok`, `RoleAssigned`, target passa a ter o role |
| CA2 | ator sem permissão → `forbidden`; target não muda |
| CA3 | ator inexistente → `forbidden` |
| CA4 | ator disabled → `forbidden` |
| CA5 | target inexistente → `user-not-found` |
| CA6 | target disabled → `user-disabled` |
| CA7 | role inexistente → `role-not-found` |
| CA8 | atribuir role já possuído → `ok`, sem duplicar |

## Saída RED

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../use-cases/assign-role.ts'
ℹ tests 1 · pass 0 · fail 1
```

## Handoff para W1 (`ports-and-adapters`)

Criar `src/modules/auth/application/use-cases/assign-role.ts` conforme `000-request.md`/DD-USER-07. Authz do
ator (fail-closed → `forbidden`), `Permission.parse('user:assign-role')`, `authorize`, carregar target+role,
`User.assignRole`, save. `Clock.now()`; sem `throw`/`class`. Lint antecipado.
