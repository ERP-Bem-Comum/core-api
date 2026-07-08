# W0 — REPORT (FIN-SUPPLIER-VIEW-BACKFILL-RERUN, #111)

> **Owner:** skill `tdd-strategist` · **Data:** 2026-07-08
> **Resultado atípico:** não há RED legítimo a fabricar — a máquina (backfill + worker + reader +
> testes) **já existe e passa**. O defeito do #111 é **operacional** (backfill não disparado / worker
> não drenou no ambiente), não de código. Fabricar um RED artificial violaria YAGNI e o espírito do TDD.

## Como cheguei aqui

Exploração read-only (agente `Explore`) + execução do teste unit do backfill. Mapa completo dos
artefatos em `handbook/runbooks/supplier-view-backfill.md`.

## Cobertura de testes existente (repro do bug + CAs)

| CA (do `000-request.md`) | Coberto por | Camada | Estado |
| :-- | :-- | :-- | :-- |
| **CA1** grid devolve nome/CNPJ quando projetado | `document-supplier-view-join.drizzle-mysql.test.ts` | integração (`MYSQL_INTEGRATION=1`) | existe; valida grid com e sem match |
| repro "view vazia ⇒ `null`" | idem (`describe` "null quando não há match") | integração | existe |
| **CA2** idempotência do backfill | `tests/jobs/financial/supplier-view-backfill.test.ts` | **unit** | ✅ **GREEN 3/3** (rodado 2026-07-08) |
| idempotência do store real (`ON DUPLICATE KEY`) | `supplier-view-store.drizzle-mysql.test.ts` | integração | existe |
| e2e `par_outbox → fin_supplier_view` | `projection.integration.test.ts` | integração | existe |
| **CA3** fornecedor sem dados (quarentena) ⇒ `null` | — | — | **implícito** (sem linha ⇒ `LEFT JOIN` null); sem filtro explícito de status/quarentena no read-path |

### Evidência unit (sem Docker)

```
▶ backfillSupplierViews
  ✔ popula o read-model a partir dos fornecedores existentes
  ✔ re-execução é idempotente (não duplica nem corrompe)
  ✔ NÃO regride um evento real mais novo (guard de occurredAt antigo)
ℹ tests 3 · pass 3 · fail 0
```

## Diagnóstico (por que a view está vazia no ambiente)

Causa-raiz **dupla** possível — mede-se, não se assume (queries em `runbook §6`):
1. **Backfill nunca disparado** no ambiente (`fin_supplier_view` = 0 linhas, fornecedores existem no `partners`).
2. **Worker parado / sem env** (`par_outbox` com backlog crescente).

Correção = rodar o **backfill** (cobre pré-existentes) **e** garantir o **worker** ativo (cobre novos).

## Entregável autônomo desta wave

- **Runbook operacional**: `handbook/runbooks/supplier-view-backfill.md` — o que faz, arquitetura (2 pools),
  idempotência, config (env), como rodar (local + Docker), diagnóstico do #111, validação (CA1), relacionados.
  Atende o item de DoD "documentar como acionar o backfill localmente".

## Validação ao vivo no x99 — RESOLVIDA (2026-07-08)

MySQL 8.4.10 subido no x99 (`docker run` avulso, sem bind-mount — ver [[mac-dev-x99-docker-runner-tunnel]]),
alcançado do Mac por túnel SSH (`ssh -L 3306`). Evidências:

- **Testes de integração 7/7 GREEN** (`MYSQL_INTEGRATION=1`, `applyMigrations:true` no x99):
  - `document-supplier-view-join.drizzle-mysql.test.ts` — CA1: grid traz nome/CNPJ quando a view tem o `supplierRef`, **null quando não**.
  - `supplier-view-store.drizzle-mysql.test.ts` — 5/5: idempotência + guard de recência (`occurredAt`).
  - `projection.integration.test.ts` — e2e `par_outbox → fin_supplier_view` (worker).
- **Backfill job real (`run.ts`) end-to-end:** semeado 1 fornecedor em `par_suppliers` (partners) → `TRUNCATE fin_supplier_view` (0) → `pnpm run job:financial:supplier-view-backfill` (2 pools, mesmo `core`) → **`concluído — 1 aplicados, 0 falhas`** → `fin_supplier_view` = 1 linha com `name`/`document` corretos. **CA1 comprovado ao vivo.**
- **CA2 (idempotência) ao vivo:** 2ª execução do backfill → view segue com **1 linha** (sem duplicar).
- Nota: o mapper do partners valida a leitura — o seed exige `id` UUID v4, `cnpj` com DV válido, `service_category` do enum (`service-category.ts`), e alvo de pagamento (banco OU pix, CHECK `par_suppliers_payment_target_chk`).

**O que resta é operacional/deploy (fora do código):** disparar o mesmo backfill no ambiente de produção
(via `docker compose --profile jobs run --rm supplier-view-backfill` ou `pnpm run job:...`) — o runbook cobre.

## Decisão sobre CA3 (quarentena)

Hoje a degradação para `null` de fornecedor sem dados é **implícita e correta** (sem linha na view).
**Não** há invariante de domínio pedindo filtro explícito de status/quarentena no read-path — adicioná-lo
seria especulativo (YAGNI). Recomendação: **não** implementar; se o P.O. quiser cravar como comportamento
intencional, abrir teste de caracterização separado. Sem código de produção novo neste ticket.
