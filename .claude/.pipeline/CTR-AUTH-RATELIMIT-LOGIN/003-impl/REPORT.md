# W1 — Implementação (GREEN)

- `composition.ts`: `AuthCompositionConfig.sensitiveRateLimit?: { max, timeWindow }` (default `{5, '1 minute'}` via `DEFAULT_SENSITIVE_RATE_LIMIT`); exposto em `AuthHttpDeps.sensitiveRateLimit`.
- `plugin.ts`: rotas `/login` e `/refresh` recebem `config: { rateLimit: deps.sensitiveRateLimit }` — override por rota do `@fastify/rate-limit` já registrado global (app.ts). `/register` e `/me` seguem o teto global.
- `server.ts`: env `AUTH_LOGIN_RATE_LIMIT_MAX` / `AUTH_LOGIN_RATE_LIMIT_WINDOW` (parse defensivo; ausente → default).

Sem mudança em domínio/application — é hardening na borda HTTP.
