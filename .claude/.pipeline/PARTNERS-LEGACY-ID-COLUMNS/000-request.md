# PARTNERS-LEGACY-ID-COLUMNS — Coluna `legacy_id` de correlação nas tabelas `par_*`

> **Size:** S · **ADR:** ADR-0020 (MySQL único), ADR-0014 (isolamento `par_*`), ADR-0031 §"legacy_id". · **Cadeia:** 1º pré-requisito (P2) de [`PARTNERS-ETL-BOOTSTRAP`](../PARTNERS-ETL-BOOTSTRAP/000-request.md).

## Contexto

A ETL one-shot do legado precisa de uma coluna de correlação por tabela para idempotência: re-rodar não duplica (SELECT-by-`legacy_id` antes de inserir — ADR-0020 proíbe UPSERT nativo). As PKs do legado são `int AUTO_INCREMENT`; o core-api usa UUID. `legacy_id` guarda o `int` de origem.

Decisão técnica consolidada na consulta aos especialistas (ver `PARTNERS-ETL-BOOTSTRAP/000-request.md` §Decisões):

- Tipo **`int('legacy_id')` nullable** (NULL = registro nativo do core-api; não-NULL = registro migrado).
- **`uniqueIndex` por tabela**, nome `par_<abrev>_legacy_id_idx` (convenção ADR-0020). UNIQUE com NULL aceita múltiplos NULL (InnoDB) — registros nativos coexistem.

## Escopo

1. Adicionar `legacyId: int('legacy_id')` + `uniqueIndex('par_<x>_legacy_id_idx').on(t.legacyId)` nas 4 tabelas em `src/modules/partners/adapters/persistence/schemas/mysql.ts`:
   - `par_financiers` → `par_financiers_legacy_id_idx`
   - `par_suppliers` → `par_suppliers_legacy_id_idx`
   - `par_collaborators` → `par_collaborators_legacy_id_idx`
   - `par_user_profiles` → `par_user_profiles_legacy_id_idx`
2. Gerar migration via `pnpm db:generate:partners`; verificar o SQL (`ALTER TABLE ... ADD COLUMN legacy_id int NULL` + `CREATE UNIQUE INDEX`). `int` não exige edição manual de CHARSET/COLLATE.
3. Atualizar os mappers row↔domínio das 4 tabelas se necessário (campo nullable; `$inferInsert`/`$inferSelect`).

## Fora de escopo

- A ETL em si (ticket `PARTNERS-ETL-BOOTSTRAP`). Aqui só a coluna + índice + migration.
- Qualquer escrita de dados / leitura do dump.

## Critérios de aceite

- [ ] As 4 tabelas `par_*` expõem `legacyId` (nullable) no schema Drizzle.
- [ ] `uniqueIndex` por tabela com nome na convenção `par_<abrev>_legacy_id_idx`.
- [ ] Migration gerada e revisada (coluna nullable; UNIQUE aceita múltiplos NULL).
- [ ] Mappers existentes continuam verdes (campo opcional não quebra reidratação).
- [ ] W3 verde: typecheck + lint + format + testes.

## Notas de disciplina

- ADR-0020: sem `AUTO_INCREMENT` em PK de domínio (não é o caso — `legacy_id` é coluna de correlação, não PK). `int` é permitido.
- A migration roda sob o journal `__drizzle_migrations_partners` (já configurado no driver do módulo).
