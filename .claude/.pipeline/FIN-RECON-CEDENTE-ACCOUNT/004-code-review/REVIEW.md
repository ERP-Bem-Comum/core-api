# Code Review — FIN-RECON-CEDENTE-ACCOUNT — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (skill) · **Data:** 2026-06-19
**Escopo revisado:**

- `domain/cedente/{types.ts,cedente-account.ts}`
- `application/ports/{cedente-account-store.ts,cedente-account-history.ts}`
- `application/use-cases/{create,list,close,edit}-cedente-account.ts`
- `application/use-cases/import-bank-statement.ts` (guard)
- `adapters/persistence/repos/{cedente-account-store.in-memory,cedente-account-store.drizzle,cedente-account-history.from-statements}.ts`
- `adapters/persistence/mappers/cedente-account.mapper.ts` · `schemas/mysql.ts` · migration `0009`
- `adapters/http/{plugin,composition,schemas,error-mapping}.ts` · `public-api/permissions.ts`

---

## Princípio IX — citação canônica (invariante do par coeso)

A decisão central de domínio — `openingBalanceCents` + `openingBalanceDate` formam um **par coeso** validado no smart constructor `create()` (FR-006), e o agregado da 016 é **estendido** (mesmo consistency boundary) em vez de fragmentado — está ancorada em:

> *"An invariant is a business rule that must always be consistent. There are different kinds of consistency. One is transactional consistency, which is considered immediate and atomic... When discussing invariants, we are referring to transactional consistency."* — Vaughn Vernon, *Implementing DDD*, p. 450 (§"Model True Invariants in Consistency Boundaries", linha 8985)

O par saldo/data é uma invariante transacional (imediata e atômica) → pertence ao construtor do agregado, não à borda. Implementado em `cedente-account.ts` (`(cents===undefined) !== (date===undefined)` → `opening-balance-requires-date`). ✓

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma. Zero `throw`/`class`/`this`/`any` no domínio; ports são `type Readonly<{...}>`; use-cases são factory `(deps)=>(input)=>Promise<Result>`; adapters convertem erro→`Result`; cross-módulo respeitado (ADR-0006); migration nullable+UNIQUE+CHECK (ADR-0020); imports `.ts` + `import type`. Gate W3 verde (typecheck/format/lint/test).

### 🟡 Importante (registrar)

#### Issue 1 — `application/use-cases/edit-cedente-account.ts` (campo `type`)

**Categoria:** B/D (smart constructor / validação de invariante).
**Problema:** `edit` aplica `type: input.type as AccountType` direto no `updated` **sem revalidar** contra `ACCOUNT_TYPES` — diferente do `create`, que delega ao domínio. Um `type` inválido só é barrado pela borda (Zod `accountTypeSchema` no PATCH). Se o use-case for chamado por outro caller (futuro), aceitaria estado inválido.
**Esperado:** revalidar `type` no caminho de edição (defesa-em-profundidade — o domínio rejeita estado inválido independentemente da borda).
**Disposição:** não-bloqueante (único caller hoje é a rota PATCH, gateada por Zod). Registrar como follow-up de hardening (candidato a issue ou W1-touch posterior). Não há bug funcional confirmado.

### 🔵 Sugestão / observação

- **`accountHistory.hasActivity`** (`cedente-account-history.from-statements.ts`): "histórico" derivado de `listTransactionsByPeriod` (tem transações de extrato). É proxy razoável (não há conciliação sem importação), mas não cobre o caso de extrato importado com 0 transações. Aceitável p/ W1; revisitar se FR-008 exigir contar conciliações explicitamente.
- **Valores PT no union `AccountType`** (`'corrente'|'poupanca'|'investimento'`): divergem da convenção "código em EN", mas são **linguagem ubíqua** do domínio bancário BR e fazem parte do contrato fixado na spec/W0 (testes asseguram `'corrente'`/`'salario'`). Mudar seria alteração de spec, fora do W1.
- **`error-mapping.ts`**: `cedente-account-not-found` movido 404→422 (global). Afeta o `code` público de confirm/manual-entry (404→422), mas nenhum teste exige 404 ali e é defensável (ref pendente, não recurso pedido). Documentado no `003-impl/REPORT.md`.
- **`openingBalanceDate`** aceito como `string` livre no domínio (a borda valida via `z.iso.date()`). Consistente com o padrão do projeto (datas como string ISO na borda).

---

## O que está bom

- Smart constructor com invariante de par coeso ancorado em DDD (Princípio IX). ✓
- Guard de import **lenient e antes do parse** — espelha `confirm-reconciliation`, preserva o happy-path existente, não introduz regressão (13 testes de import verdes). ✓
- `create` insert-only via `findByNaturalKey` (não reusa o upsert cego) — exatamente a decisão D2 do `research.md`. ✓
- Migration 0009 estritamente não-quebrante (ADD COLUMN nullable) + UNIQUE FR-016 + CHECK do `type`. ✓
- Fixture de integração parametrizada (contador) resolve o achado W0 sobre colisão da chave natural. ✓
- `exactOptionalPropertyTypes` respeitado (spread condicional em domínio/mapper/handlers). ✓
- Zero regressão: 311 testes financial + 2957 globais verdes.

---

## Próximo passo

**APPROVED** → pipeline-maestro avança para **W3** (gate formal + close). O 🟡 Issue 1 fica registrado como follow-up de hardening (não bloqueia o close — severidade Importante, não Crítica).
