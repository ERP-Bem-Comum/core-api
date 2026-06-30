# SPEC — preHandler authn + rota protegida (`AUTH-HTTP-AUTHZ-HOOK`, H2)

> **Tipo:** ticket · **Size:** S · **Épico-pai:** `EPIC-HTTP-CORE-API`
> **Status da spec:** aprovada (2026-05-28, Gabriel)
> **ADRs tocados:** `ADR-0024` (RBAC), `ADR-0025`, `ADR-0005` (defense-in-depth sobre o BFF), `ADR-0006`/`0028`, `ADR-0027`

## 1. Problema & contexto

As rotas auth (H1) são públicas. Para proteger rotas (agora e nos outros módulos) o core precisa **verificar
o access JWT** (defense-in-depth — o BFF já valida, mas o core não confia cegamente) e expor a identidade ao
handler, com `authorize(permission)` para RBAC. Entrega o mecanismo + uma rota protegida real (`/me`) que o prova.

## 2. User stories

- Como **BFF/cliente**, quero `GET /api/v2/auth/me` com `Authorization: Bearer <jwt>` e receber a identidade, para confirmar a sessão.
- Como **autor de rota protegida (futuro)**, quero um `requireAuth` + `authorize(permission)` reutilizáveis, para proteger endpoints sem reimplementar verificação.

## 3. Critérios de aceitação (testes do W0 — `app.inject`)

- **CA1 me-happy** — register → login (captura `accessToken`) → `GET /me` com `Authorization: Bearer <accessToken>` → **200** `{ userId }` (= sub do token).
- **CA2 me-no-token** — `GET /me` sem header `Authorization` → **401**.
- **CA3 me-bad-token** — `Authorization: Bearer garbage` (ou expirado) → **401**.
- **CA4 authz** — `authorize(activeUserSemPermissao, permission)` → `err('forbidden')`; o helper de borda mapeia `forbidden`→**403** (teste unit do mapeamento).
- **CA5 openapi** — `/docs/json` contém `/api/v2/auth/me` com security scheme bearer documentado.
- **CA6 regressão** — register/login/refresh/logout verdes; shell/baseline verdes.

## 4. Não-objetivos / fora de escopo

- Rotas protegidas por permissão específica (change-password/assign-role HTTP) → fase posterior (consomem o `authorize` exposto aqui).
- RW split (I1). Revogação de access token (JWT é stateless até expirar — refresh cobre).

## 5. Clarificações (decisões a avalizar)

- **D1 — Escopo:** H2 entrega **authn** (`requireAuth` + `GET /me`) + **expõe** `authorize`/`requireAuth` para reuso; **não** cria rota protegida por permissão (sem caso real ainda). O `authorize`→403 é coberto por teste unit (CA4). *(Recomendado: prova authn com rota real, sem sentinela de permissão.)*
- **D2 — Onde vive:** no módulo auth (`adapters/http/auth-hook.ts`), exposto via `public-api/http.ts` como factory `makeRequireAuth(verifyAccessToken)` (+ `makeAuthorize(userReader)` para o futuro). Outros módulos consomem via `auth/public-api/` (ADR-0006 — auth é o BC de identidade, ADR-0024). `AuthHttpDeps` ganha `verifyAccessToken`.
- **D3 — Extração:** `Authorization: Bearer <jwt>`; ausente/sem prefixo/inválido → **401** uniforme (sem revelar o motivo). `request` decorado com `userId` (Fastify `decorateRequest`).

> D1–D3 OK ⇒ aprovar.

## 6. Plano técnico

```
auth/adapters/http/auth-hook.ts (novo):
  makeRequireAuth(verifyAccessToken): preHandler
    - lê Authorization: Bearer; 401 se ausente/malformado
    - verifyAccessToken(jwt) -> 401 se err; decora req.userId = claims.userId
  (makeAuthorize(userReader): preHandler factory — exposto p/ uso futuro)

auth/adapters/http/composition.ts (+):
  AuthHttpDeps += verifyAccessToken  (do tokenIssuer)

auth/adapters/http/plugin.ts (+):
  GET /me { preHandler: requireAuth } -> reply { userId: req.userId }
  (response schema Zod { userId })

auth/public-api/http.ts (+): export makeRequireAuth (+ makeAuthorize)
```

- **Erro→HTTP:** authn falha → 401 (envelope estável); `authorize` forbidden → 403 (no helper de borda).
- **OpenAPI:** registrar bearer security scheme no swagger (`/me` exige).

## 7. Constitution check

| Fonte | Exigência | Como adere |
| :-- | :-- | :-- |
| `ADR-0024` (RBAC) | `authorize` fail-closed; identidade própria | reusa `authorize` puro (DD-USER-02); requireAuth verifica JWT |
| `ADR-0005` | BFF valida JWT cross-cutting | core re-valida (defense-in-depth); não confia cego |
| `ADR-0025` | HTTP adapter; preHandler | hook em `adapters/http/`; handler fino |
| `ADR-0006`/`0028` | cross-módulo via public-api | hook exposto via `auth/public-api/http.ts` p/ outros módulos |
| `ADR-0027` | Zod borda; OpenAPI | `/me` response Zod; bearer no `/docs` |
| `web-security-backend` | 401/403 fail-closed, sem vazar motivo | 401 uniforme; 403 forbidden |

## 8. Riscos & mitigações

| Risco | Sev. | Mitigação |
| :-- | :-- | :-- |
| Decorar `request` com tipo (TS) | baixa | `decorateRequest('userId', '')` + module augmentation no escopo do hook |
| `authorize` precisar carregar user (roles) | média | H2 só authn + `/me {userId}`; carregar user/roles fica no `makeAuthorize` (uso futuro) |
| Confiar só no BFF | — | core re-valida (defense-in-depth) |
| Regressão nas 4 rotas | baixa | CA6 |

## 9. Definition of Done

- [ ] CA1–CA6 verdes (W0→W3).
- [ ] `requireAuth` + `/me` protegida; `authorize`/`requireAuth` exalçados via public-api.
- [ ] `AuthHttpDeps += verifyAccessToken`; bearer no OpenAPI.
- [ ] `pnpm test`/`typecheck`/`format`/`lint` verdes; sem dep nova.
