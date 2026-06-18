# NOTIF-EMAIL-OUTBOX — entrega confiável de e-mail via outbox + worker

> Origem: GitHub issue **#117** (`[notifications] e-mail transacional via Umbler (SMTP)`).
> Recorte acordado com o autor: o **núcleo** da #117 já está entregue (`EmailSender` port,
> adapter Nodemailer SMTP = adapter Umbler, `parseSmtpConfig`, mock InMemory, adapter Resend HTTP,
> wiring por env no `auth/composition`, ligado no `forgot-password` com anti-enumeração). O gap de
> código de maior valor é a **entrega confiável assíncrona**: hoje o envio é **síncrono no request**
> (`auth/.../request-password-reset.ts:86`). Este ticket entrega o **outbox de e-mail + worker**.

## Tamanho

**L** — introduz a primeira camada de **persistência** no módulo `notifications` (hoje só port/adapter
de envio, sem schema/migrations), reusando a infra genérica `#src/shared/outbox`.

## Objetivo

Tornar o envio de e-mail **desacoplado do request** e **resiliente a falha do SMTP**: a intenção de
envio é gravada numa tabela `notifications_email_outbox`; um **worker dedicado** lê o backlog, chama
`EmailSender.send` com **retry + backoff** e marca `processed`/`failed`/dead-letter. Reusa o worker
genérico `runOnce<P>`/`runLoop<P>` com `P = EmailMessage` (delivery = `EmailSender.send`).

## Decisões de design travadas

1. **Reuso do outbox genérico** (`#src/shared/outbox`): `EventDelivery<EmailMessage>`,
   `WorkerOutboxOps`, `runLoop`. `rowToProcessed` desserializa `payload` (JSON da `EmailMessage`).
   Molde: `partners/worker/*` + `partners/application/ports/outbox.ts`.
2. **Isolamento por prefixo (ADR-0014):** tabela `notifications_email_outbox`. Novo
   `drizzle.config.notifications.ts` + script `db:generate:notifications` + migration **`0000`**
   (módulo virgem → **sem colisão** com `partners`/`contracts` 0009-0015; cada módulo tem
   numeração própria — confirmado).
3. **Mapeamento canônico (ADR-0020):** `id` UUID `varchar(36)`; sem JSON nativo → `payload`
   `text`/`longtext` com JSON serializado pela aplicação; `idempotencyKey` `varchar` com
   `uniqueIndex` (dedup); timestamps decompostos; sem `ENUM` nativo → `status` `varchar` validado
   no mapper (`row → domínio` retorna `Result`).
4. **Port produtor** `EmailOutbox` (application, `type` Readonly de funções):
   `enqueue(message: EmailMessage, idempotencyKey: string) => Promise<Result<{ eventId }, EmailOutboxError>>`.
   Adapters: `InMemory` (testes) + `Drizzle` (mysql).
5. **Piloto:** `PasswordResetMailer` passa a **enfileirar** (não enviar síncrono). O envio real migra
   para o worker. Anti-enumeração preservada (rota responde **202** sempre; nada vaza se a conta
   não existe). **Atomicidade total** (enqueue na MESMA transação do save do reset-token) fica como
   melhoria de follow-up — nesta fatia o enqueue é best-effort pós-save (mantém a garantia atual e
   **adiciona** retry assíncrono no envio). Decisão a confirmar em W2.
6. **Worker standalone** `notifications/worker/run.ts` (+ `outbox-worker.ts`, `config.ts`), molde
   `partners/worker/run.ts`; `applyMigrations: false` (release aplica). Script `worker:email`.

## Fora de escopo (follow-up — abrir issues/tickets próprios)

- Migrar `invite-mailer` e `collaborator-invite-mailer` para o outbox (mesma técnica do piloto).
- Env `EMAIL_PROVIDER` explícita (`umbler|memory|resend`) + `EMAIL_SANDBOX_TO` (redirect não-prod).
- Observabilidade por e-mail (status `queued/sent/failed/bounced`), rate-limit por destinatário, bounce.
- **Operacional (não-código, do autor/ops):** caixa SMTP na Umbler + `SMTP_PASS`; publicar
  SPF/DKIM/DMARC; teste de envio real em homolog; CI com Mailpit.

## Critérios de aceite (Dado / Quando / Então)

- **CA1 — enqueue persiste.** Dado uma `EmailMessage` válida e uma `idempotencyKey`, Quando
  `EmailOutbox.enqueue` é chamado, Então uma linha `notifications_email_outbox` é criada com
  `processedAt = null`, `attempts = 0` e `payload` = JSON da mensagem.
- **CA2 — idempotência.** Dado uma `idempotencyKey` já enfileirada, Quando `enqueue` é chamado de
  novo com a mesma chave, Então retorna erro `duplicate`/no-op (sem segunda linha) — `uniqueIndex`.
- **CA3 — worker entrega.** Dado uma linha pendente, Quando o worker roda uma iteração com um
  `EmailSender` que aceita, Então `EmailSender.send` é chamado com a `EmailMessage` desserializada e
  a linha é marcada `processed` (`processedAt != null`).
- **CA4 — retry.** Dado um `EmailSender` que falha (`transport-failed`), Quando o worker roda e
  `attempts + 1 < maxAttempts`, Então a linha é marcada `failed` com `attempts` incrementado e
  **permanece pendente** para nova tentativa.
- **CA5 — dead-letter.** Dado `attempts + 1 >= maxAttempts`, Quando a entrega falha de novo, Então a
  linha vai para dead-letter (não é re-tentada).
- **CA6 — payload corrupto → DLQ.** Dado uma row cujo `payload` não desserializa em `EmailMessage`,
  Quando o worker a processa, Então vai direto para dead-letter (sem consumir tentativa).
- **CA7 — piloto reset.** Dado um usuário existente e ativo, Quando `requestPasswordReset` roda,
  Então uma linha de e-mail é enfileirada (não há envio síncrono) e a rota responde **202**.
- **CA8 — anti-enumeração preservada.** Dado um e-mail inexistente/malformado/inativo, Quando
  `requestPasswordReset` roda, Então **nada** é enfileirado e a resposta continua **202**.

## Definition of Done (gate W3)

`pnpm run typecheck` + `pnpm run format:check` + `pnpm run lint` + `pnpm test` **verdes**.
Migration `0000` do notifications gerada e versionada. Sem `npm` em nenhum doc/script (ADR-0012).
Cobertura: domain/mapper (unit) + worker (integração com `EmailSender` fake) + piloto reset (unit).
