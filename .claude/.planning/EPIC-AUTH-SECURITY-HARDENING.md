# Épico — Auth Security Hardening (itens pesados)

> **Origem:** `specs/003-auth-security-hardening/spec.md` (auditoria OWASP WSTG/ASVS).
> **Quick wins entregues:** BE-REC-002, 004, 005 — ticket `CTR-AUTH-HARDENING-QUICKWINS`.
> **Este épico:** os 2 itens 🔴 que exigem design antes de codar.

## BE-REC-001 — Rate-limit/lockout dedicado de login e refresh

### Estado hoje
Rate-limit único global (200/min/IP, in-memory). Sem limite dedicado em `/login`/`/refresh`, sem account lockout.

### Decisões de design a tomar
1. **Modelo do lockout (DD-USER-06):** o design-decisions diz que *"lockout/`failedAttempts` moram na camada de sessão"*. Confirmar/expandir: agregado/tabela `auth_login_attempt` (por conta + por IP) vs campo no `User`. Preferir **cooldown temporário progressivo**, não bloqueio permanente — evitar "lockout como DoS" da conta da vítima.
2. **Rate-limit por rota:** `@fastify/rate-limit` com config dedicada em `/login` e `/refresh` (poucas/min por IP), separada do teto global. Onde parametrizar (`shared/http/config.ts`).
3. **Password spraying:** combinar limite por IP/origem **e** contador por conta (spraying erra pouco por conta).
4. **Store distribuído (prod):** Redis para o rate-limit sobreviver a múltiplas instâncias/reinícios (hoje in-memory). Decidir se entra agora ou fica como follow-up de infra.

### Esboço de tickets
- ✅ `CTR-AUTH-RATELIMIT-LOGIN` — **ENTREGUE (closed-green, 2026-05-30)**. Limite dedicado 5/min em `/login` e `/refresh` via `config.rateLimit` por rota; configurável por `AuthCompositionConfig.sensitiveRateLimit` e env `AUTH_LOGIN_RATE_LIMIT_MAX`/`_WINDOW`.
- ✅ `CTR-AUTH-ACCOUNT-LOCKOUT` — **ENTREGUE (closed-green, 2026-05-30)**. Domínio `AccountLockout` (cooldown progressivo 5→1/5/15/60min, sempre temporário) na camada de sessão (DD-USER-06); port `LoginLockoutStore` + InMemory; integrado ao `authenticateUser` (cooldown → resposta genérica + verify dummy). Configurável via `AuthCompositionConfig.lockoutPolicy`.
- `CTR-AUTH-LOCKOUT-PERSISTENCE` — **NOVO follow-up**: adapter Drizzle do `LoginLockoutStore` (`auth_login_lockout`) — hoje in-memory (não compartilha entre instâncias / não sobrevive a restart). Pode casar com `CTR-AUTH-RATELIMIT-REDIS` (mesma necessidade de store compartilhado).
- `CTR-AUTH-RATELIMIT-REDIS` — store distribuído (depende de infra Redis; follow-up).

## BE-REC-003 — Fluxo de reset/recuperação de senha

### Estado hoje
Não existe. Rotas auth: register, login, refresh, logout, me.

### Decisão tomada (AskUserQuestion 2026-05-30)
**Entrega do token via EmailPort (Nodemailer) no core-api.** O auth passa a consumir
`notifications/public-api` (`EmailSender`, ADR-0010/0006) — integração cross-módulo nova.

### Decisões de design restantes
1. **Modelo do token:** VO `PasswordResetToken` — alta entropia (`randomBytes`), **TTL curto** (~15-30 min), **one-time** (invalida após uso), hash persistido (nunca o token em claro no banco, como o refresh).
2. **Persistência:** tabela `auth_password_reset` (token_hash, user_id, expires_at, used_at). Prefixo `auth_*`.
3. **Origem confiável:** a URL do link vem de **config do servidor** (`AUTH_RESET_BASE_URL`), **nunca** do header `Host`/`X-Forwarded-Host` (anti Host-Header-Injection).
4. **Anti-enumeração:** `POST /forgot-password` responde **sempre** igual (202/200 genérico), exista a conta ou não.
5. **Pós-reset:** invalidar **todas as sessões** (reusar `revokeAllSessionsForUser`, já existe) + invalidar outros tokens de reset pendentes.
6. **Template de email:** definir no módulo notifications; auth dispara via port.

### Esboço de tickets
- ✅ `CTR-AUTH-RESET-TOKEN` — **ENTREGUE (closed-green, 2026-05-30)**. Domínio puro `PasswordResetToken` (one-time + TTL, estados pending>expired>used, `consume`) + `PasswordResetTokenId`, em `domain/session/`. Espelha RefreshToken.
- ✅ `CTR-AUTH-RESET-PERSISTENCE` — **ENTREGUE (closed-green, 2026-05-30)**. Port `PasswordResetTokenRepository` + InMemory + schema `auth_password_reset` + mapper + repo Drizzle + migration `0001` (hardening manual). Integração MySQL **pendente** (porta 3306 ocupada). O minter (`randomBytes`+sha256) foi movido para o `CTR-AUTH-RESET-REQUEST`.
- ✅ `CTR-AUTH-RESET-REQUEST` — **ENTREGUE (closed-green, 2026-05-30)**. Minter (port+node) + port/adapter `PasswordResetMailer` (consome `notifications/public-api`) + use case `requestPasswordReset` (anti-enumeração, invalida pendentes, origem confiável) + rota `POST /forgot-password` (sempre 202, rate-limit). Mailer real (Nodemailer) **pendente** (no-op seguro sem SMTP; adapter pronto). Integração MySQL pendente.
- ✅ `CTR-AUTH-RESET-CONFIRM` — **ENTREGUE (closed-green, 2026-05-30)**. Use case `confirmPasswordReset` (lookup por hash, valida senha antes de consumir, `consume` one-time+TTL, `User.changePassword`, marca token usado, **revoga todas as sessões**) + rota `POST /reset-password` (204/400/422/403).

> **BE-REC-003 (cadeia de reset) COMPLETA — toda a spec 003 entregue.** Follow-ups:
> - ✅ `CTR-AUTH-RESET-MAILER-SMTP` — **ENTREGUE (closed-green, 2026-05-30)**. `buildResetMailer(env)` fia o Nodemailer real (SMTP_* + `AUTH_RESET_FROM`) ou no-op seguro. Reset funciona ponta-a-ponta com SMTP.
> - ⏳ store compartilhado Redis p/ rate-limit+lockout; `CTR-AUTH-LOCKOUT-PERSISTENCE` (Drizzle); validar integração MySQL (porta 3306).

## Sequência sugerida
1. BE-REC-001 rate-limit por rota (rápido, alto valor 🔴).
2. BE-REC-003 reset (token → persistência → request → confirm).
3. BE-REC-001 account lockout (modelo de domínio).
4. BE-REC-001 Redis (follow-up de infra).
