# Phase 0 — Research: Conta Cedente para Conciliação (019)

Decisões técnicas que sustentam o [plan.md](./plan.md). Cada item: **Decisão / Rationale / Alternativas consideradas**. Base de código mapeada via agente Explore (trechos com `file:line` reais).

## D1 — Estender o agregado existente (não criar separado)

- **Decisão**: estender `src/modules/financial/domain/cedente/` (agregado da 016/CNAB) com os campos de conciliação. Já decidido no clarify (spec §Clarifications).
- **Rationale**: é a **mesma** entidade do mundo real (conta bancária da organização de onde sai o pagamento). O agregado já tem `create`/`isActive`/`isClosed`/`close()` + guard `cedente-account-already-closed` e status `Active`/`Closed`. Criar um segundo agregado duplicaria identidade e arriscaria drift.
- **Alternativas**: agregado separado só-conciliação (rejeitado — duas "contas da organização", confusão + drift); tabela nova (rejeitado — `debit_account_ref` da #120/#123 já aponta para `fin_cedente_accounts`).
- **Princípio IX**: ⚠️ citação canônica (Evans — invariante de agregado; Vernon — consistency boundary) **PENDENTE** (base ACDG indisponível nesta sessão). A extensão não cria fronteira nova.

## D2 — Semântica create-vs-edit: NÃO reusar o `save()` upsert para create

- **Decisão**: `create` deve **rejeitar** conta duplicada (FR-016), não atualizar. Como o adapter Drizzle hoje implementa `save()` com `insert(...).onDuplicateKeyUpdate(...)` (`repos/cedente-account-store.drizzle.ts:54-77`), um `create` que chame `save()` **silenciosamente sobrescreveria** a conta existente. Portanto: `create` usa um caminho **insert-only** que falha em duplicidade (apoiado no `UNIQUE INDEX` de FR-016) **ou** um `findByNaturalKey()` de pré-checagem → erro de domínio `cedente-account-duplicate`. `edit` usa `findById` (deve existir) + `save`. `close` reusa o `close()` do domínio + `save`.
- **Rationale**: o `onDuplicateKeyUpdate` é **permitido** por ADR-0020 (`handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md:93` — "SQL bruto não é mais bloqueio"), mas é a primitiva errada para a semântica de _criação idempotente-rejeitante_. A regra de unicidade é de domínio/aplicação, acima da persistência.
- **Alternativas**: confiar só no `UNIQUE INDEX` e traduzir o erro do driver (`ER_DUP_ENTRY`) → funciona, mas acopla a regra ao código de erro do MySQL; preferimos pré-checagem explícita no use-case + índice como rede de segurança.
- **Impacto no port**: adicionar `list()` (FR-007) e avaliar `findByNaturalKey()` (FR-016) ao `application/ports/cedente-account-store.ts` (hoje só `findById` + `save`).

## D3 — Permissão `bank-account:read|write`

- **Decisão**: registrar `bankAccountRead: 'bank-account:read'` e `bankAccountWrite: 'bank-account:write'` em `src/modules/financial/public-api/permissions.ts` (objeto `FINANCIAL_PERMISSION`). Leitura (list/get) = read; criar/editar/encerrar = write.
- **Rationale**: clarify decidiu permissão dedicada (não reuso). Aplicada via `preHandler: [requireAuth, authorize(FINANCIAL_PERMISSION.bankAccountWrite)]`, mesmo padrão de `reconciliationWrite` (`plugin.ts:484-511`).
- **Alternativa (nota de consistência)**: o catálogo usa nouns de domínio (`reconciliation:*`, `fiscal-document:*`). `cedente-account:*` seria mais aderente ao nome do agregado; mantemos `bank-account:*` por ser a decisão literal do clarify, mas o review pode reavaliar o slug (mudança barata, sem migration).

## D4 — Guard `account-closed` no import (FR-011)

- **Decisão**: adicionar ao `application/use-cases/import-bank-statement.ts` a checagem de conta encerrada, espelhando `confirm-reconciliation.ts:85-91` (carregar a conta por `debitAccountRef`, `if (isClosed(acc)) return err('account-closed')`).
- **Rationale**: FR-012 (conciliação) **já está satisfeito** — o guard existe em `confirm-reconciliation.ts`. FR-011 (import) é o gap real: `import-bank-statement.ts` lê `debitAccountRef` mas **não** carrega a conta nem checa status. O erro `account-closed` já está mapeado para HTTP 409 + mensagem PT-BR (`error-mapping.ts:28,135`).
- **Alternativas**: guard só na borda HTTP (rejeitado — invariante de aplicação, deve viver no use-case para valer em qualquer entrada).

## D5 — Tipos das colunas novas

- **Decisão**: `type VARCHAR(16) + CHECK IN ('corrente','poupanca','investimento')`; `nickname VARCHAR(60)`; `bank_name VARCHAR(80)`; `opening_balance_cents BIGINT NULL`; `opening_balance_date DATE NULL`. Par saldo+data coeso (FR-006) validado no `create()` do domínio e por `.refine()` no Zod da borda.
- **Rationale**: ADR-0020 — enum via `VARCHAR+CHECK` (`:104`), Money em `BIGINT` cents (`:67`), sem JSON (`:102`). Todas **NULLABLE** → ALTER não-quebrante para as linhas da 016 (FR-013).
- **Alternativas**: `DATETIME(3)` para a data (rejeitado — saldo de abertura é uma data, sem hora); `ENUM` nativo (proibido por ADR-0020).

## D6 — `list()` no port e adapters

- **Decisão**: adicionar `list(): Promise<Result<readonly CedenteAccount[], CedenteAccountStoreError>>` ao port, ao adapter Drizzle (`select().from(finCedenteAccounts)`) e ao in-memory (`[...accounts.values()]`). Alimenta o grid (US1/FR-007).
- **Rationale**: o grid lista todas as contas; saldo consolidado/contadores ficam fora (FR-015, read-model em issue separada).
- **Alternativas**: paginação/filtro por status agora (YAGNI — volume baixo; adicionar quando o grid pedir).

## D7 — Pré-condição do índice único (FR-016) sobre dados legados

- **Decisão**: o W0 deve cobrir o cenário de o `CREATE UNIQUE INDEX` encontrar duplicatas pré-existentes (linhas da 016). Em dev assume-se base limpa; em produção, verificação manual antes do deploy da migration.
- **Rationale**: adicionar `UNIQUE` a uma tabela com dados pode falhar no `ALTER`. Documentado como assumption na spec.
- **Alternativas**: índice não-único + checagem só no use-case (rejeitado — perde a rede de segurança no banco).

## Resumo de unknowns

Nenhum `NEEDS CLARIFICATION` remanescente (clarify resolveu FR-008/FR-014/FR-016). Único risco operacional: D7 (dados legados vs índice único).
