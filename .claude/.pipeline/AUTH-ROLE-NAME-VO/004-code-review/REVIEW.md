# W2 — Code Review (read-only) · AUTH-ROLE-NAME-VO

**Agente:** code-reviewer · **Veredito:** APPROVED ✅ (round 1)

## Checklist

| Critério | Status |
| --- | --- |
| Domínio puro (sem classe, sem `throw`, `Result<T,E>`) | ✅ `create` retorna `Result`; nunca lança |
| Branded type via `Brand<>` central (`src/shared/primitives/brand.ts`) | ✅ `Brand<string, 'RoleName'>` |
| Erro string-literal EN kebab-case | ✅ `'role-name-invalid'` |
| Cast único e auditado na borda | ✅ um `as RoleName`, comentado |
| Module-as-namespace; imports `.ts`; `import type` p/ tipos | ✅ espelha `permission.ts` |
| ASCII puro (strip-types) | ✅ |
| YAGNI — sem unicidade/integração de agregado fora de escopo | ✅ deferido a T008 |
| Idioma: código EN, doc PT | ✅ |

## Observações

- Limite 64 acoplado a `auth_role.name varchar(64)` — coerência domínio↔schema correta.
- Normalização (`\s+ → ' '`) idempotente; comprimento medido após normalizar (CA4 coberto).

Sem issues. Aprovado para W3.
