# 09 — Read-model `fin_supplier_view`: backfill + worker de projeção (disparo e verificação)

> Operacionaliza o read-model de fornecedor do `financial` (issue [#111](https://github.com/ERP-Bem-Comum/core-api/issues/111)).
> Materializa as peças de [ADR-0041](../architecture/adr/0041-specialized-workers-and-oneshot-jobs.md) (job one-shot + worker),
> [ADR-0022](../architecture/adr/0022-read-models-via-projection-over-event-stream.md) (read-model por projeção) e
> [ADR-0043](../architecture/adr/0043-partners-supplier-integration-events.md)/[ADR-0045](../architecture/adr/0045-financial-supplier-read-model.md) (eventos `partners → financial`).

---

## Visão geral

`GET /api/v2/financial/documents` resolve `supplierName`/`supplierDocument` a partir do read-model local **`fin_supplier_view`** (`supplierRef → name, document`), via `LEFT JOIN` (`document-repository.drizzle.ts:569`). Esse read-model é alimentado por **duas vias complementares**:

| Via | O quê | Quando |
| --- | --- | --- |
| **Worker de projeção** `supplier-projection` | consome `par_outbox` (eventos `SupplierRegistered`/`SupplierEdited`) e aplica em `fin_supplier_view` | contínuo — fornecedores **novos/editados** após o worker estar no ar |
| **Job one-shot** `supplier-view-backfill` | varre os fornecedores **já existentes** no `partners` e popula `fin_supplier_view` | uma vez (idempotente) — cobre os **legados** anteriores ao worker |

**Sintoma de #111** (`supplierName: null` para todos): o worker não estava no ar e/ou o backfill nunca rodou no ambiente. **Não é defeito de código** — a máquina está entregue e closed-green (ticket `FIN-SUPPLIER-VIEW-BACKFILL`, commit `a1c94e6`); o caminho end-to-end é validado no **CI** pela suíte `financial` (`scripts/ci/test-integration.ts:96` → `tests/workers/supplier-view-projection/projection.integration.test.ts`). É uma pendência **operacional**: subir o worker + rodar o backfill no ambiente.

---

## Pré-requisitos

1. **Migrations aplicadas** no `financial` (tabela `fin_supplier_view`) e no `partners` (`par_*` + `par_outbox`). O job usa `applyMigrations: false` (prod-safe) e falha (`exit 1`) se o schema não existir.
2. **Connection strings** disponíveis: `PARTNERS_DATABASE_URL` (leitura dos fornecedores) e `FINANCIAL_DATABASE_URL` (escrita do read-model).
3. **Worker no ar** antes de novos cadastros (Procfile `supplier-projection`), para não acumular gap pós-backfill.

---

## Comando canônico

### 1. Garantir o worker de projeção no ar (contínuo)

Via Procfile (overmind/foreman sobem todos os processos, incluindo `supplier-projection`):

```bash
overmind start            # ou: foreman start — sobe http + workers do Procfile
```

Isolado (debug):

```bash
CONTRACTS_DATABASE_URL=... FINANCIAL_DATABASE_URL=... PARTNERS_DATABASE_URL=... \
  pnpm run worker:supplier-projection
```

### 2. Disparar o backfill one-shot (legados)

```bash
PARTNERS_DATABASE_URL='mysql://app:***@localhost:3306/partners' \
FINANCIAL_DATABASE_URL='mysql://app:***@localhost:3306/financial' \
  pnpm run job:financial:supplier-view-backfill
```

Idempotente: o backfill grava com `occurredAt = 2000-01-01` (`run.ts`), então qualquer snapshot vindo de **evento real** sempre vence o guard de recência — re-rodar é seguro e **nunca regride** um nome atualizado pelo worker.

### 3. Verificar

```bash
curl -s -H "Authorization: Bearer <token com fiscal-document:read>" \
  http://localhost:8080/api/v2/financial/documents | jq '.items[] | {id, supplierRef, supplierName, supplierDocument}'
```

`supplierName`/`supplierDocument` devem vir **não-nulos** para documentos com `supplierRef` de fornecedor projetado.

---

## Exit codes (job) e alertas

| Exit code | Significado | Ação |
| --- | --- | --- |
| `0` | Sucesso (`applied=N, failed=0`) | Nenhuma |
| `1` | Falha de runtime (listar fornecedores, abrir MySQL, ou `failed > 0`) | Investigar stderr; re-rodar (idempotente) |
| `78` | `EX_CONFIG` — `PARTNERS_DATABASE_URL`/`FINANCIAL_DATABASE_URL` ausentes | Corrigir env e re-disparar |

Log de sucesso (stderr): `[supplier-view-backfill] concluído — <applied> aplicados, <failed> falhas de <N> fornecedores`.

---

## Agendamento

O backfill é **one-shot** (cobertura de legados) — roda **uma vez** por ambiente após o deploy inicial; não precisa de cron. A consistência contínua é responsabilidade do **worker** `supplier-projection` (long-running no Procfile). Re-disparar o backfill só é necessário se o `fin_supplier_view` for truncado/reconstruído (ADR-0022 §"read-model reconstruível").

---

## Referências

- `src/jobs/financial/supplier-view-backfill/run.ts` — entrypoint do job (config por `PARTNERS_DATABASE_URL` + `FINANCIAL_DATABASE_URL`).
- `src/jobs/financial/supplier-view-backfill/backfill.ts` — lógica pura (guard de recência).
- `src/workers/supplier-view-projection/run.ts` — worker `par_outbox → fin_supplier_view` (consumerId `financial-supplier-view`).
- `src/modules/financial/adapters/persistence/schemas/mysql.ts:493` — tabela `fin_supplier_view`.
- [ADR-0041](../architecture/adr/0041-specialized-workers-and-oneshot-jobs.md) · [ADR-0022](../architecture/adr/0022-read-models-via-projection-over-event-stream.md) · [ADR-0043](../architecture/adr/0043-partners-supplier-integration-events.md) · [ADR-0045](../architecture/adr/0045-financial-supplier-read-model.md).
- Issue [#111](https://github.com/ERP-Bem-Comum/core-api/issues/111) (este runbook) · relacionada: [#110](https://github.com/ERP-Bem-Comum/core-api/issues/110) (mesma classe — backfill do `par_contract_count_view`).
