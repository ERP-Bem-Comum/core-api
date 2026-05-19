# Inquiry-0009: Estratégia de envio de email — Nodemailer com Service Adapter

- **Status:** Decided
- **Opened:** 2026-04-28
- **Closed/Decided:** 2026-04-28
- **Opened by:** Gabriel Aderaldo
- **Asked to:** Pesquisa em fontes públicas (mailtrap, pkgpulse) + análise interna
- **Impact:** [ADR-0010](../architecture/adr/0010-email-port-adapter-pattern.md)

---

## 1. Contexto

ERP financeiro precisa enviar emails (notificações de aprovação, alertas de pagamento, relatórios). Volume estimado: centenas a poucos milhares/mês. Necessidade de:

- Boa deliverability (notificação que não chega = problema operacional).
- Compliance LGPD (dados financeiros).
- Time pequeno sem operacional dedicado.
- Sem orçamento adicional inicialmente.

Considerações: Nodemailer é o padrão mas tem fama de "verboso e antigo". Alternativas modernas existem (Resend, SES, Postmark, SendGrid).

---

## 2. Pergunta(s) feita(s)

1. "Por que Nodemailer pode parecer ruim e quais alternativas existem?"
2. "Considerando que precisamos de gratuidade inicial, como podemos usar Nodemailer com facilidade de troca futura?"

---

## 3. Respostas / Investigação

### 2026-04-28 — Comparativo de provedores 2026

| Provider | Modelo | Free tier | Custo | Deliverability | DX |
| :--- | :--- | :--- | :--- | :---: | :---: |
| Resend | API + SDK | 3k/mês | $20+/mês | Alta | ⭐⭐⭐⭐⭐ |
| AWS SES | API + SDK | 62k/mês via EC2 | $0.10/1k | 77% | ⭐⭐⭐ |
| Postmark | API + SDK | sem | $15/10k | Muito alta | ⭐⭐⭐⭐ |
| SendGrid | API + SDK | 100/dia | $19.95/mês | 61% | ⭐⭐⭐ |
| Nodemailer + SMTP | Lib | depende | depende | depende | ⭐⭐ |

### 2026-04-28 — Vantagens reais do Nodemailer

- Transport-agnostic (troca SMTP do Gmail por SES por SendGrid trocando 1 config).
- Self-hostable (sem lock-in).
- Ecossistema maduro 15 anos: OAuth2, DKIM, anexos, ICS.
- Open source, gratuito.

### Onde dói

- API verbose.
- Sem dashboard / analytics / webhook automático.
- Templates manuais.
- Deliverability dependente do SMTP usado.
- Maintainer solo (Andris Reinman).

---

## 4. Análise interna

### Decisão estratégica

**Custo zero** é critério vinculante (não há orçamento). Nodemailer com SMTP gratuito (próprio servidor ou Gmail SMTP no início) cabe. **Mas** abstrair via Service Adapter pra que troca futura seja trivial.

### Padrão Service Adapter

Mesmo princípio da ACL Bradesco do handbook (`domain/05` l.5). Port define contrato; adapter implementa.

```typescript
// Port (kernel-level)
export type EmailSender = Readonly<{
  send: (message: EmailMessage) => Promise<Result<EmailReceipt, EmailError>>
}>

// Adapter atual: Nodemailer
createNodemailerEmailSender(config)

// Adapters futuros (esqueleto pronto):
// createResendEmailSender(config)
// createSesEmailSender(config)

// Composition root injeta o adapter. Trocar provider = trocar 1 linha.
```

### O que esse desenho resolve

| Problema | Como resolve |
| :--- | :--- |
| Acoplamento ao Nodemailer | Domínio importa só o port |
| Trocar provider depois | Novo adapter com mesma assinatura |
| Testabilidade | `createInMemoryEmailSender` |
| Erros consistentes | `EmailError` union |
| Retry sem inflar adapter | `withRetry` decorator |

### O que NÃO faz parte do port

- Renderização de templates HTML (application layer).
- Idempotência (outbox pattern do ADR-0004 cobre).
- Bounce handling (provider externo).
- Suppression list (futuro, em decorator).

---

## 5. Decisão final

1. ✅ **Nodemailer como adapter inicial** (custo zero).
2. ✅ **Padrão Service Adapter (Port + Adapters)** desde o dia 1.
3. ✅ **Estrutura de pastas:**
   - `packages/shared-kernel/src/email/` — port + types + smart constructors.
   - `apps/core-api/src/adapters/email/` — adapters concretos (`nodemailer.ts`, `memory.ts`, futuros).
4. ✅ **In-memory adapter para testes.**
5. ✅ **Retry como decorator separado.**

---

## 6. Saídas

- [x] [ADR-0010](../architecture/adr/0010-email-port-adapter-pattern.md) criado.
- [ ] `infrastructure/03-secrets-catalog.md`: adicionar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`.

---

## 7. Referências

- [Best Email API For Node.js Developers Compared 2026 — Mailtrap](https://mailtrap.io/blog/best-email-api-for-nodejs-developers/)
- [Resend vs Nodemailer vs Postmark — PkgPulse](https://www.pkgpulse.com/blog/resend-vs-nodemailer-vs-postmark-email-nodejs-2026)
- Nodemailer documentation: https://nodemailer.com/
