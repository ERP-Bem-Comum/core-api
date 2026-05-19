[← Voltar para Arquitetura](./README.md)

# 📨 Eventos e Integração

> **Status:** vigente | **Última revisão:** 2026-04-28 (correção MySQL — ver [ADR-0015](./adr/0015-mysql-outbox-pattern.md))

---

## 1. Premissa

Comunicação entre `legacy-api` e `core-api` é feita **exclusivamente** por eventos:

- ❌ Sem chamada HTTP síncrona entre eles.
- ❌ Sem leitura cruzada de tabelas.
- ✅ Sempre via [Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html) em MySQL.

> Decisão: [ADR-0015](./adr/0015-mysql-outbox-pattern.md).

---

## 2. Padrão Outbox em MySQL

Cada serviço tem uma tabela `outbox` no **próprio database**. A escrita do evento ocorre **na mesma transação** da mudança de domínio — garantindo atomicidade.

### 2.1. Schema da Outbox

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

> ⚠️ **Importante:** O índice composto `(processed_at, occurred_at)` substitui o partial index do PostgreSQL. Em MySQL, partial indexes não existem; a ordem dos campos do índice garante que queries `WHERE processed_at IS NULL` sejam eficientes (NULL fica agrupado no início).

### 2.2. Fluxo

```
1. Receber requisição
2. INICIAR TRANSAÇÃO (BEGIN)
3.   Escrever mudança de domínio (INSERT/UPDATE em tabelas de domínio)
4.   INSERT INTO outbox (event_id, event_type, aggregate_id, payload, ...)
5. COMMITAR TRANSAÇÃO (COMMIT)   ← evento existe SE E SOMENTE SE estado persistido
6. Worker (assíncrono) lê WHERE processed_at IS NULL FOR UPDATE SKIP LOCKED
7. Worker publica/encaminha evento
8. Consumidor processa, marca event_id como visto (idempotência)
9. Worker atualiza processed_at na origem
```

### 2.3. Query do worker (recomendada)

```sql
-- MySQL 8 suporta SKIP LOCKED desde 8.0.1
SELECT *
FROM core.outbox
WHERE processed_at IS NULL
ORDER BY processed_at, occurred_at
LIMIT 100
FOR UPDATE SKIP LOCKED;
```

`FOR UPDATE SKIP LOCKED` permite múltiplos workers consumirem em paralelo sem race condition.

---

## 3. Idempotência

Cada consumidor mantém uma tabela própria de eventos processados:

```sql
CREATE TABLE core.eventos_processados (
  event_id     CHAR(36)    PRIMARY KEY,
  source       VARCHAR(255) NOT NULL,
  processed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);
```

Antes de processar um evento recebido:
1. Verificar se `event_id` já existe em `eventos_processados`.
2. Se sim → ignorar (já processado).
3. Se não → processar + INSERT na mesma transação.

> Garante que retries não causam reprocessamento.

---

## 4. Bus inicial: o próprio MySQL

Na fase atual, o **"bus" é a própria tabela outbox + worker que faz polling**:

- Polling simples (intervalo configurável, ex: 500ms-1s).
- Sem `LISTEN/NOTIFY` (não existe em MySQL — diferença vs PostgreSQL).

### Por quê MySQL e não Kafka/NATS/Redis?

| Vantagem | Detalhe |
| -------- | -------- |
| Atomicidade gratuita | Mesma transação ACID → impossível ter desync |
| Zero infra nova | MySQL já existe |
| Auditoria embutida | Outbox **É** o log de eventos |
| Observabilidade trivial | SQL é a query mais natural do mundo |
| Retry e dead-letter naturais | Campos `attempts`, `last_error` na própria tabela |

> Detalhamento da decisão e gatilhos para mudança de broker em [ADR-0015](./adr/0015-mysql-outbox-pattern.md).

---

## 5. Convenções de Nomeação de Eventos

| Regra | Exemplo |
| -------- | -------- |
| **Tempo passado** — fatos consumados, não comandos | `DocumentoSelado` ✅ &nbsp; / &nbsp; `SelarDocumento` ❌ |
| **Verbo de domínio**, não "Created" genérico | `TituloAprovado` ✅ &nbsp; / &nbsp; `TituloCreated` ❌ |
| **Versionado no payload** | `schema_version: 1` |
| **PascalCase** no `event_type` | `RetornoCnabProcessado` |
| **camelCase** nos campos do payload | `aggregateId`, `occurredAt` |

---

## 6. Catálogo Inicial de Eventos Cross-Fronteira

### 6.1. Cross-serviço (`legacy ↔ core`) — fase 1 (Bradesco)

Eventos que cruzam a fronteira física `legacy ↔ core`:

| Evento | Origem | Consumidor | Propósito |
| -------- | -------- | -------- | -------- |
| `RemessaCnabGerada` | core | (auditoria, terceiros) | Notifica que arquivo CNAB foi gerado |
| `RetornoCnabProcessado` | core | legacy | Atualiza status de títulos legados que foram para remessa |
| `SaidaBancariaIdentificada` | core | legacy + core | Conciliação automática |
| `TituloLegadoPagoManualmente` | legacy | core | Conciliação reversa (pagamento via Internet Banking) |

> ⚠️ Os payloads concretos devem ser **refinados antes** de implementar o BC Bradesco. Esta tabela é o esqueleto, não o contrato final.

### 6.2. Cross-módulo dentro do `core-api` (Contratos ↔ Financeiro)

O `core-api` é um Modular Monolith ([ADR-0006](./adr/0006-modular-monolith-core-api.md)) com dois módulos: **Financeiro** ([`../domain/`](../domain/)) e **Contratos** ([`../domain/contratos/`](../domain/contratos/)). A comunicação entre módulos usa o **mesmo padrão Outbox**, mesmo sendo intra-processo: garante atomicidade, auditoria e o caminho de extração futura caso um módulo vire serviço próprio.

| Evento | Origem | Consumidor | Propósito |
| -------- | -------- | -------- | -------- |
| `ContratoMaeCriado` | Contratos | Financeiro (futuro) | Cria registro de teto disponível por contrato |
| `EstadoContratualAtualizado` | Contratos | Financeiro | Atualiza valor/prazo vigente do contrato (afeta empenho) |
| `ContratoEncerrado` | Contratos | Financeiro + Contratos/Aditivos | Bloqueia novos vínculos fiscais; bloqueia novos aditivos |
| `AditivoHomologado` | Contratos | (interno ao módulo Contratos) | Gatilha o recálculo do estado vigente |
| `DocumentoFiscalVinculadoAoContrato` (futuro) | Financeiro | Contratos | Dá visibilidade de consumo do saldo do contrato |

> 📚 Matriz interna completa do módulo Contratos em [`../domain/contratos/06-event-line-context.md`](../domain/contratos/06-event-line-context.md).
> 📚 Matriz interna completa do módulo Financeiro em [`../domain/06-event-line-context.md`](../domain/06-event-line-context.md).

---

## 7. Formato Canônico do Payload

```json
{
  "eventId": "f4e3a2b1-...",
  "eventType": "RetornoCnabProcessado",
  "schemaVersion": 1,
  "occurredAt": "2026-04-28T14:30:00.000Z",
  "aggregateType": "RetornoCNAB",
  "aggregateId": "ret-2026-04-28-001",
  "payload": {
    "arquivoRemessaRef": "rem-2026-04-27-007",
    "titulosAceitos": ["tit-001", "tit-002"],
    "titulosRecusados": [
      { "id": "tit-003", "motivo": "AGENCIA_INVALIDA", "codigoBradesco": "03" }
    ]
  }
}
```

---

## 8. Erros e Dead-Letter

- Worker incrementa `attempts` em cada falha de despacho/processamento.
- Após **5 tentativas**, evento é movido para `<database>.outbox_dead_letter` para análise humana.
- Alerta dispara assim que dead-letter recebe registro novo.

```sql
CREATE TABLE core.outbox_dead_letter (
  event_id     CHAR(36)    PRIMARY KEY,
  original     JSON        NOT NULL,    -- linha completa da outbox
  failed_at    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  reviewed_at  DATETIME(6) NULL,
  resolution   TEXT        NULL
);
```

---

## 9. NÃO Fazer

| ❌ | Por que evitar |
| -------- | -------- |
| Eventos como comando (`AtualizarTitulo`) | Comando é decisão; evento é fato consumado |
| Eventos contendo objetos de domínio inteiros | Acopla consumidores ao schema interno do produtor |
| Workflow distribuído via cadeia de eventos sem orquestração | Saga implícita é impossível de auditar |
| Acoplar consumidores ao schema interno do produtor | Payload é contrato; tabela interna não é |
| Mudar payload de evento existente sem versão | Quebra consumidores silenciosamente |
| Usar evento como mecanismo de RPC ("CalcularImpostos") | Evento é fato passado, não pergunta |

---

## 10. Quando Migrar para Broker Dedicado

Re-avaliar o uso de MySQL como bus quando **algum** dos seguintes for verdade:

- Latência de eventos virou gargalo medido (não suposto).
- Mais de 3 consumidores diferentes do mesmo evento.
- Necessidade de fanout para sistemas externos ao ERP.
- Throughput sustentado > 100 eventos/segundo.
- Necessidade de retenção longa de eventos como fonte de verdade (event sourcing externo).

> Mudança gera **ADR novo** que `supersedes` o ADR-0015.

> **Caminho intermediário possível:** se aparecer requisito de real-time que polling não atenda, considerar **CDC via Debezium** sobre o binlog do MySQL — torna a outbox publicável real-time sem mudar o pattern. Cabe em ADR próprio se o requisito aparecer.

---

## 11. Referências

- [ADR-0013](./adr/0013-mysql-database-engine.md) — engine MySQL.
- [ADR-0014](./adr/0014-mysql-database-isolation.md) — isolamento por database.
- [ADR-0015](./adr/0015-mysql-outbox-pattern.md) — decisão sobre outbox em MySQL.
- [03-data-architecture.md](./03-data-architecture.md) — databases isolados (premissa).
- [`../domain/06-event-line-context.md`](../domain/06-event-line-context.md) — matriz de eventos do módulo Financeiro.
- [`../domain/contratos/06-event-line-context.md`](../domain/contratos/06-event-line-context.md) — matriz de eventos do módulo Contratos.
- [Microservices.io — Transactional Outbox](https://microservices.io/patterns/data/transactional-outbox.html)
