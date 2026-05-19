# MySQL 8.0 Window Functions: ROW_NUMBER, LAG, LEAD, and Running Totals

> **Fonte:** https://www.jusdb.com/blog/mysql-8-window-functions-row-number-lag-lead
> **Publicado:** 2025-10-22
> **Aplicação no core-api:** ADR-0020 permite window functions e CTEs recursivas. Casos imediatos: paginação determinística (`ROW_NUMBER`), evolução de valor do contrato com aditivos (`SUM OVER ORDER BY data_homologacao`), comparações ano-a-ano de séries (`LAG`).

---

## TL;DR

Window function processa agregação **sem colapsar linhas** — cada linha preserva identidade e ganha valor computado sobre conjunto relacionado pela cláusula `OVER (PARTITION BY … ORDER BY … ROWS BETWEEN … AND …)`. Substitui self-join e subselect correlacionado com plano muito melhor.

---

## Conceitos-chave

- **Aggregate** colapsa linhas. **Window** mantém todas.
- `OVER (…)` é obrigatório.
- `PARTITION BY col` — reset da janela por grupo (similar a `GROUP BY`, sem colapsar).
- `ORDER BY col` dentro do `OVER` — ordem lógica da janela; relevante para frame e funções ordinais.
- **Frame:** `ROWS`/`RANGE`/`GROUPS BETWEEN x PRECEDING AND y FOLLOWING`.
  - `ROWS` — N linhas físicas.
  - `RANGE` — intervalo de valores (ex.: `INTERVAL 6 DAY PRECEDING`).
  - `GROUPS` — N peer groups (mesmos valores de ORDER BY).
- Ordem de avaliação: `WHERE` → `GROUP BY` → window → `ORDER BY` final.

---

## Sintaxe geral

```sql
SELECT
  c1,
  funcao() OVER (
    [PARTITION BY g]
    [ORDER BY o [ASC|DESC]]
    [ROWS|RANGE|GROUPS BETWEEN start AND end]
  ) AS w_val
FROM t;
```

---

## Funções

### `ROW_NUMBER()`
Sequencial sem empates.
```sql
SELECT customer_id, region, total_spend,
       ROW_NUMBER() OVER (PARTITION BY region ORDER BY total_spend DESC) AS rn
FROM customer_summary;
```

### `RANK()` × `DENSE_RANK()`
`RANK` pula após empate (`1, 1, 3`); `DENSE_RANK` é contínuo (`1, 1, 2`).

### `LAG(col, offset, default)` / `LEAD(col, offset, default)`
```sql
SELECT month, revenue,
       LAG(revenue) OVER (ORDER BY month) AS prev,
       revenue - LAG(revenue) OVER (ORDER BY month) AS mom_diff
FROM monthly_revenue;
```

### `NTILE(n)`
Buckets ~iguais. Q1..Q4 = `NTILE(4)`.

### `PERCENT_RANK()` / `CUME_DIST()`
- `PERCENT_RANK() = (rank-1)/(n-1)` em [0,1].
- `CUME_DIST()` = proporção cumulativa em (0,1].

### `SUM/AVG/COUNT … OVER (…)`
```sql
SELECT order_date, daily_revenue,
       SUM(daily_revenue) OVER (ORDER BY order_date)            AS running_total,
       AVG(daily_revenue) OVER (ORDER BY order_date
         ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)              AS rolling_7d
FROM daily_sales;
```
Frame default sem cláusula `ROWS/RANGE`: `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`.

### `FIRST_VALUE` / `LAST_VALUE` / `NTH_VALUE`
**Cuidado com `LAST_VALUE`:** frame default só vai até `CURRENT ROW` → retorna o atual, não o último. Forçar:
```sql
LAST_VALUE(amount) OVER (
  PARTITION BY customer_id ORDER BY order_date
  ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
```

---

## Casos canônicos

### 1. Top-N por grupo
```sql
WITH ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY region ORDER BY total_spend DESC) rn
  FROM customers
)
SELECT * FROM ranked WHERE rn <= 3;
```

### 2. MoM (mês a mês)
```sql
SELECT month, revenue,
       LAG(revenue) OVER (ORDER BY month) prev,
       revenue - LAG(revenue) OVER (ORDER BY month) diff,
       ROUND(100 * (revenue - LAG(revenue) OVER (ORDER BY month))
                  / LAG(revenue) OVER (ORDER BY month), 2) pct
FROM monthly_revenue;
```

### 3. Próximo evento (`LEAD`)
```sql
SELECT customer_id, event_date, event_type,
       LEAD(event_date) OVER (PARTITION BY customer_id ORDER BY event_date) next_date
FROM events;
```

### 4. Running total
```sql
SELECT order_date, daily_revenue,
       SUM(daily_revenue) OVER (ORDER BY order_date) AS running_total
FROM daily_sales;
```

### 5. Moving average (7 dias)
```sql
SELECT order_date, daily_revenue,
       AVG(daily_revenue) OVER (
         ORDER BY order_date
         ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS ma7
FROM daily_sales;
```

### 6. Quartil dentro de departamento
```sql
SELECT department, employee_id, salary,
       NTILE(4) OVER (PARTITION BY department ORDER BY salary DESC) AS q
FROM employees;
```

### 7. Primeiro / último por grupo
```sql
SELECT customer_id, order_date, amount,
       FIRST_VALUE(amount) OVER w AS first_amt,
       LAST_VALUE(amount)  OVER w AS last_amt
FROM orders
WINDOW w AS (
  PARTITION BY customer_id ORDER BY order_date
  ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING);
```

---

## Performance

Índices que ajudam:
```sql
CREATE INDEX idx_region_spend ON customer_summary (region, total_spend DESC);
CREATE INDEX idx_order_date    ON daily_sales (order_date);
```
- Coluna do `PARTITION BY` à frente do índice → reduz I/O drasticamente.
- `ORDER BY` que casa com ordem do índice → sem `filesort`.
- Partição muito grande sem índice → sort externo / temp table.

Window quase sempre **vence self-join**:
```sql
-- ruim: subselect correlacionado
SELECT a.customer_id, a.spend,
       (SELECT b.spend FROM sales b
        WHERE b.customer_id=a.customer_id AND b.order_date<a.order_date
        ORDER BY b.order_date DESC LIMIT 1) AS prev
FROM sales a;

-- bom
SELECT customer_id, spend,
       LAG(spend) OVER (PARTITION BY customer_id ORDER BY order_date) AS prev
FROM sales;
```

---

## `WINDOW` clause

```sql
SELECT customer_id, order_date, amount,
       FIRST_VALUE(amount) OVER w AS first_amt,
       LAST_VALUE(amount)  OVER w AS last_amt,
       AVG(amount)         OVER w AS avg_amt
FROM orders
WINDOW w AS (
  PARTITION BY customer_id ORDER BY order_date
  ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING);
```

---

## Armadilhas

- **`LAST_VALUE` com frame default** retorna o atual. Forçar `UNBOUNDED FOLLOWING`.
- ORDER BY sobre coluna não indexada em partição enorme → sort externo.
- Misturar `GROUP BY` com window: window opera **após** o GROUP BY; usar agregado dentro do `OVER` (ex.: `SUM(rev) OVER (PARTITION BY region)`) é o caminho.
- `LAG/LEAD` com `NULL` → considere terceiro argumento default (`LAG(rev, 1, 0)`).
- Frame `RANGE` exige `ORDER BY` numérico/temporal de uma única coluna — restritivo.

---

## EXPLAIN

```sql
EXPLAIN FORMAT=JSON
SELECT customer_id, total_spend,
       ROW_NUMBER() OVER (PARTITION BY region ORDER BY total_spend DESC) rn
FROM customers WHERE region='North'\G
-- buscar nó "windowing"; conferir uso de índice em PARTITION BY
```

---

## Resumo

| Função | Retorno | Caso uso |
|---|---|---|
| `ROW_NUMBER` | sequencial sem empate | top-N |
| `RANK` | com gaps | ranking com empate |
| `DENSE_RANK` | sem gaps | ranking contínuo |
| `NTILE(n)` | bucket 1..n | quartil/decil |
| `PERCENT_RANK` | [0,1] | percentil |
| `CUME_DIST` | (0,1] | distribuição acumulada |
| `LAG / LEAD` | valor anterior/próximo | períodos |
| `FIRST/LAST/NTH_VALUE` | valor da janela | extremos |
| `SUM/AVG/COUNT OVER` | agregado com frame | running totals, MA |

---

## Referências cruzadas

- [09-optimizer-hints…](./09-optimizer-hints-index-join-order-max-execution-time.md) — hints úteis quando otimizador escolhe filesort.
- [07-buffer-pool…](./07-innodb-buffer-pool-pages-chunks-eviction.md) — relatórios grandes ocupam buffer.
- ADR-0020 — window functions permitidas; CTEs recursivas idem.
