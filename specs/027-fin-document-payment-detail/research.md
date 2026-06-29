# Research — Complemento da forma de pagamento (feature 027)

Fase 0 do `/speckit-plan`. Todas as decisões foram **pré-validadas antes da spec** por 3 agentes especialistas (`drizzle-orm-expert`, `zod-expert`, `security-backend-expert`) + 2 canais MCP canônicos (`acdg-skills` para DDD, `security` para OWASP). Nenhum `NEEDS CLARIFICATION` remanescente. Veredito agregado: **SÓLIDA com ajustes incrementais incorporados, 0 bloqueante.**

---

## D1 — `paymentDetail` é atributo primitivo, não Value Object

**Decisão**: modelar como `paymentDetail: string | null` em `DocumentCore` e `DraftDocument`. Sem smart constructor próprio, sem branded type, sem VO.

**Rationale**: o complemento é texto livre heterogêneo (linha digitável, id de cartão, ref. de câmbio, observação) sem comportamento, sem invariante de domínio verificável a priori e sem relação com outros atributos da entidade. Envolvê-lo em VO seria over-engineering.

**Citação canônica** (Princípio IX — Vernon, *Implementing Domain-Driven Design*, p.292, `shared-references/ddd/ddd--vernon-livro-vermelho.md:5379`):

> "By now you may have begun to think that everything looks like a Value Object. [...] Where you might use a little caution is when there are truly simple attributes that really don't need any special treatment. Perhaps those are Booleans or any numeric value that is really self-contained, needing no additional functional support, and is related to no other attributes in the same Entity. On their own the simple attributes are a Meaningful Whole."

**Alternativas consideradas**: (a) VO `PaymentDetail` com validação de formato por tipo de boleto — rejeitada (YAGNI; formato é responsabilidade externa, o campo é opaco). (b) Reusar `description` — rejeitada (semântica distinta; complemento é específico da forma de pagamento).

---

## D2 — Validação de borda: bound + rejeição de inválidos, sem sanitização de conteúdo

**Decisão**: `z.string().trim().min(1).max(255).regex(/^[^\x00-\x1F\x7F]*$/).optional()` no create; idem `.nullable().optional()` no patch.

**Rationale**:
- `.trim().min(1)` — `""`/whitespace-only são inválidos (400); ausência (`undefined`) = "não informado". Elimina ambiguidade `null` vs `""` no read-model (achado `zod-expert` Minor 1/2).
- `.max(255)` — bound contra abuso, casa com `varchar(255)`. Usos conhecidos cabem com folga (linha digitável ~47–54; código de barras 44; câmbio < 100).
- `.regex(/^[^\x00-\x1F\x7F]*$/)` — rejeita caracteres de controle: CR/LF evitam **log injection** quando `LOG_LEVEL=debug` serializa o body; NUL corrompe `varchar` utf8mb4 (achado `security-backend-expert` M1). Não toca acentos/dígitos/pontuação.
- **Sem sanitizar conteúdo** — o backend não faz strip de HTML.

**Citação canônica** (Princípio IX — OWASP Input Validation Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html):

> "It's also free-form text input that highlights the importance of proper context-aware output encoding and quite clearly demonstrates that input validation is **not** the primary safeguards against Cross-Site Scripting. If your users want to type apostrophe `'` or less-than sign `<` in their comment field, they might have perfectly legitimate reason for that and the application's job is to properly handle it throughout the whole life cycle of the data."

**Alternativas consideradas**: (a) strip/sanitização de HTML no backend — rejeitada (frágil, bypasses, corrompe linha digitável legítima, falsa sensação de segurança). (b) allowlist rígido — rejeitada (campo multi-semântico, não há conjunto fechado).

---

## D3 — Fronteira de defesa XSS é do front (output encoding)

**Decisão**: a spec atribui explicitamente ao consumidor que renderiza a defesa contra Stored XSS — renderizar como text content (JSX `{value}`), `dangerouslySetInnerHTML` proibido para este campo. Backend valida shape/bounds (D2).

**Rationale**: defesa primária de Stored XSS é output-encoding context-aware no renderer (OWASP A03; achado `security-backend-expert` M2). Repassar essa cláusula ao lado front da #89.

---

## D4 — Persistência: `varchar(255) NULL`, migration aditiva INSTANT

**Decisão**: coluna `payment_detail varchar(255)` (nullable, sem default, sem CHECK, sem index, sem COLLATE explícito) em `fin_documents`; migration `0026` gerada por `db:generate` (`ALTER TABLE ADD COLUMN`).

**Rationale** (`drizzle-orm-expert`, veredito SÓLIDA):
- `varchar(255)` é o canônico de "texto livre curto" (ADR-0018); sem CHECK porque o conteúdo é heterogêneo; sem index porque não há query por esse campo.
- Sem `COLLATE` explícito — herda `utf8mb4_unicode_ci` da tabela; só colunas UUID recebem `utf8mb4_bin` (precedente `debit_account_ref`).
- `ALTER ADD COLUMN` é `ALGORITHM=INSTANT` por default no MySQL 8.4 (Refman 8.4 §17): metadata-only, lock-free, concurrent DML permitido, back-compat (linhas existentes leem `NULL`). Row-version counter de `fin_documents` = 8/64 após esta migration — margem confortável.

**Alternativas consideradas**: `varchar(500)` — desnecessário (255 cobre os usos). Index — rejeitado (sem `findByPaymentDetail`).

---

## D5 — Exposição detail-only

**Decisão**: campo em `documentResponseSchema` (detalhe) e **não** em `documentSummarySchema` (listagem).

**Rationale**: BE-030 (response não vaza campos além do necessário); o front consome o complemento no detalhe/edição, não na grade. Consistente com `accessKey`/`competencia`/`description`, ausentes na listagem.

---

## D6 — Edição via PATCH em escopo (clarify resolvido)

**Decisão**: `adjustDocumentBodySchema` recebe `paymentDetail` `.nullable().optional()` — `null` apaga, ausente não altera (padrão de `description`). A trilha de auditoria (timeline) registra before/after.

**Rationale**: decisão de clarify (2026-06-29); valor operacional (corrigir linha digitável errada) com custo marginal baixo. Auditoria de before/after é intencional.

---

## D7 — Logs: não é credential

**Decisão**: `paymentDetail` **não** entra no redact list do Pino.

**Rationale**: linha digitável/código de barras é instrumento de pagamento, não credencial de autenticação; impresso no boleto e enviado ao pagador. Com `LOG_LEVEL=warn` (produção) o body não é serializado. Documentar; reavaliar se vier a conter dado pessoal identificável (achado `security-backend-expert` m2).
