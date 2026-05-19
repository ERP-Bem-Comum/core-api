[← Voltar para ADRs](./README.md)

# ADR-0004: Postgres Outbox como Mecanismo de Eventos Inicial

- **Status:** Superseded by [ADR-0015](./0015-mysql-outbox-pattern.md) em 2026-04-28
- **Date:** 2026-04-27
- **Deciders:** Arquiteto

> ⚠️ **AVISO:** Este ADR partiu da assunção incorreta de que o engine de banco era PostgreSQL. O engine real é MySQL 8 (ver [ADR-0013](./0013-mysql-database-engine.md)). O Outbox Pattern foi adaptado para MySQL no [ADR-0015](./0015-mysql-outbox-pattern.md), mantendo todas as propriedades conceituais (atomicidade, idempotência, durabilidade) com sintaxe e features específicas de MySQL. O conteúdo abaixo permanece como evidência histórica.

---

## Contexto

Comunicação entre `legacy-api` e `core-api` precisa ser:

- **Confiável** (sem perda de eventos).
- **Atômica** (evento publicado se e somente se mudança de domínio persistida).
- **Ordenada** por agregado (eventos do mesmo título ordenados entre si).
- **Auditável** (todo evento rastreável).
- **Compatível com infra atual** (sem novo componente para manter).

Brokers tradicionais (Kafka, NATS, Redis Streams) ofereceriam recursos avançados, mas trazem custo operacional inicial.

---

## Decisão

Adotar **Padrão Outbox** com PostgreSQL como bus inicial:

1. Cada serviço tem tabela `outbox` no próprio schema.
2. Evento é inserido na **mesma transação** da mudança de domínio.
3. Worker (no próprio serviço) faz polling (ou `LISTEN/NOTIFY`) e publica/encaminha.
4. Idempotência via `event_id` único e tabela `eventos_processados` no consumidor.
5. Retentativas com `attempts` na linha; após N falhas, move para `outbox_dead_letter`.

---

## Consequências

### Positivas

- **Atomicidade gratuita** via transação ACID (sem two-phase commit).
- **Zero infra nova** — Postgres já existe.
- **Auditoria embutida** — outbox **é** o log de eventos.
- **Observabilidade trivial** — SQL é a query mais natural do mundo.
- **Retry e dead-letter naturais** (campos `attempts`, `last_error`).
- Time aprende padrão simples antes de adotar broker mais complexo.

### Negativas

- **Latência maior** que broker dedicado (polling = segundos; LISTEN/NOTIFY = milissegundos mas conexão sempre ativa).
- **Throughput limitado** pela tabela e pelo I/O do banco.
- **Fanout** de muitos consumidores sobrecarrega o banco.

### Neutras

- Migração futura para Kafka/NATS/Redis trocaria o **transporte** sem mudar o **contrato de eventos**. Domínio não enxerga o broker.

---

## Gatilhos para Re-avaliação

A decisão será revisitada (gerando ADR novo) se:

- **Latência** de eventos virar gargalo medido (não suposto).
- Mais de **3 consumidores diferentes** do mesmo evento.
- Necessidade de **fanout** para sistemas externos ao ERP.
- **Throughput** sustentado > 100 eventos/segundo.
- Necessidade de **retenção longa** de eventos como fonte de verdade (event sourcing externo).

---

## Alternativas Consideradas

### A. Apache Kafka

**Rejeitada nesta fase porque:**
- Operação significativa (ZooKeeper/KRaft, partições, consumer groups, schema registry).
- Time precisaria de capacidade dedicada para operar.
- Overkill para 2 serviços iniciais.
- Pode ser introduzido depois sem reescrever domínio.

### B. NATS JetStream

**Rejeitada nesta fase porque:**
- Componente novo para infra operar.
- Sem ganho concreto sobre outbox dado o volume.
- Considerada para Estágio 2 se gatilhos forem atingidos.

### C. Redis Streams

**Rejeitada nesta fase porque:**
- Adiciona dependência operacional.
- Persistência menos robusta que Postgres para dados financeiros.
- Considerada se Redis já existir no stack para outros usos (cache).

### D. Comunicação Síncrona HTTP entre Serviços

**Rejeitada porque:**
- Sem atomicidade — mudança no produtor pode persistir mas chamada falha.
- Acoplamento temporal: produtor depende de consumidor estar online.
- Sem rastro de auditoria automático.
- Quebra a regra de eventos como única ponte cross-schema.

---

## Referências

- Microservices.io — [Pattern: Transactional Outbox](https://microservices.io/patterns/data/transactional-outbox.html)
- [ADR-0003](./0003-shared-db-isolated-schemas.md) — schemas isolados (premissa).
- [`../04-integration-events.md`](../04-integration-events.md) — detalhamento técnico (schema, fluxo, idempotência).
