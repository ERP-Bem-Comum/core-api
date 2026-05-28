# W1 — Implementação (GREEN) — CORE-HTTP-SECURITY-BASELINE

**Wave:** W1 · **Agente:** security-backend-expert (skill web-security-backend) · **Outcome:** GREEN · **Data:** 2026-05-28

## Mudanças

### `src/shared/http/config.ts`
- `HttpConfig` ganha `trustProxy: boolean|string`, `requestTimeout: number`, `keepAliveTimeout: number`.
- `parsePositiveInt` (ignora vazio/NaN/negativo → default) + `parsePort` (1..65535) → fim do `NaN` silencioso (CA3).
- `parseTrustProxy` (`true`/`false`/CIDR; default `true`) (CA4).
- `requestTimeout` (REQUEST_TIMEOUT_MS, default 30000) e `keepAliveTimeout` (KEEP_ALIVE_TIMEOUT_MS, default 72000) (CA5).

### `src/shared/http/app.ts`
- **`buildLoggerOptions(env)`** exportada (função pura) — redact expandido: `authorization`, `cookie`, `set-cookie`, `x-api-key`, `*.password`, `*.token`, `*.accessToken`, `*.refreshToken`, `*.secret` (CA6, BE-050).
- `Fastify({ ... trustProxy: config.trustProxy, requestTimeout, keepAliveTimeout, logger: buildLoggerOptions(...) })`.
- Hook **`onSend`**: `cache-control: no-store` quando `req.url` começa com `/api/v2` (CA1).

### `src/server.ts`
- Sem mudança — já repassa `config` (campos novos fluem do `readHttpConfig`).

## Invariantes respeitados (ADR-0005/0025)
- ❌ Nenhum HSTS, força-HTTPS ou TLS adicionado. `trustProxy` default `true` preservado (core atrás do BFF), só configurável.

## Ajuste de teste no W1 (detalhe de API, sem mudar CA)
- CA5: `app.initialConfig` do Fastify expõe `keepAliveTimeout` mas **não** `requestTimeout` — a asserção de `requestTimeout` passou a ser via unit de `readHttpConfig` (já cobria); `keepAliveTimeout` segue via `initialConfig`.
- `dummyApiPlugin` do teste: sem `async` (retorna `Promise.resolve()`) p/ satisfazer `require-await`.

## Evidência GREEN
```
node --test security-baseline.test.ts bootstrap.test.ts  →  16 pass / 0 fail
typecheck / lint / format  →  limpos
```
