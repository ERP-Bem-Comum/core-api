[← Voltar para Infraestrutura](./README.md)

# 📧 Runbook — Envio de E-mail Transacional (deploy operacional)

> **Status:** vigente | **Criado:** 2026-06-20 | Operacionaliza a issue **#135** (follow-up da #117).
> Pré-requisito: o **código já está completo** (ADR-0047). Este runbook cobre o que falta para o
> envio **funcionar em homolog/prod** — provisionamento, DNS, env, migrations no release e worker.

---

## 1. Arquitetura atual (ADR-0047) — leia antes

O e-mail transacional **não** é enviado no request. O caminho é:

```
use case (auth/partners)
  └─ emite evento de domínio na MESMA transação do save  →  auth_outbox | par_email_outbox
                                                                     │
worker `email-dispatch` (processo dedicado, ADR-0041)  ◄────────────┘
  └─ decodifica (auth|partners/public-api) → template → EmailSender.send → SMTP (Umbler) | Resend
```

- **Não existe mais** `notifications_email_outbox` nem `worker:email` — foram **aposentados** (ADR-0047 / `NOTIF-EMAIL-OUTBOX-RETIRE`). O checklist original da #135 está desatualizado nesses pontos; vale **este** runbook.
- Fontes do worker: **`auth_outbox`** (pool `auth`) + **`par_email_outbox`** (pool `partners`). Sem `PARTNERS_DATABASE_URL`, o worker roda só a fonte `auth` (degradação graciosa).
- O worker **não aplica migrations** — isso é responsabilidade do release (passo 5).

## 2. Escolha do provider — Umbler (SMTP) vs Resend (HTTP)

| | Umbler | Resend |
| --- | --- | --- |
| Envio | **SMTP** (`smtp.umbler.com:587` STARTTLS, ou `:465` TLS) | API HTTP |
| Adapter no core-api | `EMAIL_PROVIDER=smtp` (Nodemailer) | `EMAIL_PROVIDER=resend` (`resend.ts`) |
| **Webhook de bounce/complaint** | **❌ Não oferece** | ✅ Sim |

> **Decisão de bounce (#132) — verificado em 2026-06-20:** a API pública da Umbler (`api.umbler.com`,
> spec OpenAPI `/swagger/v1/swagger.json`) expõe **apenas gestão de domínios/contas** (`/v1/emails/*`)
> — **zero** endpoints de `webhook`/`bounce`/`complaint`/`suppression`/`event`/`delivery`. Logo, **bounce
> handling via webhook (#132) NÃO é viável com Umbler.** Para #132: usar **Resend** (já tem adapter +
> webhooks) ou parsing de bounces via IMAP da caixa de retorno. Umbler segue ótima para **envio**.

## 3. Provisionar credencial de envio

- **Umbler (SMTP):** criar caixa/credencial no painel (ex.: `no-reply@dominio`); anotar host/porta/usuário/senha → `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`/`SMTP_USER`/`SMTP_PASS`.
- **Resend (HTTP):** criar API key → `RESEND_API_KEY`.

Secrets (`SMTP_PASS`, `RESEND_API_KEY`) **nunca** no repo — via Secrets Manager (ver [`03-secrets-catalog.md`](./03-secrets-catalog.md) §3.6).

## 4. DNS de deliverability (no domínio remetente)

- **SPF** — TXT em `@`: incluir o provider de envio (Umbler: `include:spf.umbler.com`).
- **DKIM** — TXT do seletor fornecido pelo provider (chave pública).
- **DMARC** — TXT em `_dmarc`: começar `v=DMARC1; p=none; rua=mailto:dmarc@dominio` e endurecer (`p=quarantine`→`p=reject`) após observar relatórios.

## 5. Variáveis de ambiente (release)

Catálogo canônico: [`03-secrets-catalog.md`](./03-secrets-catalog.md) §3.6. Recorte mínimo do worker:

```bash
# Provider + remetente
EMAIL_PROVIDER=smtp                       # smtp | resend | memory
SMTP_HOST=smtp.umbler.com
SMTP_PORT=587
SMTP_SECURE=false                         # false p/ 587 (STARTTLS); true p/ 465
SMTP_USER=no-reply@dominio
SMTP_PASS=<secret>
EMAIL_FROM="Bem Comum <no-reply@dominio>"
# Fontes do worker (auth obrigatório; partners opcional)
AUTH_DATABASE_URL=mysql://...
PARTNERS_DATABASE_URL=mysql://...
```

## 6. Migrations no release

Aplicar **antes** de subir o worker (o worker abre os pools com `applyMigrations: false`):

- `auth` — até a migration do `auth_outbox` (0007+).
- `partners` — até a migration do `par_email_outbox`.

## 7. Subir o worker

```bash
pnpm run worker:email-dispatch     # src/workers/email-dispatch/run.ts — processo dedicado
```

Encerra com SIGTERM/SIGINT (graceful). Exit `78` = erro de config (env inválida); `1` = falha de infra (DB).

## 8. Teste local de SMTP — Mailpit

`docker compose up -d mailpit` sobe um SMTP fake (porta **1025**) + UI web (**8025**). No `.env`:

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
EMAIL_FROM="Dev <dev@local>"
EMAIL_SANDBOX_TO=dev@local          # redireciona TODO e-mail (nunca em prod)
```

Dispare um reset de senha e veja o e-mail capturado em `http://localhost:8025`.

## 9. Validação em homolog (DoD da #135)

- Reset de senha envia e-mail **real** via provider.
- SPF + DKIM + DMARC **verdes** ([mail-tester.com](https://www.mail-tester.com) ≥ 9/10).
- Worker `email-dispatch` rodando como processo dedicado; secrets fora do repo.

## 10. Checklist #135 (corrigido para o modelo ADR-0047)

- [ ] Credencial SMTP Umbler **ou** `RESEND_API_KEY`.
- [ ] DNS: SPF + DKIM + DMARC (`p=none` → endurecer).
- [ ] `AUTH_DATABASE_URL` (+ `PARTNERS_DATABASE_URL`) no deploy.
- [ ] Aplicar migrations `auth` + `partners` no release.
- [ ] Subir `worker:email-dispatch` (~~`worker:email`~~ — não existe mais).
- [ ] CI/local: Mailpit (serviço `mailpit` no compose).
- [ ] `.env.example` consolidado (entregue).
- [ ] mail-tester ≥ 9/10 em homolog.
