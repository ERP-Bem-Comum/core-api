[← Voltar para Infraestrutura](./README.md)

# 📊 Observabilidade — Baseline

> **Status:** vigente | **Última revisão:** 2026-04-27

Mínimo viável de observabilidade para o sistema funcionar com confiança em produção financeira.

---

## 1. Logs

| Item | Requisito |
| :--- | :--- |
| Formato | JSON estruturado |
| Saída | stdout dos containers |
| Coletor | CloudWatch / Datadog / Loki / Elastic (a escolher) |
| Retenção | ≥ 90 dias em prod |
| Retenção (auditoria fiscal) | ≥ 5 anos |

### 1.1. Campos Obrigatórios

```json
{
  "timestamp": "2026-04-27T14:30:00.123Z",
  "level": "info",
  "service": "core-api",
  "request_id": "req-abc123",
  "msg": "documento selado",
  "duration_ms": 42
}
```

### 1.2. Campos Contextuais (Quando Aplicável)

- `user_id` — usuário autenticado.
- `aggregate_id` — ID do agregado de domínio afetado.
- `event_type` — tipo de evento processado.
- `correlation_id` — para rastrear fluxo cross-service.

### 1.3. PII

- ❌ Evitar logar PII (CPF, email, telefone, valores financeiros sensíveis).
- ✅ Quando inevitável, mascarar antes de logar: `***-***-123`.
- ✅ Sempre em audit log estruturado, não em log de aplicação geral.

---

## 2. Métricas

### 2.1. Endpoint

Cada serviço expõe `/metrics` em formato **Prometheus**.

### 2.2. Métricas Obrigatórias Mínimas

| Categoria | Métrica | Labels |
| :--- | :--- | :--- |
| HTTP | `http_requests_total` | status, route, method |
| HTTP | `http_request_duration_seconds` | status, route, method |
| Outbox | `outbox_pending_total` | service, schema |
| Outbox | `outbox_processed_total` | service, event_type |
| Outbox | `outbox_failed_total` | service, event_type |
| Banco | `db_pool_active` | service |
| Banco | `db_query_duration_seconds` | service, operation |
| Runtime | `process_resident_memory_bytes` | service |
| Runtime | `nodejs_eventloop_lag_seconds` | service |

### 2.3. Coleta e Visualização

- **Scrape:** Prometheus / Datadog Agent / equivalente.
- **Dashboards:** um por serviço + um por BC.
- **Retenção:** ≥ 90 dias em prod.

---

## 3. Tracing

| Item | Requisito |
| :--- | :--- |
| Padrão | OpenTelemetry |
| Propagação | Header `traceparent` entre BFF → serviços |
| Sampling em prod | 10% |
| Sampling em staging | 100% |
| Backend | Tempo / Jaeger / Datadog APM (a escolher) |

> Trace deve cobrir o caminho completo: browser → BFF → serviço → DB.

---

## 4. Health Checks

Cada serviço expõe dois endpoints:

| Endpoint | Propósito | Critério |
| :--- | :--- | :--- |
| `/health` | Liveness (processo respira) | Retorna 200 sempre que processo está vivo |
| `/ready` | Readiness (pronto para tráfego) | 200 só se DB acessível e dependências OK |

> **Load balancer usa `/ready`** para roteamento — `/health` é só sinal de vida.

### Exemplo de resposta

```json
GET /ready

{
  "status": "ok",
  "service": "core-api",
  "version": "1.2.3",
  "checks": {
    "database": "ok",
    "outbox_worker": "ok"
  }
}
```

---

## 5. Alertas

### 5.1. Críticos (paginam imediatamente)

| Alerta | Condição |
| :--- | :--- |
| Serviço down | `/health` falha por 1 min |
| Outbox dead-letter | Qualquer entrada nova |
| DB indisponível | `/ready` falha por 2 min |
| Restore necessário | Backup mais recente > RPO |

### 5.2. Altos (notificação dentro de horário comercial)

| Alerta | Condição |
| :--- | :--- |
| Latência elevada | p95 > 1s por 5 min |
| Taxa de erro 5xx | > 1% em 5 min |
| Outbox crescendo | `outbox_pending_total` > 1000 por 10 min |
| DB CPU | > 80% por 10 min |
| DB conexões | > 80% do pool |
| Disk space | > 85% no banco |

### 5.3. Médios (revisão diária)

| Alerta | Condição |
| :--- | :--- |
| Latência p99 elevada | > 3s por 15 min |
| Taxa de erro 4xx anômala | > 5% acima do baseline |

---

## 6. Backup e Restore

| Item | Requisito (prod) |
| :--- | :--- |
| Backup | PITR (Point-in-Time Recovery) habilitado |
| Retenção | ≥ 30 dias |
| RPO | 15 minutos |
| RTO | 30 minutos |
| Teste de restore | Semestral mínimo, em staging |
| Documentação de procedimento | Em [`../operations/`](../operations/README.md) |

---

## 7. Auditoria de DB

- **MySQL audit ativo** em prod via plugin do provedor cloud:
  - AWS RDS: Database Activity Streams.
  - GCP Cloud SQL: Cloud Audit Logs.
  - Self-managed: MySQL Enterprise Audit / MariaDB Audit Plugin.
- **Logs de DDL** em todos os databases.
- **Logs de DML** em tabelas financeiras críticas (`core.documentos`, `core.titulos*`, `legacy.*` críticas).
- **Retenção:** ≥ 5 anos (requisito fiscal).
- **Acesso aos logs:** apenas auditores e Security; não é dado operacional.

> Engine MySQL 8 — ver [ADR-0013](../architecture/adr/0013-mysql-database-engine.md).

---

## 8. SLOs Iniciais (Para Revisar Após 3 Meses)

| Serviço | SLO | Target |
| :--- | :--- | :--- |
| `bff-gateway` | Disponibilidade | 99.9% |
| `bff-gateway` | Latência p95 | < 200ms |
| `legacy-api` | Disponibilidade | 99.5% |
| `core-api` | Disponibilidade | 99.9% |
| `core-api` | Latência p95 | < 500ms |
| Outbox | Latência de processamento p95 | < 30s |

> Valores conservadores. Calibrar após primeiro mês com dados reais.

---

## 9. Referências

- [`./01-infra-handoff.md`](./01-infra-handoff.md) — handoff principal.
- [`./02-environments.md`](./02-environments.md) — RPO/RTO por ambiente.
- [`../architecture/04-integration-events.md`](../architecture/04-integration-events.md) — métricas de outbox.
