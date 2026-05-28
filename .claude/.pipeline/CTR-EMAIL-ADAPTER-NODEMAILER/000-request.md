# 000 — Request CTR-EMAIL-ADAPTER-NODEMAILER

> **Segundo ticket do módulo `notifications` — ATIVA o canal de email em produção. Size: M.**
> Implementa o adapter Nodemailer do port `EmailSender` (entregue em `CTR-EMAIL-PORT` ✅).
> **Ativa o agente `nodemailer-email-expert`** (estava RESERVED em `.claude/agents/nodemailer-email-expert.md`).
> Implementa [ADR-0010](../../../handbook/architecture/adr/0010-email-port-adapter-pattern.md) §"Adapter inicial: Nodemailer".

## Justificativa

`CTR-EMAIL-PORT` (#1) entregou o contrato (`EmailSender` port + `InMemoryEmailSender` adapter de teste). Faltava a implementação de produção. Sem ela:

- Não há canal real de envio — qualquer use case que tente enviar email funciona em testes mas falha em prod.
- ADR-0010 não está integralmente implementado.
- Agente `nodemailer-email-expert` permanece RESERVED, não pode ser invocado para troubleshooting futuro.

**Decisões fixadas neste ticket:**

- **`nodemailer` como dependency direta** (não devDependency) — adapter é código de produção.
- **Pool habilitado por default** (ADR-0010 indica `SMTP_POOL=true`, `SMTP_MAX_CONNS=5`).
- **Config via env vars + parser puro** — `parseSmtpConfig(env: ProcessEnv): Result<SmtpConfig, SmtpConfigError>`. Sem ler `process.env` dentro do adapter; injection explícita.
- **Tradução de erros Nodemailer → `EmailError` tagged** — mapping documentado em function pura `mapNodemailerError(err: unknown): EmailError`.
- **Tests de integração via Ethereal** — `nodemailer.createTestAccount()` cria conta SMTP dinâmica, captura emails sem entregar. Rodam APENAS via `pnpm test:integration` (não no `pnpm test` default).
- **Fix da issue I2 do W2 anterior:** remover `createInMemoryEmailSender` do `public-api/index.ts`. InMemory permanece em `adapters/email/in-memory.ts` para tests internos do próprio módulo notifications.
- **Composition root:** decidir em qual arquivo construir o sender. Como ainda não há use case que envia email, fica adiado — adapter exposto via `public-api` como factory `createNodemailerEmailSender(config)` que outros módulos chamam no seu composition root (ex.: futuro `src/modules/financial/composition.ts`).

## Escopo

### 1. Dependencies

```bash
pnpm add nodemailer
pnpm add --save-dev @types/nodemailer
```

### 2. `src/modules/notifications/adapters/email/nodemailer-config.ts`

Parser puro de env vars → `SmtpConfig`:

```ts
export type SmtpConfig = Readonly<{
  host: string;
  port: number;
  secure: boolean;          // true=465 SMTPS, false=587 STARTTLS
  user: string;
  pass: string;
  pool: boolean;            // default true
  maxConnections: number;   // default 5
}>;

export type SmtpConfigError =
  | Readonly<{ tag: 'missing-env'; field: string }>
  | Readonly<{ tag: 'invalid-port'; raw: string }>
  | Readonly<{ tag: 'invalid-max-connections'; raw: string }>;

export const parseSmtpConfig = (
  env: NodeJS.ProcessEnv,
): Result<SmtpConfig, SmtpConfigError>;
```

Lê: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_POOL` (opt, default `true`), `SMTP_MAX_CONNS` (opt, default `5`).

### 3. `src/modules/notifications/adapters/email/nodemailer.ts`

```ts
import nodemailer from 'nodemailer';
import type { EmailSender } from '../../application/ports/email-sender.ts';
import type { EmailError, EmailMessage } from '../../domain/email/types.ts';
import type { SmtpConfig } from './nodemailer-config.ts';
import { type Result, ok, err } from '../../../../shared/result.ts';

export const createNodemailerEmailSender = (config: SmtpConfig): EmailSender => {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    pool: config.pool,
    maxConnections: config.maxConnections,
  });

  return {
    send: async (message: EmailMessage): Promise<Result<EmailReceipt, EmailError>> => {
      try {
        const info = await transporter.sendMail({
          from: message.from,
          to: [...message.to],
          cc: message.cc ? [...message.cc] : undefined,
          bcc: message.bcc ? [...message.bcc] : undefined,
          subject: message.subject,
          text: message.textBody,
          html: message.htmlBody,
        });
        return ok({
          messageId: info.messageId,
          acceptedAt: new Date().toISOString(),
        });
      } catch (caught) {
        return err(mapNodemailerError(caught));
      }
    },
  };
};

const mapNodemailerError = (caught: unknown): EmailError => {
  if (!(caught instanceof Error)) {
    return { tag: 'transport-failed', reason: 'unknown non-Error throw' };
  }
  const msg = caught.message;
  // Heuristica: classifica por mensagem comum do Nodemailer.
  if (/EENVELOPE|invalid recipient/i.test(msg)) {
    return { tag: 'invalid-recipient', reason: msg };
  }
  if (/EAUTH|550|554/.test(msg)) {
    return { tag: 'smtp-rejected', reason: msg };
  }
  return { tag: 'transport-failed', reason: msg };
};
```

### 4. `src/modules/notifications/public-api/index.ts` — fix issue I2 + nova export

```diff
 export type { EmailSender } from '../application/ports/email-sender.ts';

-export type { InMemoryEmailSender } from '../adapters/email/in-memory.ts';
-export { createInMemoryEmailSender } from '../adapters/email/in-memory.ts';
+export type { SmtpConfig, SmtpConfigError } from '../adapters/email/nodemailer-config.ts';
+export { parseSmtpConfig } from '../adapters/email/nodemailer-config.ts';
+
+export { createNodemailerEmailSender } from '../adapters/email/nodemailer.ts';
+
+// InMemory NAO e exposto no public-api - e adapter de teste, importavel APENAS
+// internamente em tests do proprio modulo (tests/modules/notifications/).
+// Outros modulos consomem o port via createNodemailerEmailSender no composition root.
```

### 5. Tests

```
tests/modules/notifications/adapters/email/nodemailer-config.test.ts
tests/modules/notifications/adapters/email/nodemailer.integration.test.ts
```

#### `nodemailer-config.test.ts` (tests rápidos, rodam em `pnpm test`)

Cenários:

- **CA-T1**: env válido completo → `ok(SmtpConfig)` com `pool=true` e `maxConnections=5` (defaults).
- **CA-T2**: `SMTP_HOST` ausente → `err({ tag: 'missing-env', field: 'SMTP_HOST' })`.
- **CA-T3**: `SMTP_PORT='abc'` → `err({ tag: 'invalid-port', raw: 'abc' })`.
- **CA-T4**: `SMTP_POOL='false'` → `ok` com `pool=false`.
- **CA-T5**: `SMTP_MAX_CONNS='10'` → `ok` com `maxConnections=10`.
- **CA-T6**: `SMTP_MAX_CONNS='-3'` → `err({ tag: 'invalid-max-connections', raw: '-3' })`.

#### `nodemailer.integration.test.ts` (rodam SOMENTE em `pnpm test:integration`)

```ts
import nodemailer from 'nodemailer';
// guard de integration
const integrationOn = process.env.NOTIFICATIONS_INTEGRATION === '1';
describe(integrationOn ? 'nodemailer integration' : 'nodemailer integration (SKIP)', () => {
  if (!integrationOn) {
    it.skip('NOTIFICATIONS_INTEGRATION=1 desligado', () => {});
    return;
  }
  // ... usa nodemailer.createTestAccount() para Ethereal
});
```

Cenários:

- **CA-T7**: send com Ethereal account → `ok(receipt)`. `info.accepted` tem 1 endereço.
- **CA-T8**: send com recipient inválido (`'@invalid'`) → `err({ tag: 'invalid-recipient' })` ou `smtp-rejected`.
- **CA-T9**: SmtpConfig com `host: 'nonexistent.invalid'` → `err({ tag: 'transport-failed' })`.

### 6. `package.json` — script de integração

```diff
-"test:integration": "... 'tests/cli/contracts.cli.mysql.test.ts'; rc=$?; ..."
+"test:integration": "... 'tests/cli/contracts.cli.mysql.test.ts' 'tests/modules/notifications/adapters/email/nodemailer.integration.test.ts'; rc=$?; ..."
+"test:integration:notifications": "NOTIFICATIONS_INTEGRATION=1 node --test --experimental-strip-types --no-warnings 'tests/modules/notifications/**/*.test.ts'"
```

(Decisão final pode ser apenas o `:notifications` standalone — evita acoplar integração de email com MySQL.)

### 7. `CLAUDE.md` — atualizar agentes ativados

```diff
-| Nodemailer (adapter SMTP — **reservado, Fase 2+**)                | [`nodemailer-email-expert`](./.claude/agents/nodemailer-email-expert.md)       |
+| Nodemailer (adapter SMTP — ativado por ADR-0010 + CTR-EMAIL-ADAPTER-NODEMAILER)   | [`nodemailer-email-expert`](./.claude/agents/nodemailer-email-expert.md) |
```

E adicionar `notifications` ao mapa de módulos (se houver seção):

```
src/modules/
├── contracts/    # Fase 1, fechado
└── notifications/  # Fase 2 - email canal ativo, SMS/push futuro
```

### 8. Agente `.claude/agents/nodemailer-email-expert.md` — sair de RESERVED

```diff
-RESERVED (Fase 2+) — Use proactively when email channel is activated. Until then, return immediately with "este agente é reservado, aguardando ativação do canal de notificação no core-api". Trigger (quando ativo): ...
+Use proactively for SMTP adapter via Nodemailer. Trigger: "adapter Nodemailer do EmailPort", "createTransport", "pool SMTP", "DKIM signing", "OAuth2 SMTP", ...
```

## Critérios de aceitação

- **CA1** — `nodemailer-config.ts` exporta `parseSmtpConfig` puro retornando `Result<SmtpConfig, SmtpConfigError>`.
- **CA2** — `nodemailer.ts` exporta `createNodemailerEmailSender(config: SmtpConfig): EmailSender` que satisfaz o port.
- **CA3** — `mapNodemailerError` traduz `Error` cru do Nodemailer em `EmailError` tagged. Heurística documentada.
- **CA4** — Public-api expõe `createNodemailerEmailSender` + `parseSmtpConfig` + `SmtpConfig` type. Remove `InMemoryEmailSender`/`createInMemoryEmailSender` (fix issue I2 do W2 anterior).
- **CA5** — `nodemailer-config.test.ts` com 6 tests CA-T1..T6 rodam em `pnpm test` (sem rede).
- **CA6** — `nodemailer.integration.test.ts` com 3 tests CA-T7..T9 rodam em `pnpm test:integration:notifications` (Ethereal account, rede).
- **CA7** — `package.json` ganha `pnpm test:integration:notifications`.
- **CA8** — `CLAUDE.md` atualizado: agente `nodemailer-email-expert` sai de RESERVED + módulo `notifications` no mapa.
- **CA9** — `.claude/agents/nodemailer-email-expert.md` atualizado para versão ativa.
- **CA10** — Gates verdes (typecheck/format/lint/test serial, integration skip default).
- **CA11** — ASCII puro em todos os 2 arquivos novos source.
- **CA12** — Dependency `nodemailer` instalada via `pnpm add` (não `npm`).
- **CA13** — `try/catch` apenas no adapter (boundary) e convertido para `Result` antes de retornar (regra de adapters do CLAUDE.md).

## Não-objetivos

- **DKIM signing** — `handbook/reference/nodemailer/dkim.md` cobre. Fica para ticket #3 (`CTR-EMAIL-DKIM`) se a P.O. exigir.
- **OAuth2 SMTP** (Gmail, Outlook) — ADR-0010 menciona como opção futura.
- **Decorators `withRetry` / `withLogging`** — composição opcional, ticket futuro.
- **Suppression list / bounce handling** — fora do port (ADR-0010 §"O que NÃO entra no port").
- **Templates HTML** — application layer dos módulos consumers (Contracts, Financeiro).
- **Composition root real** — não há use case que envie email ainda. Adapter exposto para uso futuro.
- **Migrar para Resend/SES** — apenas Nodemailer neste ticket (ADR-0010 §"Quando Re-avaliar").
- **Secrets vault integration** — env vars cruas; ADR-0011 (supply-chain) cobre o resto.

## Risco / pontos de atenção

1. **`nodemailer` na production dependency** — confirma alinhamento com ADR-0010. Não é dev-only.
2. **Pool de conexões SMTP** — `pool=true` mantém connections quentes. Para graceful shutdown, considerar `transporter.close()` ao SIGTERM. **Fora de escopo deste ticket** — não há shutdown handler real ainda.
3. **Ethereal account** — `nodemailer.createTestAccount()` é assíncrono e usa serviço externo (ethereal.email). Tests de integração podem falhar se ethereal estiver down. Aceitar para v1; alternativa é mock SMTP local (`smtp-server` package) em ticket de hardening.
4. **`mapNodemailerError` por regex** — heurística sobre mensagens Nodemailer. Frágil em mudanças de versão; aceitar e cobrir via tests de integração (CA-T8/T9).
5. **`maxConnections` default = 5** — alinhado com ADR-0010. Pode ser tuning futuro se volume crescer.
6. **`secure: true` para porta 465; `false` + STARTTLS para 587** — comportamento Nodemailer default. Parser não infere automaticamente, exige `SMTP_SECURE` explícito.
7. **Bug #47936 (sub-agent interruption):** size M; invocar `nodemailer-email-expert` em W1 com checklist embutido + verificar filesystem após cada `Agent(...)`.

## Como este ticket fecha o módulo notifications (v1)

Após fechar:
- Módulo `notifications` tem port + adapter de produção + adapter de teste + parser de config.
- Agente especialista ativo para troubleshooting.
- Próximos consumers (Contracts: notificar P.O. quando `AmendmentHomologated`; Financeiro: alertas de pagamento) podem injetar `createNodemailerEmailSender(parseSmtpConfig(process.env))` no seu composition root.
- ADR-0010 integralmente implementado.

Próxima frente de notificações fica para a P.O. decidir:
- DKIM signing
- SMS (Twilio)
- Push (Firebase)
- Templates centralizados
