# Phase 0 — Research: Financial Supplier Read-Model

## Decisão 1 — Read-model local mantido por eventos vs leitura cruzada de tabelas

**Decision**: o `financial` mantém uma cópia local denormalizada (`fin_supplier_view`), alimentada **só** por eventos do `partners` via outbox. A listagem lê essa cópia; **nunca** acessa tabelas do `partners` nem chama o `partners` de forma síncrona em runtime.

**Rationale (cânone — Princípio IX)**: acessar a base de outro serviço/módulo é o anti-padrão de _content coupling_ descrito por Newman. Citação literal (`handbook/reference/skills-base/architecture/building-microservices--sam-newman.md:983`):

> "Content coupling describes a situation in which an upstream service reaches into the internals of a downstream service and changes its internal state. The most common manifestation of this is an external service accessing another microservice's database and changing it directly. ... With content coupling, the lines of ownership become less clear, and it becomes more difficult for developers to change a system."

A comunicação correta entre fronteiras é por **eventos** — o produtor não conhece o consumidor (`:1658`):

> "Event-driven — Microservices emit events, which other microservices consume and react to accordingly. The microservice emitting the event is unaware of which microservices, if any, consume the events it emits."

Isso casa com ADR-0006 (cross-módulo só por public-api/eventos), ADR-0014 (isolamento por prefixo `fin_*`/`par_*`, sem leitura cruzada) e ADR-0015 (outbox). O custo é **consistência eventual**, aceito no clarify da spec (Newman, `:686`, trata eventual consistency como o preço da autonomia entre fronteiras).

**Alternatives considered**:

- **Port síncrono `PartnersReadPort.getSupplierView` em runtime** — rejeitado no clarify da #47: acopla a listagem à disponibilidade/latência do `partners` e gera N+1 por página.
- **LEFT JOIN cross-database `fin_documents` × `par_suppliers`** — viola ADR-0014 (leitura cruzada) e o content coupling acima.

## Decisão 2 — Onde roda o consumer (topologia)

**Decision**: **worker dedicado em composition root** (`src/workers/supplier-view-projection/run.ts`), fora dos módulos. Abre 2 pools: lê o `par_outbox` via public-api do `partners` (reusa `runLoop` + `WorkerOutboxOps`) e aplica no `financial` via public-api (`applySupplierEvent`). O `EventDelivery` (tipo do `partners`) é instanciado **no composition root**, colando os dois lados — nenhum módulo importa o outro.

**Rationale**: espelha exatamente o precedente do `contracts` (`adapters/event-delivery/timeline-projection.delivery.ts` — um `EventDelivery` que projeta eventos num read-model). O composition root é o lugar canônico para código que cruza módulos (como `src/server.ts`). Entrypoint dedicado por responsabilidade segue ADR-0041 (workers especializados).

**Alternatives considered**:

- **Estender `partners/worker/run.ts`** injetando um delivery do financial — exigiria expor `EventDelivery`/`ProcessedEvent` na public-api do `partners` e faria o financial implementar tipo do `partners`; mais acoplamento. Rejeitado (decisão do usuário no clarify de topologia).
- **Relay HTTP** (partners worker → endpoint do financial) — over-engineering para um monolito modular in-process (YAGNI).

## Decisão 3 — Idempotência e ordem (at-least-once + fora de ordem)

**Decision**: `fin_supplier_view` tem `supplier_ref` como PK e guarda `occurred_at`. A aplicação faz **upsert com guard de recência**: `INSERT ... ON DUPLICATE KEY UPDATE name=VALUES(name), document=VALUES(document), occurred_at=VALUES(occurred_at) WHERE/IF VALUES(occurred_at) >= occurred_at`. Como o MySQL não tem `WHERE` em `ON DUPLICATE KEY UPDATE`, usa-se a técnica `occurred_at = IF(VALUES(occurred_at) >= occurred_at, VALUES(occurred_at), occurred_at)` e idem para `name`/`document` (só atualiza quando o evento é mais novo).

**Rationale**: o worker já garante at-least-once com `markProcessed`/DLQ; o consumer precisa ser idempotente para reentrega e robusto a eventos fora de ordem (um `SupplierEdited` antigo não pode regredir o estado). O guard por `occurred_at` resolve ambos sem tabela `eventos_processados` separada (mais simples — YAGNI; o upsert por `supplier_ref` é naturalmente idempotente). `ON DUPLICATE KEY UPDATE` é permitido por ADR-0020.

**Alternatives considered**:

- **Tabela `eventos_processados` (consumer_id, event_id)** como no `contracts` — necessária quando o efeito não é idempotente por natureza; aqui o read-model é última-escrita-vence por `supplier_ref`, então o guard de `occurred_at` basta. Mantido como evolução se surgir efeito colateral não idempotente.

## Decisão 4 — Backfill de fornecedores pré-existentes

**Decision**: job **one-shot** (`src/jobs/financial/supplier-view-backfill/run.ts`, ADR-0041) que lista os fornecedores existentes via public-api do `partners` e aplica cada um pelo **mesmo** `applySupplierEvent`/store do consumer (idempotente). Re-execução é segura.

**Rationale**: sem backfill, fornecedores legados aparecem com nome/CNPJ nulos até serem editados (decisão do clarify: incluir). Reusar o caminho de aplicação evita duplicar lógica. One-shot disparado por operador/cron externo (ADR-0041), não loop long-running.

**Ponto a verificar no ticket**: a public-api do `partners` precisa expor uma **listagem** de fornecedores (`supplierRef`, `name`, `document`). Existe `buildPartnersReadPort.getSupplierView` (por id) e o ETL port; se não houver um `listSuppliers`, o ticket `PAR-PUBLIC-API-CONSUMER-SURFACE` adiciona um método de listagem na public-api (read-only).

## Decisão 5 — Enriquecimento da listagem

**Decision**: `findPaged` faz **LEFT JOIN intra-`financial`** `fin_documents` × `fin_supplier_view` em `supplier_ref`; `DocumentListItem` ganha `supplierName`/`supplierDocument` (nullable). `null` quando `supplier_ref` é nulo ou ausente na cópia (FR-006).

**Rationale**: ambas as tabelas são `fin_*` (mesmo pool) → JOIN intra-módulo, sem cross-database, sem N+1. Adição apenas no DTO/schema (FR-008/009). `document` é texto (alfanumérico — ADR-0044).

**Alternatives considered**: lookup por linha (N+1) — rejeitado (SC-002).
