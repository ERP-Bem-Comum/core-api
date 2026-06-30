# CORE-HTTP-SECURITY-BASELINE — hardening inicial do shell HTTP

## Origem

Pedido do usuário (2026-05-28): aplicar as **configs iniciais de segurança** no shell HTTP transversal
(`src/shared/http/`) e no composition root (`src/server.ts`). Primeiro uso aplicado do
[`security-backend-expert`](../../agents/security-backend-expert.md) / skill
[`web-security-backend`](../../skills/web-security-backend/SKILL.md) — referência normativa em
`references/node-fastify-backend-security.md` (regras `BE-NNN`).

## Estado atual (H0 — já existe, NÃO regredir)

- `app.ts`: helmet (CSP off), cors (allowlist do config), rate-limit (+headers), `bodyLimit` 1 MiB,
  `trustProxy: true`, `genReqId` (x-request-id|randomUUID), logger Pino `redact: [authorization, *.password]`,
  error handlers, `/health`, `/docs` (OpenAPI 3.1.1), registro de `routes` sob `/api/v2`.
- `errors.ts`: envelope estável `{ error: { code, message, requestId } }`; stack NUNCA vaza no body.
- `config.ts`: `readHttpConfig(env)` com defaults (port 3000, host 0.0.0.0, cors [], rate 200/min).
- `server.ts`: graceful shutdown (SIGTERM/SIGINT), last-resort handlers.

## Escopo (configs de segurança a aplicar)

1. **`redact` Pino expandido (BE-050):** somar `req.headers.cookie`, `res.headers["set-cookie"]`,
   `req.headers["x-api-key"]`, `*.token`, `*.accessToken`, `*.refreshToken`, `*.secret`.
2. **Timeouts de servidor (anti-DoS):** `requestTimeout` configurável (default 30000ms); `keepAliveTimeout`
   explícito (default 72000ms). Via `config.ts`/env.
3. **`trustProxy` configurável (anti IP-spoof):** ler de env (`TRUST_PROXY`: `true`|`false`|CSV de CIDR);
   default mantém `true` (atrás do BFF), mas documenta que prod deve usar o CIDR do BFF.
4. **Validação robusta de `config.ts`:** `PORT`/`RATE_LIMIT_MAX` inválido (NaN) → erro claro ou default
   seguro, nunca `NaN` silencioso.
5. **`Cache-Control: no-store` (onSend):** default em respostas de `/api/v2` (evita cache de dado sensível
   em proxy/browser). `/docs` e `/health` isentos se necessário.

## Critérios de aceitação (detalhados na 001-spec/SPEC.md)

- **CA1:** resposta de `/api/v2/*` carrega `Cache-Control: no-store`; `/health` segue 200.
- **CA2:** headers de segurança do helmet permanecem (`x-content-type-options: nosniff`) — sem regressão.
- **CA3:** `readHttpConfig` com `PORT`/`RATE_LIMIT_MAX` inválido → comportamento determinístico (erro ou default), nunca `NaN`.
- **CA4:** `trustProxy` reflete `TRUST_PROXY` do env (true/false/CIDR); default preserva comportamento atual.
- **CA5:** `requestTimeout` aplicado (config); `keepAliveTimeout` explícito.
- **CA6 (redact):** verificável — config do logger inclui os novos paths (token/cookie/secret). (Asserção por inspeção do options ou log capturado.)
- **CA7 (regressão):** os 7 CAs do H0 (`bootstrap.test.ts`) seguem verdes; suíte sem regressão.

## Fora de escopo (respeita invariantes)

- **HSTS / forçar HTTPS / TLS** — TLS termina no BFF (ADR-0005/0025).
- **CSP completa p/ HTML** — API-only; `/docs` é dev-only.
- **Cookies `Secure`** — não há cookies no shell ainda (sessão é do auth).
- **AuthN/AuthZ preHandler** — H2 `AUTH-HTTP-AUTHZ-HOOK`.
- **Rate-limit específico de rotas de auth** — H1 `AUTH-HTTP-ROUTES`.

## Notas

- **Skill:** `web-security-backend` (+ agente `security-backend-expert`). Pipeline W0→W3, SPEC formal (risco: segurança + nova superfície).
- ESLint: `src/shared/http/**` já tem as folgas de adapter. Idioma: código EN, doc PT-BR.
