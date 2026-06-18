# Code Review — Ticket FIN-RECON-PERIOD-EXPORT (#125) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-18T23:35Z
**Escopo revisado:**

- `domain/reconciliation/{period,reconciliation-period-id}.ts`
- `application/use-cases/{close-reconciliation-period,export-reconciliation}.ts` + guard em import/confirm/manual/undo
- `application/ports/{reconciliation-period-store,reconciliation-exporter}.ts` + extensão `bank-statement-repository.ts`
- `adapters/persistence/repos/reconciliation-period-store.{in-memory,drizzle}.ts` + `mappers/reconciliation-period.mapper.ts`
- `adapters/export/reconciliation-exporter.ts` + `bank-statement-repository.*` (listTransactionsByPeriod)
- `adapters/persistence/schemas/mysql.ts` (fin_reconciliation_periods) + `migrations/mysql/0008_*.sql`
- `adapters/http/{plugin,composition,schemas,error-mapping}.ts` + `public-api/{events,permissions}.ts`
- testes (domínio, exporter, use-cases, http, integração)

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma. Sem `throw`/`class`/`any` na camada errada; sem violação de ADR; sem bug funcional (CA1–CA7 verdes,
incl. integração). Switch do exporter é exaustivo (`const _: never`).

### 🟡 Importante (não-bloqueia, registrar)

#### Issue 1 — guard `period-closed` só tem teste direto via `recordManualEntry`

**Categoria:** H (cobertura).
**Problema:** o guard R18 foi ligado em 4 use-cases (import/confirm/manual/undo), mas só o caminho de
`recordManualEntry` tem teste `period-closed` direto (`period.use-cases.test.ts`). `importBankStatement`,
`confirmReconciliation` e `undoReconciliation` exercitam a MESMA lógica (`periods.isClosed`), porém sem
asserção própria; a integração testa `isClosed` isolado, não o bloqueio fim-a-fim.
**Avaliação:** risco baixo (lógica simétrica + `isClosed` integração-testado), mas há lacuna de cobertura.
**Não bloqueia.**
**Recomendação:** adicionar 3 testes curtos de `period-closed` (import/confirm/undo) reusando os fakes existentes.

### 🔵 Sugestão

- **Guard do import checa só início+fim do extrato** (`[periodStart, periodEnd]`): um extrato que *atravesse* a
  fronteira de um período fechado (datas extremas fora, transação no meio dentro) escaparia. Cenário raro
  (extrato cabe num período). Endurecer com checagem por transação se necessário.
- **Fronteira de data depende de transações à meia-noite**: `period_end` é `date` (00:00). `isClosed` e
  `listTransactionsByPeriod` usam `<=`/`between`; como as transações são gravadas à meia-noite (parsers #119),
  o último dia casa. Se uma fonte futura trouxer hora-do-dia, a transação no fim do último dia poderia escapar.
- **Fechar período vazio é permitido** (sem transações → sem pendência → Closed): "selo" de período sem
  movimento; intencional, mas registrar.
- **Export inclui todas as transações do range** (não só `Reconciled`) com coluna `status`: ok p/ um extrato do
  período; `valor`/totais em centavos inteiros (CSV). O OFX formata `TRNAMT` com `/100`+`toFixed(2)` (float
  só de apresentação, não aritmética de Money).

---

## O que está bom

- **`closePeriod` puro** (FR-013 + range), com a contagem de `Pending` delegada à application (`listTransactionsByPeriod`).
- **Guard R18 cross-cutting** consistente: import checa as bordas do extrato; confirm/manual usam a data da
  transação; undo carrega a transação p/ a data (skip se ausente — não trava o desfazer por inconsistência).
- **Exporter Node puro** (D-FORMATS): CSV via `toCsv` compartilhado (RFC 4180 + anti-injeção de fórmula) + OFX
  manual; switch exaustivo; totalizações.
- **Schema ADR-0020-clean** (fin_reconciliation_periods: UNIQUE conta+range, CHECK status); migration 0008 aditiva
  com CHARSET/COLLATE; `isClosed` Drizzle com `lte/gte` sobre `date`.
- **Narrowing de ports** mantido ao crescer deps (`undo` ganhou `statements`+`periods` via `Pick`); `Pick<_,'isClosed'>`
  em todos os guards (interface mínima).
- **public-api/outbox** ampliados para `ReconciliationPeriodClosed` (+ guard de evento).
- **Testes** em todas as camadas + integração que prova close persistido, `isClosed` por data, UNIQUE no re-close e export.

---

## Resolução pós-review (a pedido do humano)

- **🟡 Issue 1 (cobertura do guard):** **RESOLVIDO** — adicionados 3 testes diretos de `period-closed` em
  `period.use-cases.test.ts`: importar / conciliar / desfazer em período fechado. Somados ao de `recordManualEntry`,
  os **4 caminhos** do guard R18 têm asserção própria. Re-gate: typecheck ✅ · lint ✅ · suíte do ticket verde.
- **🔵** mantidos (straddle do import; fronteira meia-noite; período vazio; export todos-status; OFX float-display) — sem ação.

## Próximo passo

- **APPROVED** (🟡 resolvido) → avançar para **W3** (`ts-quality-checker`): gate + `test:integration:financial`.
