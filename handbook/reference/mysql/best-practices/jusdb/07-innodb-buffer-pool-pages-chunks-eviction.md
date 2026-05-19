# MySQL InnoDB Buffer Pool: Deep Dive into Pages, Chunks, and Eviction

> **Fonte:** https://www.jusdb.com/blog/mysql-innodb-buffer-pool-pages-chunks-eviction-deep-dive
> **Publicado:** 2025-11-17
> **Aplicação no core-api:** referência operacional para deploy MySQL 8 — dimensionamento do pool, dump/load para warmup, proteção contra full scans de migrações Drizzle.

---

## TL;DR

Buffer pool é a estrutura de memória mais crítica do InnoDB. Dividido em **chunks de 128 MB** contendo **pages de 16 KB**, gerenciado por LRU com duas sublists (young 63% / old 37%). **Hit ratio alvo > 99%**; < 95% = falta de memória ou query ruim. Midpoint insertion + `innodb_old_blocks_time` protege contra thrashing por full table scan.

---

## Conceitos-chave

- **Page** — 16 KB, unidade de I/O entre disco e memória.
- **Chunk** — 128 MB, unidade de alocação dentro do pool.
- **Instance** — partição do pool para reduzir contenção de mutex.
- **LRU list** com dois níveis:
  - **Young / new sublist** (63% do topo) — hot pages.
  - **Old sublist** (37%) — candidatas a eviction; entrada se dá aqui.
- **Flush list** — dirty pages ordenadas por LSN.
- **Free list** — frames livres.
- **Change buffer** — cache de mudanças em índice secundário não-único.
- **Adaptive Hash Index** — index acelerador transparente; usa ~5% do pool.
- **Dirty page** — modificada em memória, ainda não persistida.
- **Page cleaner** — thread que flushava dirty pages em background.

---

## Anatomia em camadas

| Região | % | Função |
|---|---|---|
| young (new) | 63% | hot pages — promoção por reacesso |
| old | 37% | inserção inicial + filtro contra scans |

Fluxo:

1. **Primeira leitura** → cabeça da old sublist (midpoint insertion).
2. Aguarda `innodb_old_blocks_time` ms (default 1000).
3. **Segundo acesso** após esse tempo → promoção para cabeça da young.
4. Reacessos contínuos → permanece no topo da young (LRU clássico).
5. Inatividade → desce em young → desce em old → eviction da cauda.

**Por que old=37% + janela temporal?** Full table scan de N M linhas leria cada página exatamente uma vez. Com proteção, cada página entra em old mas é evictada antes do segundo toque → cache hot intacto.

---

## Eviction (LRU modificado)

Eviction é feita da **cauda da old sublist**. As young aging caem para old, depois saem.

```sql
SELECT pool_id, pages_made_young, pages_not_made_young,
       pages_read, pages_created, pages_written
FROM information_schema.INNODB_BUFFER_POOL_STATS;
```

- `pages_not_made_young / pages_made_young` alto → workload com scans destrutivos → aumentar `innodb_old_blocks_time`.
- `pages_read` crescente → pool insuficiente.

### Hit ratio
```sql
SELECT ROUND((1 - Innodb_buffer_pool_reads / Innodb_buffer_pool_read_requests) * 100, 2)
FROM performance_schema.global_status;   -- simplificado
```
| Faixa | Diagnóstico |
|---|---|
| < 95% | dimensionamento ruim ou query ineficiente |
| 95–99% | aceitável, considerar crescer |
| > 99% | configurado bem |

---

## Best practices

### 1. Dimensionar ~70% da RAM
Reservar 10–15% para FS cache, 256 MB–1 GB para log buffer, buffers per-thread (`sort_buffer_size`, `join_buffer_size`), overhead de conexão (2–4 MB), temp tables, binlog cache.

### 2. Instâncias = 1 por GB (até 64), mínimo 1 GB por instância
```ini
innodb_buffer_pool_instances = 16   # para pool ~16 GB
```
Reduz mutex contention.

### 3. Dump/load para warmup
```ini
innodb_buffer_pool_dump_at_shutdown = ON
innodb_buffer_pool_load_at_startup  = ON
innodb_buffer_pool_dump_pct         = 25    # top 25% das páginas
```
Reduz aquecimento de horas para minutos.

### 4. Proteger contra batch scans
```sql
SET GLOBAL innodb_old_blocks_time = 5000;   -- antes do ETL
-- ETL
SET GLOBAL innodb_old_blocks_time = 1000;   -- restaurar
```

### 5. Monitoramento diário
- hit ratio > 99%
- `pages_not_made_young / made_young` < 5%
- dirty pages % < 50%
- page read latency (ewma) < 10 ms

---

## Parâmetros

| Parâmetro | Default | Recomendado | Função |
|---|---|---|---|
| `innodb_buffer_pool_size` | 128 MB | ~70% RAM | tamanho total |
| `innodb_buffer_pool_instances` | 8 | `floor(pool_gb)` (max 64) | reduzir contenção |
| `innodb_buffer_pool_chunk_size` | 128 MB | manter | granularidade |
| `innodb_old_blocks_pct` | 37 | 37 | % da old sublist |
| `innodb_old_blocks_time` | 1000 ms | 2000–5000 em ETL | proteção contra scan |
| `innodb_buffer_pool_dump_at_shutdown` | OFF | ON | snapshot do pool |
| `innodb_buffer_pool_load_at_startup` | OFF | ON | restaurar snapshot |
| `innodb_buffer_pool_dump_pct` | 100 | 25 | % do pool a salvar |
| `innodb_page_cleaners` | 4 | 8 em I/O alto | threads de flush |
| `innodb_flush_log_at_trx_commit` | 1 | **1 em prod** | durabilidade |

**Importante:** `pool_size` precisa ser múltiplo de `chunk_size × instances` (8.0.31+ redimensiona). Senão, MySQL ajusta sozinho e a config efetiva pode surpreender.

---

## Queries de monitoramento

### Status agregado
```sql
SHOW ENGINE INNODB STATUS\G
-- seção BUFFER POOL AND MEMORY
```

### Detalhe por instância
```sql
SELECT pool_id, pool_size, free_buffers, database_pages, old_database_pages,
       modified_database_pages, pages_made_young, pages_not_made_young,
       pages_read, pages_created, pages_written
FROM information_schema.INNODB_BUFFER_POOL_STATS;
```

### Composição por tipo de página
```sql
SELECT page_type, COUNT(*) cnt, ROUND(COUNT(*)*16/1024, 2) size_mb
FROM information_schema.INNODB_BUFFER_PAGE
WHERE space <> 0
GROUP BY page_type
ORDER BY cnt DESC;
```

### Progresso de load no startup
```sql
SELECT variable_name, variable_value
FROM performance_schema.global_status
WHERE variable_name LIKE 'Innodb_buffer_pool_load%';
```

### Wait events
```sql
SELECT event_name, count_star, sum_timer_wait/1e12 total_s, avg_timer_wait/1e9 avg_ms
FROM performance_schema.events_waits_summary_global_by_event_name
WHERE event_name LIKE 'wait/io/file/%'
   OR event_name LIKE 'wait/lock/rwlock/buffer%'
ORDER BY sum_timer_wait DESC LIMIT 10;
```

---

## Sinais de pressão

1. **page reads/requests > 5%** — muitos misses.
2. **Eviction rate > 100 pages/s sustentada** — pool subdimensionado.
3. **Dirty pages > 75%** — page cleaner não acompanha; checar I/O.
4. **`pages_not_made_young / total promoções > 10%`** — workload com scans destrutivos.

---

## Armadilhas

- Pool < 70% RAM em produção → thrashing.
- `pool_size` não múltiplo de `chunk × instances` → MySQL reduz/ajusta.
- Full table scan destrói cache se `innodb_old_blocks_time=0`.
- 16 instâncias com pool de 10 GB → 625 MB por instância (abaixo de 1 GB, contenção continua).
- Dump/load desligado → warmup horas após restart.
- Confundir log buffer com buffer pool — log buffer é 16–256 MB, pequeno.

---

## Comandos

```sql
-- dump on-demand
SET GLOBAL innodb_buffer_pool_dump_now = ON;
SELECT VARIABLE_VALUE FROM performance_schema.global_status
WHERE VARIABLE_NAME='Innodb_buffer_pool_dump_status';

-- load on-demand (cuidado em prod)
SET GLOBAL innodb_buffer_pool_load_now = ON;
```

---

## Referências cruzadas

- [10-window-functions…](./10-window-functions-row-number-lag-lead-running-totals.md) — queries que aquecem o pool.
- [11-innodb-redo-log-tuning.md](./11-innodb-redo-log-tuning.md) — dirty page flushing interage com redo.
- [05-deadlock-analysis…](./05-deadlock-analysis-innodb-status.md) — `SHOW ENGINE INNODB STATUS` compartilhado.
