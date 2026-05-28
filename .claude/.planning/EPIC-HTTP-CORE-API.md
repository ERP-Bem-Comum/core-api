# SPEC — Borda HTTP do core-api (`EPIC-HTTP-CORE-API`)

> **Tipo:** épico · **Size:** XL (fatiado abaixo) · **Épico-pai:** —
> **Status da spec:** aprovada (2026-05-27, Gabriel) — H0 em execução
> **ADRs tocados:** `ADR-0005`, `ADR-0006`, `ADR-0011`, `ADR-0014`, `ADR-0023`, `ADR-0024`, `ADR-0025`, `ADR-0026`, `ADR-0027`
> **Método:** [spec-driven nativo](../runbooks/spec-driven-pipeline.md) — primeiro piloto.

## 1. Problema & contexto

O core-api é **CLI-first** (`CLAUDE.md`: "nenhum servidor HTTP ainda"). O módulo `auth` está completo internamente
(6 use cases, repos Drizzle, cripto, JWT) mas **sem porta de entrada** — inutilizável de verdade. O `contracts`
só tem CLI. O **ADR-0025 (Accepted, 2026-05-27)** adotou Fastify como adapter HTTP de borda exatamente para
desbloquear auth (ADR-0024) e a exposição HTTP de contratos (ADR-0023). Este épico entrega essa borda, **auth
primeiro** (decisão 2026-05-27).

## 2. User stories

- Como **BFF**, quero `POST /api/v2/auth/login` no core-api e receber **access JWT + refresh opaco**, para autenticar o usuário.
- Como **BFF**, quero `POST /api/v2/auth/refresh`, para renovar o access token sem novo login.
- Como **BFF**, quero `POST /api/v2/auth/logout`, para revogar a sessão (refresh).
- Como **admin** (via front→BFF), quero `POST /api/v2/auth/register`, para criar usuário.
- Como **operador**, quero CRUD de contratos via HTTP (ACL sobre o `openapi.yaml` legado) — **fase 2 do épico**.
- Como **dev/ops**, quero `/health` e logs estruturados com `request-id` propagado do BFF.

## 3. Critérios de aceitação (alto nível — cada ticket detalha os seus)

- **CA1** — Servidor Fastify sobe via composition root único; `GET /health` responde 200 sem tocar banco.
- **CA2** — Tradução `Result<T,E>`→HTTP central: `ok`→2xx; erro de domínio→4xx mapeado; erro de infra→5xx. Nenhum `throw` vaza como 500 não-tratado.
- **CA3** — Todo request body é validado por **smart constructor do domínio** antes do use case; inválido → 400 com erro estável.
- **CA4** — Rotas mutáveis exigem **access token válido** (preHandler authn) + `authorize(permission)` quando aplicável; falha → 401/403.
- **CA5** — Hardening ativo: headers (helmet), CORS restrito, rate-limit; `request-id` no log (Pino).
- **CA6** — Domínio e application **sem nenhum import de Fastify** (garantia ADR-0006).
- **CA7** — Borda **contract-first** (ADR-0027): um schema **Zod** por rota valida shape do request/response e **gera o OpenAPI 3.1.1** servido em `/docs`. Domínio/application **nunca importam Zod**; o smart constructor roda depois do shape.

## 4. Não-objetivos / fora de escopo

- **TLS no core-api** — termina no proxy/BFF (decisão 2026-05-27); o core-api fala HTTP interno. Sem certificados no Node.
- **Reescrever o BFF** — continua burro (ADR-0005 não superseded): valida JWT cross-cutting, rate-limit de borda, roteia `/api/v2/*`.
- **Contracts HTTP completo nesta leva** — auth primeiro; contracts entra numa spec-filha após a borda auth fechar.
- **OpenAPI 3.2.0 agora** — o tooling (`zod-openapi`) só emite 3.1.0/3.1.1; o alvo é **3.1.1** (ADR-0027), gerado dos schemas Zod. 3.2.0 fica como north-star até o tooling suportar. O `openapi.yaml` legado (3.0.3) vira ACL/referência de migração para contracts.

## 5. Clarificações (Q&A)

- **Q:** Onde termina o TLS? · **R:** Proxy/BFF; core-api é HTTP interno (2026-05-27, Gabriel).
- **Q:** Auth ou contracts primeiro? · **R:** Auth (2026-05-27).
- **Q:** Spec-kit oficial ou método nativo? · **R:** Método nativo no pipeline, sem Python/uv (2026-05-27).
- **Q:** Como garantir consistência de I/O e doc da API? · **R:** **Zod contract-first** na borda + OpenAPI gerado (ADR-0027); Zod só em `adapters/http/`, smart constructors mantêm a regra de negócio (2026-05-27, Gabriel).
- **Q:** Versão do OpenAPI? · **R:** **3.1.1** — máximo que `zod-openapi` emite (não há tooling Zod→3.2.0); legado 3.0.3 vira referência (2026-05-27).
- **Q (a resolver no H0):** Como cada módulo expõe rotas ao composition root sem ferir o isolamento do ADR-0006?
  Hipótese: cada módulo exporta um **plugin Fastify** em `adapters/http/` (consome seu próprio `application` — intra-módulo, permitido); o root transversal registra os plugins. Se o root precisar importar o plugin de um módulo, a exposição deve passar por um ponto público (estender `public-api/`). **`auth` ainda não tem `public-api/`** — gap a fechar.

## 6. Plano técnico de alto nível (sem código)

- **Composição:** o composition root transversal (`src/server.ts`) monta o Fastify usando o **shell de borda
  em `src/shared/http/`** (ADR-0028), injeta adapters reais (repos Drizzle writer/reader, argon2 hasher, JWT
  issuer, clock, refresh-token-minter) e **registra os plugins de rota de cada módulo**. Espelha o padrão da
  CLI (`contracts/cli/{main,context,registry}.ts`).
- **Borda por módulo:** rotas vivem em `src/modules/<m>/adapters/http/` como plugin Fastify; cada handler faz
  `parse → smart constructor → use case → Result→HTTP`. `throw` permitido só aqui, convertido na borda.
- **Error handler central:** um mapeador único `Result.error (string union) → status HTTP` + envelope de erro estável.
- **Contract-first (ADR-0027):** schema **Zod** por rota é a fonte única — valida o shape do request, serializa a resposta e **gera o OpenAPI 3.1.1** (`fastify-zod-openapi` + `zod-openapi`, servido por `@fastify/swagger-ui` em `/docs`). Zod fica só em `adapters/http/`; o shape malformado vira 400 antes do smart constructor (que valida a regra → Result→4xx).
- **Auth (rota→use case):** `register`→`registerUser` · `login`→`authenticateUser` (+ `refreshTokenMinter`) ·
  `refresh`→`refreshAccessToken` · `logout`→`revokeSession`. `changePassword`/`assignRole` = rotas protegidas, fase posterior.
- **RW split (ADR-0026):** composition root injeta pools `writer`/`reader`; em single-node ambos ao mesmo host.

## 7. Constitution check (aderência aos ADRs/regras)

| Fonte | Exigência (citada) | Como o épico adere |
| :-- | :-- | :-- |
| `ADR-0025:29` | HTTP é **adapter** que "traduz `Result<T,E>` em status HTTP"; `throw` só na borda | Handlers em `adapters/http/`; error handler central; CA2/CA6 |
| `ADR-0025:30` | "Domínio e application permanecem sem framework" | Nenhum import Fastify fora de `adapters/http/`; CA6 |
| `ADR-0025:35-38` | `/api/v2/*`; validação por smart constructor; composition root único; Pino + `request-id` | §6; CA1/CA3/CA5 |
| `ADR-0005:31` | BFF **burro**, não superseded; core-api emite credencial, BFF valida JWT | §4 não-objetivo "reescrever BFF"; core-api só emite |
| `ADR-0006` | Cross-módulo só via `public-api/` | Rotas intra-módulo consomem o próprio `application`; se root importar plugin, expor via `public-api/` (§5/§8) |
| `ADR-0024` | auth exposto via HTTP (`login`/`refresh`/`logout`) | Tickets H1/H2 |
| `ADR-0026:98-101` | escrita no pool writer; read-after-write crítico no primário; um escritor | Ticket I1; login/refresh são write-heavy → writer |
| `ADR-0011` | supply-chain: `approve-builds`, sem `npm`, deps auditadas | Fastify + plugins entram via `pnpm` + `approve-builds`; agente `fastify-server-expert` |
| `ADR-0014` | um único escritor por database | Mantido pelo I1 |
| `ADR-0027` | Zod só em `adapters/http/`; OpenAPI **gerado** (3.1.1), não à mão; smart constructors mantêm a regra | Stack Zod na borda; domínio sem Zod; `/docs` gerado; CA7 |

## 8. Riscos & mitigações

| Risco | Sev. | Mitigação |
| :-- | :-- | :-- |
| Nova superfície de ataque (HTTP) | alta | Hardening no H0 (helmet/cors/rate-limit), validação estrita por smart constructor, sem stack trace ao cliente |
| `auth` sem `public-api/` → root transversal não acessa rotas sem ferir ADR-0006 | média | H0 decide o padrão de composição; se necessário, ticket de exposição (`AUTH-HTTP-PLUGIN-EXPORT` / estender `public-api/`) antes do H1 |
| Tradução `Result`→HTTP inconsistente entre módulos | média | Error handler **central único** + tabela de mapeamento de erros compartilhada |
| Dependência nova (Fastify + **Zod stack** + plugins) | média | `pnpm` + `approve-builds` (ADR-0011); versões pinadas; auditar no PR (Inquiry-0005); `fastify-server-expert` revisa |
| Sobreposição shape (Zod) × regra (smart constructor) confunde camadas | baixa | Fronteira dura do ADR-0027: Zod = shape/serialização/OpenAPI; smart constructor = invariante de negócio (§6) |
| Escopo do épico inchar (auth + contracts juntos) | média | Contracts sai desta leva; spec-filha própria após auth |

## 9. Definition of Done (épico)

- [ ] auth exposto: `register/login/refresh/logout` verdes E2E (HTTP → use case → Result→HTTP).
- [ ] Hardening + `/health` + Pino/request-id no H0.
- [ ] Constitution check sem conflito aberto (item §5/§8 do `public-api` resolvido no H0).
- [ ] Cada ticket fechou `closed-green` no pipeline com sua própria `001-spec/SPEC.md`.

## 10. Fatiamento em tickets (ordem por dependência)

| # | Ticket | Size | Entrega | Depende |
| :-- | :-- | :-- | :-- | :-- |
| 1 | `CORE-HTTP-FASTIFY-BOOTSTRAP` (H0) | M | Instala Fastify + **stack Zod contract-first** (`zod` v4, `zod-openapi`, `fastify-zod-openapi`, `@fastify/swagger`+`swagger-ui`); composition root; type-provider + validator/serializer compilers; error handler `Result`→HTTP; helmet/cors/rate-limit; Pino+`request-id`; `GET /health` + `GET /docs` (OpenAPI 3.1.1). **Decide o padrão de composição de rotas (§5).** Transversal | — |
| 1.5 | `CORE-HTTP-SHELL-RELOCATE` | S | **✅ closed-green** — move o shell (H0) para `src/shared/http/` + composition root `src/server.ts` (ADR-0028); estende glob ESLint p/ `src/shared/http/**` + `src/modules/*/adapters/http/**`. Refactor sem mudança de comportamento | H0 |
| 2 | `AUTH-HTTP-PLUGIN-EXPORT` (S) | S | **✅ closed-green** — `auth/adapters/http/plugin.ts` (`authHttpPlugin`, sub-escopo `/auth` + rota sentinela `__ping` Zod) + `auth/public-api/http.ts` (re-export, ADR-0006) + wiring em `src/server.ts`. Padrão de plugin-por-módulo estabelecido p/ o H1 | H0 |
| 3 | `AUTH-HTTP-ROUTES` (H1a) | M | **✅ closed-green** — composition root auth (memory+mysql, chaves ES256) + `POST /api/v2/auth/{register→201,login→200}`; factory `authHttpPlugin(deps)`; erro→HTTP (409/422/401/403); enumeração-safe; `__ping` removida. Fatiado de H1 (SPEC §8) | H0, #2 |
| 3b | `AUTH-HTTP-ROUTES-SESSION` (H1b) | S | **✅ closed-green** — `POST /api/v2/auth/{refresh→200 rotação, logout→204 idempotente}`; reusou o composition root (só +2 schemas +2 rotas); erro→HTTP 401/403. **4 rotas auth completas.** | H1a |
| 4 | `AUTH-HTTP-AUTHZ-HOOK` (H2) | S | preHandler authn (verify access JWT) + `authorize(permission)`; 401/403 | H1 |
| 5 | `CORE-DB-RW-SPLIT-POOLS` (I1) | M | Dual pool writer/reader (ADR-0026) injetado no composition root; paralelizável após H0 | H0 |
| 6+ | `CONTRACTS-HTTP-*` | épico-filho | ACL sobre os 12 endpoints do `openapi.yaml` legado — **spec-filha própria** após a borda auth fechar | H0, H2 |

**Caminho crítico:** H0 → (#2 se necessário) → H1 → H2. I1 paralelo após H0. Contracts após auth.
Recursos (agente W1 · skills · docs) por etapa em §11.

## 11. Recursos por etapa (agentes · skills · docs do handbook)

> Cada linha do §10 herda os **transversais** abaixo + os recursos específicos do seu bloco. Paths verificados
> nesta árvore. Agentes: `.claude/agents/<nome>.md` · Skills: `.claude/skills/<nome>/SKILL.md`.

### Transversais (todos os tickets)
- **Orquestração:** [`contratos-orchestrator`](../agents/contratos-orchestrator.md) (entry-point) + skill [`pipeline-maestro`](../skills/pipeline-maestro/SKILL.md).
- **Waves:** W0 [`tdd-strategist`](../skills/tdd-strategist/SKILL.md) · W2 [`code-reviewer`](../skills/code-reviewer/SKILL.md) · W3 [`ts-quality-checker`](../skills/ts-quality-checker/SKILL.md).
- **Spec (pré-W0):** `001-spec/SPEC.md` via template [`../templates/spec.md`](../templates/spec.md) ([método](../runbooks/spec-driven-pipeline.md)).
- **Regras de camada:** [`../rules/adapters.md`](../rules/adapters.md) (borda converte `Result`), [`../rules/testing.md`](../rules/testing.md).
- **TS estrito (qualquer dúvida de tipo):** agente [`typescript-language-expert`](../agents/typescript-language-expert.md) + `handbook/reference/typescript/`.

### #1 — `CORE-HTTP-FASTIFY-BOOTSTRAP` (H0)
- **Agentes:** [`fastify-server-expert`](../agents/fastify-server-expert.md) (W1) · [`nodejs-runtime-expert`](../agents/nodejs-runtime-expert.md) (SIGTERM/graceful shutdown) · [`pnpm-workspace-expert`](../agents/pnpm-workspace-expert.md) (instalar Fastify + **stack Zod** [`zod` v4, `zod-openapi`, `fastify-zod-openapi`, `@fastify/swagger(-ui)`] via `approve-builds`).
- **Skills:** [`ports-and-adapters`](../skills/ports-and-adapters/SKILL.md) (HTTP é adapter; composition root).
- **Docs:** `handbook/reference/fastify/Guides/{Getting-Started,Plugins-Guide,Write-Plugin,Recommendations,Prototype-Poisoning,Delay-Accepting-Requests}.md` · `fastify/Reference/{Server,Lifecycle,Hooks,Errors,Logging,Encapsulation,Plugins,TypeScript,Type-Providers}.md` · `fastify-plugins/{helmet,cors,rate-limit,swagger,swagger-ui}.md` · `nodejs/{Process,HTTP}.md` · `nodejs/Asynchronous context tracking.md` (request-id via ALS; reusar `CTR-NODE-CORRELATION-ALS`) · **contract-first (ADR-0027):** [zod.dev](https://zod.dev) · [fastify-zod-openapi](https://github.com/samchungy/fastify-zod-openapi) · [zod-openapi](https://github.com/samchungy/zod-openapi) — criar `handbook/reference/zod/` no W1 · ADRs `0025`, `0027`, `0005`, `0006`, `0011`.

### #2 — `AUTH-HTTP-PLUGIN-EXPORT` (condicional)
- **Agentes:** [`fastify-server-expert`](../agents/fastify-server-expert.md) (formato do plugin) · [`typescript-language-expert`](../agents/typescript-language-expert.md) (`public-api` / subpath imports).
- **Skills:** [`modular-monolith`](../skills/modular-monolith/SKILL.md) (**canônica** — fronteira cross-módulo) · [`ports-and-adapters`](../skills/ports-and-adapters/SKILL.md).
- **Docs:** `handbook/reference/fastify/Reference/{Plugins,Encapsulation}.md` · `fastify/Guides/Write-Plugin.md` · ADR `0006` · padrão no código: `src/modules/contracts/public-api/index.ts`.

### #3 — `AUTH-HTTP-ROUTES` (H1)
- **Agentes:** [`fastify-server-expert`](../agents/fastify-server-expert.md) (W1; rotas + schema validation).
- **Skills:** [`ports-and-adapters`](../skills/ports-and-adapters/SKILL.md) (handler → use case → `Result`→HTTP).
- **Docs:** `handbook/reference/fastify/Reference/{Routes,Request,Reply,Validation-and-Serialization,Hooks,Errors,ContentTypeParser,Type-Providers}.md` · `fastify/Guides/Testing.md` (`fastify.inject` p/ E2E) · **schemas Zod por rota (ADR-0027):** [zod.dev](https://zod.dev) + `fastify-zod-openapi` type-provider · `handbook/domain/auth/design-decisions.md` (DD-LOGIN-01/02 refresh opaco) · ADRs `0024`, `0025`, `0027`. Use cases já prontos: `register-user`, `authenticate-user`, `refresh-access-token`, `revoke-session`.

### #4 — `AUTH-HTTP-AUTHZ-HOOK` (H2)
- **Agentes:** [`fastify-server-expert`](../agents/fastify-server-expert.md) (preHandler/hooks/decorators).
- **Skills:** [`ports-and-adapters`](../skills/ports-and-adapters/SKILL.md).
- **Docs:** `handbook/reference/fastify/Reference/{Hooks,Lifecycle,Request,Decorators}.md` · `nodejs/Asynchronous context tracking.md` (propagar identidade) · `handbook/domain/auth/design-decisions.md` (DD-USER-02 `authorize` puro) · ADR `0024` (RBAC). Verify do access JWT: adapter `AUTH-ADAPTER-JWT-ISSUER` já entregue.

### #5 — `CORE-DB-RW-SPLIT-POOLS` (I1)
- **Agentes:** [`mysql2-driver-expert`](../agents/mysql2-driver-expert.md) (**canônico** — dual pool, timeouts) · [`mysql-database-expert`](../agents/mysql-database-expert.md) (replication lag / read-after-write) · [`drizzle-orm-expert`](../agents/drizzle-orm-expert.md) (injeção nos repos).
- **Skills:** [`ports-and-adapters`](../skills/ports-and-adapters/SKILL.md) (ports por intenção: writer vs reader).
- **Docs:** `handbook/reference/mysql2/{README,caching_sha2_password,SECURITY}.md` · `drizzle/{connect-overview,get-started-mysql,transactions}.mdx` · `handbook/reference/mysql/` (replicação — via agente) · ADRs `0026` (invariantes §98-101), `0014`.

### #6+ — `CONTRACTS-HTTP-*` (épico-filho; spec-filha própria)
- **Agentes:** [`fastify-server-expert`](../agents/fastify-server-expert.md) (rotas) · [`drizzle-orm-expert`](../agents/drizzle-orm-expert.md) + [`mysql-database-expert`](../agents/mysql-database-expert.md) (EXPLAIN das listagens/paginação).
- **Skills:** [`requirements-engineer`](../skills/requirements-engineer/SKILL.md) (ACL: traduzir o `openapi.yaml` legado em requisitos) · [`modular-monolith`](../skills/modular-monolith/SKILL.md) · [`ports-and-adapters`](../skills/ports-and-adapters/SKILL.md).
- **Docs:** `handbook/reference/fastify/Reference/{Routes,Validation-and-Serialization,Reply}.md` · `fastify-plugins/{swagger,swagger-ui}.md` (doc gerada via Zod, ADR-0027) · `drizzle/{select,indexes-constraints,dynamic-query-building}.mdx` (em `handbook/reference/drizzle/`) · contrato legado `handbook/api_documentations/contracts/openapi.yaml` (ACL/migração) · ADRs `0023` (4 estados), `0025`, `0027`.
