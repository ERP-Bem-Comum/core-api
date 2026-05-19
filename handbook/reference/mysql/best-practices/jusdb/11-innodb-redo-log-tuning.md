# MySQL InnoDB Redo Log Tuning: Sizing for Production Write Throughput

> **Fonte:** https://www.jusdb.com/blog/mysql-innodb-redo-log-tuning-production-guide
> **Publicado:** 2025-10-21
> **Aplicação no core-api:** quando o MySQL de prod aparecer, este é o setting que o autor do artigo descreve como "dangerously undersized by default". Para o core-api há baixo TPS hoje, então 1–2 GB já cobre. Para "outbox + repository commits" sustentados, alvo 4 GB no boot.

---

## TL;DR

Default `innodb_redo_log_capacity = 100 MiB` é perigoso. Subdimensionar gera checkpoints frenéticos → page cleaner stalls → throughput cai 30–50%. Dimensionar **4–8× o pico de write throughput**, monitorar `Innodb_checkpoint_age` abaixo de 75% da capacidade.

---

## Conceitos-chave

- **Redo log (WAL)** — buffer circular onde toda mudança é registrada **antes** de modificar páginas do buffer pool. Permite crash recovery + adia I/O random.
- **LSN (Log Sequence Number)** — relógio monotônico em bytes do redo.
- **Checkpoint** — flush coordenado de dirty pages para liberar redo. Quando atrasa, write stalls.
- **`innodb_log_file_size` (< 8.0.30)** — legado; resize exige restart.
- **`innodb_redo_log_capacity` (8.0.30+)** — pool único; resize dinâmico com `SET PERSIST`; default 100 MiB.

---

## Por que 100 MiB é perigoso

Pico de 50 MB/s preenche 100 MiB em ~2 s → checkpoint contínuo → page cleaner satura → writes esperam → throughput médio cai 30–50%.

---

## Dimensionar

### Tabela rápida

| Write pico | `innodb_redo_log_capacity` |
|---|---|
| < 10 MB/s | 1–2 GiB |
| 10–50 MB/s | 4–8 GiB |
| 50–200 MB/s | 8–32 GiB |
| > 200 MB/s | 32–64 GiB |

### Fórmula

```
capacity ≈ peak_write_bytes_per_sec × 60 (a 90) min
```

Regra prática: capacidade suficiente para 60–90 min de pico — em geral 4–8 GiB.

### Medir LSN delta

```sql
SELECT variable_value INTO @lsn_start
FROM performance_schema.global_status
WHERE variable_name='Innodb_redo_log_current_lsn';

SELECT SLEEP(60);

SELECT variable_value INTO @lsn_end
FROM performance_schema.global_status
WHERE variable_name='Innodb_redo_log_current_lsn';

SELECT (@lsn_end - @lsn_start)/60 AS bytes_per_sec,
       FORMAT((@lsn_end - @lsn_start)/60/1024/1024, 2) AS mb_per_sec;
```

---

## `innodb_log_file_size` × `innodb_redo_log_capacity`

| Aspecto | < 8.0.30 (`log_file_size`) | 8.0.30+ (`redo_log_capacity`) |
|---|---|---|
| Arquivos | `ib_logfile0/1/…` | pool único |
| Resize | restart + recovery lento | dinâmico (`SET PERSIST`) |
| Padrão | 48 MiB × 2 | 100 MiB |
| Recuperação após crash | lenta com logs grandes | rápida |

---

## Parâmetros vizinhos

```ini
innodb_log_buffer_size            = 16M           # buffer em RAM
innodb_flush_log_at_trx_commit    = 1             # 0/1/2 — 1 = ACID
innodb_io_capacity                = 2000          # IOPS background
innodb_io_capacity_max            = 4000          # IOPS em flush urgente
innodb_max_dirty_pages_pct        = 75            # flush agressivo acima disso
innodb_max_dirty_pages_pct_lwm    = 65            # começa flush
sync_binlog                       = 1             # durabilidade binlog
innodb_flush_method               = O_DIRECT      # NVMe / SSD moderno
```

Mismatch entre redo grande e `innodb_io_capacity` baixo é a causa #1 de stalls.

---

## Procedimento de tuning

1. **Medir** LSN delta no pico (60 s ou 5 min).
2. **Calcular** alvo via tabela ou fórmula.
3. **Aplicar** com `SET PERSIST innodb_redo_log_capacity = <bytes>;` (8.0.30+).
4. **Monitorar** `Innodb_checkpoint_age` — alvo < 75% da capacidade.
5. **Reproduzir** pico; confirmar latência de write estável.

---

## Monitoramento

```sql
SHOW STATUS LIKE 'Innodb_redo_log%';
SHOW STATUS LIKE 'Innodb_checkpoint%';

SELECT
  (SELECT variable_value FROM performance_schema.global_status
   WHERE variable_name='Innodb_redo_log_current_lsn') AS lsn_current,
  (SELECT variable_value FROM performance_schema.global_status
   WHERE variable_name='Innodb_checkpoint_age')       AS checkpoint_age_bytes,
  @@innodb_redo_log_capacity                          AS capacity_bytes,
  ROUND(
    (SELECT variable_value FROM performance_schema.global_status
     WHERE variable_name='Innodb_checkpoint_age')
    / @@innodb_redo_log_capacity * 100, 1)            AS checkpoint_pct;
```

Hit ratio do buffer pool (alvo > 99%) integra a saúde:
```sql
SELECT ROUND((1 -
  SUM(IF(variable_name='Innodb_buffer_pool_reads', variable_value, 0))
  / NULLIF(SUM(IF(variable_name='Innodb_buffer_pool_read_requests', variable_value, 0)), 0)
) * 100, 2) AS hit_rate_pct
FROM performance_schema.global_status
WHERE variable_name IN ('Innodb_buffer_pool_reads', 'Innodb_buffer_pool_read_requests');
```

---

## Sinais de undersize

- `SHOW PROCESSLIST` com `page cleaner: flush_list`.
- Mensagens no error log: `InnoDB: Sync writes: X sec`.
- Throughput de write trava em ~40–60 MB/s independente da carga.
- `checkpoint_age` constantemente > 75%.
- Latência de commit com picos > 100 ms.

## Sinais de oversize

- Recovery após crash demora horas (raro em 8.0.30+).
- Espaço em disco alocado sem uso.
- Nenhum ganho de throughput ao crescer mais.

---

## Armadilhas

- Aumentar redo sem aumentar `innodb_io_capacity` → page cleaner continua sem fôlego.
- Confundir `sync_binlog` com tuning de redo — são durabilidades distintas.
- Resize com `SET GLOBAL` (não persiste) ou sem validar `checkpoint_age` depois.
- Buffer pool minúsculo + redo gigante → não adianta.

---

## Configuração canônica de produção

```ini
[mysqld]
innodb_redo_log_capacity        = 8589934592       # 8 GiB
innodb_buffer_pool_size         = 48G
innodb_buffer_pool_instances    = 8
innodb_max_dirty_pages_pct      = 75
innodb_max_dirty_pages_pct_lwm  = 65
innodb_io_capacity              = 2000
innodb_io_capacity_max          = 4000
innodb_flush_method             = O_DIRECT
innodb_flush_log_at_trx_commit  = 1
innodb_log_buffer_size          = 16M
sync_binlog                     = 1
```

---

## Comandos

```sql
SHOW VARIABLES LIKE 'innodb_redo%';
SHOW STATUS LIKE 'Innodb_checkpoint_age';
SET PERSIST innodb_redo_log_capacity = 8589934592;
```

---

## Referências cruzadas

- [07-buffer-pool…](./07-innodb-buffer-pool-pages-chunks-eviction.md) — relação direta.
- [02-binlog-retention…](./02-binlog-retention-rotation-purge.md) — binlog é durabilidade separada.
- [05-deadlock-analysis…](./05-deadlock-analysis-innodb-status.md) — `SHOW ENGINE INNODB STATUS` comum.
