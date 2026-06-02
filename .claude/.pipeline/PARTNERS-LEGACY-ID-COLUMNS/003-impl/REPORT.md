# W1 — GREEN — PARTNERS-LEGACY-ID-COLUMNS

**Skill:** drizzle-schema-author · **Outcome:** GREEN

## Arquivos editados

1. **`src/modules/partners/adapters/persistence/schemas/mysql.ts`**
   - `+ import { int }` de `drizzle-orm/mysql-core`.
   - `+ legacyId: int('legacy_id')` (nullable) nas 4 tabelas `par_*`.
   - `+ uniqueIndex('par_<x>_legacy_id_idx').on(t.legacyId)` nas 4 tabelas.

2. **`src/modules/partners/adapters/persistence/migrations/mysql/0004_secret_wendell_vaughn.sql`** (gerado por `db:generate:partners`)
   - `ALTER TABLE ... ADD legacy_id int` (nullable) × 4.
   - `ALTER TABLE ... ADD CONSTRAINT par_<x>_legacy_id_idx UNIQUE(legacy_id)` × 4.

## Decisões de design (consolidadas na consulta aos especialistas)

- **`int` nullable** (não `bigint`/`varchar`): PK legada é `int AUTO_INCREMENT` (≤ 2³¹-1, máximo legado ~273). NULL = registro nativo do core-api; não-NULL = migrado.
- **UNIQUE por tabela** com NULL: InnoDB aceita múltiplos NULL num índice UNIQUE → registros nativos coexistem; idempotência da ETL garantida para os migrados.
- **`int` não exige edição manual de CHARSET/COLLATE** (não é coluna de texto) — SQL gerado usado como está.

## Resultado

```
# suíte do ticket (legacy-id-columns.test.ts)
ℹ tests 12 · pass 12 · fail 0

# regressão — toda a persistence do partners
ℹ tests 238 · pass 238 · fail 0
```

GREEN. Mappers existentes intactos (coluna nullable não quebra reidratação). Sem regressão.
