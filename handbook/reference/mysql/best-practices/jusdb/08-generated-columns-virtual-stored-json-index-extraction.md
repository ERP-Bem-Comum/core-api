# MySQL 8.0 Generated Columns: Virtual, Stored, and JSON Index Extraction

> **Fonte:** https://www.jusdb.com/blog/mysql-8-generated-columns-virtual-stored-json
> **Publicado:** 2025-11-10
> **Aplicação no core-api:** ADR-0020 proíbe JSON e generated columns como atalho para flexibilidade — Money e Period continuam decompostos. Generated columns são ferramenta válida para **derivar** valores caros (ex.: índice `LOWER(email)` em CPF/contraparte futura), nunca para "ressuscitar" JSON.

---

## TL;DR

Coluna gerada é valor derivado de expressão determinística. `VIRTUAL` computa por leitura (zero storage, não indexável); `STORED` materializa no INSERT/UPDATE (storage + write cost; indexável). Use STORED quando precisa indexar; VIRTUAL para display.

---

## Conceitos-chave

- **Determinismo obrigatório:** `NOW()`, `UUID()`, `RAND()` **proibidos**.
- Não pode referenciar outra generated column.
- `VIRTUAL` (default) → não persiste; recalcula no SELECT.
- `STORED` → persiste; indexável; ALTER de expressão = full rewrite.
- `GENERATED ALWAYS AS (expr)` — `ALWAYS` é opcional, default.

---

## Sintaxe

### CREATE TABLE
```sql
CREATE TABLE orders (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  amount    DECIMAL(10,2),
  tax_rate  DECIMAL(5,4) DEFAULT 0.08,
  tax_amt   DECIMAL(10,2) GENERATED ALWAYS AS (amount * tax_rate) VIRTUAL,
  total     DECIMAL(10,2) GENERATED ALWAYS AS (amount * (1 + tax_rate)) STORED
);

CREATE INDEX idx_orders_total ON orders (total);
```

### ALTER TABLE
```sql
ALTER TABLE orders MODIFY COLUMN total
  DECIMAL(10,2) GENERATED ALWAYS AS (amount * (1.10 + tax_rate)) STORED;
-- ⚠️ STORED: full table rewrite
```

---

## VIRTUAL × STORED

| Critério | VIRTUAL | STORED |
|---|---|---|
| Storage | 0 | tamanho do tipo |
| Custo de write | 0 | alto |
| Custo de read | calcula sempre | 0 |
| `CREATE INDEX` | ❌ (usar functional index) | ✅ |
| Online DDL | rápido | full rewrite |
| Replicação | seguro (recalcula) | `binlog_format=ROW`/`MIXED` |
| Footprint memória | baixo | alto |
| Bom para | exibição / cálculo simples | filtro / ordenação |

---

## Casos de uso

### 1. Extrair valor de JSON e indexar
```sql
CREATE TABLE products (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  metadata JSON,
  sku      VARCHAR(50) GENERATED ALWAYS AS (metadata->>'$.sku') STORED,
  category VARCHAR(50) GENERATED ALWAYS AS (metadata->>'$.category') STORED
);
CREATE INDEX idx_sku      ON products (sku);
CREATE INDEX idx_category ON products (category);
```

### 2. Indexar partes de DATE/TIMESTAMP
```sql
CREATE TABLE events (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_time   DATETIME NOT NULL,
  event_year   SMALLINT GENERATED ALWAYS AS (YEAR(event_time))  STORED,
  event_month  TINYINT  GENERATED ALWAYS AS (MONTH(event_time)) STORED
);
CREATE INDEX idx_year_month ON events (event_year, event_month);
SELECT COUNT(*) FROM events WHERE event_year=2025 AND event_month=10;
```

### 3. Case-insensitive
```sql
ALTER TABLE users
  ADD COLUMN email_lower VARCHAR(255)
    GENERATED ALWAYS AS (LOWER(email)) STORED,
  ADD INDEX idx_email_lower (email_lower);
SELECT * FROM users WHERE email_lower='admin@example.com';
```

### 4. Expressão complexa reutilizada
```sql
CREATE TABLE invoices (
  id              INT PRIMARY KEY,
  subtotal        DECIMAL(10,2),
  discount_pct    DECIMAL(5,2),
  tax_rate        DECIMAL(5,4),
  taxable_amount  DECIMAL(10,2) GENERATED ALWAYS AS
    (subtotal * (1 - discount_pct / 100)) STORED,
  tax_due         DECIMAL(10,2) GENERATED ALWAYS AS
    (taxable_amount * tax_rate) STORED
);
-- ❌ Atenção: 8.0 não permite uma generated referenciar outra; em 8.4 idem.
-- Esse exemplo é PSEUDOCÓDIGO; replicar a fórmula completa em cada coluna.
```

### 5. CHECK sobre coluna gerada
```sql
CREATE TABLE payments (
  id         INT PRIMARY KEY,
  amount     DECIMAL(10,2),
  currency   VARCHAR(3),
  amount_usd DECIMAL(10,2) GENERATED ALWAYS AS (
    CASE currency
      WHEN 'USD' THEN amount
      WHEN 'EUR' THEN amount * 1.08
      WHEN 'GBP' THEN amount * 1.25
    END
  ) STORED,
  CONSTRAINT chk_amount_positive CHECK (amount_usd > 0)
);
```

### 6. Conversão de tipo
```sql
ALTER TABLE logs
  ADD COLUMN value_int INT GENERATED ALWAYS AS (CAST(value_str AS UNSIGNED)) STORED;
```

---

## Generated column × functional index

```sql
-- functional index (8.0+):
CREATE INDEX idx_email_lower ON users ((LOWER(email)));

-- generated + index:
ALTER TABLE users
  ADD COLUMN email_lower VARCHAR(255) GENERATED ALWAYS AS (LOWER(email)) STORED,
  ADD INDEX idx_email_lower (email_lower);
```

Preferir **generated column** quando:
- A expressão é usada em **várias queries**.
- Schema explícito ajuda auditoria e leitura.
- Pretende usar em `GROUP BY` / `ORDER BY` sem repetir a expressão.

Preferir **functional index** quando:
- Uma única query precisa.
- Quer evitar storage extra (STORED) ou recomputo (VIRTUAL).

---

## Armadilhas

- **ALTER de expressão STORED** → full table rewrite.
- **Determinismo:** `NOW()`, `RAND()`, `UUID()`, user-defined functions não-determinísticas → erro.
- **STORED recalcula a cada UPDATE** mesmo que a coluna fonte não mude.
- **Charset/Collation** podem precisar ser declarados na coluna derivada (texto).
- **`NOT NULL` em coluna gerada** exige fonte garantidamente não-nula.
- **`ALGORITHM=INSTANT` não funciona** ao alterar generated columns.

---

## Comandos / DDL

```sql
SELECT COLUMN_NAME, GENERATION_EXPRESSION, EXTRA
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders'
  AND EXTRA LIKE '%GENERATED%';

SHOW INDEX FROM orders WHERE Column_name='total';

EXPLAIN SELECT * FROM orders WHERE total > 1000\G

ALTER TABLE orders DROP COLUMN total;
```

---

## Referências cruzadas

- [04-json-column-performance.md](./04-json-column-performance.md) — JSON path indexing.
- [09-optimizer-hints…](./09-optimizer-hints-index-join-order-max-execution-time.md) — hints podem forçar índice em generated column.
- ADR-0020 — features permitidas/proibidas.
