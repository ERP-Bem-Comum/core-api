# W0 — RED — PARTNERS-LEGACY-ID-COLUMNS

**Skill:** tdd-strategist · **Outcome:** RED

## Arquivo criado

- `tests/modules/partners/adapters/persistence/legacy-id-columns.test.ts`

## Testes (3 por tabela × 4 tabelas `par_*` = 12)

Para `par_financiers`, `par_suppliers`, `par_collaborators`, `par_user_profiles`:

1. **expõe a coluna `legacyId`** — `getTableColumns(table)` contém `legacyId`.
2. **mapeia para a coluna SQL `legacy_id`** — `col.name === 'legacy_id'`.
3. **é nullable** — `col.notNull === false` (NULL = registro nativo do core-api).

## Resultado (RED esperado)

```
ℹ tests 12
ℹ pass 0
ℹ fail 12
```

Todos falham por inexistência da coluna `legacyId` no schema. RED legítimo — a API alvo (coluna + mapeamento) ainda não existe.
