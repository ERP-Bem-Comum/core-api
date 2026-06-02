# Backend Security Spec — Node.js 24 + TypeScript 6 + Fastify 5

> Spec **normativa** (MUST/SHOULD/MAY) + **regras de auditoria** (padrão ruim → detecção → fix) para a
> borda HTTP e adapters do core-api. Cada regra tem ID `BE-NNN`. Adaptado de openai/skills
> `security-best-practices` ao stack e ADRs do projeto. Citar `handbook/reference/<tech>/<arquivo>.md` ao aplicar.

---

## 0) Boundaries & anti-abuso (MUST)

- **MUST NOT** pedir, imprimir, logar ou commitar secrets (chave de API, client secret, private key, cookie de sessão, JWT, chave de assinatura, credencial S3/Magalu).
- **MUST NOT** "consertar" segurança desligando proteção (afrouxar CORS, remover validação, `secure-json-parse` off, `secure:false` permanente, bypass de authz).
- **MUST** dar findings com evidência: `arquivo:linha` + snippet + impacto.
- **MUST** assumir hostil tudo que cruza trust boundary: HTTP body/query/params/header, env, row de banco, resposta de serviço externo, payload de evento outbox.
- **TLS:** o core-api roda atrás do BFF (ADR-0005/0025). **MUST NOT** reportar falta de TLS/HTTPS no core-api como vulnerabilidade. **MUST NOT** recomendar HSTS. Cookie `Secure` só sob flag de ambiente (quebra dev/local sem TLS).

---

## 1) Input na borda (MUST)

- **BE-001 (MUST):** todo `request.body/query/params/headers` consumido por handler passa por **schema Zod** (shape, ADR-0027) e depois por **smart constructor** do domínio (invariante, ADR-0006) antes de chegar ao use case. `request.body: any`/uso cru ⇒ finding **Alta**.
  - _Detecção:_ handler lê `req.body.<x>` sem `schema` na rota; tipo `any`/`unknown` sem narrowing.
  - _Fix:_ declarar `schema: { body, querystring, params }` (Zod via `fastify-zod-openapi`) + `SmartType.from(raw)` → `Result`.
- **BE-002 (MUST):** `bodyLimit` declarado (default 1 MiB no projeto) — evita DoS por payload gigante. Ver `handbook/reference/fastify/Reference/Server.md`.
- **BE-003 (MUST):** **Prototype Poisoning** — Fastify 5 usa `secure-json-parse` por default; **não** desabilitar. Ler `handbook/reference/fastify/Guides/Prototype-Poisoning.md`. Nunca fazer merge profundo de objeto vindo de input em objeto existente sem proteção de `__proto__`/`constructor`/`prototype`.

## 2) Injection (MUST)

- **BE-010 (MUST):** SQL **sempre** parametrizado via Drizzle/mysql2 (ADR-0020). Template string com input em query ⇒ finding **Crítica**.
- **BE-011 (MUST):** processo externo via `node:child_process` `execFile`/`spawn` com array de args; **nunca** `exec`/`execSync` com string montada de input (command injection). Ver skill `nodejs-process-runner` e `handbook/reference/nodejs/Child processes.md`.
- **BE-012 (MUST):** path/key de storage derivada de input é sanitizada (sem `..`, sem absoluto) — o VO `StorageKey` valida. Path traversal ⇒ **Crítica**.
- **BE-013 (SHOULD):** sem `eval`/`new Function`/`vm` sobre input.

## 3) AuthN / AuthZ (MUST) — ADR-0024

- **BE-020 (MUST):** rota que muda estado exige **access token válido** (verify JWT) + **`authorize(permission)`**; falha → 401/403, **fail-closed**. Rota mutável sem `preHandler` de authn ⇒ **Crítica**.
- **BE-021 (MUST):** **IDOR/BOLA** — além de autenticar, verificar **ownership/escopo** do recurso (`UUID` válido não prova autorização). Ler recurso por id sem checar dono ⇒ **Alta**.
- **BE-022 (MUST):** sessão/refresh conforme auth (refresh opaco `randomBytes`+`sha256`, JWT ES256 curto). Não aceitar `alg:none`; validar `iss`/`aud`/`exp`.
- **BE-023 (SHOULD):** rate-limit em endpoints de auth (login/refresh) — anti brute-force.

## 4) Output (MUST)

- **BE-030 (MUST):** `response` schema com `additionalProperties:false` — não vazar campos do agregado (ex.: hash de senha, refresh token). Ler `handbook/reference/fastify/Reference/Validation-and-Serialization.md`.
- **BE-031 (MUST):** error handler central **nunca** devolve stack trace/mensagem interna ao cliente; envelope estável `{ error: { code, message, requestId } }`. Stack só no log (Pino).

## 5) Crypto (MUST) — `handbook/reference/nodejs/{Crypto,Web Crypto API}.md`

- **BE-040 (MUST):** aleatoriedade de segurança via CSPRNG (`crypto.randomUUID()`, `crypto.randomBytes()`). `Math.random()` para id/token/csrf/nonce ⇒ **Alta**.
- **BE-041 (MUST):** comparação de segredo/token com `crypto.timingSafeEqual` (não `===`).
- **BE-042 (MUST):** senha com argon2 (já no módulo auth); nunca MD5/SHA1 puro para senha.

## 6) Logging & secrets (MUST)

- **BE-050 (MUST):** Pino com `redact` em `req.headers.authorization`, `*.password`, tokens, credenciais. Logar token/PII ⇒ **Alta**. Ver `handbook/reference/fastify/Reference/Logging.md`.
- **BE-051 (MUST):** secret lido de env/secret-file, nunca hardcoded; nunca devolvido em resposta nem serializado em evento.

## 7) Hardening Fastify (MUST/SHOULD) — `handbook/reference/fastify-plugins/`

- **BE-060 (MUST):** `@fastify/cors` com **allowlist explícita**; `origin:true` em prod ⇒ **Alta**.
- **BE-061 (SHOULD):** `@fastify/helmet`; CSP declarada quando servir HTML (no core-api, API-only → CSP menos crítica).
- **BE-062 (SHOULD):** `@fastify/rate-limit` com store externo (Redis) em prod multi-instância; in-memory é inútil com >1 réplica.
- **BE-063 (MUST):** `@fastify/swagger-ui` **não** exposto em prod (só dev/staging via flag).

## 8) SSRF & saída de rede (MUST)

- **BE-070 (MUST):** fetch a URL derivada de input (documento, webhook) com **allowlist** de host/esquema; bloquear IP privado/metadata (169.254.169.254); não seguir redirect a host interno. ⇒ SSRF é **Crítica** em ambiente cloud.

---

## Ordem de auditoria recomendada

1. Bootstrap do server + plugins (helmet/cors/rate-limit/bodyLimit/swagger).
2. Rotas: input validation (Zod+smart constructor), authn/z preHandler, output schema.
3. Persistência: parametrização, ownership nas queries.
4. Storage/rede: keys, pré-assinatura, SSRF.
5. Crypto/logging/secrets.
6. Supply-chain (ver `supply-chain-and-cloud-security.md`).

## Falsos-positivos comuns neste projeto

- "Sem HTTPS/TLS no servidor" → **não é finding** (TLS no BFF, ADR-0005).
- "Cookie sem Secure" em código de dev → ok se houver flag para prod.
- "Sem CSRF token" numa API consumida por BFF com JWT Bearer (não cookie) → CSRF é menos aplicável; confirmar o modelo de sessão antes de reportar.
