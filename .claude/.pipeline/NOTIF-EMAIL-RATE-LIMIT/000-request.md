# NOTIF-EMAIL-RATE-LIMIT — rate-limit de envio por destinatário (anti-abuso)

## Contexto
Issue **#133** (follow-up #117, Fase 2 go-live #246). Sem teto por destinatário, um fluxo (reset/convite)
pode floodar um inbox. Decisão do dono (2026-07-08): **descartar** o excedente (anti-flood) — o e-mail
não sai e o worker marca a row como processada (sem retry/DLQ).

## Design (decorator no EmailSender — ADR-0010 §"Decorators opcionais")
Molde: `withSandboxRedirect`. Autocontido em `notifications`, single-instance (Valkey deferido — ADR-0030).

1. **`EmailError`** (`domain/email/types.ts`): novo membro `| { tag: 'rate-limited'; reason: string }`.
2. **`withRateLimit(sender, policy, now)`** (`adapters/email/rate-limit.ts`): sliding window **in-memory**
   por destinatário (`to`, lowercased). Se algum destinatário já atingiu `maxPerWindow` na `windowMs` →
   retorna `err({ tag: 'rate-limited' })` **sem** delegar. Dentro do limite → registra timestamp + delega.
3. **`email-event-delivery.ts`**: `send` → `rate-limited` vira **`ok(undefined)`** (descarte processado,
   não `deliveryUnavailable`) — o worker não retenta nem manda p/ DLQ.
4. **`build-email-sender.ts`**: monta o decorator quando `EMAIL_RATE_LIMIT_MAX` está setado.
5. **Env:** `EMAIL_RATE_LIMIT_MAX` (int) + `EMAIL_RATE_LIMIT_WINDOW_MS` (int, default ex. 3600000). Ausente = sem rate-limit.

## Critérios de aceite
- **CA1** N envios ao MESMO destinatário na janela: o (N+1)-ésimo retorna `err rate-limited`, sem chamar o inner sender.
- **CA2** destinatários DISTINTOS têm orçamentos independentes (sem efeito cruzado).
- **CA3** após a janela expirar (avançar o clock), o destinatário volta a enviar.
- **CA4** dentro do limite, delega ao inner sender (envia normal).
- **CA5** no delivery, `rate-limited` → `ok` (processado/descarte), **não** retry/DLQ; demais EmailError seguem indo p/ DeliveryError.
- **CA6** anti-enumeração preservada: o rate-limit é assíncrono (worker/sender), não muda a resposta ao usuário no request.
- **CA7** gate W3 verde; sem regressão.

## Pipeline
W0 `tdd-strategist` (RED decorator + delivery) → W1 `ts-domain-modeler` (EmailError) + decorator + wiring →
**W2 auditoria de segurança:** skill `code-reviewer` (qualidade) **+ agente `security-backend-expert` +
skill `web-security-backend` + MCP `mcp__security` (search_security_docs)** — auditar o anti-abuso:
janela deslizante correta (sem off-by-one/bypass), **anti-enumeração** preservada (resposta ao usuário
não muda), sem vazar em log, sem efeito cruzado entre destinatários, e limites de recurso (o Map
in-memory não cresce sem teto). → W3 `ts-quality-checker`. Validação: unit (clock fake) + opcional e2e Mailpit/x99.

## Fora de escopo
Persistência do estado (in-memory basta p/ single-instance); rate-limit no adapter Resend (só cadeia SMTP/geral);
mudar o adapter Nodemailer (SES em prod intocado).
