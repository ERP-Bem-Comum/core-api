# Code Review - Ticket CTR-EMAIL-ADAPTER-NODEMAILER - Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (skill `.claude/skills/code-reviewer/SKILL.md`)
**Data:** 2026-05-22T11:00Z
**Escopo revisado:**

- `src/modules/notifications/adapters/email/nodemailer-config.ts` (criado em W1)
- `src/modules/notifications/adapters/email/nodemailer.ts` (criado em W1)
- `src/modules/notifications/public-api/index.ts` (modificado em W1)
- `package.json` (deps + script)
- `.claude/agents/nodemailer-email-expert.md` (saida de RESERVED)
- `CLAUDE.md` (anti-padrao #11)
- Referencias para contexto (nao modificadas em W1):
  - `src/modules/notifications/application/ports/email-sender.ts`
  - `src/modules/notifications/domain/email/types.ts`
  - `src/modules/notifications/domain/email/address.ts`
  - `src/modules/notifications/domain/email/subject.ts`
  - `src/modules/notifications/adapters/email/in-memory.ts`
  - `src/shared/result.ts`

---

## Issues encontradas

### Critica (bloqueia approval)

Nenhuma.

### Importante (nao-bloqueia, mas registrar)

Nenhuma.

### Sugestao (estilo / clareza)

#### S1 - `src/modules/notifications/domain/email/types.ts:22`

**Categoria:** G (clareza de contrato)
**Problema:** Comentario inline diz `messageId: string; // UUID v4`. O adapter Nodemailer (entregue agora) retorna `info.messageId` no formato `<random@host>` (RFC 5322 Message-ID), nao UUID v4. O adapter InMemory de fato retorna `randomUUID()`, dai a confusao no momento da criacao do tipo (ticket #1).

**Impacto:** Documental. Nao quebra nenhum CA deste ticket (o teste CA-T7 verifica `messageId.length > 0`, agnostico de formato). Mas o comentario contradiz a implementacao real do adapter de producao.

**Fix sugerido (escopo: ticket de hardening futuro, NAO este):**

```ts
// antes
messageId: string; // UUID v4
// depois
messageId: string; // formato dependente do adapter: <id@host> em Nodemailer (RFC 5322), UUID em InMemory
```

**Severidade:** baixa. Inserido no ticket #1 (`CTR-EMAIL-PORT`). Pode ser corrigido em ticket de polimento de doc do dominio.

---

#### S2 - `src/modules/notifications/adapters/email/nodemailer.ts:72-84` (`mapNodemailerError`)

**Categoria:** H (cobertura de teste)
**Problema:** A funcao `mapNodemailerError` e pura e tem 3 branches mais o branch nao-`Error`. Cobertura atual vem somente via tests de integracao (CA-T8/T9), que dependem de Ethereal + rede + `NOTIFICATIONS_INTEGRATION=1`. Em ambiente sem rede ou CI default, a funcao fica sem cobertura.

**Impacto:** Funcao frequentemente alterada (cada nova versao do Nodemailer pode mudar formato de mensagem). Regressoes podem passar silenciosamente em `pnpm test` default.

**Fix sugerido (ticket de hardening futuro, NAO este):**

Adicionar `tests/modules/notifications/adapters/email/nodemailer-error-mapper.test.ts` com fixtures sinteticos:

```ts
const E = (msg: string): Error => new Error(msg);

it('EENVELOPE -> invalid-recipient', () => {
  assert.equal(mapNodemailerError(E('EENVELOPE 553 ...')).tag, 'invalid-recipient');
});
it('EAUTH -> smtp-rejected', () => { ... });
it('5xx code -> smtp-rejected', () => { ... });
it('outro -> transport-failed', () => { ... });
it('non-Error throw -> transport-failed', () => { ... });
```

Requer exportar `mapNodemailerError` (atualmente `function` local). Decisao de design: expor como utility named export.

**Severidade:** media. Recomendo ticket separado `CTR-EMAIL-MAPPER-UNIT-COVERAGE`.

---

#### S3 - `src/modules/notifications/adapters/email/nodemailer.ts:31-37` (ramo `config.pool` separado)

**Categoria:** G (clareza)
**Problema:** O ramo ternario sobre `config.pool` para construir `transporter` esta um pouco verboso. Funciona e e correto - `SMTPPool.Options` vs `SMTPTransport.Options` sao unioes distintas no typing do Nodemailer e o ternario evita um `as` ou um cast.

**Impacto:** Estilo. Codigo le bem, mas talvez um helper `buildTransportOpts(config): SMTPPool.Options | SMTPTransport.Options` melhorasse a leitura.

**Severidade:** muito baixa. Nao agir agora.

---

## O que esta bom

1. **Adapter cumpre o contrato de adapter** - `try/catch` apenas dentro do `send`, conversao explicita para `Result<EmailReceipt, EmailError>` via `mapNodemailerError`. Zero leak de `throw` para application/domain. (categoria D)

2. **Port permanece `type Readonly<{...}>`** - `email-sender.ts:14`. Sem `interface`, sem `class`. (categoria D)

3. **`parseSmtpConfig` e pura** - recebe `Readonly<NodeJS.ProcessEnv>` como argumento, nao le `process.env` interna. Testes deterministicos via objeto literal. (categoria D)

4. **`SmtpConfigError` e discriminated union com tag** - `'missing-env' | 'invalid-port' | 'invalid-max-connections'`. Field `field` ou `raw` por variante. (categoria C)

5. **`exactOptionalPropertyTypes` respeitado** - `cc`/`bcc` usam `=== undefined ? undefined : [...]` em vez de spread direto. (categoria F)

6. **Imports com `.ts`** + **`import type` em tipos puros** - `SMTPPool`, `SMTPTransport`, `EmailSender`, etc. (categoria F)

7. **Guard contra parseInt parcial** - `String(port) !== portRaw` rejeita `'587abc'`, `'0587'`. Pequeno detalhe mas robusto. (categoria F)

8. **Public-api removeu InMemory exposure** (fix issue I2 do W2 anterior) - `createInMemoryEmailSender` continua acessivel via path interno do modulo para tests, mas nao para consumers externos. Conforme ADR-0006. (categoria E)

9. **Identifiers em EN consistente** - modulo notifications inteiro em EN (decisao herdada de #1). Sem prefix `I`, sem sufixo `Impl`. (categoria G)

10. **`nodemailer` em `dependencies` (nao devDependencies)** - alinhado com ADR-0010. CA12 satisfeito. CA12 + ADR-0012 (`pnpm`, nao `npm`).

11. **Tests integration corretamente guarded** por `NOTIFICATIONS_INTEGRATION=1`. `pnpm test` default nao precisa de rede.

12. **Documentacao do agente em sync com codigo** - body `.claude/agents/nodemailer-email-expert.md` agora reflete "Status: ativo" + changelog 2026-05-21. CLAUDE.md anti-padrao #11 nao lista mais `nodemailer-email-expert`.

---

## CAs do request - verificacao final

| CA | Onde | Status |
| :--- | :--- | :--- |
| CA1 | `nodemailer-config.ts` exporta `parseSmtpConfig` puro -> `Result<SmtpConfig, SmtpConfigError>` | OK |
| CA2 | `nodemailer.ts` exporta `createNodemailerEmailSender(config): EmailSender` | OK |
| CA3 | `mapNodemailerError` heuristica documentada | OK (ver S2 - cobertura indireta) |
| CA4 | public-api: novos exports + remove InMemory | OK |
| CA5 | `nodemailer-config.test.ts` 6 tests rodam em `pnpm test` | OK (6/6 GREEN) |
| CA6 | `nodemailer.integration.test.ts` guarded `NOTIFICATIONS_INTEGRATION=1` | OK (SKIP esperado em `pnpm test`) |
| CA7 | `pnpm test:integration:notifications` no package.json | OK |
| CA8 | `CLAUDE.md` atualizado: anti-padrao #11 ajustado | OK |
| CA9 | `.claude/agents/nodemailer-email-expert.md` saiu de RESERVED | OK (body + changelog) |
| CA10 | Gates verdes | OK (typecheck/format/lint/test notifications) |
| CA11 | ASCII puro nos 2 novos source | OK (`nodemailer-config.ts` + `nodemailer.ts`) |
| CA12 | `nodemailer` via `pnpm add`, em `dependencies` | OK |
| CA13 | `try/catch` apenas no adapter, convertido para `Result` na borda | OK |

13/13 satisfeitos. Sugestoes S1-S3 nao bloqueiam aprovacao - registradas como tickets de hardening futuros opcionais.

---

## Proximo passo

**APPROVED** -> pipeline avanca para **W3 (`ts-quality-checker`)**.

W3 deve rodar:

- `pnpm run typecheck` (esperado: OK; ja verificado em W1)
- `pnpm run format:check` (esperado: OK; ja verificado em W1)
- `pnpm run lint` (esperado: OK; ja verificado em W1)
- `pnpm test` (esperado: OK exceto regressao pre-existente em `tests/infra/mysql-compose.test.ts` por Docker daemon offline - documentar como nao-regressao)

Opcional para W3: `NOTIFICATIONS_INTEGRATION=1 pnpm test:integration:notifications` (requer rede + Ethereal) para exercitar uma vez os 3 tests integration antes do close. Se falhar por ambiente, registrar e nao bloquear close.
