# MySQL Foreign Keys: Evolution from 5.7 to 8.4

> **Fonte:** https://www.jusdb.com/blog/mysql-foreign-keys-evolution-5-7-to-8-4
> **Publicado:** 2025-11-20
> **Aplicação no core-api:** Drizzle declara FK nos schemas; este artigo rege como nomear índice de FK, escolher `ON DELETE`/`ON UPDATE` e estratégia de migration. Como o domínio gera UUIDs (`ContractId`, `AmendmentId`), validação de tipo/collation no upgrade 8.4 é trivial — mas vale o checklist.

---

## TL;DR

Verificação de FK roda em **cada** INSERT/UPDATE/DELETE — custo real em alta throughput. 5.7 não tinha DDL atômico, 8.0 trouxe data dictionary transacional, **8.4 rejeita mismatch de tipo/collation** que versões antigas aceitavam em silêncio. `ON DELETE CASCADE` em prod é antipattern por amplificação ilimitada de locks; prefira `RESTRICT` + lógica no domínio.

---

## Linha do tempo

### MySQL 5.7
- Dicionário dividido entre `.frm` e InnoDB SYS tables.
- DDL **não-atômico** — crash a meio deixa schema parcial.
- `information_schema.REFERENTIAL_CONSTRAINTS` derivado do parser `.frm` — pode divergir.
- FK checks serializados.
- Índice em coluna FK criado **implicitamente** e com nome anônimo.

### MySQL 8.0
- DDL **atômico** via data dictionary transacional InnoDB.
- `information_schema` é authoritative.
- `ALTER TABLE … ADD FOREIGN KEY … ALGORITHM=INPLACE, LOCK=NONE` evita cópia de tabela.
- **Instant DDL não cobre FK** — mínimo INPLACE.

### MySQL 8.4 LTS
- Validação **estrita** de tipo/collation entre coluna pai e filha — pode rejeitar `ALTER`.
- Drop silencioso de índice ao remover FK passa a ser **deprecated** (futuro: explícito).
- `SET DEFAULT` aceito no parser, rejeitado em runtime (`ER_FK_CANNOT_USE_DEFAULT`).

---

## Sintaxe canônica

### CREATE TABLE
```sql
CREATE TABLE orders (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NOT NULL,
  status      VARCHAR(20) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_customer_id (customer_id),         -- explícito, sempre
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id) REFERENCES customers (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB;
```

Regra: **sempre** declarar índice explícito + nomeado na coluna FK. Anônimos invisíveis a auditoria.

### ALTER TABLE
```sql
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_product
  FOREIGN KEY (product_id) REFERENCES products (id)
  ON DELETE RESTRICT,
  ALGORITHM=INPLACE, LOCK=NONE;

ALTER TABLE orders
  DROP FOREIGN KEY fk_orders_product,
  ALGORITHM=INPLACE, LOCK=NONE;
```

---

## ON DELETE / ON UPDATE

| Ação | Comportamento | Custo | Quando usar |
|---|---|---|---|
| `RESTRICT` | bloqueia se há filho | 1 index read | **padrão** |
| `NO ACTION` | equivalente a RESTRICT em InnoDB | 1 index read | compatibilidade SQL standard |
| `CASCADE` | propaga DEL/UPD a todos os filhos | **ilimitado** | só com volume controlado, raro em prod |
| `SET NULL` | escreve NULL no filho (precisa ser nullable) | 1 UPDATE por filho | relação opcional |
| `SET DEFAULT` | parser aceita, InnoDB rejeita | ❌ não funciona | **não usar** |

`CASCADE` em alta concorrência: lock chains → deadlock detector → rollback → retry no app. Evitar.

---

## Comparação por versão

| Capacidade | 5.7 | 8.0 | 8.4 |
|---|---|---|---|
| DDL atômico para FK | ❌ | ✅ | ✅ |
| `information_schema` authoritative | ⚠️ parcial | ✅ | ✅ |
| Instant DDL para FK | ❌ | ❌ (INPLACE) | ❌ (INPLACE) |
| FK em tabela particionada | ❌ | ❌ | ❌ |
| Validação tipo/collation | lenient (silenciosa) | moderada | **estrita** |
| `DROP FK` derruba índice | ✅ silencioso | ✅ silencioso | ⚠️ deprecated |

---

## Best practices

1. **Índice explícito e nomeado** — `INDEX idx_xxx_yyy(yyy)`.
2. **`RESTRICT` como default**; `CASCADE` só com volume conhecido.
3. **Auditar tipo/collation pré-upgrade 8.4**:
   ```sql
   SELECT kcu.TABLE_NAME, kcu.COLUMN_NAME,
          c.COLUMN_TYPE child_type, p.COLUMN_TYPE parent_type
   FROM information_schema.KEY_COLUMN_USAGE kcu
   JOIN information_schema.COLUMNS c
     ON c.TABLE_SCHEMA=kcu.TABLE_SCHEMA AND c.TABLE_NAME=kcu.TABLE_NAME
        AND c.COLUMN_NAME=kcu.COLUMN_NAME
   JOIN information_schema.COLUMNS p
     ON p.TABLE_SCHEMA=kcu.TABLE_SCHEMA AND p.TABLE_NAME=kcu.REFERENCED_TABLE_NAME
        AND p.COLUMN_NAME=kcu.REFERENCED_COLUMN_NAME
   WHERE kcu.REFERENCED_TABLE_NAME IS NOT NULL
     AND c.COLUMN_TYPE <> p.COLUMN_TYPE;
   ```
4. **`FOREIGN_KEY_CHECKS=0` só para bulk load**, e sempre seguido de auditoria de orphans.
5. **Replicação:** propagar `SET SESSION foreign_key_checks=0` ao primário; réplica reaplica com checks ligados — orphan vai quebrar.
6. **Sem FK em tabelas particionadas** — não suportado em nenhuma versão.
7. **Sem FK em schemas shardados** ou microservices — validar no app + reconciliação.
8. **No core-api:** evitar FK cross-database (`core.ctr_* ↔ core.fin_*`) — ADR-0014 manda comunicação por eventos via outbox.

---

## Performance

- INSERT filho: 1 lookup de índice no pai. 50 K inserts/s × 2 FKs = 100 K reads/s no buffer pool.
- DELETE pai com `CASCADE`: write amplification ilimitada + risco de deadlock.
- UPDATE de coluna referenciada com `ON UPDATE CASCADE`: locks exclusivos sequenciais em todos os filhos.
- Índice implícito: sobrevive ao `DROP FOREIGN KEY` e precisa ser dropado à parte:
  ```sql
  ALTER TABLE child DROP FOREIGN KEY child_ibfk_1;
  ALTER TABLE child DROP INDEX FK362D7EFFC123456;
  ```

---

## Armadilhas

- **FK silenciosamente desabilitada em 5.0/5.1 legado** — verificar `REFERENTIAL_CONSTRAINTS` para detectar.
- **`FOREIGN_KEY_CHECKS=0` não valida retroativamente** — orphans persistem.
- **Mismatch charset/collation** — 5.7 aceita, 8.4 rejeita.
- **`ON DELETE SET NULL` em coluna `NOT NULL`** — rejeitado (`ER_FK_COLUMN_CANNOT_BE_NULL`).
- **FK em generated column** — comportamento varia entre 5.7 e 8.0; evitar.
- **Circular reference** — `DELETE` em qualquer das duas exige `FOREIGN_KEY_CHECKS=0` temporário.

---

## Migrations seguras

### Adicionar FK a tabela existente
```sql
-- 1) Achar orphans
SELECT child.id FROM child
LEFT JOIN parent p ON p.id = child.parent_id
WHERE p.id IS NULL AND child.parent_id IS NOT NULL;

-- 2) Reparar / deletar / apontar para parent válido

-- 3) Adicionar com INPLACE
ALTER TABLE child
  ADD CONSTRAINT fk_child_parent
  FOREIGN KEY (parent_id) REFERENCES parent(id)
  ON DELETE RESTRICT,
  ALGORITHM=INPLACE, LOCK=NONE;
```

### Drop coluna que tem FK
```sql
ALTER TABLE child DROP FOREIGN KEY fk_child_parent, ALGORITHM=INPLACE, LOCK=NONE;
ALTER TABLE child DROP INDEX idx_parent_id;
ALTER TABLE child DROP COLUMN parent_id;
```

### Bulk load
```sql
SET SESSION foreign_key_checks = 0;
LOAD DATA INFILE '/data.csv' INTO TABLE orders ...;
SET SESSION foreign_key_checks = 1;

-- auditar orphans antes de seguir
SELECT COUNT(*) FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
WHERE c.id IS NULL;
```

---

## Comandos essenciais

### Listar todas as FKs
```sql
SELECT rc.CONSTRAINT_NAME, rc.TABLE_NAME child, rc.REFERENCED_TABLE_NAME parent,
       rc.UPDATE_RULE, rc.DELETE_RULE,
       kcu.COLUMN_NAME child_col, kcu.REFERENCED_COLUMN_NAME parent_col
FROM information_schema.REFERENTIAL_CONSTRAINTS rc
JOIN information_schema.KEY_COLUMN_USAGE kcu
  ON kcu.CONSTRAINT_NAME=rc.CONSTRAINT_NAME
 AND kcu.CONSTRAINT_SCHEMA=rc.CONSTRAINT_SCHEMA
WHERE rc.CONSTRAINT_SCHEMA = DATABASE();
```

### 8.0+ data dictionary (mais detalhe)
```sql
SELECT f.NAME, f.FOR_NAME child, f.REF_NAME parent,
       f.DELETE_RULE, f.UPDATE_RULE,
       fe.FOR_COL_NAME, fe.REF_COL_NAME
FROM mysql.foreign_keys f
JOIN mysql.foreign_key_column_usage fe ON fe.FK_ID = f.ID;
```

### Detectar orphans
```sql
SELECT COUNT(*) FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
WHERE c.id IS NULL AND o.customer_id IS NOT NULL;
```

---

## Quando NÃO usar FK

- OLTP > 10–20 K writes/s — overhead vira dominante.
- Schema shardado — pai e filho podem estar em hosts diferentes.
- Microservices com bancos separados.
- Tabelas particionadas — não suportado.

Em todos esses, integridade vira responsabilidade do app + reconciliação periódica.

---

## Referências cruzadas

- [05-deadlock-analysis…](./05-deadlock-analysis-innodb-status.md) — `CASCADE` e contenção.
- [07-buffer-pool…](./07-innodb-buffer-pool-pages-chunks-eviction.md) — leituras de FK aquecem buffer.
- ADR-0014 — Isolamento por database (sem FK cross-módulo).
