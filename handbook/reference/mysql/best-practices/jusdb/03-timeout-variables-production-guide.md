# MySQL wait_timeout, net_read_timeout & All Timeout Variables (2026 Production Guide)

> **Fonte:** https://www.jusdb.com/blog/mysql-timeout-variables-complete-guide-for-database-professionals
> **Publicado:** 2026-05-09
> **Aplicação no core-api:** dimensionar `mysql2` pool (`connectionLimit=10`, `enableKeepAlive`) e prevenir "server has gone away" no driver Drizzle/MySQL. Vide `src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts`.

---

## TL;DR

Oito variáveis críticas + a regra de ouro: **`HikariCP idleTimeout` (ou equivalente do pool) deve ser ~30 s ABAIXO de `wait_timeout` do servidor**. Misalinhamento pool↔servidor responde por ~50% dos `ERROR 2006 'MySQL server has gone away'`. Defaults do MySQL são herdados de 2002 e perigosos em prod moderna.

| Variável | Default | Recomendado | Escopo | Função |
|---|---|---|---|---|
| `wait_timeout` | 28800 s (8 h) | 300–900 s | global+session | mata conexões inativas (não interativas) |
| `interactive_timeout` | 28800 s | 1800 s | global+session | mesmo, para clientes `CLIENT_INTERACTIVE` |
| `net_read_timeout` | 30 s | 30–120 s | global+session | espera de pacote do cliente DURANTE query |
| `net_write_timeout` | 60 s | 60–120 s | global+session | espera de cliente RECEBER resultado |
| `connect_timeout` | 10 s | 5–15 s | global | handshake inicial |
| `innodb_lock_wait_timeout` | 50 s | 5–20 s | global+session | espera por row lock InnoDB |
| `lock_wait_timeout` | 31536000 s (1 ano) | 300 s | global+session | metadata lock (DDL) |
| `max_execution_time` | 0 (off) | 3000–10000 ms | global+session | só para SELECT (ms!) |

---

## Conceitos-chave

- **Conexão vs execução vs lock** — três famílias de timeout independentes.
- **Defaults legados** assumem clientes humanos, não pools de aplicação.
- **`max_execution_time` é em milissegundos**; o resto em segundos.
- `max_execution_time` **só afeta SELECT**, nunca DML/DDL.
- `innodb_lock_wait_timeout` aciona apenas **rollback da última statement** quando `innodb_rollback_on_timeout=OFF` (default!) → inconsistência silenciosa.

---

## Variáveis em detalhe

### `wait_timeout`
- Conexão inativa não-interativa morre após N s.
- Erro: `2006 'MySQL server has gone away'` ou `2013 Lost connection`.
- Recomendado: 300–600 s (web), 180 s (serverless), 3600 s (analytics longa).
- Default 28800 s → pool drena ociosamente até esgotar `max_connections`.

### `interactive_timeout`
- Igual ao acima, mas para flag `CLIENT_INTERACTIVE` (CLI, Workbench).
- 1800 s é seguro; 600 s em ambientes de auditoria forte.

### `net_read_timeout`
- MySQL espera pacote do cliente **durante** uma operação em curso (ex.: bulk INSERT lento).
- Aumentar para 60–300 s em ETL/streaming.

### `net_write_timeout`
- MySQL espera cliente ler o resultado.
- Para exports grandes: 120–300 s.

### `connect_timeout`
- Só handshake inicial; não afeta conexões já abertas.
- Curto (5 s) ajuda contra DoS de handshake; em LAN, 10 s.

### `innodb_lock_wait_timeout`
- Espera por **row lock**.
- Erro: `1205 Lock wait timeout exceeded; try restarting transaction`.
- Fintech/OLTP: 5–10 s (falha rápido + retry no app).
- ⚠️ **Default `innodb_rollback_on_timeout = OFF` mantém a transação aberta** após 1205 → mistura confirmada inconsistente. **Forçar `ON` em prod.**

### `innodb_rollback_on_timeout`
- `ON`: timeout = rollback da **transação inteira**.
- `OFF` (default): rollback só da última statement → bug clássico de "dinheiro saiu da conta mas ordem não foi marcada paga".

### `lock_wait_timeout`
- Para **metadata locks** (DDL: ALTER, RENAME, DROP, TRUNCATE).
- Default 31.536.000 s (1 ano!) → DDL fica parado eternamente atrás de uma transação ociosa.
- Recomendado: 300 s.

### `max_execution_time`
- Mata SELECT após N **milissegundos**.
- Hint por query: `SELECT /*+ MAX_EXECUTION_TIME(120000) */ …`.
- Não afeta UPDATE/DELETE/INSERT/DDL — design intencional.

### `innodb_deadlock_detect`
- `ON` (default): kill imediato em deadlock; um trx escolhido como vítima.
- `OFF`: usa `innodb_lock_wait_timeout` — útil em concorrência altíssima (10K+ TPS) **se** a aplicação retentar.

### `replica_net_timeout` (antigo `slave_net_timeout`)
- Default 60 s; aumentar para 120–300 s em rede instável.

### `mysqlx_*` (X Protocol)
- Raramente necessário ajustar em OLTP tradicional.

---

## Best practices

1. **`wait_timeout` do servidor > `idleTimeout` do pool em pelo menos 30 s.**
2. **Pool `testOnBorrow` / `pool_pre_ping` ligado** — valida com `SELECT 1` antes de entregar conexão.
3. **`innodb_rollback_on_timeout = ON` em produção, sempre.**
4. **`max_execution_time` global restritivo + hints liberais** — protege OLTP, libera relatórios.
5. **Monitorar `Aborted_connects` e `Aborted_clients`** — crescimento revela timeout mal calibrado.
6. **Calibrar por workload**, não global; reavaliar quando `max_connections` ou tráfego mudam.
7. **Testar com carga real**, não com dev box.

---

## Pool–MySQL alignment ("HikariCP trick")

Causa raiz de metade dos `server has gone away`:

```
Servidor: wait_timeout = 300s
Pool:     idleTimeout = ∞ (default Hikari)

T+0      app abre conexão
T+299    MySQL marca "ociosa"
T+300    MySQL fecha em silêncio   ✂
T+301    app pega conexão morta do pool → ERROR 2006
```

Solução genérica:

```
pool.idleTimeout = (server.wait_timeout - 30) × 90%
                  ≈ (300 - 30) × 0.9 = 243s → use 270s
```

Em AWS RDS, o LB/Proxy mata conexão antes do `wait_timeout` (60–350 s típicos):

```
pool.maxLifetime = MIN(rds_lb_timeout, wait_timeout) - 30s
```

### Exemplos por driver

**Spring/HikariCP**
```yaml
spring.datasource.hikari:
  idle-timeout: 270000
  max-lifetime: 1740000
  connection-timeout: 30000
  connection-test-query: "SELECT 1"
  maximum-pool-size: 20
```

**Node.js `mysql2`** (relevante para core-api)
```ts
const pool = mysql.createPool({
  connectionLimit: 10,
  idleTimeout: 270_000,        // ms
  enableKeepAlive: true,
  keepAliveInitialDelay: 240_000, // ms
});
```

**SQLAlchemy/Python**
```python
engine = create_engine(url, pool_recycle=270, pool_pre_ping=True, pool_size=20)
```

---

## Armadilhas / anti-patterns

- `wait_timeout < 60 s` → mata queries rápidas legítimas. Confundir com `net_read_timeout`.
- Mudar timeout no meio de transação → comportamento inconsistente entre statements.
- Misturar unidades (segundos vs ms) — `max_execution_time` é ms.
- Deixar `innodb_rollback_on_timeout = OFF` (default) — bug financeiro silencioso.
- Timeout enorme "por segurança" → cascata de pool exhaustion.
- `max_execution_time` global restritivo aplicado a relatórios → todos morrem; usar hints.

---

## Comandos essenciais

```sql
SHOW VARIABLES WHERE Variable_name IN (
  'wait_timeout','interactive_timeout','connect_timeout',
  'net_read_timeout','net_write_timeout',
  'innodb_lock_wait_timeout','lock_wait_timeout',
  'innodb_rollback_on_timeout','max_execution_time');

-- diagnosticar "server has gone away"
SHOW STATUS LIKE 'Aborted%';
SELECT SLEEP(310);   -- se wait_timeout=300, dá 2006

-- transações longas
SELECT trx_id, trx_state, TIMESTAMPDIFF(SECOND, trx_started, NOW()) sec,
       trx_rows_locked, trx_query
FROM information_schema.INNODB_TRX
WHERE TIMESTAMPDIFF(SECOND, trx_started, NOW()) > 30
ORDER BY sec DESC;

-- lock waits com bloqueador
SELECT r.trx_id AS waiting, b.trx_id AS blocking,
       TIMESTAMPDIFF(SECOND, r.trx_wait_started, NOW()) AS wait_s,
       r.trx_query AS waiting_query, b.trx_query AS blocking_query
FROM information_schema.INNODB_TRX r
JOIN performance_schema.data_lock_waits w
  ON r.trx_id = w.REQUESTING_ENGINE_TRANSACTION_ID
JOIN information_schema.INNODB_TRX b
  ON b.trx_id = w.BLOCKING_ENGINE_TRANSACTION_ID;
```

---

## Configurações canônicas por workload

```ini
# OLTP / web
[mysqld]
wait_timeout                  = 300
interactive_timeout           = 1800
connect_timeout               = 10
net_read_timeout              = 30
net_write_timeout             = 60
innodb_lock_wait_timeout      = 10
innodb_rollback_on_timeout    = ON
innodb_deadlock_detect        = ON
lock_wait_timeout             = 300
max_execution_time            = 5000
max_connections               = 500

# Fintech (mais agressivo)
innodb_lock_wait_timeout      = 5
max_execution_time            = 3000

# Analytics (override por hint)
wait_timeout                  = 3600
innodb_lock_wait_timeout      = 120
max_execution_time            = 300000
```

---

## Referências cruzadas

- [05-deadlock-analysis…](./05-deadlock-analysis-innodb-status.md) — interação `innodb_lock_wait_timeout` + deadlock detector
- [09-optimizer-hints…](./09-optimizer-hints-index-join-order-max-execution-time.md) — hint `MAX_EXECUTION_TIME`
- [01-mysql-explained…](./01-mysql-explained-innodb-8.4-replication-production-patterns.md)
