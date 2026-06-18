# Code Review — Ticket FIN-RECON-CORE-PERSIST-HTTP (#123) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-18T17:05Z
**Escopo revisado:**

- `application/use-cases/{confirm-reconciliation,undo-reconciliation,search-paid-payables}.ts`
- `application/ports/{reconciliation-repository,payable-reconciliation-view}.ts` + extensão `bank-statement-repository.ts`
- `adapters/persistence/repos/{reconciliation-repository,payable-reconciliation-view}.{in-memory,drizzle}.ts` + `bank-statement-repository.*` (findTransaction)
- `adapters/persistence/mappers/reconciliation.mapper.ts` + `statement.mapper.ts` (transactionRowToDomain)
- `adapters/persistence/schemas/mysql.ts` (3 tabelas) + `migrations/mysql/0006_*.sql`
- `adapters/outbox/outbox.in-memory.ts` + `application/ports/outbox.ts` + `public-api/events.ts`
- `adapters/http/{plugin,composition,schemas,dto,error-mapping}.ts` + `public-api/permissions.ts`
- testes (use-cases, mapper, http, integração)

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma. Sem `throw`/`class`/`any` nas camadas erradas (lint type-checked verde); sem violação de ADR;
sem bug funcional (CA1–CA11 verdes, incl. atomicidade na integração real).

### 🟡 Importante (não-bloqueia, registrar)

#### Issue 1 — caminho de persistência ignora `Payable.reconcile`/`unreconcile` — `repos/reconciliation-repository.drizzle.ts`

**Categoria:** D / DRY.
**Problema:** as transições de domínio `Payable.reconcile`/`unreconcile` (#122) **não são usadas em produção**
(só no teste `payable-reconcile.test.ts`). O write-path flipa o status com UPDATE condicional SQL
(`WHERE status='Paid' SET 'Reconciled'`), replicando o invariante Paid↔Reconciled fora do domínio.
**Avaliação:** **defensável** e consequência direta do unit-of-work aprovado: evita carregar o agregado
Document inteiro para flipar um título; o invariante R2 já é validado no domínio (`Reconciliation.confirm`
checa `payable.status === 'Paid'` via `PayableSnapshot`), e o `WHERE status=...` + `affectedRows` é a rede
de concorrência. **Não bloqueia.**
**Recomendação:** aceitar (as funções de domínio permanecem como spec canônica do invariante + unit-tested),
ou abrir follow-up p/ rotear o write pelo domínio (mais pesado). Registrar via `issue-report` se quiser zerar a duplicação.

#### Issue 2 — guard FR-015 (`account-closed`) é decisão de estado no use-case — `use-cases/confirm-reconciliation.ts`

**Categoria:** application.md ("se um `if` decide estado de negócio, mover p/ domain").
**Problema:** `if (account.status === 'Closed') return err('account-closed')` decide regra de negócio na
application.
**Avaliação:** **defensável** — é guard **cross-aggregate**: a raiz `Reconciliation` não enxerga
`CedenteAccount` (agregado distinto); coordenar agregados é papel do application service (DDD). Os invariantes
internos da conciliação (R2/R3) estão no domínio. **Não bloqueia.**
**Recomendação:** aceitar; se o time quiser domain-encoded, passar o status da conta para um check de domínio
(mudança em #122). 

### 🔵 Sugestão (futuro — já mapeado em tickets)

- **`searchPaidPayables` sem filtros** (conta/período) — lista todos os `Paid`. Filtros são do read-model **#139**.
- **`difference` sem validação sinal×tratamento** — o domínio só checa o fechamento (R3); consistência
  (ex.: `Discount` deve ser negativo) é da conciliação parcial avançada **#141**.
- **`fin_rejected_suggestions`** criada sem use-case — esperado (rejeição de sugestão é **#121**); só a tabela aqui.

---

## O que está bom

- **Unit-of-work atômico** no `confirm`/`undo`: UMA `db.transaction` cobre conciliação+itens + flip do título +
  flip da transação; UPDATE condicional `WHERE status=...` + `affectedRowsOf` blinda contra corrida (espelha o
  optimistic-lock do `document-repository.drizzle.ts`). Sentinela via `throw` interno → rollback → `Result`.
- **Sequência canônica** dos use-cases: fetch → guard FR-015 → domínio (R2/R3) → persist → publish (evento só
  após save ok). Zero regra de fechamento na application (delegada a `Reconciliation.confirm`).
- **Refs cross-aggregate por identidade** (`transaction_id`/`payable_id` sem FK; só índice) — alinhado a Evans/
  D-AGGREGATES; FK só de `fin_reconciliation_items` → raiz (boundary, CASCADE).
- **Schema ADR-0020-clean**: varchar+CHECK (type/status/treatment), bigint cents, PK composta nos itens, CHECK
  composto da `difference` (ambos null OU ambos preenchidos). Migration 0006 com `utf8mb4_bin` nas colunas de identidade.
- **Mapper** revalida todo estado vindo do banco (IDs, type, status, treatment) → `Result`.
- **Outbox/public-api** ampliados de forma coerente; guard de evento atualizado.
- **Borda** no padrão do módulo (Zod, `sendDomainError`/`sendResult`, slugs não vazam, RBAC `reconciliation:write`/`:read`).
- **Testes**: use-cases com fakes (CA1–CA9), mapper round-trip Active/Undone/difference, HTTP 201/undo/403/404,
  e **integração real** provando atomicidade (confirm flipa os 3; undo reverte os 3; re-confirm bloqueado;
  guard FR-015 sem efeito colateral).

---

## Resolução pós-review (a pedido do humano — "resolve os amarelos e azuis")

- **🟡 Issue 1 (transições de título não usadas):** **RESOLVIDO por remoção** — `Payable.reconcile`/`unreconcile`
  (`domain/payable/payable.ts`) + teste dedicado removidos (dead code; sem caller de produção; o invariante
  Paid↔Reconciled é dono do agregado `Reconciliation` — `confirm` R2 — e aplicado atomicamente pelo repo, já
  coberto por integração). Cobertura da regra preservada (CA5 + CA11).
- **🟡 Issue 2 (guard FR-015 na application):** **RESOLVIDO** — a decisão de negócio saiu do `if` inline; o
  use-case agora chama o predicado de domínio `isClosed(account)` (`domain/cedente/cedente-account.ts`).
- **🔵 #139 (filtros de `searchPaidPayables`):** ponteiro já ancorado em `search-paid-payables.ts` (read-model #139).
- **🔵 #141 (sinal×tratamento da `difference`):** ponteiro ancorado em `schemas.ts` (confirmReconciliationBodySchema).
- **🔵 #121 (`fin_rejected_suggestions`):** ponteiro já ancorado no comentário do schema.

Re-gate após as mudanças: typecheck ✅ · format ✅ · lint ✅ · `pnpm test` ✅ **2803/0** · integração ✅ **28/0**.

## Próximo passo

- **APPROVED** (com 🟡 resolvidos) → avançar para **W3** (`ts-quality-checker`): gate + `test:integration:financial`.
