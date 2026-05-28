# SPEC — CORE-HTTP-FASTIFY-BOOTSTRAP (H0)

> **Tipo:** ticket · **Size:** M · **Épico-pai:** `EPIC-HTTP-CORE-API`
> **Status da spec:** aprovada (deriva da spec-mãe aprovada 2026-05-27)
> **ADRs tocados:** `ADR-0025`, `ADR-0027`, `ADR-0006`, `ADR-0011`, `ADR-0005`

## 1. Problema & contexto

A borda HTTP precisa de um alicerce antes de qualquer rota de negócio: servidor, hardening, logging, tradução
de erro e a stack contract-first Zod. Sem ele, H1 (auth) não tem onde pendurar rotas. Transversal, em `src/http/`.

## 2. User stories

- Como **dev/ops**, quero subir o servidor com `/health` e `/docs`, para validar deploy e inspecionar o contrato.
- Como **autor de rotas (H1+)**, quero `buildApp` montando hardening + Zod + error handler, para só declarar rotas.
- Como **operador de incidente**, quero erro com `request-id` e **sem stack trace** vazada, para diagnosticar com segurança.

## 3. Critérios de aceitação (viram os testes do W0 — via `app.inject`)

- **CA1** — `buildApp()` resolve uma instância Fastify; `inject GET /health` → **200** com `{ status: 'ok' }`, sem I/O de banco.
- **CA2** — Exceção não-tratada numa rota → **500** com envelope `{ error: { code, message, requestId } }` e **sem** campo/stack trace no body.
- **CA3** — Rota com schema **Zod** de body; payload que viola o shape → **400** com envelope de erro de validação (não 500).
- **CA4** — Resposta carrega headers do **helmet** (ex.: `x-content-type-options: nosniff`).
- **CA5** — Rota inexistente → **404** com o mesmo envelope estável `{ error: { code, message, requestId } }`.
- **CA6** — `inject GET /docs/json` → **200** e o documento tem `openapi: '3.1.1'`.
- **CA7** — `sendResult(reply, err('x-not-found'), map)` aplica o status mapeado (ex.: 404) e envelope; `sendResult(reply, ok(v), …)` → 2xx com `v` serializado.

> Hardening de rate-limit é configurado mas **não** asserido no W0 (custo/flakiness); fica para teste de carga futuro.

## 4. Não-objetivos
- Rotas de negócio (auth/contracts). `buildApp` aceita `routes?: plugin[]`, mas H0 passa `[]`.
- TLS, RW split, `public-api/http.ts` de auth.

## 5. Clarificações (resolve a §5 da spec-mãe)
- **Composição de rotas (gap `public-api`):** `buildApp(opts)` recebe `routes?: FastifyPluginAsync[]` e os registra sob `/api/v2`. **O composition root** (`server.ts`) é quem importa o plugin de cada módulo — e o fará via **`<module>/public-api/http.ts`** (cross-módulo só por public-api, ADR-0006). Assim `buildApp` **não importa módulo nenhum** (recebe plugins por injeção). O export `public-api/http.ts` de auth é o ticket #2. **No H0 não há rotas de módulo** → sem violação, sem dependência do #2.
- **Estrutura:** `src/http/{app,server,errors,reply,config}.ts` + `src/http/plugins/` (hardening, docs, request-id).
- **Versões:** Fastify v5; `fastify-zod-openapi` v5.x + `zod-openapi` + `zod` v4; `@fastify/{helmet,cors,rate-limit,swagger,swagger-ui}` compatíveis com v5 (pinadas no W1 via `approve-builds`).

## 6. Plano técnico (sem código)

```
src/http/
  app.ts      — buildApp(opts?: BuildAppOptions): Promise<FastifyInstance>
                 · setValidatorCompiler/setSerializerCompiler (fastify-zod-openapi)
                 · withTypeProvider<FastifyZodOpenApiTypeProvider>()
                 · register: helmet, cors, rate-limit, swagger(+ui em /docs), fastifyZodOpenApiPlugin
                 · onRequest hook: request-id (header x-request-id ou gera; entra no ALS de correlation.ts)
                 · setErrorHandler + setNotFoundHandler (errors.ts)
                 · GET /health
                 · registra opts.routes (default []) sob /api/v2
  server.ts   — main(): lê config (env), buildApp({ routes }), app.listen, graceful shutdown
                 (SIGTERM/SIGINT → app.close), integra src/shared/runtime/last-resort.ts
  errors.ts   — toErrorEnvelope(err, requestId); ZodError→400; 404; default→500 (log full, body sem stack)
  reply.ts    — sendResult<T,E>(reply, result, { ok?: status, errors?: Record<E,status> }): Result→HTTP
  config.ts   — readHttpConfig(env): { port, host, corsOrigins, rateLimit } com defaults seguros
```
- **Envelope de erro (contrato):** `{ error: { code: string; message: string; requestId: string } }`. `code` = string-kebab (erro de domínio) ou `'internal'`/`'not-found'`/`'validation'`.
- **Reuso:** `Result` (`#src/shared/primitives/result.ts`), ALS (`#src/shared/observability/correlation.ts`), clock (`#src/shared/ports/clock.ts`), last-resort (`#src/shared/runtime/last-resort.ts`).
- **`/api/v2`** como prefixo das rotas de negócio (ADR-0025:35); `/health` e `/docs` ficam na raiz (infra, não versionado).

## 7. Constitution check
| Fonte | Exigência | Como adere |
| :-- | :-- | :-- |
| `ADR-0025:29-30` | HTTP é adapter; domínio/app sem framework | Tudo em `src/http/` (adapter transversal); nada de Fastify no domínio. CA1-CA7 |
| `ADR-0025:35-38` | `/api/v2/*`; composition root único; Pino + request-id | `buildApp` registra routes sob `/api/v2`; `server.ts` é o root; hook request-id |
| `ADR-0027` | Zod só na borda; OpenAPI **gerado** 3.1.1; smart constructors mantêm a regra | compilers Zod + `/docs/json` 3.1.1 (CA3/CA6); H0 não toca domínio |
| `ADR-0006` | cross-módulo só via `public-api/` | `buildApp` recebe plugins por injeção; nenhum import de módulo no H0 |
| `ADR-0011` | deps via `approve-builds`, pnpm, pinadas | Fastify + Zod stack instaladas no W1 sob esse processo |
| `ADR-0005:31` | BFF burro; core-api emite, BFF valida JWT | H0 não autentica (H2 faz authn hook); só bootstrap |

## 8. Riscos & mitigações
| Risco | Sev. | Mitigação |
| :-- | :-- | :-- |
| Vazar stack trace em 500 | alta | Envelope fixo; stack só no log (Pino), nunca no body (CA2 asserta ausência) |
| Zod compiler mal-ligado → validação não roda | média | CA3 asserta 400 em payload inválido contra schema real |
| OpenAPI sair 3.0/3.1.0 em vez de 3.1.1 | baixa | CA6 asserta `openapi === '3.1.1'` |
| Deps novas (supply-chain) | média | `approve-builds`, versões pinadas, auditoria no PR (W1) |

## 9. Definition of Done
- [ ] CA1–CA7 verdes (W0→W1).
- [ ] `pnpm test`/`typecheck`/`lint`/`format` verdes (W3); deps aprovadas via `approve-builds`.
- [ ] Nenhum import de Fastify/Zod fora de `src/http/`.
- [ ] `handbook/reference/zod/` criado (apontado na spec-mãe §11 #1).
