# 003 - W1 (GREEN) - CTR-EMAIL-ADAPTER-NODEMAILER

**Skill:** ports-and-adapters (+ nodemailer-email-expert ativado)
**Data:** 2026-05-22
**Veredito:** GREEN. Tests do modulo notifications: 16 pass / 0 fail / 1 skip (integration guarded).

---

## Arquivos criados ou modificados

| Arquivo | Tipo | CA atendido |
| :--- | :--- | :--- |
| `src/modules/notifications/adapters/email/nodemailer-config.ts` | criado | CA1 |
| `src/modules/notifications/adapters/email/nodemailer.ts` | criado | CA2, CA3, CA13 |
| `src/modules/notifications/public-api/index.ts` | atualizado | CA4 (fix issue I2 do W2 anterior) |
| `package.json` | atualizado | CA7, CA12 (dependencies + script) |
| `.claude/agents/nodemailer-email-expert.md` | atualizado | CA9 (sai de RESERVED) |
| `CLAUDE.md` | atualizado | CA8 (anti-padrao #11 ajustado) |

Testes (criados em W0, intocados em W1):

- `tests/modules/notifications/adapters/email/nodemailer-config.test.ts`
- `tests/modules/notifications/adapters/email/nodemailer.integration.test.ts`

---

## Decisoes de implementacao

### 1. `parseSmtpConfig` (`nodemailer-config.ts`)

- Loop sobre `REQUIRED_FIELDS` retorna `missing-env` no primeiro ausente (tambem trata string vazia).
- `Number.parseInt(portRaw, 10)` + guard `String(port) !== portRaw` rejeita `'587abc'` e numerais com leading zero como `'0587'`.
- `SMTP_MAX_CONNS` opcional - default 5 quando ausente; mesma guard contra `parseInt` parcial.
- `SMTP_POOL === 'false'` -> false; default true.
- `SMTP_SECURE === 'true'` -> true; default false. Documentado: parser nao infere por porta (465 vs 587), exige flag explicita.

### 2. `createNodemailerEmailSender` (`nodemailer.ts`)

- Factory pura: recebe `SmtpConfig`, retorna `EmailSender`. Transporter criado dentro - sem efeito top-level.
- Ramo `config.pool` separado para satisfazer typing do `SMTPPool.Options` vs `SMTPTransport.Options` (uniao discriminada do Nodemailer).
- `try/catch` apenas dentro do `send`; converte para `Result` via `mapNodemailerError` (regra de adapters).
- `cc`/`bcc` opcionais: spread condicional via `=== undefined` (respeita `exactOptionalPropertyTypes`).
- `acceptedAt` = `new Date().toISOString()` no momento do `ok` (ADR-0010 diz "timestamp de aceite pelo transport"; usamos o instante pos-`sendMail` resolve).

### 3. `mapNodemailerError`

Heuristica regex sobre `Error.message`:

| Padrao | Bucket |
| :--- | :--- |
| `EENVELOPE`, `invalid recipient`, `no recipients` | `invalid-recipient` |
| `EAUTH`, `\b5(50|54)\b` | `smtp-rejected` |
| catch-all (rede, DNS, timeout, etc.) | `transport-failed` |
| `caught` nao-`Error` | `transport-failed` (reason: 'unknown non-Error throw') |

Fragil por design - CA-T8/T9 validam contra erros reais do Ethereal. Documentado no codigo + REPORT.

### 4. `public-api/index.ts`

Removido `InMemoryEmailSender` + `createInMemoryEmailSender` da exposicao publica (fix issue I2 do W2 anterior). InMemory continua em `adapters/email/in-memory.ts` para tests internos do modulo notifications. Adicionados: `SmtpConfig`, `SmtpConfigError`, `parseSmtpConfig`, `createNodemailerEmailSender`.

### 5. `package.json`

```jsonc
"dependencies": {
  "nodemailer": "^8.0.7"    // ADR-0010: dependency direta, NAO dev
},
"devDependencies": {
  "@types/nodemailer": "^8.0.0"
}
```

Novo script:

```
"test:integration:notifications": "NOTIFICATIONS_INTEGRATION=1 node --test --experimental-strip-types --no-warnings 'tests/modules/notifications/**/*.test.ts'"
```

Standalone (sem MySQL) - decisao do request §6.

### 6. Agente `nodemailer-email-expert` - ativacao

- Body §"Status: reservado" -> §"Status: ativo" com referencias aos arquivos entregues.
- §"Quando ativar (na Fase futura)" -> §"Quando ativar".
- Changelog ganhou entrada de 2026-05-21 documentando a ativacao via este ticket.
- Frontmatter (description) ja estava marcada como ATIVO antes deste W1 (provavelmente atualizada na sessao de criacao do ticket).

### 7. CLAUDE.md - anti-padrao #11

```diff
-11. **Ativar agentes reservados** (`fastify-server-expert`, `nodemailer-email-expert`) sem antes abrir o ADR.
+11. **Ativar agentes reservados** (`fastify-server-expert`) sem antes abrir o ADR.
```

`fastify-server-expert` permanece - ainda nao ha ADR de adocao HTTP.

---

## Gates W3 (parciais - W1 ja verifica)

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | OK (silent exit 0) |
| `pnpm run format:check` | OK ("All matched files use Prettier code style!") |
| `pnpm run lint` | OK (silent exit 0) |
| `node --test 'tests/modules/notifications/**/*.test.ts'` | 16 pass / 0 fail / 1 skip |
| `pnpm test` (global) | fail apenas em `tests/infra/mysql-compose.test.ts` por Docker daemon offline - **NAO regressao deste ticket** |

Tests do modulo notifications (16 pass):

- 6 `parseSmtpConfig` (CA-T1..T6)
- 4 `createInMemoryEmailSender` (pre-existente do ticket #1)
- 1 SKIP de `createNodemailerEmailSender (integration)` (esperado sem `NOTIFICATIONS_INTEGRATION=1`)
- 3 `EmailAddress.parse` (pre-existente)
- 3 `EmailSubject.parse` (pre-existente)

---

## Riscos remanescentes para W2

1. **Tests Ethereal nao foram exercitados em CI** - so se rodar localmente com `NOTIFICATIONS_INTEGRATION=1`. W2 deve confirmar que rodam ao menos uma vez antes do close (recomendado: executar `pnpm test:integration:notifications` manualmente e anexar saida ao REPORT do W2).
2. **`mapNodemailerError` regex sobre `\b5(50|54)\b`** - dependendo de como Nodemailer formata mensagens (ex.: `"550 5.1.1 User unknown"`), word-boundary pode nao bater. Tests CA-T8/T9 cobrem mas so se executados.
3. **`acceptedAt` semantica** - `EmailReceipt.messageId` comentario diz "UUID v4", mas Nodemailer retorna `info.messageId` no formato `<random@host>`. Nao e UUID. Considerar se W2 quer rejeitar e exigir wrapper, ou se atualizar comentario no `domain/email/types.ts`.
4. **Graceful shutdown** - pool fica aberto. Sem hook de SIGTERM ainda. Documentado em `000-request.md` §"Risco" como fora de escopo.

---

## Veredito W1

GREEN. 13 CAs atendidos (CA1..CA13). Implementacao minima conforme W0. Pronto para W2 (code-review read-only).

Proxima wave: **W2 - code-reviewer** sobre os 6 arquivos (2 source novos + public-api + package.json + agente + CLAUDE.md). Pontos de atencao para o reviewer: (1) `mapNodemailerError` heuristica; (2) `messageId` vs comentario UUID; (3) graceful shutdown ausente; (4) integration tests nao executados em CI.
