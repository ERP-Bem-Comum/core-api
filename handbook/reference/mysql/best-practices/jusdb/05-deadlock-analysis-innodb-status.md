# MySQL Deadlock Analysis: Reading InnoDB Status and Writing Deadlock-Safe Code

> **Fonte:** https://www.jusdb.com/blog/mysql-deadlock-analysis-innodb-status-prevention-guide
> **Publicado:** 2025-11-27
> **Aplicação no core-api:** repositórios Drizzle do módulo Contracts usam transações `SELECT-then-UPDATE-or-INSERT`; este artigo rege como diagnosticar 1213/1205 quando aparecerem e como organizar a ordem de acesso aos agregados (Contract sempre antes de Amendment, por exemplo).

---

## TL;DR

Deadlocks no InnoDB **sempre têm causa determinística**: (1) ordem inconsistente de locks entre transações, ou (2) índice ausente forçando escalação para next-key locks. Diagnóstico: `SHOW ENGINE INNODB STATUS` → seção `LATEST DETECTED DEADLOCK`. Prevenção: ordem de acesso fixa + índice nos `WHERE` de UPDATE/DELETE + transações curtas + retry com backoff exponencial em erro 1213.

---

## Conceitos-chave

- **Deadlock vs Lock Wait** — lock wait é uma trx esperando; deadlock é ciclo (A espera B, B espera A).
- **Victim selection** — InnoDB faz rollback da trx com menor undo log (mais barata).
- **Record / Gap / Next-key locks** — InnoDB sob REPEATABLE READ trava registros + gaps (ranges) por padrão.
- **Intention locks (IS/IX)** — sinalizam intenção de travar linha dentro da tabela.
- **Erros relevantes:** `1213 Deadlock found when trying to get lock` e `1205 Lock wait timeout exceeded`.

---

## Como ler `SHOW ENGINE INNODB STATUS`

```sql
SHOW ENGINE INNODB STATUS\G
```

Procure a seção `LATEST DETECTED DEADLOCK`:

```
LATEST DETECTED DEADLOCK
2025-11-27 09:15:33 0x7f8b2c001700

*** (1) TRANSACTION:
TRANSACTION 421938, ACTIVE 0 sec
MySQL thread id 142
UPDATE orders SET status='shipped' WHERE id=100

*** (1) HOLDS THE LOCK(S):
RECORD LOCKS space id 23 index PRIMARY of table `shop`.`orders`
lock_mode X locks rec but not gap

*** (1) WAITING FOR THIS LOCK TO be GRANTED:
RECORD LOCKS space id 24 index PRIMARY of table `shop`.`shipments`
lock_mode X locks rec but not gap

*** (2) TRANSACTION:
TRANSACTION 421939, ACTIVE 0 sec
UPDATE shipments SET tracking='1Z...' WHERE order_id=100

*** (2) HOLDS THE LOCK(S):
... shipments ...

*** (2) WAITING FOR THIS LOCK TO be GRANTED:
... orders ...

*** WE ROLL BACK TRANSACTION (2)
```

| Campo | Significado |
|---|---|
| `TRANSACTION 421938` | id único |
| `ACTIVE 0 sec` | há quanto tempo a trx existe |
| `lock_mode X` | exclusive lock (escrita) |
| `S` | shared lock (leitura) |
| `locks rec but not gap` | apenas registro, sem range |
| `locks gap before rec` | gap lock |
| `next-key lock` | registro + gap |
| `HOLDS THE LOCK(S)` | o que essa trx tem |
| `WAITING FOR` | o que falta |
| `WE ROLL BACK TRANSACTION (2)` | vítima escolhida |

Interpretação clássica: **inversão de ordem** — trx 1 trancou `orders` e quer `shipments`; trx 2 fez o oposto.

---

## Causas comuns

### 1. Ordem inconsistente de locks
Problema:
```sql
-- endpoint A
BEGIN; UPDATE orders … ; UPDATE shipments … ; COMMIT;
-- endpoint B
BEGIN; UPDATE shipments … ; UPDATE orders … ; COMMIT;
```
Correção: **toda** rota trava `orders` antes de `shipments`.

### 2. Índice ausente → next-key lock na tabela inteira
Problema:
```sql
CREATE TABLE jobs (id BIGINT PK, status VARCHAR(20), created_at DATETIME);
UPDATE jobs SET status='done' WHERE status='pending' AND created_at < NOW();
-- sem índice em (status, created_at) → scan + lock em range gigante
```
Correção:
```sql
ALTER TABLE jobs ADD INDEX idx_status_created (status, created_at);
```

### 3. `SELECT … FOR UPDATE` em fila com alta concorrência
Problema: vários workers competem pelo mesmo lock + gap.
Correção (8.0+): `FOR UPDATE SKIP LOCKED`.

```sql
BEGIN;
SELECT id FROM job_queue WHERE status='pending' LIMIT 1 FOR UPDATE SKIP LOCKED;
UPDATE job_queue SET status='processing' WHERE id=?;
COMMIT;
```

### 4. Transações longas com I/O externo no meio
```sql
BEGIN;
UPDATE accounts SET balance = balance - 10 WHERE id=1;
-- chamada HTTP de 500 ms aqui ❌ lock mantido
COMMIT;
```
Correção: fechar a transação ANTES do I/O externo.

---

## Como escrever código deadlock-safe

### 1. Ordem global de lock por chave
```python
first, second = sorted([from_id, to_id])
cur.execute("UPDATE accounts SET balance=balance-%s WHERE id=%s", (amt, first))
cur.execute("UPDATE accounts SET balance=balance+%s WHERE id=%s", (amt, second))
```

### 2. Escopo mínimo de transação
Fazer processamento fora; abrir BEGIN só para o write.

### 3. Retry com backoff exponencial em 1213
```python
for attempt in range(MAX_RETRIES):
    try:
        with conn.cursor() as cur:
            fn(cur)
        conn.commit()
        return
    except pymysql.err.OperationalError as e:
        if e.args[0] == 1213:
            conn.rollback()
            time.sleep(0.05 * (2 ** attempt))
        else:
            raise
```

### 4. `SKIP LOCKED` em filas
Pattern canônico de worker.

### 5. Não usar `FOR UPDATE` para leituras puras
Lock só quando há intenção real de UPDATE depois.

---

## Configurações relevantes

| Parâmetro | Default | Recomendado | Efeito |
|---|---|---|---|
| `innodb_deadlock_detect` | ON | ON | detecção ativa de ciclo (vs esperar timeout) |
| `innodb_lock_wait_timeout` | 50 s | 5–30 s | espera por row lock |
| `innodb_print_all_deadlocks` | OFF | **ON** | loga TODOS, não só o último |
| `transaction_isolation` | REPEATABLE-READ | READ-COMMITTED quando possível | menos gap locks |
| `innodb_rollback_on_timeout` | OFF | **ON** (vide artigo de timeouts) | rollback da trx inteira |

```ini
[mysqld]
innodb_deadlock_detect       = ON
innodb_lock_wait_timeout     = 20
innodb_print_all_deadlocks   = ON
innodb_rollback_on_timeout   = ON
transaction-isolation        = READ-COMMITTED
```

---

## Monitoramento

### Transações ativas e bloqueadores
```sql
SELECT r.trx_id AS waiting, r.trx_mysql_thread_id AS waiting_thread,
       r.trx_query AS waiting_query,
       b.trx_id AS blocking, b.trx_mysql_thread_id AS blocking_thread,
       b.trx_query AS blocking_query
FROM information_schema.innodb_lock_waits w
JOIN information_schema.innodb_trx b ON b.trx_id = w.blocking_trx_id
JOIN information_schema.innodb_trx r ON r.trx_id = w.requesting_trx_id;
```

### `performance_schema.data_locks`
```sql
SELECT OBJECT_SCHEMA, OBJECT_NAME, INDEX_NAME, LOCK_TYPE, LOCK_MODE,
       LOCK_STATUS, LOCK_DATA
FROM performance_schema.data_locks
WHERE OBJECT_SCHEMA='core';
```

### `data_lock_waits`
```sql
SELECT * FROM performance_schema.data_lock_waits\G
```

### Histórico via log de erros
```bash
grep "DEADLOCK DETECTED" /var/log/mysql/error.log | wc -l
```

---

## Armadilhas

- "Deadlock é aleatório" → falso, sempre tem causa.
- `FOR UPDATE` em leitura — vira contenção desnecessária.
- UPDATE/DELETE sem índice no `WHERE` → next-key na tabela inteira.
- Lock sobrevivendo a chamada HTTP/RPC dentro da transação.
- `innodb_lock_wait_timeout = 0` — força falha imediata sem dar chance ao MySQL detectar deadlock antes.

---

## Comandos essenciais

```sql
SHOW ENGINE INNODB STATUS\G
SELECT * FROM information_schema.INNODB_TRX\G
SELECT * FROM performance_schema.data_locks WHERE THREAD_ID = CONNECTION_ID()\G
KILL [CONNECTION|QUERY] <thread_id>;
SHOW VARIABLES LIKE 'innodb%timeout%';
SHOW VARIABLES LIKE 'innodb_print%';
```

---

## Checklist de prevenção

- [ ] Ordem de lock fixa por chave (ordenar ids antes do BEGIN).
- [ ] Transação curta — sem I/O externo dentro.
- [ ] Índice em todo `WHERE` de UPDATE/DELETE.
- [ ] `FOR UPDATE` só quando segue UPDATE/DELETE; preferir `SKIP LOCKED` em filas.
- [ ] `innodb_print_all_deadlocks = ON` em prod.
- [ ] Retry com backoff exponencial para 1213.
- [ ] `innodb_rollback_on_timeout = ON`.

---

## Referências cruzadas

- [03-timeout-variables…](./03-timeout-variables-production-guide.md) — `innodb_lock_wait_timeout`, `innodb_rollback_on_timeout`.
- [07-buffer-pool…](./07-innodb-buffer-pool-pages-chunks-eviction.md) — entender páginas trancadas.
- [11-redo-log-tuning…](./11-innodb-redo-log-tuning.md) — escrita de logs durante deadlock recovery.
