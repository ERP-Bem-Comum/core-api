# W0 — Testes (RED) — CORE-HTTP-FASTIFY-BOOTSTRAP (H0)

**Skill:** tdd-strategist · **Data:** 2026-05-28 · **Estado:** RED

`tests/http/bootstrap.test.ts` — 7 casos (CA1-CA7 da 001-spec) exercendo o bootstrap via `app.inject`.

## Resultado RED

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'zod' imported from tests/http/bootstrap.test.ts
✖ tests/http/bootstrap.test.ts
ℹ fail 1
```

Falha no carregamento do arquivo — fail-first por **ausência da API + deps**:
- `#src/http/app.ts` (`buildApp`) e `#src/http/reply.ts` (`sendResult`) ainda não existem.
- A stack Zod (`zod/v4`) só é instalada no W1 (`approve-builds`, ADR-0011) — primeiro import a falhar.

## Cobertura (CA → asserção)

| CA | Asserção |
| --- | --- |
| CA1 | `GET /health` → 200 `{ status: 'ok' }` |
| CA2 | exceção não-tratada → 500, envelope `{ error: { code:'internal', message, requestId } }`, **sem** mensagem interna nem "stack" no body |
| CA3 | body que viola schema Zod → 400, `error.code === 'validation'` |
| CA4 | header `x-content-type-options: nosniff` (helmet) |
| CA5 | rota inexistente → 404, `error.code === 'not-found'` |
| CA6 | `GET /docs/json` → 200, `openapi === '3.1.1'` |
| CA7 | `sendResult(reply, ok(v), {ok})` → 2xx+`v`; `sendResult(reply, err('x-not-found'), {errors})` → 404+envelope |

## Pressão de design sobre o W1 (contrato que o GREEN deve satisfazer)

- `buildApp(opts?): Promise<FastifyInstance>` retornando a instância **com o type-provider Zod** (CA3 registra rota com `schema.body: z.object(...)`).
- Envelope de erro **fixo** `{ error: { code, message, requestId } }`; `internal`/`validation`/`not-found` + string-kebab de domínio.
- `sendResult<T,E>(reply, result, { ok?, errors? })` como helper Result→HTTP.
- `/health` e `/docs/json` na raiz; rotas de negócio sob `/api/v2` (vazio no H0).

## Próximo passo
W1 (`fastify-server-expert`): instalar Fastify v5 + stack Zod via `approve-builds`; implementar `src/http/{app,server,errors,reply,config}.ts` até CA1-CA7 verdes. Criar `handbook/reference/zod/`.

> Nota: `pnpm test` global fica **vermelho** (este arquivo) até o W1 — estado fail-first esperado do H0.
