# 000 — Request CTR-EMAIL-ADAPTER-RESEND

> **Adapter HTTP do port `EmailSender` via SDK oficial `resend`. Size: M.**
> Segundo adapter de produção do módulo `notifications` (o primeiro foi Nodemailer/SMTP em `CTR-EMAIL-ADAPTER-NODEMAILER` ✅).
> Implementa [ADR-0010](../../../handbook/architecture/adr/0010-email-port-adapter-pattern.md) §"Stubs para Resend e SES prontos para futura migração" (linhas 33, 51, 131) — o ADR já autoriza este adapter; **não requer ADR novo**.

## Justificativa

O ADR-0010 prevê explicitamente Resend como caminho de evolução (`resend.ts # (futuro)`). O port `EmailSender` é agnóstico de transporte — o domínio importa só `send(message) => Promise<Result<EmailReceipt, EmailError>>`. Adicionar o adapter Resend dá ao composition root dos módulos consumers a opção de trocar o provider em 1 linha, sem tocar domínio.

**Resend é API-first (HTTP), não SMTP.** O SDK `resend` faz `POST` para `api.resend.com`. Difere do Nodemailer em um ponto crítico de borda: **`resend.emails.send()` NÃO lança em erro de API** — retorna `{ data, error }`. O adapter precisa inspecionar `result.error` (rejeição estruturada do provider) **além** do `try/catch` (falha de rede/transporte).

## Decisões fixadas neste ticket

- **`resend` como dependency direta** (não devDependency) — adapter é código de produção. SDK traz tipos próprios (sem `@types/resend`).
- **Config via env + parser puro** — `parseResendConfig(env): Result<ResendConfig, ResendConfigError>`. Sem ler `process.env` dentro do adapter; injeção explícita. Espelha `parseSmtpConfig`. Única env obrigatória: `RESEND_API_KEY`.
- **Tradução de erro em duas frentes**, ambas convergindo para o `EmailError` tagged union já existente (`domain/email/types.ts`):
  1. `result.error` (provider respondeu erro estruturado `{ message, name }`) → `mapResendError(error)`.
  2. `catch` (throw do SDK / rede / DNS / timeout) → `{ tag: 'transport-failed' }`.
- **Reuso da tag `smtp-rejected` como bucket "provider rejeitou a requisição"** (validation/auth/rate-limit/quota do Resend). O nome do union diz "smtp" mas semanticamente é "o provider disse não". **Não renomear o union** neste ticket — isso afeta o domínio compartilhado + o adapter Nodemailer (fora de escopo). Registrado em "Não-objetivos".
- **Estratégia de teste espelha o Nodemailer** (não há precedente de `mock.module` no projeto):
  - `parseResendConfig` e `mapResendError` testados **puros** no `pnpm test` (rápidos, sem rede).
  - `send()` real testado em `resend.integration.test.ts` **opt-in** (`NOTIFICATIONS_INTEGRATION=1` + `RESEND_API_KEY` real), entra automático no glob de `test:integration:notifications`.
- **Payload com spread condicional** para `cc`/`bcc`/`html` — `exactOptionalPropertyTypes` proíbe passar chave `undefined` quando o tipo do SDK não admite `| undefined`.

## Escopo

### 1. Dependency

```bash
pnpm add resend
```

### 2. `src/modules/notifications/adapters/email/resend-config.ts`

```ts
export type ResendConfig = Readonly<{ apiKey: string }>;
export type ResendConfigError = Readonly<{ tag: 'missing-env'; field: string }>;
export const parseResendConfig = (
  env: Readonly<NodeJS.ProcessEnv>,
): Result<ResendConfig, ResendConfigError>;
```

Lê: `RESEND_API_KEY` (required, não-vazio).

### 3. `src/modules/notifications/adapters/email/resend.ts`

```ts
import { Resend } from 'resend';
export const createResendEmailSender = (config: ResendConfig): EmailSender => { ... };
export const mapResendError = (error: Readonly<{ message: string; name: string }>): EmailError => { ... };
```

Borda do `send()`:

```ts
try {
  const { data, error } = await client.emails.send(payload);
  if (error !== null) return err(mapResendError(error));
  if (data === null) return err({ tag: 'transport-failed', reason: 'resend returned neither data nor error' });
  return ok({ messageId: data.id, acceptedAt: new Date().toISOString() });
} catch (caught) {
  return err({ tag: 'transport-failed', reason: caught instanceof Error ? caught.message : 'unknown non-Error throw' });
}
```

`mapResendError` (heurística sobre `error.name`/`error.message`):
- recipient inválido (`/invalid.*(to|recipient|address)|missing.*recipient/i`) → `invalid-recipient`
- qualquer outra rejeição estruturada do provider → `smtp-rejected`

### 4. `src/modules/notifications/public-api/index.ts`

Adiciona, **sem remover** os exports do Nodemailer:

```ts
export type { ResendConfig, ResendConfigError } from '../adapters/email/resend-config.ts';
export { parseResendConfig } from '../adapters/email/resend-config.ts';
export { createResendEmailSender } from '../adapters/email/resend.ts';
```

### 5. Tests

```
tests/modules/notifications/adapters/email/resend-config.test.ts      # rápido (pnpm test)
tests/modules/notifications/adapters/email/resend.test.ts             # rápido (pnpm test) — mapResendError puro
tests/modules/notifications/adapters/email/resend.integration.test.ts # opt-in NOTIFICATIONS_INTEGRATION=1 + RESEND_API_KEY
```

## Critérios de aceitação

- **CA1** — `resend-config.ts` exporta `parseResendConfig` puro retornando `Result<ResendConfig, ResendConfigError>`.
- **CA2** — `resend.ts` exporta `createResendEmailSender(config: ResendConfig): EmailSender` que satisfaz o port.
- **CA3** — `resend.ts` exporta `mapResendError` puro; trata as duas frentes (`result.error` estruturado e `catch`).
- **CA4** — `public-api` expõe `createResendEmailSender` + `parseResendConfig` + `ResendConfig`/`ResendConfigError`, sem remover exports do Nodemailer.
- **CA5** — `resend-config.test.ts`: CA-T1 (válido → ok), CA-T2 (`RESEND_API_KEY` ausente → `missing-env`). Rodam em `pnpm test`.
- **CA6** — `resend.test.ts`: CA-T3 (recipient inválido → `invalid-recipient`), CA-T4 (rejeição genérica → `smtp-rejected`). Rodam em `pnpm test`.
- **CA7** — `resend.integration.test.ts`: CA-T5 (send real → `ok(receipt)` com `messageId` UUID) — skip quando `NOTIFICATIONS_INTEGRATION!=1` ou `RESEND_API_KEY` ausente.
- **CA8** — Gates verdes (typecheck/format/lint/`pnpm test` serial; integração skip default).
- **CA9** — ASCII puro nos arquivos source novos.
- **CA10** — `try/catch` apenas no adapter (boundary), convertido para `Result` antes de retornar.
- **CA11** — Dependency `resend` instalada via `pnpm add` (nunca `npm`).

## Não-objetivos

- **Idempotency key / batch / tags / scheduling / webhooks** do Resend — o port `EmailSender.send(message)` não carrega esses campos; idempotência é coberta pelo Outbox (ADR-0010 §"O que NÃO entra no port"). Tickets futuros se a P.O. exigir.
- **Renomear `smtp-rejected` → `provider-rejected`** no `EmailError` union — afeta domínio compartilhado + Nodemailer. Ticket próprio se desejado.
- **Templates `react`/HTML** — application layer dos consumers.
- **Agente `resend-email-expert`** — não há reference `handbook/reference/resend/`; o `nodemailer-email-expert` cobre só SMTP. Fora de escopo.
- **Composition root real** — nenhum use case envia email ainda; adapter exposto para uso futuro.
- **Editar ADR-0010** — já autoriza Resend (anti-padrão #5: não editar ADR aceito).

## Risco / pontos de atenção

1. **`mapResendError` por heurística sobre `error.name`** — os nomes de erro do Resend não estão 100% documentados na API reference; heurística frágil, coberta por testes unitários e validável no integration opt-in.
2. **`resend.emails.send` não lança em erro de API** — divergência de borda vs Nodemailer; o `if (error !== null)` é obrigatório, não opcional.
3. **`exactOptionalPropertyTypes`** — payload construído com spread condicional para `cc`/`bcc`/`html`.
4. **Integração exige API key real** — sem Ethereal-equivalente; CA-T5 só roda com `RESEND_API_KEY` provisionada. Aceitar para v1.
