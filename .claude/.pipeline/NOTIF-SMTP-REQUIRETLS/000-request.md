# NOTIF-SMTP-REQUIRETLS — STARTTLS obrigatório no adapter SMTP (hardening)

## Contexto

Achado da auditoria de e-mail (Q.A. prod 2026-07-02, avaliação do `nodemailer-email-expert`): em `src/modules/notifications/adapters/email/nodemailer.ts:49-54`, o `baseOpts` do transport não seta `requireTLS`. Com `SMTP_SECURE=false` (porta 587), o STARTTLS do Nodemailer é **oportunista**: só negocia TLS se o servidor anunciar suporte — um MITM que suprima o anúncio faz a conexão degradar para texto claro sem erro. Isso contraria o invariante do próprio agente nodemailer do projeto ("TLS obrigatório… nunca `secure: false` + `requireTLS: false` em prod"). Produção usa SES via SMTP 587/STARTTLS.

## Escopo (mínimo)

1. `nodemailer-config.ts`: nova env `SMTP_REQUIRE_TLS` — default **`true` quando `SMTP_SECURE=false`** (fail-secure); opt-out explícito `SMTP_REQUIRE_TLS=false` para SMTP local sem TLS (Mailpit). Irrelevante quando `secure=true` (TLS implícito, porta 465).
2. `nodemailer.ts`: repassar `requireTLS` ao `createTransport`.
3. `compose.yaml`: serviço `email-dispatch` (aponta para Mailpit `:1025` sem TLS) ganha `SMTP_REQUIRE_TLS=false` — dev local continua funcionando.
4. Docs: `.env.example` (via `git apply` — `.env*` é bloqueado a Read/Edit) + `handbook/infrastructure/03-secrets-catalog.md` §3.6.

**Fora do escopo:** `rateLimit`/`rateDelta` do pool (achado separado, latente), mudança de provider, allowlist do From (ticket futuro).

## Critérios de aceite

- CA1 — **Dado** `SMTP_SECURE=false` e `SMTP_REQUIRE_TLS` ausente, **Quando** a config é parseada, **Então** `requireTLS === true` (default fail-secure) e o transport recebe `requireTLS: true`.
- CA2 — **Dado** `SMTP_REQUIRE_TLS=false` explícito, **Então** `requireTLS === false` (opt-out consciente, dev/Mailpit).
- CA3 — **Dado** `SMTP_SECURE=true` (465), **Então** o comportamento atual é preservado (TLS implícito; `requireTLS` não interfere).
- CA4 (erro) — **Dado** `SMTP_REQUIRE_TLS=banana`, **Então** a config é rejeitada com erro nomeando a env (mesmo padrão fail-fast do `parseSmtpConfig`), OU documentadamente tratada como default — decisão do W0/W1 registrada.
- CA5 — Testes existentes do adapter/config não regridem (contagem ≥ baseline).

## Processo (regras duras desta worktree)

- TODA wave despachada pelo harness (contratos-orchestrator → skill/especialista); sessão principal só orquestra/persiste.
- Identificadores novos: **EN**, auditados um a um no W2 (nunca "consistência com legado" como critério).
- Sem Docker, sem test:integration nesta sessão (migração de banco do humano em andamento). Validação e2e do Mailpit fica para o ticket de CI.
- Baseline: typecheck da dev HEAD segue vermelho no ETL alheio (ver ticket `AUTH-EMAIL-LINK-BASE-URLS`); W3 deste ticket herda a mesma ressalva/condição de fechamento.
