# Code Review — Ticket FIN-RECON-MANUAL-BATCH (#124) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-18T20:10Z
**Escopo revisado:**

- `domain/reconciliation/{manual-entry,manual-entry-id}.ts` + edits em `types.ts`/`events.ts`/`reconciliation.ts`
- `application/use-cases/{record-manual-entry,confirm-batch}.ts` + narrowing em `confirm-reconciliation.ts`
- `application/ports/reconciliation-repository.ts` (+confirmManualEntry)
- `adapters/persistence/repos/reconciliation-repository.{in-memory,drizzle}.ts` + `mappers/reconciliation.mapper.ts`
- `adapters/persistence/schemas/mysql.ts` (fin_manual_entries + CHECK widen) + `migrations/mysql/0007_new_hercules.sql`
- `adapters/http/{plugin,composition,schemas,error-mapping}.ts` + `public-api/events.ts`
- testes (domínio, use-cases, http, integração)

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma. Sem `throw`/`class`/`any` na camada errada; sem violação de ADR; sem bug funcional (CA1–CA6 verdes,
incl. integração). A regressão do CHECK `fin_reconciliations.type` foi **auto-detectada pela integração e
corrigida dentro do W1** (causa, não sintoma) — política de regressão zero respeitada.

### 🟡 Importante (não-bloqueia, registrar)

#### Issue 1 — teste "conta encerrada → account-closed" exercita o caminho errado — `manual-entry.use-cases.test.ts`

**Categoria:** H (qualidade de teste).
**Problema:** o `it('CA3: conta encerrada → account-closed')` **não salva** a conta → `findById` null →
asserta `'cedente-account-not-found'`. O nome promete `account-closed`, mas testa o **not-found**; o caminho
`account-closed` (conta `Closed`) do lançamento manual **não tem teste direto**.
**Avaliação:** o guard usa `isClosed` (mesma lógica já coberta no #123/CA11 para `confirm`), então o risco é
baixo, mas o teste é enganoso e há lacuna nominal. **Não bloqueia.**
**Recomendação:** renomear para "conta inexistente → cedente-account-not-found" **e** adicionar um teste que
salva uma conta `Closed` e asserta `account-closed`.

#### Issue 2 — `confirmBatch` não é atômico no lote — `confirm-batch.ts`

**Categoria:** D (semântica de operação).
**Problema:** para na 1ª falha, mas as conciliações já criadas **persistem** (cada manual entry é unit-of-work
individual). O caller recebe `err` sem saber quantas foram criadas.
**Avaliação:** decisão documentada (`000-request.md` / REPORT) — lote é best-effort por transação; não há tx
única cross-transação (cada uma é independente). **Não bloqueia.**
**Recomendação:** considerar retornar resultado parcial (`{ created, failedAt }`) em vez de `err` seco, ou
documentar o contrato de parcialidade na borda. Cabe num follow-up se o produto exigir.

### 🔵 Sugestão

- **`manualEntry` não reidratado no `findById`** (`toDomain` → null): documentado; nenhum use-case da fatia lê o
  boundary pós-criação e o `undo` não o usa. Reidratar fica para quando houver leitura de manual entry.
- **`undo` de manual entry** preserva a row em `fin_manual_entries** (R7 — nunca deleta); coerente.
- **Migration 0007 faz DROP+ADD do CHECK** (DDL MySQL é auto-commit → janela sem o constraint): inofensivo no
  apply single-threaded da migration.

---

## O que está bom

- **Domínio `confirmManualEntry`** puro e coeso: cria `Reconciliation` tipo `ManualEntry` (`items: []`,
  `manualEntry` no boundary) + `ManualEntryRecorded`; guard `manual-entry-value-not-positive`. Sem balance
  check (correto — manual entry não casa título, é o lançamento do valor da transação).
- **Extensão mínima do agregado** (#122): `ReconciliationType += 'ManualEntry'` + campo `manualEntry`; confirm/undo
  existentes recebem `manualEntry: null` sem quebrar nada.
- **Unit-of-work `confirmManualEntry`** no repo: conciliação + `fin_manual_entries` + transação `Pending→Reconciled`
  na mesma tx, SEM título (espelha o padrão do #123, com `affectedRows`).
- **`confirmBatch` compõe `recordManualEntry`** (DRY) — 1 template × N transações; `empty-batch` guard.
- **Narrowing `confirmReconciliation.reconciliationRepo` → `Pick<_,'confirm'>`** ao crescer o port: evita acoplar
  use-cases à superfície nova. Boa disciplina de ports.
- **Schema ADR-0020-clean** (fin_manual_entries: type+value CHECK, FK CASCADE, refs por identidade) + CHECK de
  `fin_reconciliations.type` ampliado via migration aditiva 0007 (regenerada para 1 migration coesa).
- **Borda** no padrão (Zod, RBAC `reconciliation:write`, value derivado da transação — não vem no body).
- **Testes** em todas as camadas, incluindo integração que provou o unit-of-work no MySQL real (e pegou a
  regressão do CHECK).

---

## Resolução pós-review (a pedido do humano — "resolve os warnings tbm")

- **🟡 Issue 1 (teste enganoso):** **RESOLVIDO** — `it` renomeado para "conta inexistente → cedente-account-not-found"
  **e** adicionado `it('guard FR-015 — conta encerrada (Closed) → account-closed')` que salva uma conta `Closed`
  e asserta `account-closed` (caminho antes não coberto p/ manual entry).
- **🟡 Issue 2 (`confirmBatch` não-atômico):** **RESOLVIDO** — `confirmBatch` agora é **best-effort com relatório**:
  processa TODAS as transações e retorna `ok({ created, reconciliationIds, failed })` (sem estado parcial
  silencioso; `empty-batch` segue como único erro de topo). Borda devolve `failed[]` com **code público**
  (`toPublicCode`, não vaza slug — OWASP API8). Testes: `failed.length===0` no caminho feliz + teste de lote
  parcial (1 criada, 1 em `failed` com `transaction-already-reconciled`).
- **🔵** mantidos (manualEntry não reidratado / undo preserva row / DROP+ADD do CHECK) — sem ação.

Re-gate: typecheck ✅ · format ✅ · lint ✅ · `pnpm test` ✅ **2828/0** (+2 testes). Persistência inalterada
(integração CA6 confirmada no W3).

## Próximo passo

- **APPROVED** (com 🟡 resolvidos) → avançar para **W3** (`ts-quality-checker`): gate + `test:integration:financial`.
