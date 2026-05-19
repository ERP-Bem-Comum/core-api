# MySQL JSON Column Performance: Indexing, Querying, and Schema Design Trade-offs

> **Fonte:** https://www.jusdb.com/blog/mysql-json-column-performance-indexing-schema-tradeoffs
> **Publicado:** 2025-12-03
> **Aplicação no core-api:** **ADR-0020 PROÍBE colunas JSON nativas.** Este artigo serve como justificativa empírica do veto e como referência caso futuro ADR queira reverter — qualquer PR que tente reintroduzir JSON precisa demonstrar conformidade com o que está aqui.

---

## TL;DR

Coluna JSON sem índice = full table scan (4.200 ms em 10 M linhas). Solução: **functional index** (8.0+) ou **generated column + index** (5.7.8+). Ainda assim, **colunas escalares dedicadas batem qualquer JSON indexado** (0,75 ms vs 1,2 ms). Use JSON só para estrutura genuinamente variável, append-only e raramente consultada.

---

## Conceitos-chave

- **`JSON_EXTRACT(col, path)` / `col->>'$.path'`** — acesso por JSONPath; sem índice nativo.
- **Functional index (8.0.13+):** `ADD INDEX … ((CAST(JSON_EXTRACT(col, '$.x') AS UNSIGNED)))`.
- **Generated column VIRTUAL (5.7.8+):** coluna calculada, indexável, sem armazenamento físico (no STORED há).
- **Multi-valued index (8.0.17+):** indexa cada elemento de array (`AS CHAR(N) ARRAY`).
- **`JSON_TABLE`:** materializa array como linhas — útil para agregação, lento para lookup.
- **`JSON_SET` reescreve o documento inteiro** — caro para updates frequentes.

---

## Best practices

### 1. Tabela base
```sql
CREATE TABLE events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  payload JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
Sem mais nada, qualquer filtro por JSONPath é `type=ALL`.

### 2. Functional index (8.0+)
```sql
ALTER TABLE events
  ADD INDEX idx_user_id ((CAST(JSON_EXTRACT(payload, '$.user_id') AS UNSIGNED)));

SELECT * FROM events
WHERE CAST(JSON_EXTRACT(payload, '$.user_id') AS UNSIGNED) = 42;
-- EXPLAIN: type=range, ~150 rows, 1.2ms
```
A **query precisa repetir literalmente** a expressão indexada. `payload->>'$.user_id'` pode NÃO bater com `JSON_EXTRACT(...)`.

### 3. Generated column + index (5.7.8+)
```sql
ALTER TABLE events
  ADD COLUMN user_id BIGINT GENERATED ALWAYS AS
    (CAST(JSON_EXTRACT(payload, '$.user_id') AS UNSIGNED)) VIRTUAL,
  ADD INDEX idx_user_id (user_id);

SELECT * FROM events WHERE user_id = 42;  -- 0.8ms
```
Mais legível. Suporta 5.7.

### 4. `JSON_TABLE` para flatten de arrays
```sql
SELECT e.id, jt.tag
FROM events e,
JSON_TABLE(e.payload, '$.tags[*]' COLUMNS (tag VARCHAR(100) PATH '$')) jt
WHERE jt.tag = 'critical';
```

### 5. Multi-valued index para arrays (8.0.17+)
```sql
ALTER TABLE events
  ADD INDEX idx_tags ((CAST(JSON_EXTRACT(payload, '$.tags[*]') AS CHAR(100) ARRAY)));

SELECT * FROM events
WHERE JSON_CONTAINS(payload, JSON_ARRAY('critical'), '$.tags');
```
Multi-valued **só funciona com `JSON_CONTAINS` / `MEMBER OF` / `JSON_OVERLAPS`**, não com `JSON_EXTRACT` direto.

### 6. Migração JSON → colunas escalares
1. `ALTER TABLE … ADD COLUMN user_id BIGINT, ADD COLUMN event_type VARCHAR(50);`
2. Backfill em lotes (`UPDATE … WHERE user_id IS NULL LIMIT 10000` em loop).
3. `ADD INDEX …` nas novas colunas.
4. Atualizar app; opcionalmente `DROP COLUMN payload`.

### 7. Não usar JSON para campos voláteis
```sql
-- ruim: reescreve o blob inteiro a cada update
UPDATE events SET payload = JSON_SET(payload, '$.processed', true) WHERE id = 1;

-- bom: coluna escalar dedicada
ALTER TABLE events ADD COLUMN processed BOOLEAN DEFAULT FALSE;
UPDATE events SET processed = true WHERE id = 1;
```

---

## Quando JSON ajuda × quando atrapalha

| Cenário | JSON? | Razão |
|---|---|---|
| Estrutura genuinamente variável (chaves diferentes por linha) | ✅ | evita N colunas nullable |
| Campo consultado/filtrado com frequência | ❌ | escalar é mais rápido e simples |
| Configuração / settings estáticos | ✅ | leitura rara, sem necessidade de index |
| Payload de API armazenado as-is (auditoria) | ✅ | append-only |
| Campos em JOIN | ❌ | FK exige escalar |
| Logs de auditoria com metadata flexível | ✅ | sem queries por path |
| Campo atualizado frequentemente | ❌ | `JSON_SET` reescreve doc |
| Array p/ relatório (GROUP BY, agregação) | ❌ | `JSON_TABLE` é caro; desnormalizar |

---

## Generated column + functional index passo a passo (EXPLAIN)

10 M linhas; filtro por `$.user_id`.

```sql
-- sem índice
EXPLAIN SELECT * FROM events WHERE JSON_EXTRACT(payload, '$.user_id') = '42'\G
-- type: ALL, rows: 10M, 4.200ms

-- functional
ALTER TABLE events
  ADD INDEX idx_uid_func ((CAST(JSON_EXTRACT(payload, '$.user_id') AS UNSIGNED)));
EXPLAIN SELECT * FROM events
WHERE CAST(JSON_EXTRACT(payload, '$.user_id') AS UNSIGNED) = 42\G
-- type: range, rows: 150, 1.2ms

-- generated column
ALTER TABLE events
  ADD COLUMN user_id BIGINT
    GENERATED ALWAYS AS (CAST(JSON_EXTRACT(payload, '$.user_id') AS UNSIGNED)) VIRTUAL,
  ADD INDEX idx_uid (user_id);
EXPLAIN SELECT * FROM events WHERE user_id = 42\G
-- type: range, rows: 150, 0.8ms
```

Escalar puro (sem JSON): ~0,75 ms. Generated VIRTUAL é ~6% mais lento por causa do CAST em runtime; STORED é ainda mais barato no SELECT mas paga no INSERT/UPDATE.

---

## Multi-valued index — sintaxe e armadilhas

```sql
ALTER TABLE events
  ADD INDEX idx_tags ((CAST(JSON_EXTRACT(payload, '$.tags[*]') AS CHAR(100) ARRAY)));
```

Cuidados:
1. 8.0.17+ apenas.
2. Cada elemento é uma entrada de índice — arrays grandes inflam writes.
3. Só funciona com `JSON_CONTAINS` / `MEMBER OF` / `JSON_OVERLAPS`.
4. Optimizer pode preferir full scan se o array típico for muito grande; validar com `EXPLAIN`.

---

## Armadilhas

- **Operador `->>` vs `JSON_EXTRACT`** não casam com o índice se a expressão indexada usou um e a query usou o outro. Padronizar.
- **`ORDER BY JSON_EXTRACT(…)`** → `Using filesort`. Solução: generated column indexada.
- **`JSON_CONTAINS` sem multi-valued index** → full scan.
- **Caminho parcial** (`$`) ou `LIKE` sobre JSON → full scan.
- **JSON em coluna usada em FK** — proibido pelo modelo relacional; usar coluna escalar.

---

## Comandos / DDL essenciais

```sql
-- tamanho médio
SELECT ROUND(AVG(OCTET_LENGTH(payload))/1024, 2) AS avg_json_kb FROM events;

-- listar functional / multi-valued
SELECT INDEX_NAME, EXPRESSION
FROM information_schema.STATISTICS
WHERE TABLE_NAME='events' AND EXPRESSION IS NOT NULL;

-- backfill em lote
UPDATE events
SET user_id = CAST(JSON_EXTRACT(payload, '$.user_id') AS UNSIGNED)
WHERE user_id IS NULL LIMIT 10000;

-- validar paridade
SELECT COUNT(*) FROM events
WHERE CAST(JSON_EXTRACT(payload, '$.user_id') AS UNSIGNED) <> user_id;
```

---

## Comparação de performance (10 M linhas)

| Abordagem | Tempo | EXPLAIN type | Rows |
|---|---|---|---|
| JSON sem índice | 4.200 ms | ALL | 10 M |
| Functional index | 1,2 ms | range | ~150 |
| Generated column VIRTUAL | 0,8 ms | range | ~150 |
| Coluna escalar dedicada | 0,75 ms | range | ~150 |

---

## Por que isso reforça o ADR-0020

- Money é decomposto em `amount_cents BIGINT + currency CHAR(3)`, não JSON.
- Period é decomposto em `start_date + end_date` + (opcional) `inclusive_*`.
- `homologatedAmendmentIds` vira **tabela de junção**, não array JSON.
- Resultado: queries simples, planos previsíveis, FK relacional, índices triviais.

## Referências cruzadas

- [08-generated-columns…](./08-generated-columns-virtual-stored-json-index-extraction.md)
- [09-optimizer-hints…](./09-optimizer-hints-index-join-order-max-execution-time.md)
- ADR-0020 — features SQL permitidas/proibidas
