# W0 — Testes RED — CORE-HTTP-SECURITY-BASELINE

**Wave:** W0 · **Skill:** tdd-strategist · **Outcome:** RED · **Data:** 2026-05-28

## Escrito

`tests/shared/http/security-baseline.test.ts` — CA1–CA6 (CA7 = regressão em `bootstrap.test.ts`):

| CA | Asserção | Mecanismo |
| :-- | :-- | :-- |
| CA3 | `PORT/RATE_LIMIT_MAX` inválido → default (não NaN); `{}` → defaults atuais | unit `readHttpConfig` |
| CA4 | `TRUST_PROXY` → `true`(default)/`false`/CIDR | unit `readHttpConfig` |
| CA5 | `requestTimeout` 30000 / `keepAliveTimeout` 72000 (+override) + repassados ao Fastify (`app.initialConfig`) | unit + inject |
| CA6 | `buildLoggerOptions({}).redact` contém cookie/set-cookie/x-api-key/token/accessToken/refreshToken/secret/authorization/password | unit (função pura) |
| CA1 | `/api/v2/ping` → `cache-control: no-store`; `/health` → 200 isento | inject |
| CA2 | `x-content-type-options: nosniff` (regressão helmet) | inject |

## RED

```
node --test tests/shared/http/security-baseline.test.ts
✖ fail 1  (module load: `buildLoggerOptions` não exportado em #src/shared/http/app.ts;
            HttpConfig sem trustProxy/requestTimeout/keepAliveTimeout)
```

GREEN quando o W1: estender `config.ts` (parse robusto + trustProxy/timeouts), exportar `buildLoggerOptions`
(redact expandido) em `app.ts`, setar `requestTimeout`/`keepAliveTimeout`/`trustProxy` no Fastify e adicionar
`onSend` com `cache-control: no-store` em `/api/v2/*`.
