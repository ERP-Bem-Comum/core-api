# Runbook — Backfill + Worker do read-model `fin_supplier_view`

> Popula/repovoa o read-model **`fin_supplier_view`** (nome/CNPJ do fornecedor na listagem
> `GET /api/v2/financial/documents`) a partir dos fornecedores do `partners`. Origem: US2 #47
> (núcleo `8804699e`, worker `2a62f542`, join na grid `f5a51989`, backfill `a1c94e6`).
> Este runbook é o entregável operacional do ticket **`FIN-SUPPLIER-VIEW-BACKFILL-RERUN`** (#111).
> Padrões: ADR-0015 (outbox), ADR-0022 (read-model via projeção), ADR-0041 (jobs/workers especializados).

## 1. O que faz e por quê

A listagem financeira **não pode** ler as tabelas do `partners` direto (ADR-0014 / ADR-0006). O
read-model `fin_supplier_view` é uma **projeção evento-carregada** (ADR-0022): uma linha por
fornecedor (`supplierRef`), com `{name, document, occurredAt, updatedAt}`, consultada por
`LEFT JOIN` na query da grid.

Quando a view está **vazia**, o `LEFT JOIN` não encontra match e a grid devolve
`supplierName` / `supplierDocument` **`null`** — degradação correta, **não** bug de query
(`document-repository.drizzle.ts:513`, mapper `:570-571`).

Há **dois** caminhos que alimentam a view — precisam dos **dois** para cobertura total:

| Caminho | Fonte | Cobre |
| :-- | :-- | :-- |
| **Worker** `supplier-projection` | eventos `SupplierRegistered`/`SupplierEdited` no `par_outbox` | fornecedores criados/editados **a partir de agora** |
| **Backfill** one-shot | snapshot dos fornecedores **já existentes** (`listSuppliersForProjection`) | fornecedores **pré-existentes** (que nunca emitiram evento após a view existir) |

> O worker só projeta eventos **novos**. Fornecedor cadastrado antes de a view/worker existirem
> **nunca** aparece pelo worker — é exatamente o que o **backfill** resolve.

## 2. Arquitetura (fluxo)

```
BACKFILL (one-shot, src/jobs/financial/supplier-view-backfill/)
  run.ts   → listSuppliersForProjection(PARTNERS_DATABASE_URL)  [partners/public-api]
           → openMysqlFinancial(FINANCIAL_DATABASE_URL)
           → backfillSupplierViews(records, store, occurredAt=2000-01-01)
                                     │  upsert por supplierRef (guard de recência)
                                     ▼
                              fin_supplier_view

WORKER (contínuo, src/workers/supplier-view-projection/)
  run.ts   → 2 pools (lê par_outbox, escreve fin_supplier_view) → runLoop
  delivery → rowToMessage {eventType,payload} → applySupplierEvent
  apply    → filtra SupplierRegistered/SupplierEdited → store.upsert
```

- **2 pools** (diferente do `payable-projection`, que usa 1): lê `par_outbox` (partners),
  escreve `fin_supplier_view` (financial).
- **`occurredAt` do backfill = `2000-01-01`** (data antiga proposital): o guard de recência garante
  que um evento real, sempre mais novo, **vence** o backfill — reexecutar o backfill **nunca** regride
  um snapshot vindo do worker (`run.ts:20`).

## 3. Idempotência (reexecução é segura)

- `SupplierViewStore.upsert` = `INSERT ... ON DUPLICATE KEY UPDATE` com guard
  `IF(occurred_at >= ...)` — `supplier-view-store.drizzle.ts:39-60`.
- Rodar o backfill **2×** rende o mesmo estado (**CA2** do #111). Provado por:
  - unit: `tests/jobs/financial/supplier-view-backfill.test.ts` (popula · idempotente · não-regride)
  - integração: `tests/modules/financial/adapters/persistence/supplier-view-store.drizzle-mysql.test.ts`
- Fornecedor sem dados (ex.: quarentena da ETL, #275) simplesmente **não gera linha** → grid degrada
  para `null`, sem falhar o backfill (**CA3** — hoje implícito: sem linha ⇒ `LEFT JOIN` null).

## 4. Configuração

| Env | Obrigatório | Descrição |
| :-- | :-- | :-- |
| `PARTNERS_DATABASE_URL` | sim (backfill + worker) | DSN MySQL do `partners` (fonte dos fornecedores / `par_outbox`). |
| `FINANCIAL_DATABASE_URL` | sim (backfill + worker) | DSN MySQL do `financial` (destino `fin_supplier_view`). |

Sem env → o backfill sai com **exit 78** (`EX_CONFIG`, `run.ts:17,25-28`). Migrations **não** são
aplicadas pelo job/worker (responsabilidade do release — `0003_dapper_joseph.sql` cria a tabela).

## 5. Como rodar

```bash
# ── Backfill one-shot (pré-existentes) ──
# Local (foreground)
PARTNERS_DATABASE_URL=mysql://user:pass@127.0.0.1:3306/core \
FINANCIAL_DATABASE_URL=mysql://user:pass@127.0.0.1:3306/core \
  pnpm run job:financial:supplier-view-backfill

# Docker (profile `jobs`) — run + exit, sem restart loop
docker compose --profile jobs run --rm supplier-view-backfill

# ── Worker de projeção (eventos novos) — 1 réplica ──
# Local (foreground)
PARTNERS_DATABASE_URL=... FINANCIAL_DATABASE_URL=... pnpm run worker:supplier-projection
# Docker (profile `workers`)
docker compose --profile workers up supplier-projection
```

Log de sucesso do backfill (stderr): `[supplier-view-backfill] concluído — N aplicados, 0 falhas de M fornecedores`.
Exit `0` = ok; `1` = houve falha (ou env/partners indisponível); `78` = env ausente.
Encerramento do worker é **graceful** via SIGTERM/SIGINT (aborta o `runLoop`, fecha os pools).

## 6. Diagnóstico do #111 — "grid mostra fornecedor `null`"

Causa-raiz possível é **dupla** (não assumir; medir):

```sql
-- (a) A view está mesmo vazia?
SELECT COUNT(*) FROM fin_supplier_view;                       -- 0 ⇒ nunca populada

-- (b) Há documentos com fornecedor que deveriam casar?
SELECT COUNT(*) FROM fin_documents WHERE supplier_ref IS NOT NULL;

-- (c) O worker está drenando o outbox de partners?
SELECT COUNT(*) FROM par_outbox WHERE processed_at IS NULL;   -- alto e estável ⇒ worker parado
```

| Achado | Causa | Ação |
| :-- | :-- | :-- |
| `fin_supplier_view` vazia + fornecedores existem no `partners` | **backfill nunca disparado** no ambiente | rodar o backfill (§5). |
| `par_outbox` com backlog crescente | **worker parado** / sem env | subir `supplier-projection` (§5); conferir `PARTNERS_/FINANCIAL_DATABASE_URL`. |
| view populada mas grid ainda `null` | `supplier_ref` do documento não bate com `supplierRef` do fornecedor | conferir a chave de ligação (`fin_documents.supplier_ref` ↔ `fin_supplier_view.supplier_ref`). |

**Ordem recomendada:** rodar o **backfill** (cobre o passado) **e** garantir o **worker** ativo
(cobre o futuro). Só um dos dois deixa uma das janelas descoberta.

## 7. Validação (CA1 do #111)

Após o backfill, a grid deve devolver nome/CNPJ para documentos com fornecedor projetado:

```bash
curl -s "$BASE_URL/api/v1/financial/documents?limit=5" | jq '.items[] | {supplierName, supplierDocument}'
# esperado: supplierName / supplierDocument NÃO-nulos p/ documentos com fornecedor
```

Prova automatizada (exige MySQL via Docker):
`MYSQL_INTEGRATION=1 pnpm run test:integration:financial` — cobre
`document-supplier-view-join.drizzle-mysql.test.ts` (grid) + `projection.integration.test.ts` (worker e2e).

## 8. Relacionados

- **#111** (este ticket — reexecução operacional; a máquina já existia).
- **US2 #47** — núcleo do read-model + worker + join + backfill original (`a1c94e6`).
- **#275** — quarentena de fornecedor na ETL (fonte de fornecedor sem dados → grid `null`).
- Molde: [`payable-view-projection-worker.md`](./payable-view-projection-worker.md).
- ADR-0015 (outbox) · ADR-0022 (read-model via projeção) · ADR-0041 (jobs/workers especializados).
