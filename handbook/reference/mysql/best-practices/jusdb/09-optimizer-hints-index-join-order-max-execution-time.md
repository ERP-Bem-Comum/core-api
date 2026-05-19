# MySQL Optimizer Hints: INDEX, JOIN_ORDER, and MAX_EXECUTION_TIME

> **Fonte:** https://www.jusdb.com/blog/mysql-optimizer-hints-index-join-order-guide
> **Publicado:** 2025-10-27
> **Aplicação no core-api:** hints só com EXPLAIN justificando. Em queries de relatório futuras (listagens de contratos com filtros mistos), `MAX_EXECUTION_TIME` hint é a única forma supportada de exceder o `max_execution_time` global definido em prod.

---

## TL;DR

Hints SQL orientam o planejador sem mexer em variáveis globais. Posição obrigatória: comentário `/*+ … */` **logo após** o verbo (`SELECT/INSERT/UPDATE/DELETE`). Princípio: hint é último recurso — antes, corrigir estatística (`ANALYZE TABLE`) e índices. Otimizador moderno acerta na maioria; quando errar, documentar a regressão com `EXPLAIN` antes/depois.

---

## Conceitos-chave

- **Optimizer hints** (`/*+ … */`) — sintaxe nova, granular, com escopo por *query block* via `QB_NAME()`.
- **Index hints** (`USE/FORCE/IGNORE INDEX`) — sintaxe legada, só para seleção de índice, por tabela.
- **Escopo:** statement-level, query-block-level (`QB_NAME`), table-level.

---

## Sintaxe geral

```sql
SELECT /*+ HINT(args) HINT(args) */ cols FROM t;
INSERT /*+ HINT(args) */ INTO t VALUES ...;
UPDATE /*+ HINT(args) */ t SET ...;
DELETE /*+ HINT(args) */ FROM t WHERE ...;
```

O bloco DEVE estar imediatamente após o verbo. Vários hints separados por espaço.

---

## Hints por categoria

### Index selection
```sql
SELECT /*+ INDEX(orders idx_orders_created) */ id, amount
FROM orders WHERE created_at > '2025-01-01';

SELECT /*+ NO_INDEX(orders idx_status) */ * FROM orders WHERE status = 'active';

-- variantes específicas
-- GROUP_INDEX, JOIN_INDEX, ORDER_INDEX (e NO_*) selecionam índice
-- só para a operação correspondente.

SELECT /*+ ORDER_INDEX(orders idx_created) */ *
FROM orders ORDER BY created_at DESC LIMIT 100;
```

### Index merge
```sql
SELECT /*+ INDEX_MERGE(t idx_a, idx_b) */ * FROM t WHERE a=? OR b=?;
SELECT /*+ NO_INDEX_MERGE(t) */ * FROM t WHERE a=? OR b=?;
```

### Ordem de join
```sql
SELECT /*+ JOIN_ORDER(o, u) */ o.id, u.email
FROM orders o JOIN users u ON o.user_id = u.id
WHERE o.status='pending';

-- variantes:
-- JOIN_PREFIX(t1, t2)    — força t1, t2 no início
-- JOIN_SUFFIX(t1, t2)    — força no final
-- JOIN_FIXED_ORDER()     — usar a ordem textual do FROM
```

### Algoritmo de join
```sql
SELECT /*+ BNL(o, u) */ ...        -- block nested loop
SELECT /*+ NO_BNL(o) */ ...
SELECT /*+ HASH_JOIN(o, u) */ ...  -- 8.0.18+
SELECT /*+ NO_HASH_JOIN(o, u) */ ...
```

### Semijoin / subquery
```sql
SELECT /*+ SEMIJOIN(MATERIALIZATION) */ ...
SELECT /*+ NO_SEMIJOIN() */ ...
SELECT /*+ SUBQUERY(MATERIALIZATION) */ ...
```

### Limites e variáveis
```sql
-- mata a query após 5000 ms (só SELECT)
SELECT /*+ MAX_EXECUTION_TIME(5000) */ * FROM big_table WHERE …;

-- SET_VAR muda variável só para esta statement
SELECT /*+ SET_VAR(sort_buffer_size = 16M) */ * FROM t ORDER BY x;
```

### Resource group (8.0+)
```sql
SELECT /*+ RESOURCE_GROUP(analytics_rg) */ region, SUM(value)
FROM orders GROUP BY region;
```

### Query block name
```sql
SELECT /*+ QB_NAME(outer) */ id FROM orders
WHERE user_id IN (
  SELECT /*+ QB_NAME(inner) INDEX(users idx_users_status) */ id
  FROM users WHERE status='premium'
);
```

---

## Index hints legados

```sql
SELECT * FROM orders USE INDEX (idx_status) WHERE status='active';
SELECT * FROM orders FORCE INDEX (idx_status) WHERE status='active';
SELECT * FROM orders IGNORE INDEX (idx_status) WHERE status='active';

-- por operação
SELECT * FROM orders USE INDEX FOR JOIN     (idx_user) WHERE …;
SELECT * FROM orders USE INDEX FOR ORDER BY (idx_date) ORDER BY created_at;
SELECT * FROM orders USE INDEX FOR GROUP BY (idx_status) GROUP BY status;
```

Preferir optimizer hints sempre que possível — sintaxe nova, mais granular.

---

## Quando usar / quando NÃO usar

### Use
- Plano consistentemente ruim após `EXPLAIN`/`EXPLAIN ANALYZE`.
- Query crítica que exige plano estável.
- Override pontual de `max_execution_time` global em relatório.

### NÃO use
- Sem `EXPLAIN` antes/depois — vira chute.
- Substituindo correção de estatística (`ANALYZE TABLE`) ou criação de índice.
- "Para garantir" — versões futuras do otimizador podem ignorar.

---

## Diagnóstico

```sql
EXPLAIN SELECT * FROM orders WHERE status='pending';
EXPLAIN FORMAT=JSON SELECT * FROM orders WHERE status='pending'\G
EXPLAIN FORMAT=TREE SELECT * FROM orders WHERE status='pending'\G  -- 8.0+
EXPLAIN ANALYZE SELECT * FROM orders WHERE status='pending'\G       -- 8.0.18+

-- trace
SET optimizer_trace = 'enabled=on';
SELECT * FROM orders WHERE status='pending';
SELECT * FROM information_schema.OPTIMIZER_TRACE\G
SET optimizer_trace = 'enabled=off';
```

`ANALYZE FORMAT=TREE/JSON` mostra também tempo real, comparável com a estimativa do EXPLAIN.

---

## Armadilhas

- Hint **silenciosamente ignorado** em versões futuras → revalidar a cada upgrade.
- Aplicar `INDEX()` para `JOIN` quando o índice serve só ao `WHERE` — usar a variante certa.
- `QB_NAME` em CTE pode não funcionar de forma equivalente — testar com `EXPLAIN`.
- Hint ótimo num dataset pode regredir noutro: validar com volume real.
- Diferença `FORCE INDEX` × `USE INDEX`: `USE` é sugestão, `FORCE` é obrigatório (mas otimizador pode descartar mesmo assim em alguns paths).

---

## Comandos

```sql
EXPLAIN SELECT /*+ MAX_EXECUTION_TIME(3000) */ * FROM t;

-- desligar hints globalmente em emergência
SET GLOBAL optimizer_switch = 'hints=off';   -- (cuidado, raro)

-- recompor estatísticas
ANALYZE TABLE orders;
```

---

## Referências cruzadas

- [03-timeout-variables…](./03-timeout-variables-production-guide.md) — `max_execution_time` global vs hint.
- [10-window-functions…](./10-window-functions-row-number-lag-lead-running-totals.md) — relatórios típicos onde hints aparecem.
- [04-json-column-performance.md](./04-json-column-performance.md) — match exato de expressão indexada exige cuidado de hint.
