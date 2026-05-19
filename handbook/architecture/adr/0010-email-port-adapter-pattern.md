[← Voltar para ADRs](./README.md)

# ADR-0010: Email — Port & Adapter Pattern com Nodemailer inicial

- **Status:** Accepted
- **Date:** 2026-04-28
- **Deciders:** Arquiteto técnico

---

## Contexto

O ERP envia emails: notificações de aprovação de documento, alertas de pagamento, relatórios PDF/CSV, confirmações de conciliação. Volume estimado: centenas a poucos milhares/mês.

Restrições:
- **Custo zero inicialmente** — não há orçamento para provider de email pago.
- **Boa deliverability necessária** — notificação de aprovação que não chega = problema operacional.
- **Compliance LGPD** — emails podem conter dados financeiros.
- **Time pequeno** — operacional precisa ser simples.

Análise completa em [Inquiry-0009](../../inquiries/0009-email-strategy-nodemailer-with-adapter.md).

---

## Decisão

**Padrão Port & Adapter** (Hexagonal / Ports and Adapters):

1. **Port `EmailSender`** definido em `packages/shared-kernel/src/email/`.
2. **Adapter inicial: Nodemailer** em `apps/core-api/src/adapters/email/nodemailer.ts`.
3. **In-memory adapter** para testes em `apps/core-api/src/adapters/email/memory.ts`.
4. **Decorators opcionais**: `withRetry`, `withLogging` (composição).
5. **Stubs para Resend e SES** prontos para futura migração sem alterar domínio.

### Decisão estrutural

```
packages/shared-kernel/src/email/
├── types.ts          # EmailMessage, EmailAddress, EmailReceipt
├── address.ts        # Smart constructor de EmailAddress
├── subject.ts        # Smart constructor de EmailSubject
├── errors.ts         # EmailError union (string literal)
├── port.ts           # EmailSender interface
└── index.ts

apps/core-api/src/adapters/email/
├── nodemailer.ts     # createNodemailerEmailSender (atual)
├── memory.ts         # createInMemoryEmailSender (testes)
├── with-retry.ts     # withRetry decorator
├── resend.ts         # (futuro)
└── ses.ts            # (futuro)
```

### O que entra no port

```typescript
export type EmailSender = Readonly<{
  send: (
    message: EmailMessage,
  ) => Promise<Result<EmailReceipt, EmailError>>
}>
```

**Apenas isso.** Single function. Sem retry, sem template, sem batch.

### O que NÃO entra no port

- ❌ Renderização de templates HTML (responsabilidade da application layer).
- ❌ Idempotência interna (já coberta pelo Outbox Pattern do [ADR-0004](./0004-postgres-outbox-pattern.md)).
- ❌ Bounce handling (provider externo / webhook futuro).
- ❌ Suppression list (decorator separado se necessário).

---

## Consequências

### Positivas

- **Trocar provider = trocar 1 linha na composition root.** Domínio importa apenas o `EmailSender` port.
- **Testabilidade**: `createInMemoryEmailSender` substitui qualquer adapter real.
- **Erros consistentes**: `EmailError` união normaliza tudo (Nodemailer, Resend, SES) numa única forma.
- **Custo zero inicial**: Nodemailer + SMTP gratuito (próprio servidor ou Gmail SMTP no início).
- **Estilo do projeto**: sem `class`, sem `this`, `Result<T,E>`, ports/adapters explícitos — alinhado com [ADR-0006](./0006-modular-monolith-core-api.md).
- **Não vira "monolito do meio"**: lógica de envio fica nos adapters, não no domínio.

### Negativas

- **Nodemailer tem fama de verboso e antigo** — sem dashboard, sem analytics, templates manuais.
- **Deliverability dependente do SMTP usado** — Gmail SMTP free tem limites; servidor próprio precisa SPF/DKIM/DMARC + IP warming.
- **Maintainer solo** (Andris Reinman / Postal Systems) — bus factor.
- **Sem webhooks de eventos** — bounce/delivery/open dependeria de adapter customizado.

### Neutras

- Migração futura para Resend / SES / Postmark é **trivial** — adapter novo + troca na composition root.
- Templates ficam na application layer — independente do provider.

---

## Variáveis de ambiente

A serem provisionadas em [`infrastructure/03-secrets-catalog.md`](../../infrastructure/03-secrets-catalog.md):

```
SMTP_HOST
SMTP_PORT
SMTP_SECURE         # true para 465; false para 587/STARTTLS
SMTP_USER
SMTP_PASS
SMTP_POOL           # opcional, default true
SMTP_MAX_CONNS      # opcional, default 5
```

---

## Quando Re-avaliar

- Se Nodemailer apresentar problemas de manutenção ou vulnerabilidade.
- Se volume crescer para >10k emails/mês (custo/benefício de Resend ou SES muda).
- Se aparecer requisito de webhooks de delivery / analytics que Nodemailer não cobre.
- Se Bem Comum decidir adotar provider pago (Resend já tem stub pronto).

---

## Alternativas Consideradas

### A. Nodemailer monolítico (sem port)
**Rejeitada.** Acopla domínio ao Nodemailer; troca futura vira refactor invasivo.

### B. Adoção direta de Resend
**Rejeitada agora** (custo). Mantida como caminho de evolução (stub criado).

### C. Adoção direta de AWS SES
**Rejeitada agora** (custo + setup). Pode fazer sentido se a Bem Comum mantiver AWS para outros sistemas.

### D. Sem abstração (deixar Nodemailer espalhado)
**Rejeitada.** Anti-padrão; quebra independência de domínio.

---

## Referências

- [Inquiry-0009](../../inquiries/0009-email-strategy-nodemailer-with-adapter.md) — análise completa.
- [ADR-0006](./0006-modular-monolith-core-api.md) — princípios de port & adapter.
- [ADR-0004](./0004-postgres-outbox-pattern.md) — idempotência via outbox.
- Documentação Nodemailer: https://nodemailer.com/
