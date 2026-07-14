# Code Review — REPORTS-PAYMENT-POSITION (#243 · REP-4)

**Reviewer:** `code-reviewer` + `security-backend-expert` (correção da agregação + fronteira/exposição).
**Veredito:** **APPROVED** (round 1).
**Escopo:** reader agregado `financial/public-api`, adapters `reports`, borda HTTP, composition.

## Achados

### 🔴 Crítico / 🟠 Alto — nenhum

### 🟡 Médio
- **M1 — 3º pool ao `financial` no processo HTTP (sem registry).** `openPaymentPositionReader` abre
  pool próprio contra o mesmo banco `financial`, somando-se ao pool do `financialHttpPlugin` e ao do
  `openSuppliersWithoutContractReader` (REP-2). Mesmo vetor do incidente RDS 0001 (pressão no connection
  budget), **não** o mesmo bug (`maxIdle < connectionLimit` garantido por construção). Padrão
  **pré-existente** no módulo `reports` (REP-2 já fazia); este ticket adiciona +1 instância.
  **Follow-up (não bloqueia):** unificar os readers HTTP do `reports` num pool compartilhado por
  connection-string (`openMysqlFinancialOnPool` / PoolRegistry do #407). Registrado abaixo.

### 🔵 Baixo
- **B2 — faltava fixture `due_date == hoje`.** O predicado ATRASADO é `< hoje` (estrito, correto), mas
  o CA4 não travava a fronteira. **CORRIGIDO** — adicionado payable Open que vence hoje: conta em
  PENDENTE (`310000`) e **não** em ATRASADO (`200000`).
- **B1 — `stderr.write(String(cause))` no catch.** Vai só p/ log do servidor (5xx sanitizado por
  `sendResult`); é a **convenção do driver** financial (não regressão). Não mexer isoladamente.
- **B3 — `Number()` sobre `SUM` de bigint.** Perda de precisão só acima de ~R$90 tri por grupo
  (inatingível); padrão pré-existente (`suppliers-without-contract`).

## Correção da agregação (coração do ticket) — confirmada correta
- 3 baldes batem com a definição: PENDENTE `status IN ('Open','Approved')`, PAGO `= 'Paid'`, ATRASADO
  `IN ('Open','Approved') AND due_date < today` (`<` estrito). ATRASADO ⊆ PENDENTE.
- `due_date` (date string 'YYYY-MM-DD') vs `today` (`PlainDate.toISOString`) — comparação lexicográfica
  de ISO largura-fixa = cronológica. Correto.
- **ONLY_FULL_GROUP_BY (MySQL 8.4):** GROUP BY cobre as 6 colunas não-agregadas do SELECT.
- `SUM(CASE WHEN ... ELSE 0 END)` nunca NULL (todo grupo tem ≥1 linha) → sem NaN.
- `WHERE status != 'Cancelled'` seguro (`status` NOT NULL + CHECK). Refs nulos agrupam intencionalmente.

## Confirmações
- **Sem SQL injection:** query só com refs de coluna + `${today}` bind param; handler sem input do usuário.
- **Pool boot-scoped:** reader aberto 1× no boot; `today` re-derivado por chamada via clock no closure. Cleanup encadeado em falha parcial (fecha os já abertos) — sem vazamento.
- **Boundary ADR-0006:** `reports` importa só `financial/public-api`.
- **RBAC fail-closed:** `requireAuth` → `authorize('fiscal-document:read')`; CA2 prova 403.
- **Response fechado + 5xx sem leak:** 9 colunas `.strict()` (CA3); `sendResult` envelope genérico ≥500.
- **Exposição:** nomes de fornecedor/CC/categoria + valores, gated; sem CNPJ/dado sensível extra.
