# Quickstart — Conciliação Bancária (017)

Como rodar e validar a feature em desenvolvimento. Stack: Node 24 · TS 6 · ESM · pnpm · Drizzle +
mysql2 (MySQL 8) · `node:test` · Fastify+Zod. **Nunca `npm`** (ADR-0012).

## Pré-requisitos

```bash
pnpm install --frozen-lockfile
```

- **Dependência de dados**: a conciliação importa extrato **por conta-cedente** (`fin_cedente_accounts`,
  da fatia 016) e casa contra títulos em `Paid`. Em dev/teste, semeie:
  1. uma conta-cedente (ou a referência lógica `debitAccountRef`);
  2. um `fin_payables` em status `Paid` (o caminho remessa→retorno→extrato D+1 é externo — ver
     `research.md` D-DEP).

## Testes (gate W0/W3)

```bash
pnpm test                       # node:test — unit + use-case + http (fastify.inject)
pnpm run test:integration       # sobe MySQL via Docker; repos Drizzle reais + índice único FITID
```

Suites principais (ver "Estimativa de Pipeline" no plan.md):

- `tests/modules/financial/domain/reconciliation/*.test.ts` — agregados, VOs (`Fitid`, `MatchScore`),
  invariante R3 (fechamento 100%), transição `Paid↔Reconciled`.
- `tests/modules/financial/adapters/statement-parsers/{ofx,csv}-parser.test.ts` — parsing + FITID
  sintético (CSV).
- `tests/modules/financial/application/use-cases/*.test.ts` — importar (dedup), confirmar (R1/R2),
  desfazer (R7), parcial/múltiplo, lançamento manual, fechar período.
- `tests/modules/financial/adapters/http/financial-reconciliation.http.test.ts` — borda
  `/api/v2/financial/...` (201/204/409/422).

## Subir a borda HTTP (dev)

```bash
# memory driver (sem DB) — valida regras e contratos rápido
node src/server.ts

# mysql driver (persistência real)
FINANCIAL_DRIVER=mysql FINANCIAL_DATABASE_URL='mysql://...' node src/server.ts
pnpm run worker:outbox          # entrega PayableReconciled / ReconciliationUndone
```

## Fluxo de validação manual (E2E feliz)

```text
1. POST /api/v2/financial/bank-statements   { debitAccountRef, format:'OFX', content }  → 201 { statementId, imported, duplicatesDiscarded }
2. (reimporte o MESMO arquivo)                                                            → 201 { imported: 0, duplicatesDiscarded: N }   (R5)
3. GET  /bank-statements/:id/transactions?filter=pendentes                                → lista
4. GET  /statement-transactions/:txId/suggestions                                         → sugestões (band alta/media)
5. POST /reconciliations { transactionId, payableIds:[paid] }                             → 201 { status:'Ativa' }  + título Paid→Reconciled
6. (verifique o outbox) PayableReconciled enfileirado                                      → SELECT * FROM <outbox> ...
7. POST /reconciliations/:id/undo { reason }                                              → 200 { status:'Desfeita' } + título Reconciled→Paid
```

## Migrations

```bash
# após editar adapters/persistence/schemas/mysql.ts
pnpm run db:generate            # gera migration 0005+ (serializada após a 0004 da 016)
```

Inserir CHARSET/COLLATE à mão na migration (utf8mb4*unicode_ci; UUID/FK em utf8mb4_bin), como nas
demais tabelas `fin*\*`. **Uma migration por ticket** (lição PRs #83–86).

## Gate de qualidade (antes de fechar)

```bash
pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test
```
