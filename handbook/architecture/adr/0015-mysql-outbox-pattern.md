[← Voltar para ADRs](./README.md)

# ADR-0015: MySQL Outbox Pattern (supersedes ADR-0004)

- **Status:** Accepted
- **Date:** 2026-04-28
- **Supersedes:** [ADR-0004](./0004-postgres-outbox-pattern.md)
- **Deciders:** Arquiteto técnico

---

## Contexto

[ADR-0004](./0004-postgres-outbox-pattern.md) definiu **Postgres Outbox Pattern** como bus de eventos inicial. Após [ADR-0013](./0013-mysql-database-engine.md) confirmar que o engine é **MySQL 8**, o pattern precisa de adaptação técnica.

A boa notícia: o Outbox Pattern é **engine-agnóstico em conceito**. As propriedades fundamentais (atomicidade via transação ACID, durabilidade via tabela, idempotência via PK única) existem em ambos. Só muda a sintaxe e algumas otimizações.

---

## Decisão

Adotar **Outbox Pattern em MySQL** com as adaptações abaixo. Comportamento e contratos de eventos são idênticos ao especificado em ADR-0004.

### Schema da outbox

```sql
CREATE TABLE core.outbox (
  event_id        CHAR(36)     PRIMARY KEY,
  event_type      VARCHAR(255) NOT NULL,
  schema_version  INT          NOT NULL DEFAULT 1,
  aggregate_type  VARCHAR(255) NOT NULL,
  aggregate_id    VARCHAR(255) NOT NULL,
  payload         JSON         NOT NULL,
  occurred_at     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  processed_at    DATETIME(6)  NULL,
  attempts        INT          NOT NULL DEFAULT 0,
  last_error      TEXT         NULL,
  INDEX idx_outbox_unprocessed (processed_at, occurred_at)
);
```

> Mesma estrutura em `legacy.outbox`.

### Fluxo (idêntico ao ADR-0004)

```
1. Receber requisição
2. INICIAR TRANSAÇÃO
3.   Escrever mudança de domínio
4.   INSERT INTO outbox (event_type, aggregate_id, payload, ...)
5. COMMITAR TRANSAÇÃO   <- evento existe SE E SOMENTE SE estado persistido
6. Worker (assíncrono) lê WHERE processed_at IS NULL
7. Worker publica/encaminha evento
8. Consumidor processa, marca event_id como visto (idempotência)
9. Worker atualiza processed_at na origem
```

---

## Diferenças vs ADR-0004 (PostgreSQL → MySQL)

| Aspecto | PostgreSQL (ADR-0004) | MySQL (este ADR) |
| -------- | -------- | -------- |
| Tipo do `event_id` | `UUID` | `CHAR(36)` ou `BINARY(16)` (recomendado: `CHAR(36)` por simplicidade) |
| Payload | `JSONB` | `JSON` (funcional, menos performático em consultas — irrelevante aqui) |
| Timestamp | `TIMESTAMPTZ DEFAULT now()` | `DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6)` |
| Index para unprocessed | Partial index `WHERE processed_at IS NULL` | Index composto `(processed_at, occurred_at)` + filtro na query |
| Notificação real-time | `LISTEN/NOTIFY` opcional | **Não disponível** — apenas polling |
| Estratégia de leitura | Polling OU LISTEN/NOTIFY | Polling apenas |
| Consumer query | `WHERE processed_at IS NULL ORDER BY occurred_at LIMIT N FOR UPDATE SKIP LOCKED` | `WHERE processed_at IS NULL ORDER BY processed_at, occurred_at LIMIT N FOR UPDATE SKIP LOCKED` |

### Sobre o índice

PostgreSQL permite partial index (mais eficiente), MySQL não. A solução em MySQL: índice composto **com `processed_at` PRIMEIRO** — assim queries `WHERE processed_at IS NULL` usam o índice eficientemente, já que `NULL` fica agrupado.

```sql
-- ✅ Boa: NULL agrupado, scan eficiente
INDEX idx_outbox_unprocessed (processed_at, occurred_at)

-- ❌ Ruim: scan da tabela inteira filtrando depois
INDEX idx_outbox_bad (occurred_at, processed_at)
```

### Sobre `FOR UPDATE SKIP LOCKED`

MySQL 8 suporta `FOR UPDATE SKIP LOCKED` desde 8.0.1 — essencial para múltiplos workers consumirem sem race condition. **Confirmado disponível.**

---

## Idempotência (mantida idêntica ao ADR-0004)

```sql
CREATE TABLE core.eventos_processados (
  event_id     CHAR(36)    PRIMARY KEY,
  source       VARCHAR(255) NOT NULL,
  processed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);
```

Antes de processar evento recebido:
1. Verificar se `event_id` existe em `eventos_processados`.
2. Se sim → ignorar (já processado).
3. Se não → processar + INSERT na mesma transação.

---

## Bus inicial: o próprio MySQL

Mesma estratégia de ADR-0004:
- Worker faz polling periódico (ex: 500ms-1s).
- Sem broker dedicado nesta fase.
- Migração futura para Kafka/NATS/Redis Streams continua sendo o caminho se gatilhos forem atingidos.

### Por quê MySQL e não Kafka/NATS/Redis nesta fase?

Razões mantidas de ADR-0004:
- Atomicidade gratuita via transação ACID.
- Zero infra nova — MySQL já existe.
- Auditoria embutida — outbox **é** o log de eventos.
- Observabilidade trivial — SQL é a query mais natural.

---

## Convenções de nomeação de eventos

Mantidas idênticas a ADR-0004:

| Regra | Exemplo |
| -------- | -------- |
| Tempo passado — fatos consumados, não comandos | `DocumentoSelado` ✅ / `SelarDocumento` ❌ |
| Verbo de domínio, não "Created" genérico | `TituloAprovado` ✅ / `TituloCreated` ❌ |
| Versionado no payload | `schema_version: 1` |
| PascalCase no `event_type` | `RetornoCnabProcessado` |
| camelCase nos campos do payload | `aggregateId`, `occurredAt` |

---

## Catálogo inicial de eventos cross-fronteira

Mantido idêntico a ADR-0004:

| Evento | Origem | Consumidor | Propósito |
| -------- | -------- | -------- | -------- |
| `RemessaCnabGerada` | core | (auditoria, terceiros) | Notifica geração de CNAB |
| `RetornoCnabProcessado` | core | legacy | Atualiza títulos legados em remessa |
| `SaidaBancariaIdentificada` | core | legacy + core | Conciliação automática |
| `TituloLegadoPagoManualmente` | legacy | core | Conciliação reversa |

---

## Erros e dead-letter

Mantido idêntico a ADR-0004 (ajustando sintaxe):

```sql
CREATE TABLE core.outbox_dead_letter (
  event_id     CHAR(36)    PRIMARY KEY,
  original     JSON        NOT NULL,
  failed_at    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  reviewed_at  DATETIME(6) NULL,
  resolution   TEXT        NULL
);
```

---

## Quando Re-avaliar

Mesmos gatilhos de ADR-0004:

- Latência de eventos virar gargalo medido (não suposto).
- Mais de 3 consumidores diferentes do mesmo evento.
- Necessidade de fanout para sistemas externos ao ERP.
- Throughput sustentado > 100 eventos/segundo.

Em qualquer desses casos: ADR novo `supersedes` este, com migração para Kafka/NATS/Redis Streams.

> **Nota sobre LISTEN/NOTIFY:** se em algum momento aparecer requisito de real-time intra-aplicação que polling de 500ms não atenda, considerar usar **MySQL com replicação binlog + algo como Debezium** (CDC) para tornar a outbox publicável real-time. Isso é exotic e cabe em ADR próprio caso o requisito apareça.

---

## Referências

- [ADR-0013](./0013-mysql-database-engine.md) — engine MySQL 8.
- [ADR-0014](./0014-mysql-database-isolation.md) — isolamento por database.
- [ADR-0004](./0004-postgres-outbox-pattern.md) — versão PostgreSQL anterior (superseded).
- [`../04-integration-events.md`](../04-integration-events.md) — detalhamento técnico atualizado.
- [Microservices.io — Transactional Outbox](https://microservices.io/patterns/data/transactional-outbox.html)
