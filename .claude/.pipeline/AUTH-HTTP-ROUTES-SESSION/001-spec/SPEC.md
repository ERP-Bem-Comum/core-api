# SPEC — Rotas refresh + logout (`AUTH-HTTP-ROUTES-SESSION`, H1b)

> **Tipo:** ticket · **Size:** S · **Épico-pai:** `EPIC-HTTP-CORE-API`
> **Status da spec:** aprovada (2026-05-28, Gabriel)
> **ADRs tocados:** `ADR-0024`, `ADR-0025`, `ADR-0027`, `ADR-0006` · **Reusa** decisões D1–D5 do H1 (aprovadas).

## 1. Problema & contexto

H1a entregou register/login + o composition root com os 4 use cases instanciados. Falta expor `refresh` e
`logout` — o ciclo de sessão completo. Mecânico: 2 rotas no plugin existente + 2 schemas; sem nova decisão.

## 2. User stories

- Como **BFF**, quero `POST /api/v2/auth/refresh` para renovar o access sem novo login.
- Como **BFF**, quero `POST /api/v2/auth/logout` para revogar a sessão (idempotente).

## 3. Critérios de aceitação (testes do W0 — `app.inject`)

- **CA8 refresh-happy** — register → login (captura `refreshToken`) → `POST /refresh {refreshToken}` → **200** `{accessToken, refreshToken, userId}` (3 não-vazios; refresh **rotacionado** ≠ o anterior).
- **CA9 refresh-bad** — `POST /refresh` com token inexistente/garbage → **401**.
- **CA10a logout** — refresh válido → `POST /logout {refreshToken}` → **204** (sem body).
- **CA10b logout-idempotente** — repetir o `/logout` com o mesmo token → **204**.
- **CA11 openapi** — `/docs/json` contém `/api/v2/auth/refresh` e `/api/v2/auth/logout`.
- **CA12 regressão** — register/login (`routes.test.ts`) + shell/baseline verdes.

## 4. Não-objetivos

- AuthZ preHandler (H2); RW split (I1); change-password/assign-role.
- Cookie no browser (BFF, ADR-0005) — tokens no body.

## 5. Clarificações

- Reusa **D1–D5** do H1 (factory de plugin, composition memory/mysql, refresh no body JSON, erro→HTTP, rate-limit). Sem nova ambiguidade.
- **Q:** logout devolve body? · **R:** **204 sem body** (`reply.code(204).send()`); response schema não declarado para 204. (2026-05-28.)

## 6. Plano técnico

```
auth/adapters/http/schemas.ts (+):
  refreshBodySchema = z.object({ refreshToken: z.string() })
  logoutBodySchema  = z.object({ refreshToken: z.string() })
  (response do refresh reusa loginResponseSchema)

auth/adapters/http/plugin.ts (authRoutes, +2 rotas):
  POST /refresh → deps.refreshAccessToken({refreshToken}) → sendResult(200, errors)
  POST /logout  → deps.revokeSession({refreshToken})      → sendResult(204, errors)
```

- **Erro→HTTP refresh:** `refresh-token-not-found|revoked|rotated|expired`→401; `user-disabled`→403; resto→500.
- **Erro→HTTP logout:** `refresh-token-repo-unavailable`→500; sucesso→204.
- Sem tocar composition/server/public-api (já prontos do H1a).

## 7. Constitution check

| Fonte | Exigência | Como adere |
| :-- | :-- | :-- |
| `ADR-0025` / `ADR-0027` | HTTP adapter; Zod borda; OpenAPI gerado | 2 rotas em `adapters/http/`; 2 schemas; 2 paths no `/docs/json` |
| `ADR-0024` / DD-SESSION-04/05/06 | refresh valida user ativo, rotação, revoke idempotente | use cases já implementam; rota só traduz Result→HTTP |
| `ADR-0006` | plugin não conhece adapters | reusa `AuthHttpDeps` (use cases instanciados) |

## 8. Riscos & mitigações

| Risco | Sev. | Mitigação |
| :-- | :-- | :-- |
| `refresh` rotacionar e o teste comparar token igual | baixa | CA8 asserta refresh novo ≠ anterior |
| 204 com body acidental | baixa | `reply.code(204).send()` sem payload; sem response schema 204 |
| Regressão em register/login | baixa | CA12 roda `routes.test.ts` |

## 9. Definition of Done

- [ ] CA8–CA12 verdes (W0→W3).
- [ ] 4 rotas auth completas; `/docs/json` com as 4.
- [ ] `pnpm test`/`typecheck`/`format`/`lint` verdes; sem dep nova; sem tocar composition/server.
