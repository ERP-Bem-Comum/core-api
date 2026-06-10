# W1 — Implementação (GREEN)

**Ticket:** USR-ME-PROFILE-FIELDS · **Wave:** W1 · **Outcome:** GREEN

## Arquivos

| Arquivo | Mudança |
| --- | --- |
| `src/modules/auth/adapters/http/users-schemas.ts` | `meUpdateBodySchema` ganha `email?`; comentário atualizado (CPF imutável documentado) |
| `src/modules/auth/adapters/http/me-plugin.ts` | handler repassa `email` ao `updateUserProfile`; `PROFILE_VALIDATION_STATUS` ganha os erros de VO de e-mail (422) |

## Design (mínimo)

- Reusa o use case `updateUserProfile`, que **já** valida e-mail (VO) + unicidade (`email-already-registered`).
  Nada de novo na application/domain — só o wiring na borda HTTP.
- `cpf` deliberadamente **não** entra no schema (decisão de produto: imutável no autosserviço). O teste CA5
  trava regressão.
- `email-already-registered: 409` já constava no mapa de erro do `PUT /me` (preparado) — agora exercido.

## Evidência GREEN

```
✔ CA1 aceita email   ✔ CA5 descarta cpf
✔ CA2 PUT /me altera email -> 200; GET reflete
✔ CA3 email malformado -> 422   ✔ CA4 email de outro -> 409
ℹ tests 5  ℹ pass 5  ℹ fail 0
```
