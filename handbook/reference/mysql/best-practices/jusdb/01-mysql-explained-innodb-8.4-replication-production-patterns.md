# MySQL Explained (2026): InnoDB, 8.4 LTS, Replication & Production Patterns

> **Fonte:** https://www.jusdb.com/blog/mysql-explained-a-complete-guide-for-modern-applications
> **Publicado:** 2026-05-13
> **Cópia offline:** este arquivo. **Consulte SEMPRE** antes de tomar decisão de produção sobre engine, replicação ou tuning macro.

---

## TL;DR

MySQL 8.4 LTS (lançado em abril/2025, suporte até 2032) é o baseline produtivo de 2026. Traz **HyperGraph Optimizer**, **InnoDB Cluster** nativo em Kubernetes, deprecação definitiva de `mysql_native_password` e remoção de `SQL_CALC_FOUND_ROWS`. Ótimo para OLTP transacional; **mau** para analytics PB+, JSON semi-estruturado pesado ou séries temporais.

---

## Conceitos-chave

- **RDBMS transacional** com ACID via InnoDB (storage engine padrão desde 5.5).
- **Arquitetura modular:** Parser/Optimizer → Storage Engine → Buffer Pool.
- **Replicação assíncrona** baseada em binary log (SBR / RBR / MIXED). RBR é o padrão moderno.
- **InnoDB Cluster:** Group Replication + MySQL Router → HA nativa, RPO=0, RTO 30–60 s.
- **HyperGraph Optimizer** (8.4+): algoritmo DPhyp para enumeração de planos de JOIN — 2–5× speedup em star schemas.
- **Autenticação:** migração obrigatória de `mysql_native_password` → `caching_sha2_password`.
- **Particionamento horizontal:** via Vitess ou Aurora MySQL.

---

## Best practices

### 1. Sempre usar InnoDB sobre MyISAM
**Por quê:** ACID, row-level locking, MVCC, crash recovery via redo log. MyISAM só faz table-level lock e não tem transações.

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> **Aplicação no core-api:** Drizzle já emite `ENGINE=InnoDB` por padrão. ADR-0013 fixa MySQL+InnoDB como engine de prod. Não tocar.

---

### 2. Dimensionar `innodb_buffer_pool_size` para 60–80% da RAM
**Por quê:** É o cache de páginas. Default 128 MB é inadequado para produção. Subdimensionar → thrashing de I/O. Superdimensionar → SO sufoca.

```ini
[mysqld]
innodb_buffer_pool_size = 48G   # servidor com 64 GB
innodb_log_file_size = 1G
innodb_flush_log_at_trx_commit = 1   # durabilidade ACID
```

---

### 3. Habilitar HyperGraph Optimizer (MySQL 8.4+)
**Por quê:** O otimizador legado limita planos de JOIN a ~5-6 tabelas. HyperGraph usa DPhyp para enumeração exaustiva, custo-baseada.

```sql
SET GLOBAL optimizer_switch='hypergraph_optimizer=on';
SHOW VARIABLES LIKE 'optimizer_switch';
```

**Impacto:** queries com múltiplos JOINs em star schemas ganham 2–5×.

---

### 4. Usar replicação row-based (RBR) em produção
**Por quê:** SBR depende de determinismo; `NOW()`, `RAND()`, `UUID()`, triggers não-deterministas → divergência. RBR replica linha a linha.

```ini
[mysqld]
binlog_format = ROW
binlog_row_image = MINIMAL
```

| Aspecto | SBR | RBR |
|---|---|---|
| Tamanho binlog | menor | maior |
| Determinismo | risco | garantido |
| Replicação paralela | limitada | nativa |
| Recomendação 2026 | legado | **padrão** |

---

### 5. `wait_timeout` entre 600 e 900 segundos
**Por quê:** Default 28800 s (8 h) acumula conexões fantasma de pools mal configurados → esgota `max_connections` → 'too many connections'.

```ini
[mysqld]
wait_timeout = 600
interactive_timeout = 900
max_connections = 500
```

---

### 6. Implementar InnoDB Cluster para HA nativa
**Por quê:** Group Replication + MySQL Router entregam RPO=0, RTO 30–60 s, quorum majoritário, replicação paralela.

```javascript
// MySQL Shell
cluster = dba.createCluster('prodcluster')
cluster.addInstance('node2:3306', {password: 'xxx'})
cluster.addInstance('node3:3306', {password: 'xxx'})
cluster.status()
```

**Alternativas:** Orchestrator+replica manual (leve), Percona XtraDB Cluster/Galera (síncrono multi-master), RDS Multi-AZ (gerenciado).

---

### 7. Quebrar transações grandes em batches
**Por quê:** Transações multi-GB causam (a) lock prolongado, (b) replication lag massivo (SQL thread aplica sequencial), (c) recovery lento.

Anti-padrão:
```sql
BEGIN;
INSERT INTO fact_table SELECT * FROM staging WHERE year=2024;  -- 10M linhas
COMMIT;
```

Padrão correto: chunks de 10K–100K linhas em laço com commit por batch.

---

### 8. Criar índices por predicado, não por ordem de inserção
**Por quê:** B+ tree explora ordem física. Queries filtram por coluna específica; o índice deve casar com WHERE/JOIN ON/ORDER BY.

```sql
-- ruim:
CREATE INDEX idx_id_email ON users(id, email);
-- bom (casa com WHERE email=… ORDER BY created_at DESC):
CREATE INDEX idx_email_created ON users(email, created_at DESC);
```

Validar com `EXPLAIN FORMAT=JSON`; aceitar apenas `type=range|ref|eq_ref|const`, recusar `ALL`.

---

### 9. Arquivar binlogs fora da instância para PITR
**Por quê:** `binlog_expire_logs_seconds` padrão é 30 d. Perda quebra recovery e invalida réplicas remotas em lag.

```ini
[mysqld]
binlog_expire_logs_seconds = 604800   # 7 dias localmente
binlog_format = ROW
binlog_row_image = MINIMAL
```

Cron arquiva para S3/GCS com `mysqlbinlog --read-from-remote-server`.

---

### 10. Monitorar `innodb_redo_log_capacity` e ajustar por TPS
**Por quê:** Redo pequeno força flush frequente; grande prolonga recovery.

Estimativa: `capacity ≈ (bytes_per_txn × TPS) × 10`.

```ini
[mysqld]
innodb_redo_log_capacity = 2G
```

```sql
SELECT * FROM performance_schema.innodb_redo_log_files\G
```

---

## Configurações / parâmetros citados

| Parâmetro | Default | Recomendado 2026 | Função |
|---|---|---|---|
| `innodb_buffer_pool_size` | 128 MB | 60–80% RAM | cache de páginas InnoDB |
| `innodb_log_file_size` | 50 MB | 1–2 GB | redo log (obsoleto em 8.4+) |
| `innodb_redo_log_capacity` | — | 2–8 GB | capacidade redo log (8.4+) |
| `innodb_flush_log_at_trx_commit` | 1 | 1 em prod | 0/1/2 — durabilidade |
| `wait_timeout` | 28800 s | 600–900 s | timeout conexão inativa |
| `interactive_timeout` | 28800 s | 900 s | timeout sessão interativa |
| `max_connections` | 151 | escalar | conexões simultâneas |
| `binlog_format` | ROW (8.4) | ROW | formato replicação |
| `binlog_expire_logs_seconds` | 2592000 | 604800 | retenção binlog local |
| `binlog_row_image` | FULL | MINIMAL | espaço binlog |
| `slave_parallel_workers` | 0 | 4–8 | threads replicação paralela |
| `optimizer_switch` | — | `hypergraph_optimizer=on` | HyperGraph (8.4+) |

---

## Armadilhas / anti-patterns

- `innodb_buffer_pool_size` undersized → I/O 10–100× pior.
- `wait_timeout` no default 28800 s → pool exaurido.
- Índices por ordem de inserção → full table scan; `EXPLAIN type=ALL`.
- Transações multi-GB sem batching → replica lag de horas.
- Sem backup de binlog → PITR impossível > 30 d.
- `mysql_native_password` em 8.4 → quebra em 9.x.
- SBR com `NOW()`, `RAND()`, `UUID()` → divergência silenciosa.
- InnoDB Cluster com menos de 3 nós → split-brain.

---

## Quando aplicar / Quando NÃO aplicar

### Usar MySQL:
- Web apps transacionais, e-commerce, CMS, SaaS 1–10 TB.
- Sistemas financeiros / ERP (ACID, compliance).
- Até ~10 K TPS num shard único.

### NÃO usar (preferir alternativa):
- Analytics PB+ → StarRocks, ClickHouse, Snowflake.
- Escala distribuída 100+ shards → Vitess, CockroachDB.
- JSON semi-estruturado pesado → PostgreSQL/JSONB ou MongoDB.
- Geoespacial complexo → PostgreSQL+PostGIS.
- Séries temporais → InfluxDB, TimescaleDB.
- Cache ultra-low latency → Redis, Memcached.

---

## Mudanças 8.4 LTS vs 8.0

| Mudança | Impacto | Ação |
|---|---|---|
| HyperGraph Optimizer | 2–5× speedup multi-JOIN | ativar flag, validar EXPLAIN |
| InnoDB Cluster no K8s | HA nativa em produção | migrar para K8s operator |
| `caching_sha2_password` default | drivers antigos quebram | upgrade drivers |
| Remoção `SQL_CALC_FOUND_ROWS` | queries quebram | refatorar para 2 queries (COUNT + LIMIT) |
| `--slave-*` options removidas | scripts falham | usar `--replica` |
| Suporte até 2032 | estabilidade 7 anos | upgrade antes do EOL do 8.0 (out/2026) |

---

## Comandos essenciais de produção

```sql
SHOW REPLICA STATUS\G                         -- 8.0+ (era SLAVE STATUS)
SHOW BINARY LOGS;
PURGE BINARY LOGS BEFORE '2026-01-01 00:00:00';
SHOW ENGINE INNODB STATUS\G
SELECT * FROM performance_schema.data_locks\G
SET GLOBAL slow_query_log='ON';
SET GLOBAL long_query_time=0.5;
SELECT * FROM performance_schema.table_io_waits_summary_by_table
ORDER BY SUM_TIMER_WAIT DESC LIMIT 10\G
```

Backup com binlog coordinates:
```bash
mysqldump -u root -p --single-transaction --master-data=2 \
  --all-databases > backup_$(date +%s).sql
```

---

## Referências cruzadas

- [02-binlog-retention-rotation-purge.md](./02-binlog-retention-rotation-purge.md)
- [03-timeout-variables-production-guide.md](./03-timeout-variables-production-guide.md)
- [04-json-column-performance.md](./04-json-column-performance.md)
- [11-innodb-redo-log-tuning.md](./11-innodb-redo-log-tuning.md)
- Manual oficial: [`../mysql-refman-8.4--oracle.md`](../../mysql-refman-8.4--oracle.md)
