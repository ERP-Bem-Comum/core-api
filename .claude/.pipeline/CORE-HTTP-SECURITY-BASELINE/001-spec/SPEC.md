# SPEC — Hardening inicial do shell HTTP (`CORE-HTTP-SECURITY-BASELINE`)

> **Tipo:** ticket · **Size:** M · **Épico-pai:** `EPIC-HTTP-CORE-API`
> **Status da spec:** aprovada (2026-05-28, Gabriel)
> **ADRs tocados:** `ADR-0005`/`0025` (TLS no BFF), `ADR-0028` (shell em `src/shared/http`), `ADR-0011` (deps), `ADR-0027` (Zod borda)

## 1. Problema & contexto

O shell HTTP (H0, relocado em `src/shared/http/`) já traz helmet/cors/rate-limit/bodyLimit/redact-parcial/error-handler.
Faltam **configs de baseline de segurança** que a skill [`web-security-backend`](../../../skills/web-security-backend/SKILL.md)
(reference `node-fastify-backend-security.md`) prescreve: redact completo de secrets em log (BE-050), timeouts
anti-DoS, `trustProxy` não-cego (anti IP-spoof), validação de config e `Cache-Control: no-store`. Endurecer **antes**
das rotas reais (H1) é mais barato que retrofit. Respeita os invariantes do projeto (TLS no BFF; API-only).

## 2. User stories

- Como **operador**, quero que logs nunca contenham token/cookie/secret, para não vazar credencial em observabilidade.
- Como **dev/ops**, quero timeouts e `trustProxy` configuráveis, para resistir a slowloris e impedir spoof de IP que burla o rate-limit.
- Como **mantenedor**, quero config de HTTP validada, para falhar cedo e claro em vez de subir com `NaN`.

## 3. Critérios de aceitação (viram os testes do W0 — via `app.inject` / unit de config)

- **CA1** — resposta de uma rota sob `/api/v2/*` carrega `cache-control: no-store`; `GET /health` → **200** `{status:'ok'}` (sem regressão).
- **CA2** — headers helmet permanecem: `x-content-type-options: nosniff` presente (sem regressão H0).
- **CA3** — `readHttpConfig({ PORT: 'abc' })` e `{ RATE_LIMIT_MAX: 'x' }` → comportamento **determinístico**: cai no default seguro (não `NaN`). `readHttpConfig({})` → defaults atuais.
- **CA4** — `readHttpConfig({ TRUST_PROXY: 'false' })` → `trustProxy:false`; `{ TRUST_PROXY: '10.0.0.0/8' }` → string CIDR; ausente → default `true`.
- **CA5** — `readHttpConfig` expõe `requestTimeout` (default 30000) e `keepAliveTimeout` (default 72000); `buildApp` os repassa ao Fastify (verificável: `app.initialConfig`/server options ou inject de timeout).
- **CA6** — a config do logger passada ao Fastify inclui os paths de redact novos (`cookie`, `set-cookie`, `x-api-key`, `*.token`, `*.accessToken`, `*.refreshToken`, `*.secret`) — asserção sobre o options exportado (refatorar para um `buildLoggerOptions` testável) ou via log capturado.
- **CA7 (regressão)** — `tests/shared/http/bootstrap.test.ts` (7 CAs do H0) segue verde; `pnpm test` sem regressão.

## 4. Não-objetivos / fora de escopo

- HSTS / forçar HTTPS / TLS (TLS no BFF — ADR-0005/0025).
- CSP completa p/ HTML; cookies `Secure` (sem cookies no shell ainda).
- AuthN/AuthZ preHandler (H2); rate-limit de rotas de auth (H1).
- Rate-limit com store externo (Redis) — fica para deploy/prod (config), não código agora.

## 5. Clarificações (Q&A resolvidas)

- **Q:** `trustProxy` default muda de `true`? · **R:** **Não** — mantém `true` (o core fica atrás do BFF). Torna-se **configurável** (`TRUST_PROXY`), com doc recomendando CIDR do BFF em prod. Evita regressão em dev. (2026-05-28.)
- **Q:** `Cache-Control: no-store` global ou só `/api/v2`? · **R:** só **`/api/v2/*`** (rotas de negócio com dado sensível); `/health` e `/docs` isentos. (2026-05-28.)
- **Q:** config inválida → erro ou default? · **R:** **default seguro** (resiliência operacional) + log de warn; não derrubar o boot por env malformado. (2026-05-28, revisável.)
- **Q:** Redact é testável? · **R:** Sim, extraindo `buildLoggerOptions(env)` puro e assertando os `redact` paths — evita depender de captura de log frágil. (2026-05-28.)

## 6. Plano técnico de alto nível (sem código)

```
config.ts
  + parse robusto: parseIntSafe(raw, default) → ignora NaN; valida port 1..65535
  + requestTimeout (REQUEST_TIMEOUT_MS, default 30000)
  + keepAliveTimeout (KEEP_ALIVE_TIMEOUT_MS, default 72000)
  + trustProxy (TRUST_PROXY: 'true'|'false'|CSV de CIDR → boolean|string|string[])
  HttpConfig estende com os campos novos.

app.ts
  + buildLoggerOptions(): redact expandido (cookie, set-cookie, x-api-key, *.token,
    *.accessToken, *.refreshToken, *.secret, authorization, *.password) — função testável.
  + Fastify({ ..., requestTimeout, keepAliveTimeout, trustProxy: config.trustProxy })
  + onSend hook: set 'cache-control: no-store' quando req.url começa com '/api/v2'.

(errors.ts / server.ts: sem mudança de comportamento; server.ts só repassa config.)
```

- **Reuso:** sem dep nova. `Result`/smart-constructor não se aplicam a config de shell (parse defensivo + default).
- **Testabilidade:** extrair `buildLoggerOptions` e o parse de `trustProxy`/timeouts como funções puras em `config.ts` para CAs unitários (CA3/CA4/CA5/CA6) + `inject` para CA1/CA2/CA7.

## 7. Constitution check

| Fonte | Exigência | Como adere |
| :-- | :-- | :-- |
| `ADR-0005/0025` | TLS no BFF; core HTTP interno | ❌ não adiciona HSTS/TLS; `trustProxy` configurável reconhece o proxy BFF |
| `ADR-0028` | shell em `src/shared/http`; root `src/server.ts` | toca só esses arquivos; sem rota de feature |
| `ADR-0027` | Zod só na borda | config de shell não usa Zod no domínio; parse defensivo local |
| `ADR-0011` | sem dep nova sem auditoria | nenhuma dep nova (usa Fastify/Pino já presentes) |
| `web-security-backend` (BE-050) | redact de secrets no log | redact expandido (CA6) |
| reference `BE-002`/anti-DoS | bodyLimit + limites | mantém bodyLimit; soma timeouts (CA5) |

## 8. Riscos & mitigações

| Risco | Sev. | Mitigação |
| :-- | :-- | :-- |
| Mudar `trustProxy` quebrar rate-limit por IP em dev | média | default permanece `true`; só configurável (CA4) |
| `requestTimeout` curto cortar requisição legítima lenta | média | default 30s (folgado); configurável por env |
| `no-store` em rota que poderia cachear | baixa | escopo só `/api/v2`; `/health`/`/docs` isentos (CA1) |
| Redact frágil de testar via log | baixa | extrair `buildLoggerOptions` puro e assertar paths (CA6) |
| Regressão nos 7 CAs do H0 | média | CA7 roda `bootstrap.test.ts` + suíte |

## 9. Definition of Done

- [ ] CA1–CA7 verdes (W0→W3).
- [ ] `redact` cobre token/cookie/secret; `trustProxy`/timeouts configuráveis; config sem `NaN`.
- [ ] `Cache-Control: no-store` em `/api/v2/*`.
- [ ] `pnpm test` + `typecheck` + `format:check` + `lint` verdes; sem dep nova.
- [ ] Nada de HSTS/TLS adicionado (invariante ADR-0005).
