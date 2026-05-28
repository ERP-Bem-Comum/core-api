# W1 — Implementação (GREEN) — CORE-HTTP-FASTIFY-BOOTSTRAP (H0)

**Skill:** fastify-server-expert · **Data:** 2026-05-28 · **Estado:** GREEN

## Arquivos criados

| Arquivo | Papel |
| :-- | :-- |
| `src/http/config.ts` | `readHttpConfig(env)`: port/host/corsOrigins/rateLimit + defaults seguros |
| `src/http/errors.ts` | Error handler central + envelope `{ error: { code, message, requestId } }`; ZodError→400 (`validation`), notFound→404 (`not-found`), default→500 (`internal`, sem stack/mensagem interna no body — só no log Pino) |
| `src/http/reply.ts` | `sendResult<T,E>(reply, result, { ok?, errors? })` — helper Result→HTTP para as rotas de H1+ |
| `src/http/app.ts` | `buildApp(opts?): Promise<FastifyInstance>` com type-provider Zod (`fastify-zod-openapi`), `setValidatorCompiler`/`setSerializerCompiler`, helmet/cors/rate-limit, swagger + swagger-ui em `/docs`, JSON em `/docs/json` (`openapi: '3.1.1'`), hook `onRequest` de `request-id` integrado ao ALS de `correlation.ts`, `GET /health`, registra `opts.routes ?? []` sob `/api/v2` |
| `src/http/server.ts` | Bootstrap: `readHttpConfig→buildApp→listen` + graceful shutdown SIGTERM/SIGINT→`app.close()` integrando `src/shared/runtime/last-resort.ts` |
| `handbook/reference/zod/README.md` | Stub PT-BR (Zod só na borda, ADR-0027, link zod.dev) |

## Dependências instaladas (pinadas, ADR-0011)

```
fastify              5.8.5
zod                  4.4.3
zod-openapi          5.4.6
fastify-zod-openapi  5.6.1
@fastify/helmet     13.0.2
@fastify/cors       11.2.0
@fastify/rate-limit 10.3.0
@fastify/swagger     9.7.0
@fastify/swagger-ui  5.2.6
```

Nenhuma exigiu `approve-builds` (sem postinstall pesado).

## Validação — CA1–CA7 verdes (`tests/http/bootstrap.test.ts`)

```
▶ CORE-HTTP-FASTIFY-BOOTSTRAP — bootstrap transversal
  ✔ CA1: GET /health -> 200 { status: "ok" } sem tocar banco
  ✔ CA2: excecao nao-tratada -> 500 com envelope estavel e SEM stack vazada
  ✔ CA3: body que viola o schema Zod -> 400 (validacao, nao 500)
  ✔ CA4: resposta carrega headers do helmet (x-content-type-options: nosniff)
  ✔ CA5: rota inexistente -> 404 com o mesmo envelope estavel
  ✔ CA6: GET /docs/json -> 200 e openapi === "3.1.1"
  ✔ CA7: sendResult traduz Result->HTTP (ok->2xx; err->status mapeado + envelope)
ℹ tests 7 · suites 1 · pass 7 · fail 0 · skipped 0 · duration_ms 547
```

> CA2: o log Pino mostra `{"level":50, ... "stack":"Error: mensagem-interna-secreta ..."}` (correto — stack só no log, **nunca** no body; o teste asserta a ausência).

## Validação adicional

- `pnpm run typecheck` → **EXIT=0** (projeto inteiro verde).
- **Fronteira ADR-0006/0025:30:** `grep -rnE "from ['\"](fastify|zod)" src/ --include="*.ts"` excluindo `src/http/` → **zero matches**. Nenhum import de Fastify/Zod fora da borda.

## Nota de processo

O subagente `fastify-server-expert` foi **interrompido pelo Bug #47936** imediatamente após anunciar "Agora crio o `REPORT.md`:" — todos os testes já estavam verdes e o código entregue. O orquestrador (Claude) validou via filesystem (estrutura, fronteira), re-rodou os testes (7/7) e o typecheck (exit 0), e produziu este REPORT. Reforço da regra: **o orquestrador controla o pipeline state** — o subagente não rodou `pipeline:state` (instrução respeitada).

## Próximo passo

W2 (`code-reviewer`): audit read-only de `src/http/*`, fronteira ADR-0006/0027, envelope/error handler, request-id no ALS, sendResult, contrato OpenAPI 3.1.1.
