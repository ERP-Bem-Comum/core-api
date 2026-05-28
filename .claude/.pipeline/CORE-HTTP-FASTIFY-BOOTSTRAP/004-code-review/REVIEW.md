# Validação cruzada (W2) — CORE-HTTP-FASTIFY-BOOTSTRAP — Round 1

**Veredito:** APPROVED (com 2 sugestões 🟡 — recomendo aplicar antes do W3)

**Reviewer:** code-reviewer (Claude) · **Data:** 2026-05-28
**Escopo:** `src/http/{app,config,errors,reply,server}.ts` (336 linhas) + `handbook/reference/zod/README.md` (98 linhas).

## Conformidade

| Item | Resultado |
| :-- | :-- |
| ADR-0025:29-30 — HTTP é adapter; domínio/application sem framework | ✅ `grep` confirma **zero** imports de `fastify`/`zod` fora de `src/http/` |
| ADR-0025:35-38 — `/api/v2/*`; composition root único; Pino + `request-id` | ✅ `buildApp` registra `routes` com `prefix: '/api/v2'` (app.ts:114-117); `genReqId` honra `x-request-id` upstream (38-42); hook `onRequest` → `runWithCorrelation` integra ao ALS (103-105); `server.ts` é o root |
| ADR-0027 — Zod só na borda; OpenAPI 3.1.1 gerado; smart constructors mantêm regra | ✅ compilers ligados (app.ts:48-49); `withTypeProvider<FastifyZodOpenApiTypeProvider>()` (45); `@fastify/swagger` com `openapi: '3.1.1'` + transformers (84-95); CA3/CA6 verdes |
| ADR-0006 — `buildApp` não importa módulos; cross-módulo via `public-api/` | ✅ `BuildAppOptions.routes` recebido por **injeção**; nenhum import de `src/modules/*` em `src/http/*` |
| ADR-0011 — deps via pnpm, pinadas, sem npm | ✅ 9 deps pinadas exatas; sem `approve-builds` (postinstall vazio) |
| Envelope `{ error: { code, message, requestId } }` consistente em 400/404/500 | ✅ `toErrorEnvelope` único (errors.ts:30-36); `validation`/`not-found`/`internal`/`request-error` |
| CA2 — stack/mensagem interna **não** vazam no body | ✅ `app.log.error({ err })` no servidor (errors.ts:82); body recebe só `'internal'` (83); validado pelo teste |
| Hardening — helmet, cors, rate-limit, bodyLimit, redact, trustProxy | ✅ helmet (56-58), cors (61-64), rate-limit (67-81), `bodyLimit: 1 MiB` (43), `redact: authorization/password` (36), `trustProxy: true` (44) |
| Graceful shutdown — SIGTERM/SIGINT + last-resort | ✅ `server.ts:36-37,40` + `installLastResortHandlers` |
| Idioma EN no código, PT-BR ASCII nos comentários; `.ts`/`#src/*`/`import type` | ✅ |
| handbook/reference/zod/README.md — fronteira, fluxo, versões, padrão fastify-zod-openapi | ✅ completo |

## Issues

### 🟡 Issue 1 — Config parcialmente órfã (média)
`config.ts` lê `corsOrigins`, `rateLimitMax`, `rateLimitWindow` do env, mas **`buildApp` não usa** — `app.ts:61-64,67-81` hardcoda `origin: false`, `max: 200`, `timeWindow: '1 minute'`. `server.ts:18` lê a config inteira mas só repassa `port`/`host` ao `app.listen`. Resultado: `CORS_ORIGINS`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW` são silenciosamente ignoradas — ofende o princípio "composition root injeta os adapters" (ADR-0025:37) ao manter config decorativa.

**Resolução sugerida:** estender `BuildAppOptions` com `config?: HttpConfig` (ou apenas as três opções relevantes) e usar em `app.register(cors, ...)` e `app.register(rateLimit, ...)`; `server.ts` passa a config completa para `buildApp`.

Alternativa minimalista: se o intent é "core-api só vive atrás do BFF, CORS é problema do BFF" (ADR-0005), remover `corsOrigins` de `HttpConfig` (dead code intencional).

### 🟡 Issue 2 — `return app as unknown as FastifyInstance` perde o type-provider (média/baixa)
`app.ts:119` faz `return app as unknown as FastifyInstance` — descarta o `FastifyZodOpenApiTypeProvider` aplicado por `withTypeProvider` (45). Consequência: rotas H1+ que recebam essa instância **perdem a inferência de schemas Zod** sem reaplicar `.withTypeProvider<...>()`. Os testes do W0 passam porque ali a rota é registrada via `app.post('/__zod', { schema: { body: z.object(...) } }, …)` direto no objeto retornado — mas a inferência fica ad-hoc.

**Resolução sugerida:** o tipo de retorno de `buildApp` deve ser `FastifyInstance<RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, FastifyBaseLogger, FastifyZodOpenApiTypeProvider>` (alias `FastifyAppWithZod`). Remove o cast e preserva o provider para H1+.

## Sugestões 🔵 (não-bloqueantes)
- **errors.ts:74-79** — código genérico `'request-error'` para erros Fastify `<500` (rate-limit 429, CORS, etc.). H1+ pode diferenciar (`'rate-limit-exceeded'`, `'cors-denied'`) para o cliente reagir adequadamente.
- **reply.ts:37** — `toErrorEnvelope(errorCode, errorCode, …)` usa o code como message. Para H0 está OK; em H1+, aceitar um `messages?: Partial<Record<E, string>>` opcional se mensagens humanas forem necessárias.
- **reply.ts:28,37** — cast `as unknown as Promise<void>`. Justificável pela tipagem de `reply.send`, mas idiomático seria retornar `Promise<FastifyReply>` (o que `reply.code().send()` produz) ou `void`. Cosmético.
- **app.ts:104** — `runWithCorrelation(req.id, done as () => void)` — cast funcional mas verboso. Uma helper signature em `correlation.ts` aceitando o `done` do Fastify reduziria o atrito (e seria reusada em hooks futuros).

## Próximo passo
- **APPROVED** → seguir para W3.
- Recomendado **tratar as 2 issues 🟡 antes do W3** (mesmo padrão "Sugestões 🟡 aplicadas antes do W3" da memória FIN). Pequeno refactor; mantém testes verdes.

## Resolução (pós-W2, antes do W3) — 2026-05-28

Ambas as 🟡 foram aplicadas (sem reabrir wave — refactor pós-review que mantém os CAs):

- **Issue 1 (config órfã):** `BuildAppOptions` ganhou `config?: HttpConfig` (default `readHttpConfig({})`); `app.register(cors, …)` usa `config.corsOrigins` (vazio → `origin: false`); `app.register(rateLimit, …)` usa `config.rateLimitMax`/`rateLimitWindow`. `server.ts` passa `config` ao `buildApp`. Env de produção (`CORS_ORIGINS`/`RATE_LIMIT_*`) agora têm efeito.
- **Issue 2 (cast):** novo alias exportado `FastifyAppWithZod = FastifyInstance<…, FastifyZodOpenApiTypeProvider>`; `buildApp` retorna esse tipo; `return app as unknown as FastifyInstance` → `return app`. Type-provider preservado para H1+.

Validação: `pnpm run typecheck` exit 0; `tests/http/bootstrap.test.ts` 7/7 pass. As 🔵 cosméticas ficam como follow-up (não aplicadas).
