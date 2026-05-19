# MySQL binlog Retention, Rotation & Purge: Production Guide (2026)

> **Fonte:** https://www.jusdb.com/blog/mysql-binary-log-management-purging-rotation
> **Publicado:** 2026-05-09
> **Aplicação no core-api:** ainda não temos réplicas; este guia rege qualquer trabalho futuro em **PITR** e **outbox MySQL** (ADR-0015) — outbox depende de binlog íntegro para replay.

---

## TL;DR

Configurar retenção automática com `binlog_expire_logs_seconds` (MySQL 8.0+), validar réplicas antes de qualquer purge manual, **jamais** deletar binlog por `rm` (corrompe `mysql-bin.index`). Em AWS RDS, usar `CALL mysql.rds_set_configuration('binlog retention hours', H)` — variáveis nativas são ignoradas. Monitorar consumo de disco em tempo real: réplica travada acumula TB silenciosamente.

---

## Conceitos-chave

- **Binary log** = registro sequencial de operações que **modificam** dados (INSERT/UPDATE/DELETE/DDL). **Não** registra SELECT.
- Dois propósitos: **replicação** e **PITR** (point-in-time recovery).
- **Rotação automática** ocorre quando: arquivo atinge `max_binlog_size`, server reinicia, ou `FLUSH BINARY LOGS` é executado.
- **Nunca deletar via filesystem.** `rm` deixa `mysql-bin.index` órfão e MySQL perde view do estado.

---

## Best practices

### 1. Ativar binary logging e verificar
```sql
SHOW VARIABLES LIKE 'log_bin';   -- esperar 'ON'
```
8.0+ ativa por padrão. Versões anteriores exigem `my.cnf` + restart.

### 2. Retenção automática (8.0+)
```ini
[mysqld]
log_bin                    = /var/lib/mysql/mysql-bin
max_binlog_size            = 512M
binlog_expire_logs_seconds = 604800   # 7 dias
```
```sql
SET PERSIST binlog_expire_logs_seconds = 604800;
```
`expire_logs_days` está **deprecado** em 8.0+ — não usar.

### 3. `sync_binlog = 1` em produção
```ini
[mysqld]
sync_binlog = 1
```
Força `fsync()` por commit; sem isso, crash perde os últimos segundos confirmados. Custo de throughput é aceitável em primários.

### 4. `binlog_format = ROW`
Determinístico. STATEMENT é compacto mas falha com `NOW()`, `RAND()`, `UUID()`. ROW gera arquivos 2–3× maiores — planejar disco.

### 5. Validar réplicas antes de purgar
```sql
SHOW REPLICA STATUS\G
-- ler Source_Log_File, Read_Source_Log_Pos em CADA réplica
```
Purgar log que réplica ainda lê → erro 1236, replicação morre → rebuild.

### 6. Purgar com SQL, nunca com `rm`
```sql
PURGE BINARY LOGS TO 'mysql-bin.000042';
PURGE BINARY LOGS BEFORE '2026-02-15 00:00:00';   -- margem 24 h para lag
```

### 7. Em AWS RDS, usar stored procedure dedicada
```sql
CALL mysql.rds_set_configuration('binlog retention hours', 72);
CALL mysql.rds_show_configuration();
```
RDS ignora `binlog_expire_logs_seconds` nativo — o default (NULL) é "retenção ilimitada".

### 8. Monitorar disco
```bash
du -sh /var/lib/mysql/mysql-bin.*
df -h /var/lib/mysql
```
```sql
SELECT COUNT(*) AS log_count,
       ROUND(SUM(FILE_SIZE)/1073741824, 2) AS total_gb
FROM information_schema.FILES
WHERE FILE_TYPE = 'BINARY LOG';
```
Alertar em 70% do volume; 90% já é tarde para backup emergencial.

### 9. Limpeza automatizada com salvaguarda
```bash
#!/bin/bash
MYSQL="mysql -u root -p${MYSQL_PWD}"
RETENTION_DAYS=7
CUTOFF=$(date -d "-${RETENTION_DAYS} days" '+%Y-%m-%d %H:%M:%S')
REPLICA_LOG=$($MYSQL -e "SHOW REPLICA STATUS\G" 2>/dev/null \
  | grep "Source_Log_File" | awk '{print $2}')
echo "Purging binary logs before: $CUTOFF (replica reading $REPLICA_LOG)"
$MYSQL -e "PURGE BINARY LOGS BEFORE '$CUTOFF';"
```

### 10. Métricas operacionais essenciais
- Consumo de disco (GB) — alerta a 70%
- Taxa de escrita (MB/s)
- `Seconds_Behind_Source`
- Número de arquivos binlog (proxy para expiry funcionando)

---

## Configurações / parâmetros citados

| Parâmetro | Default | Recomendado | Nota |
|---|---|---|---|
| `log_bin` | ON (8.0+) | ON | obrigatório para PITR |
| `binlog_expire_logs_seconds` | 2592000 (30 d) | 604800 (7 d) | substitui `expire_logs_days` |
| `expire_logs_days` | 10 | — | **deprecado em 8.0+** |
| `max_binlog_size` | 1 GiB | 512 MiB | tamanho de rotação |
| `binlog_format` | STATEMENT (histórico) | ROW | determinístico |
| `sync_binlog` | 0 | 1 | fsync por commit |

---

## Armadilhas / anti-patterns

| Anti-pattern | Risco | Correção |
|---|---|---|
| `rm` sobre binlog | corrompe índice | sempre `PURGE BINARY LOGS …` |
| Purgar sem ver réplicas | erro 1236, replicação morre | `SHOW REPLICA STATUS\G` antes |
| `expire_logs_days` em 8.0+ | será removido | usar `binlog_expire_logs_seconds` |
| `sync_binlog=0` em primário | perda em crash | `sync_binlog=1` |
| RDS via parameter group | sem efeito | `mysql.rds_set_configuration` |
| STATEMENT format | drift replica | ROW sempre |
| Alerta só a 90% disco | sem headroom | alerta a 70% |
| Replicação travada não detectada | acúmulo de TB | monitorar `Seconds_Behind_Source` |
| `FLUSH BINARY LOGS` para "economizar disco" | não deleta nada | só para forçar rotação |

---

## Quando aplicar

✅ Produção com réplicas; PITR crítico; compliance > 24 h; RDS/Cloud SQL.
❌ Dev/test local, sem PITR, sem réplica → pode rodar com binlog OFF.

Pré-purga obrigatório: réplicas 100% sincronizadas, backup < 24 h, disco com 2–3× a retenção máxima estimada.

---

## Comandos essenciais

```sql
SHOW BINARY LOGS;
SHOW REPLICA STATUS\G
SELECT ROUND(SUM(FILE_SIZE)/1073741824, 2) AS total_gb
FROM information_schema.FILES
WHERE FILE_TYPE = 'BINARY LOG';
FLUSH BINARY LOGS;
PURGE BINARY LOGS TO 'mysql-bin.000050';
PURGE BINARY LOGS BEFORE '2026-02-10 00:00:00';
CALL mysql.rds_set_configuration('binlog retention hours', 168);
```

---

## Notas operacionais

- **Falha clássica:** disco enche às 3 AM porque réplica parou em silêncio.
- **Janela segura:** `2 × intervalo de backup + margem de lag`. Backup diário → mínimo 48–72 h.
- Workload pesado pode gerar 20–50 GB/h de binlog. Capacity = 2–3× isso.

---

## Referências cruzadas

- [01-mysql-explained…](./01-mysql-explained-innodb-8.4-replication-production-patterns.md) — visão geral
- [03-timeout-variables…](./03-timeout-variables-production-guide.md)
- [05-deadlock-analysis…](./05-deadlock-analysis-innodb-status.md) — `SHOW ENGINE INNODB STATUS`
- ADR-0015 — Outbox pattern MySQL
