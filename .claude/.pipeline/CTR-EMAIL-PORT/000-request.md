# 000 — Request CTR-EMAIL-PORT

> **Primeiro ticket do módulo `notifications`. Size: S.**
> Cria o port `EmailSender` (types + smart constructors + InMemory adapter) sem tocar Nodemailer.
> Implementa [ADR-0010](../../../handbook/architecture/adr/0010-email-port-adapter-pattern.md) adaptado à estrutura modular real (não `packages/shared-kernel/` do monorepo, mas `src/modules/notifications/` consistente com ADR-0006).
> **Destrava:** `CTR-EMAIL-ADAPTER-NODEMAILER` (#2 — adapter real com pool SMTP, TLS, DKIM).

## Justificativa

ADR-0010 ("Email — Port & Adapter Pattern com Nodemailer inicial") está **Accepted desde 2026-04-28**. Decisão: separar o contrato (port) da implementação (adapter Nodemailer), permitindo:

1. **Trocar provider sem alterar domínio** (Resend, SES, Postmark) trocando 1 linha na composition root.
2. **Testes determinísticos** via `createInMemoryEmailSender()` sem rede.
3. **Use cases futuros** do módulo Contracts (`AmendmentHomologated` → email de notificação?) consomem só o port, nunca Nodemailer direto.

**Decisões fixadas neste ticket (confirmadas pelo usuário):**

- **Localização:** `src/modules/notifications/` (módulo dedicado, não `src/shared/email/`). Justifica-se pela escala futura (SMS, push, in-app) — `notifications` vira o bounded context que dispara mensagens.
- **EmailAddress / EmailSubject como branded types com smart constructor** — consistente com `Money`, `Period`, IDs do módulo Contratos.
- **InMemory adapter expõe `getSent()` / `clear()`** — padrão "observable test double" alinhado com `clock-fixed.ts` e `*.in-memory.ts` do módulo Contratos.
- **Sem Nodemailer neste ticket** — fica para `CTR-EMAIL-ADAPTER-NODEMAILER` (#2).

## Escopo

### 1. `src/modules/notifications/domain/email/types.ts`

```ts
import { type Result, ok, err } from '../../../../shared/result.ts';
import type { Brand } from '../../../../shared/brand.ts';

export type EmailAddress = Brand<string, 'EmailAddress'>;
export type EmailSubject = Brand<string, 'EmailSubject'>;

export type EmailAddressError = 'invalid-email-format' | 'email-address-too-long';
export type EmailSubjectError = 'empty-subject' | 'subject-too-long';

export const EmailAddress = (raw: string): Result<EmailAddress, EmailAddressError> => {
  if (raw.length > 320) return err('email-address-too-long');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return err('invalid-email-format');
  return ok(raw as EmailAddress);
};

export const EmailSubject = (raw: string): Result<EmailSubject, EmailSubjectError> => {
  if (raw.length === 0) return err('empty-subject');
  if (raw.length > 998) return err('subject-too-long'); // RFC 5322 §2.1.1
  return ok(raw as EmailSubject);
};

export type EmailMessage = Readonly<{
  from: EmailAddress;
  to: readonly EmailAddress[];
  cc?: readonly EmailAddress[];
  bcc?: readonly EmailAddress[];
  subject: EmailSubject;
  textBody: string;
  htmlBody?: string;
}>;

export type EmailReceipt = Readonly<{
  messageId: string;     // UUID v4
  acceptedAt: string;    // ISO-8601
}>;

export type EmailError =
  | Readonly<{ tag: 'invalid-recipient'; reason: string }>
  | Readonly<{ tag: 'smtp-rejected'; reason: string }>
  | Readonly<{ tag: 'transport-failed'; reason: string }>;
```

### 2. `src/modules/notifications/application/ports/email-sender.ts`

```ts
import type { Result } from '../../../../shared/result.ts';
import type { EmailError, EmailMessage, EmailReceipt } from '../../domain/email/types.ts';

export type EmailSender = Readonly<{
  send: (message: EmailMessage) => Promise<Result<EmailReceipt, EmailError>>;
}>;
```

### 3. `src/modules/notifications/adapters/email/in-memory.ts`

```ts
import { randomUUID } from 'node:crypto';
import { ok } from '../../../../shared/result.ts';
import type { EmailSender } from '../../application/ports/email-sender.ts';
import type { EmailMessage } from '../../domain/email/types.ts';

export type InMemoryEmailSender = EmailSender &
  Readonly<{
    getSent: () => readonly EmailMessage[];
    clear: () => void;
  }>;

export const createInMemoryEmailSender = (): InMemoryEmailSender => {
  const sent: EmailMessage[] = [];

  return {
    send: async (message) => {
      sent.push(message);
      return ok({
        messageId: randomUUID(),
        acceptedAt: new Date().toISOString(),
      });
    },
    getSent: () => sent,
    clear: () => {
      sent.length = 0;
    },
  };
};
```

### 4. `src/modules/notifications/public-api/index.ts` — barrel

```ts
export type {
  EmailAddress,
  EmailSubject,
  EmailMessage,
  EmailReceipt,
  EmailError,
  EmailAddressError,
  EmailSubjectError,
} from '../domain/email/types.ts';

export { EmailAddress, EmailSubject } from '../domain/email/types.ts';

export type { EmailSender } from '../application/ports/email-sender.ts';
```

### 5. Tests

```
tests/modules/notifications/domain/email/types.test.ts
tests/modules/notifications/adapters/email/in-memory.test.ts
```

Cenários (10 tests, CA-T1..T10):

- **CA-T1**: `EmailAddress('valid@example.com')` → `ok`.
- **CA-T2**: `EmailAddress('invalid')` → `err('invalid-email-format')`.
- **CA-T3**: `EmailAddress('x'.repeat(321))` → `err('email-address-too-long')`.
- **CA-T4**: `EmailSubject('Hello')` → `ok`.
- **CA-T5**: `EmailSubject('')` → `err('empty-subject')`.
- **CA-T6**: `EmailSubject('x'.repeat(999))` → `err('subject-too-long')`.
- **CA-T7**: `createInMemoryEmailSender().send(msg)` → `ok({ messageId: UUID, acceptedAt: ISO })`.
- **CA-T8**: `getSent()` retorna lista cumulativa após múltiplos sends.
- **CA-T9**: `clear()` zera a lista.
- **CA-T10**: smoke type-level — `InMemoryEmailSender` é assignable a `EmailSender`.

### 6. `CLAUDE.md` — opcional

Adicionar `notifications` ao mapa de módulos (se existir seção). **Não é bloqueante** — pode entrar no ticket #2 quando o módulo "estiver completo".

## Critérios de aceitação

- **CA1** — `domain/email/types.ts` define `EmailAddress` + `EmailSubject` como branded types com smart constructors retornando `Result<T, E>` tagged.
- **CA2** — `application/ports/email-sender.ts` define `type EmailSender = Readonly<{ send: (...) => Promise<Result<...>> }>` sem implementação.
- **CA3** — `adapters/email/in-memory.ts` exporta `createInMemoryEmailSender(): InMemoryEmailSender` que satisfaz `EmailSender` + expõe `getSent()` e `clear()`.
- **CA4** — `public-api/index.ts` re-exporta tudo que outros módulos podem consumir.
- **CA5** — `messageId` gerado via `randomUUID()` (não string fake); `acceptedAt` via `new Date().toISOString()` no momento do send.
- **CA6** — 10 tests cobrindo CA-T1..T10.
- **CA7** — Gates verdes (typecheck/format/lint/test).
- **CA8** — Padrão D (tagged errors com `tag:` discriminante) em `EmailError`.
- **CA9** — `import type` em todos os imports puramente de tipo (`verbatimModuleSyntax`).
- **CA10** — ASCII puro em comentários/strings de display (lição da série Pipeline Tooling — Node 24 strip-types).

## Não-objetivos

- **Adapter Nodemailer real** — `CTR-EMAIL-ADAPTER-NODEMAILER` (#2).
- **Decorators `withRetry` / `withLogging`** — composição opcional, fica para ticket #3 se necessário.
- **Stubs Resend / SES** — `if/when` migrar, abrir ADR de migração.
- **Templates HTML** — responsabilidade da application layer dos módulos consumers (Contracts, futuro Financeiro). Não é responsabilidade do port.
- **Idempotência interna** — já coberta pelo Outbox Pattern (ADR-0015 + série CTR-OUTBOX-*).
- **Variáveis de ambiente do SMTP** (`SMTP_HOST`, `SMTP_PORT`, etc.) — só relevantes quando o adapter Nodemailer existir.
- **Integração com use cases reais** (notificar P.O. quando AmendmentHomologated, etc.) — fica para ticket cross-módulo futuro.

## Risco / pontos de atenção

1. **Regex de email simplificada.** O padrão `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` rejeita casos esotéricos válidos pela RFC 5322 (ex.: `"a"@b.com` com quotes). Aceitar como compromisso: 99% dos endereços reais passam, edge cases viram dor de bounce — não vale parser RFC completo.
2. **Limite de 320 chars** para `EmailAddress` (RFC 5321 §4.5.3.1.3, local-part 64 + `@` + domain 255).
3. **Limite de 998 chars** para `EmailSubject` (RFC 5322 §2.1.1 line length).
4. **`new Date().toISOString()` no send** — `acceptedAt` é hora de aceitação local, não global. Aceitável para in-memory (testes); adapter real pode preferir hora do SMTP server response.
5. **`randomUUID()` requer Node 19+** — projeto está em Node 24 LTS, sem problema.
6. **Mutável dentro do InMemory.** O array `sent` é mutado (`push`/`length = 0`). Aceitável: é adapter de teste, encapsulamento via closure. Exposição via `getSent()` retorna referência readonly por tipo.
7. **`public-api/index.ts` é o único ponto de import externo.** ADR-0006: outros módulos NÃO podem importar de `domain/` ou `application/` direto.
8. **Bug #47936 (sub-agent interruption):** ticket size S, deve fechar rapidamente.

## Como este ticket destrava o próximo

Após fechar, abrir `CTR-EMAIL-ADAPTER-NODEMAILER` (#2, size M):
- Adapter Nodemailer real com connection pool.
- TLS/STARTTLS configurável.
- DKIM opcional.
- Variáveis de ambiente do `secrets:setup`.
- Tests de integração com Ethereal (Nodemailer test SMTP).
- Agente `nodemailer-email-expert` sai do RESERVED.

## Dogfood

Init do ticket via CLI (ticket #1 da Pipeline Tooling):

```bash
pnpm run pipeline:state init CTR-EMAIL-PORT --size S
```

Snapshot inicial em `STATE.json` + `STATE.md` gerado.
