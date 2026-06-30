# NOTIF-BOUNCE-WEBHOOK-INGEST (M) — ingestão de bounce/complaint via webhook

## Origem

GitHub Issue [#132](https://github.com/ERP-Bem-Comum/.../issues/132) (`needs-decision`, p3) do épico
[#170](https://github.com/ERP-Bem-Comum/.../issues/170). Branch/worktree: `feat/email-bounce-webhook`.

Primeira de **2 fatias** da #132. Esta entrega a **ingestão** (webhook → suppression list).
A segunda — `NOTIF-EMAIL-SUPPRESSION-ENFORCE` — aplica a suppression no envio (decorator sobre
`EmailSender`) e depende desta (precisa da tabela + port de suppression existirem).

ADR-0010 coloca bounce e suppression **fora** do `EmailSender`:

- `handbook/architecture/adr/0010-email-port-adapter-pattern.md:70` — "❌ Bounce handling (provider externo / webhook futuro)."
- `handbook/architecture/adr/0010-email-port-adapter-pattern.md:71` — "❌ Suppression list (decorator separado se necessário)."

## Decisões travadas (do usuário, 2026-06-19)

1. **Webhook agnóstico de provider.** O contrato HTTP normaliza um payload comum
   (`{ type: 'bounce' | 'complaint', recipient, providerMessageId?, occurredAt }`) e a **verificação
   de assinatura** é uma estratégia plugável (`WebhookVerifier`). Entrega **uma** implementação
   concreta real como primeira estratégia (Svix/HMAC sobre raw body — formato do adapter Resend já
   wired no `public-api`). NÃO construir N providers — só o seam + 1 impl (YAGNI controlado).
2. **Suppression por destinatário.** Única tabela `notifications_email_suppression` (chave = endereço
   normalizado). NÃO recriar message-log (o outbox de e-mail foi aposentado — ADR-0047 fatia 02b;
   `schemas/mysql.ts` é `export {}`). A CA literal da #132 "marcar a mensagem como bounced" é
   **relaxada** para "o destinatário entra em suppression", coerente com o envio fire-and-forget atual.

## O que este ticket entrega

1. **Migration `0002`** do módulo `notifications` (prefixo `notifications_*` — ADR-0014; engine/charset
   manual + `utf8mb4_bin` em colunas-chave, conforme nota do `schemas/mysql.ts`). Tabela
   `notifications_email_suppression`: `recipient` (unique, chave natural normalizada lowercase),
   `reason` (`'bounced' | 'complained'`), `provider_message_id` (nullable), `occurred_at`,
   `created_at`. Schema Drizzle em `adapters/persistence/schemas/mysql.ts`.
2. **Port + repo de suppression** (`application/ports/` + `adapters/persistence/`): `suppress(entry)`
   idempotente (insere-ou-ignora via SELECT-then-INSERT — UPSERT nativo proibido por ADR-0020) e
   `isSuppressed(recipient)` (consumido pela fatia 2). Mapeamento row↔domínio com `Result<T, E>`.
3. **Verificador de assinatura plugável** (`adapters/http/` ou `adapters/webhook/`): type `WebhookVerifier`
   = `(rawBody, headers) => Result<NormalizedBounceEvent, WebhookError>`. Uma impl concreta com HMAC
   (timing-safe via `node:crypto.timingSafeEqual`) sobre o **raw body** + janela de timestamp anti-replay.
   Segredo via env (`NOTIFICATIONS_WEBHOOK_SECRET`), nunca logado.
4. **Plugin HTTP** `notifications/adapters/http/` + `public-api/http.ts`, registrado em `src/server.ts`:
   `POST /api/v2/notifications/webhooks/email`. **Content-parser de raw body** (a verificação exige o
   payload cru — o JSON-parser padrão do Fastify destrói o byte-exato). Sem `requireAuth` (endpoint
   público de provider); a autenticação É a assinatura. Schemas Zod + OpenAPI (fastify-zod-openapi,
   ADR-0027).

## Critérios de aceitação (a consolidar na SPEC/W0)

- **CA1 (assinatura inválida):** header de assinatura ausente/errado → **401**, nada gravado.
- **CA2 (bounce válido):** payload `bounce` assinado → **2xx**, destinatário presente em
  `notifications_email_suppression` com `reason='bounced'`.
- **CA3 (complaint válido):** payload `complaint` assinado → **2xx**, `reason='complained'`.
- **CA4 (idempotência):** mesmo webhook entregue 2× (re-delivery do provider) → **2xx** ambas, **1** linha
  na suppression (sem erro de duplicidade).
- **CA5 (anti-replay):** timestamp fora da janela tolerada → **401**.
- **CA6 (evento ignorado):** tipo não-bounce/complaint (ex.: `delivered`) → **2xx** no-op, nada gravado.
- **CA7 (payload malformado, assinatura ok):** corpo assinado mas sem `recipient`/`type` válido → **400**.
- **CA8 (OpenAPI):** `/docs/json` contém `POST /api/v2/notifications/webhooks/email`.
- **CA9 (regressão):** demais módulos/rotas e o worker `email-dispatch` intactos.

## Roteamento por wave (contratos-orchestrator)

- **W0** (RED) — `tdd-strategist`: testes de borda (`fastify.inject` com raw body + assinatura) e do repo.
- **W1** (GREEN) — `fastify-server-expert` (rota + content-parser raw) pareado com `zod-expert`
  (schemas de borda) e `security-backend-expert` (HMAC timing-safe, anti-replay, segredo, endpoint
  público); `drizzle-schema-author` para a tabela/migration.
- **W2** (review) — `code-reviewer` + `security-backend-expert` (read-only).
- **W3** (gate) — `ts-quality-checker`: typecheck + format:check + lint + test.

## Fora de escopo

- **Enforcement no envio** (decorator + wiring no `email-dispatch`) → fatia 2 `NOTIF-EMAIL-SUPPRESSION-ENFORCE`.
- Log de eventos/observabilidade do webhook (auditoria completa) → issue #131.
- Múltiplos providers concretos (só o seam + 1 impl). Provisionar DNS/credencial → issue #135 (infra).
- E2E docker / coleção Bruno → fatia posterior.
