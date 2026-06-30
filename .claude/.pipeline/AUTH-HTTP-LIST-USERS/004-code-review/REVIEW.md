# W2 — Code Review (read-only) — AUTH-HTTP-LIST-USERS

**Wave:** W2 · **Outcome:** APPROVED · **Round:** 1 · **Data:** 2026-06-07

| Item | Veredito |
|------|----------|
| Borda HTTP: plugin encapsulado, type-provider zod-openapi, preHandler [requireAuth, authorize] (espelha supplier-plugin) | ✅ |
| RBAC fail-closed (`authorize('user:list')`); 401 sem token, 403 sem permissão | ✅ |
| `sendResult` mapeia erros; `inactive→disabled` na borda; `exactOptionalPropertyTypes` (search omitido) | ✅ |
| Adapter Drizzle: `Result` na borda (try/catch); projeção explícita (não vaza password_hash/cpf); LIKE CI; sem features proibidas (ADR-0020) | ✅ |
| Índice `auth_user_name_idx` (ORDER BY); migration gerada por `db:generate:auth` | ✅ |
| Driver mysql liga o **Drizzle real** (não stub) — `handle` disponível na composition | ✅ |
| ADR-0006: `public-api` é o único ponto de import; domínio não conhece Fastify | ✅ |

## Observações
- Validação de querystring retorna 400 (padrão do projeto), não 422 — alinhado a collaborators/acts.
- `name` null: usuários sem perfil não aparecem em busca por nome (correto; LIKE em NULL = false).
- Permission `user:list` provisória (consolidar com `006`); `Permission.parse('user:list')` válido (formato resource:action).

**Resultado:** APPROVED.
