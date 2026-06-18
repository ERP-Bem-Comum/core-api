# W1 — GREEN · FIN-RECON-STATEMENT-PERSIST-HTTP (#120)

**Skills:** ports-and-adapters · drizzle-schema-author · (borda) padrão Fastify+Zod existente · **Resultado:** 🟢 GREEN
**Branch:** `017-fin-conciliacao-bancaria` (com cedente via rebase)

## Fatia vertical entregue (US1 — importação de extrato)

Implementação mínima até GREEN sobre o domínio do #118 (`BankStatement`/`Fitid`/`importStatement`) e os
parsers do #119, usando a fundação conta-cedente (`debit_account_ref`).

### Aplicação

- `application/use-cases/import-bank-statement.ts` — factory `(deps)=>(input)=>Promise<Result>`. Sequência
  canônica: `parser.parse` → resolve FITID (nativo `Fitid.fromNative`; `null`/inválido → `Fitid.synthesize`
  determinístico por `seq`) → `repo.knownFitids` → domínio `importStatement` (dedup) → `repo.save` →
  `outbox.append(BankStatementImported)` (evento só após save ok). `deps.clock` é `Pick<Clock,'now'>`
  (depende da interface mais estreita — só precisa do `occurredAt`).
- `application/ports/bank-statement-repository.ts` — `save` / `knownFitids` / `listTransactions`
  (`null` = extrato inexistente).

### Persistência

- `schemas/mysql.ts` — `fin_bank_statements` + `fin_statement_transactions` com **índice ÚNICO
  `(debit_account_ref, fitid)`** (R5; `debit_account_ref` desnormalizado na transação). `movement` e
  `reconciliation_status` como varchar+CHECK; `entry_type` livre (string aberta do domínio #118 — sem CHECK
  restritivo, para não rejeitar tipos de lançamento arbitrários do banco). FK → raiz ON DELETE CASCADE.
- `migrations/mysql/0005_silky_scorpion.sql` — via `pnpm run db:generate:financial` + edição manual
  CHARSET/COLLATE (igual 0000–0004). `id`/`statement_id`/`debit_account_ref`/`fitid` em `utf8mb4_bin`
  (FITID é chave de dedup → comparação binária exata). Meta files formatados (`prettier --write`).
- `mappers/statement.mapper.ts` — `statementToRow` / `transactionsToRows` / `toDomain` (revalida IDs, FITID,
  movement, reconciliationStatus, file_format).
- `repos/bank-statement-repository.{in-memory,drizzle}.ts` — Drizzle: `save` insere raiz+transações na MESMA
  tx (o UNIQUE é a defesa final de dedup; insert duplicado → `err`); `knownFitids` via `IN`; `listTransactions`.

### Outbox / eventos

- `application/ports/outbox.ts` + `adapters/outbox/outbox.in-memory.ts` — `append` ampliado para
  `FinancialAppendableEvent = DocumentEvent | BankStatementEvent`.
- `public-api/events.ts` — `FinancialModuleEvent` inclui `BankStatementImported`; adicionado ao guard.

### Borda HTTP (`/api/v2/financial`)

- `POST /bank-statements` (`reconciliation:import`) → 201 `{ statementId, imported, duplicatesDiscarded, period }`.
- `GET /bank-statements/:id/transactions` (`reconciliation:read`) → 200 lista; 404 se inexistente.
- `schemas.ts` (Zod contract-first), `dto.ts` (`statementTransactionsToDto`), `error-mapping.ts` (novos slugs
  → status/PT-BR), `permissions.ts` (`reconciliation:import`/`:read`), `composition.ts` (wiring por driver,
  parser real injetado).

## Prova de verde

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ |
| `pnpm run format:check` | ✅ (após `prettier --write` nos meta files do drizzle) |
| `pnpm run lint` | ✅ |
| `pnpm test` (sem Docker) | ✅ **2790 pass / 0 fail** / 18 skipped (integração gated) |
| `pnpm run test:integration:financial` (Docker) | ✅ **29 pass / 0 fail** (inclui CA7) |

### Critérios de aceite

- **CA1–CA4** (use-case import/dedup/malformado/FITID sintético) — ✅ gate.
- **CA5** (mapper round-trip; `entryType` preservado; rejeita movement inválido) — ✅ gate.
- **CA6** (HTTP 201 + GET lista + 404 + 403 + 400 malformado) — ✅ gate.
- **CA7** (índice único `(debit_account_ref, fitid)` rejeita FITID duplicado no DB; round-trip;
  mesma FITID em conta distinta permitida) — ✅ Docker. O log `save failed ... fitid-dup` é o caminho
  esperado (violação do UNIQUE → adapter retorna `err`).

## Notas para W2 (code review)

- **`entry_type` livre vs. "union EN" do 000-request**: o domínio #118 mergeado tipa `entryType: string`
  (aberto). Respeitamos o domínio (hierarquia de fontes) — schema sem CHECK restritivo; o parser já normaliza
  ausência para `'Other'`. Fechar `entryType` num union seria mudança de domínio (#118) → novo ticket.
- **Teste W0 "held"**: o arquivo `import-bank-statement.test.ts` (untracked, held no #120 W0) foi ativado;
  ajustes mínimos de lint (`interface` em vez de `type`; `append` sem `async` ocioso) sem alterar asserções.
- **`clock: Pick<Clock,'now'>`**: narrowing intencional (o teste W0 injeta `{ now }`).

## Próxima wave

W2 (`code-reviewer`) — audit read-only, máx. 3 rounds.
