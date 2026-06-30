# W1 — Implementação mínima · AUTH-ROLE-NAME-VO

**Agente:** ts-domain-modeler · **Outcome:** GREEN ✅

## Arquivo

`src/modules/auth/domain/authorization/role-name.ts` — VO branded + smart constructor.

- `RoleName = Brand<string, 'RoleName'>`; `RoleNameError = 'role-name-invalid'`.
- `normalize(raw)` = `trim()` + `replace(/\s+/g, ' ')` (colapsa espaços).
- `create(raw)` valida não-vazio + `≤ 64` (alinhado a `auth_role.name varchar(64)`); retorna `Result`.
- Module-as-namespace; ASCII puro; imports relativos espelhando `permission.ts`.

## Prova de GREEN

```
node --experimental-strip-types --test tests/.../role-name.test.ts
→ tests 9 · pass 9 · fail 0
```

YAGNI: sem unicidade (regra de repo), sem integração no agregado (T008/`AUTH-ROLE-LIFECYCLE-AGG`).
