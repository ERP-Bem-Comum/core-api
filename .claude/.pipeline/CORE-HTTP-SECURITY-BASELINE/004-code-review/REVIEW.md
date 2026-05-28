# Code Review — CORE-HTTP-SECURITY-BASELINE — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (+ lente web-security-backend)
**Data:** 2026-05-28
**Escopo:** `src/shared/http/config.ts`, `src/shared/http/app.ts`, `tests/shared/http/security-baseline.test.ts`

---

## Verificação

| Item | Resultado |
| :-- | :-- |
| BE-050 (redact de secrets em log) | ✅ `buildLoggerOptions` cobre authorization/cookie/set-cookie/x-api-key/token/accessToken/refreshToken/secret/password |
| Anti-DoS (timeouts) | ✅ `requestTimeout`/`keepAliveTimeout` configuráveis e aplicados |
| Anti IP-spoof (trustProxy) | ✅ configurável (`TRUST_PROXY`), default `true` preservado |
| Config resiliente | ✅ `parsePositiveInt`/`parsePort` eliminam `NaN`; env malformado → default (não derruba boot) |
| No-cache de dado sensível | ✅ `onSend` → `cache-control: no-store` só em `/api/v2/*` (health/docs isentos) |
| Invariante TLS no BFF (ADR-0005/0025) | ✅ nenhum HSTS/TLS/força-HTTPS adicionado |
| Sem dep nova (ADR-0011) | ✅ usa Fastify/Pino já presentes |
| Regras absolutas (throw/class/any) | ✅ funções puras, sem `any`; `trustProxy` tipado `boolean\|string` |
| Sem regressão (CA7) | ✅ os 7 CAs do H0 verdes; suíte 1412 pass / 0 fail |

## Observações (não-bloqueantes)
- `parseTrustProxy` aceita CSV de CIDR como string única — Fastify aceita string de hops; se um dia precisar `string[]`, estender o parse. OK por ora.
- `onSend` usa `req.url.startsWith('/api/v2')` — cobre o prefixo das rotas de negócio; query string não afeta. Adequado.
- Ajuste de teste no W1 (initialConfig não expõe `requestTimeout`) é legítimo — o CA continua coberto pelo unit de config.

## O que está bom
- `buildLoggerOptions` extraído como função pura → CA6 testável sem captura frágil de log.
- Defaults preservam o comportamento do H0 (zero surpresa em dev); tudo overridable por env.
- Escopo cirúrgico: só `config.ts`/`app.ts`, `errors.ts`/`server.ts` intactos.

## Issues
Nenhuma 🔴 / 🟡 / 🔵.

## Próximo passo
APPROVED → W3 (gate já verde).
