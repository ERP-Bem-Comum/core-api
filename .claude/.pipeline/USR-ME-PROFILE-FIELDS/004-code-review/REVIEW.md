# W2 — Code Review (read-only)

**Ticket:** USR-ME-PROFILE-FIELDS · **Wave:** W2 · **Round:** 1 · **Veredito:** APPROVED

## Escopo revisado

- `src/modules/auth/adapters/http/users-schemas.ts` — `email?` no `meUpdateBodySchema`.
- `src/modules/auth/adapters/http/me-plugin.ts` — wiring + status de erro de e-mail.
- `tests/modules/auth/adapters/http/me-profile-email.route.test.ts` — novo.

## Checklist

| Item | Status |
| --- | --- |
| Reusa use case existente (sem regra nova na application/domain) | ✅ |
| CPF imutável no `/me` honrado (não entra no schema; CA5 trava) | ✅ |
| Erros de VO de e-mail mapeados (422) + unicidade (409) coerentes com `PUT /users/:id` | ✅ |
| Patch parcial preservado (`...(email !== undefined ? ...)`) | ✅ |
| Self por construção (opera em `req.userId`, sem `:id`) — sem novo vetor de acesso | ✅ |
| Idioma EN/PT correto; sem `any`/`throw` na borda | ✅ |

## Segurança

- Decisão de produto registrada: e-mail editável (credencial/contato), **CPF imutável** (identidade fiscal).
  Sem fluxo de re-verificação de e-mail — consistente com o `PUT /users/:id` já existente (não é regressão
  introduzida aqui; é a política vigente do projeto).
- Unicidade de e-mail (409) evita colisão entre contas. Conflito só com OUTRO usuário (mesmo e-mail = no-op).

## Evidência

```
typecheck: 0 errors · eslint (3 arquivos): exit 0
me-account.route.test.ts (regressão do /me): tests 6 · pass 6 · fail 0
```

Sem issues. Aprovado para W3.
