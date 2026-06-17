[← Voltar para ADRs](./README.md)

# ADR-0045: Read-model de fornecedor no `financial` consumido do `par_outbox` (US2 da #47)

- **Status:** Accepted
- **Date:** 2026-06-16
- **Deciders:** Gabriel (tech lead / arquiteto).
- **Origem:** Feature [`014-financial-supplier-readmodel`](../../../specs/014-financial-supplier-readmodel/) · issue [#47](https://github.com/ERP-Bem-Comum/core-api/issues/47) **US2** (fornecedor nome+CNPJ no grid de Contas a Pagar).
- **Estende:** [ADR-0015](./0015-mysql-outbox-pattern.md) (outbox) · [ADR-0006](./0006-modular-monolith-core-api.md) (cross-módulo por eventos/public-api) · [ADR-0014](./0014-mysql-database-isolation.md) (prefixo `fin_*`, sem leitura cruzada) · [ADR-0022](./0022-read-models-via-projection-over-event-stream.md) (read-model por projeção idempotente) · [ADR-0041](./0041-specialized-workers-and-oneshot-jobs.md) (workers/jobs) · [ADR-0043](./0043-partners-supplier-integration-events.md) (contrato do evento).

---

## Contexto

O grid `GET /api/v2/financial/documents` precisa exibir nome + CNPJ do fornecedor por linha, a partir do `supplierRef` (#47/US2). O `financial` não pode ler tabelas do `partners` (ADR-0014) nem chamá-lo de forma síncrona em runtime (N+1 / acoplamento). O `partners` já publica `SupplierRegistered`/`SupplierEdited` via `par_outbox` (ADR-0043).

A decisão de **manter outbox-MySQL + worker genérico** (sem broker/Go agora) está em `.claude/.planning/ASYNC-MESSAGING-STRATEGY.md`. Newman, _Building Microservices_, fundamenta não acessar a base do outro módulo (`building-microservices--sam-newman.md`, _content coupling_) e a comunicação por eventos (_event-driven_).

---

## Decisão

O `financial` mantém um **read-model local denormalizado** `fin_supplier_view` (`supplier_ref → name, document, occurred_at`), alimentado **só** por eventos do `partners` via outbox. O grid lê esse read-model (LEFT JOIN intra-`financial`); nunca consulta o `partners` em runtime.

### Topologia de consumo

- **Worker dedicado em composition root** (`src/workers/supplier-view-projection/`, fora dos módulos): lê o `par_outbox` (pool do `partners`) e aplica no `fin_supplier_view` (pool do `financial`), via o **worker de outbox genérico** (`src/shared/outbox`, ADR-0041/CORE-OUTBOX-WORKER-GENERIC). **Nenhum módulo importa o outro** — a ligação vive no composition root, como o `src/server.ts`. A lógica de aplicação (`applySupplierEvent`) vem da **public-api** do `financial`.
- **Idempotência + ordem:** `upsert` com `ON DUPLICATE KEY UPDATE` e **guard de recência** por `occurred_at` (`if(values(occurred_at) >= occurred_at, …)`) — absorve at-least-once e eventos fora de ordem, atomicamente, sem SELECT-then-UPDATE.
- **Backfill:** job one-shot (`src/jobs/financial/supplier-view-backfill/`, ADR-0041) popula o read-model a partir dos fornecedores **existentes** (lidos via public-api do `partners`), com `occurred_at` antigo — eventos reais sempre vencem o guard. Idempotente.

### Contrato exibido

O item do grid ganha `supplierName` e `supplierDocument` (CNPJ alfanumérico — ADR-0044), `null` quando o `supplierRef` é nulo ou ainda não está no read-model (consistência eventual — FR-006).

---

## Consequências

**Positivas:**

- O grid resolve fornecedor sem chamada cross-módulo em runtime (SC-002) e sem N+1.
- Isolamento preservado: `partners` produz eventos; `financial` consome e mantém cópia local; ligação só no composition root (ADR-0006/0014).
- Reusa o worker genérico (sem copiar mais um worker) e o outbox-MySQL (sem broker — YAGNI).

**Negativas / trade-offs:**

- Consistência eventual: um fornecedor recém-editado leva até um ciclo do worker para refletir no grid.
- O composition root abre 2 pools (partners + financial) — custo de um processo dedicado a mais (aceito; ADR-0041).
- `SupplierEdited` "redundante" (sem mudança de nome/CNPJ) ainda é processado — absorvido pelo upsert idempotente.

---

## Quando re-avaliar

- Se surgir necessidade de baixa latência (< 1 s) ou fan-out para muitos consumidores, reavaliar broker/CDC — ver gatilhos em `.claude/.planning/ASYNC-MESSAGING-STRATEGY.md`.
- Multi-instância do core-api: promover ADR-0030 (Valkey) + coordenação de jobs one-shot (`GET_LOCK`/`UNIQUE`).

---

## Referências

- `.claude/.planning/ASYNC-MESSAGING-STRATEGY.md` — pesquisa que motivou manter outbox + worker genérico.
- Newman, _Building Microservices_ — content coupling; event-driven collaboration.
- Vernon, _Implementing DDD_ — eventual consistency entre Bounded Contexts; read-model.
- [`specs/014-financial-supplier-readmodel/`](../../../specs/014-financial-supplier-readmodel/) — spec/plan/tasks.
