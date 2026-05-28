# SPEC — Rotas HTTP do módulo auth (`AUTH-HTTP-ROUTES`, H1)

> **Tipo:** ticket · **Size:** M · **Épico-pai:** `EPIC-HTTP-CORE-API`
> **Status da spec:** draft
> **ADRs tocados:** `ADR-0024`, `ADR-0025`, `ADR-0027`, `ADR-0006`/`0028`, `ADR-0005` (BFF), `ADR-0026` (RW split — diferido p/ I1)

## 1. Problema & contexto

O módulo `auth` tem 6 use cases prontos e um plugin HTTP com rota sentinela. Falta expor as **operações reais**
(`register`/`login`/`refresh`/`logout`) via HTTP, wirando os use cases aos adapters concretos. Sem isso o auth é
inutilizável de fora. Este ticket entrega as 4 rotas + o composition root que injeta os adapters.

## 2. User stories

- Como **BFF**, quero `POST /api/v2/auth/login` e receber **access JWT + refresh opaco**, para autenticar o usuário.
- Como **BFF**, quero `POST /api/v2/auth/refresh`, para renovar o access sem novo login.
- Como **BFF**, quero `POST /api/v2/auth/logout`, para revogar a sessão.
- Como **admin (via BFF)**, quero `POST /api/v2/auth/register`, para criar usuário.

## 3. Critérios de aceitação (testes do W0 — via `app.inject`)

- **CA1 register-happy** — body `{email,password}` válido, email inédito → **201**; persistiu (login subsequente funciona).
- **CA2 register-conflict** — email já registrado → **409** `{error:{code:'email-already-registered',…}}`.
- **CA3 register-shape** — body sem `email`/`password` ou tipos errados → **400** (Zod, code `validation`).
- **CA4 register-policy** — senha fraca (viola policy) → **422** `{error:{code:'<policy>',…}}`.
- **CA5 login-happy** — credencial válida → **200** `{accessToken, refreshToken, userId}` (3 strings não-vazias).
- **CA6 login-bad** — senha errada / email inexistente → **401** `invalid-credentials` (mesma resposta — não revela qual).
- **CA7 login-disabled** — user `Disabled` → **403** `user-disabled`.
- **CA8 refresh-happy** — refresh válido → **200** com novos `{accessToken, refreshToken}` (rotação).
- **CA9 refresh-bad** — refresh inválido/expirado/revogado → **401**.
- **CA10 logout** — refresh válido → **204**; repetido → **204** (idempotente, DD-SESSION-06).
- **CA11 openapi** — `/docs/json` contém os 4 paths `/api/v2/auth/{register,login,refresh,logout}`; `__ping` **ausente**.
- **CA12 no-store** — respostas de `/api/v2/auth/*` carregam `cache-control: no-store` (do baseline).
- **CA13 regressão** — `bootstrap.test.ts` + `security-baseline.test.ts` verdes.

## 4. Não-objetivos / fora de escopo

- AuthZ preHandler (verify access JWT + `authorize`) → **H2**. As 4 rotas H1 são públicas por natureza (register/login/refresh/logout não exigem token prévio; logout só o refresh).
- RW split real → **I1** (reader=writer single-node por ora).
- `change-password`/`assign-role` (protegidas) → posterior.
- Cookie de sessão no browser → BFF (ADR-0005). O core devolve tokens no **body JSON**.

## 5. Clarificações (decisões a avalizar)

- **D1 — Injeção de deps no plugin:** `authHttpPlugin` passa a ser **factory** `(deps: AuthHttpDeps) => FastifyPluginAsync`. `src/server.ts` monta o composition root auth e passa via `buildApp({ routes: [authHttpPlugin(deps)] })`. `public-api/http.ts` exporta a factory + `type AuthHttpDeps` + o builder de composition. **Não** muda `buildApp` (continua recebendo `FastifyPluginAsync[]`). *(Recomendado.)*
- **D2 — Composition root auth (memory/mysql):** espelha a CLI — função `buildAuthHttpDeps(config)` que, por driver (`AUTH_DRIVER`=`memory`|`mysql`, default `memory`), monta repos in-memory ou Drizzle + `passwordHasher` argon2 + `tokenIssuer` ES256 (chaves de env/secret — DD-TOKEN-01) + `refreshTokenMinter` node + clock real + `refreshTtlSeconds`. Exposta via `public-api/http.ts` (ADR-0006 — `server.ts` não importa adapters direto).
- **D3 — Refresh no body JSON, não cookie:** o core emite `{accessToken, refreshToken, userId}`; o BFF/cliente gerencia armazenamento (cookie HttpOnly no BFF). Sem cookie `Secure` no core (HTTP interno, ADR-0005). *(Recomendado; alinha guidance de segurança.)*
- **D4 — Mapeamento erro→HTTP** (via `sendResult`): `400` shape Zod (`validation`); `401` `invalid-credentials`/refresh inválido; `403` `user-disabled`; `409` `email-already-registered`; `422` policy de senha (`password-*`); `429` rate-limit; `500` resto. Erros de infra (repo/hasher/token) → `500` sem vazar detalhe.
- **D5 — Rate-limit estrito em `/login` e `/refresh`:** override por rota (ex.: 10/min) sobre o global (200/min) — anti brute-force. *(Recomendado.)*

> Ambiguidade aberta impede sair de draft. Se D1–D5 OK, aprovar.

## 6. Plano técnico de alto nível

```
src/modules/auth/adapters/http/
  plugin.ts            — authHttpPlugin(deps): FastifyPluginAsync (sub-escopo /auth)
                          remove __ping; registra as 4 rotas via fastify.route(...)
  schemas.ts           — Zod por rota (RegisterBody/LoginBody/RefreshBody/LogoutBody + responses)
  routes/{register,login,refresh,logout}.ts — handler: cmd → use case → sendResult(map)
  composition.ts       — buildAuthHttpDeps(config): monta deps por driver (memory|mysql)

src/modules/auth/public-api/http.ts
  export { authHttpPlugin } (factory) + type AuthHttpDeps + buildAuthHttpDeps

src/server.ts
  const authDeps = await buildAuthHttpDeps(config)
  buildApp({ routes: [authHttpPlugin(authDeps)], config })
  (+ shutdown: fechar pool do driver mysql)
```

- **Erro→HTTP:** cada rota chama `sendResult(reply, result, { ok: <2xx>, errors: { '<union>': <status> } })` (reusa `reply.ts` do shell).
- **Validação:** Zod valida shape (400); o use case valida invariante via smart constructors do domínio (Email/Password) e devolve `Result` → status mapeado.
- **RW split (ADR-0026):** `userReader`/`refreshTokenRepo` apontam ao mesmo backend por ora; I1 separa.

## 7. Constitution check

| Fonte | Exigência | Como adere |
| :-- | :-- | :-- |
| `ADR-0025:29,35-37` | HTTP é adapter; `/api/v2/*`; composition root único; validação por smart constructor | rotas em `adapters/http/`; `/api/v2/auth/*`; `server.ts` compõe; use case valida |
| `ADR-0006`/`0028` | cross-módulo via public-api; root não importa adapters | `server.ts` importa só `auth/public-api/http.ts` (factory + builder) |
| `ADR-0027` | Zod só na borda; OpenAPI gerado | `schemas.ts` em `adapters/http/`; 4 paths no `/docs/json` (CA11) |
| `ADR-0024` | login/refresh/logout/register via HTTP; refresh opaco | as 4 rotas; refresh opaco (DD-LOGIN/SESSION) |
| `ADR-0005` | BFF burro; core emite credencial | core devolve tokens no body; sem cookie no core (D3) |
| `web-security-backend` | 401/403 corretos; sem secret em log; rate-limit auth | D4 + redact (baseline) + D5 |

## 8. Riscos & mitigações

| Risco | Sev. | Mitigação |
| :-- | :-- | :-- |
| Ticket grande (4 rotas + composition + crypto wiring) | média | se W1 inchar, fatiar: H1a (composition + register/login) → H1b (refresh/logout). Decidir no W0. |
| Chaves ES256 ausentes em dev (tokenIssuer) | média | composition gera/carrega par de chaves de env/secret; fake só em teste |
| `user-disabled` vs `invalid-credentials` vazar enumeração | baixa | login responde `invalid-credentials` uniforme p/ email inexistente vs senha errada (CA6) |
| RW split ausente confundir | baixa | reader=writer documentado; I1 separa |
| Regressão na sentinela removida | baixa | CA11 asserta `__ping` ausente + 4 paths presentes |

## 9. Definition of Done

- [ ] CA1–CA13 verdes (W0→W3).
- [ ] 4 rotas wiradas; `__ping` removida; composition root memory/mysql.
- [ ] `server.ts` compõe via `public-api/http.ts` (não importa adapters direto).
- [ ] `pnpm test`/`typecheck`/`format`/`lint` verdes; sem dep nova.
- [ ] Nada de authz hook (H2) nem RW split real (I1) — fora de escopo respeitado.
