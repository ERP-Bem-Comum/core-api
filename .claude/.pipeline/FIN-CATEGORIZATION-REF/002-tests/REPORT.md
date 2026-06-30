# W0 — Testes RED · FIN-CATEGORIZATION-REF (US1 Categoria)

**Wave**: W0 · **Agente**: tdd-strategist · **Resultado**: **RED** (esperado) · **Data**: 2026-06-20

## Comando

```bash
node --test --experimental-strip-types --enable-source-maps --no-warnings \
  tests/modules/financial/domain/category/category.test.ts \
  tests/modules/financial/adapters/persistence/category-read.in-memory.test.ts \
  tests/modules/financial/adapters/http/categories.http.test.ts
```

## Resultado

```
ℹ tests 4
ℹ suites 1
ℹ pass 0
ℹ fail 4
```

Todos vermelhos **por inexistência da API** (fail-first correto — nenhum falso-verde):

| Teste (arquivo) | CA / FR | Falha RED |
| --- | --- | --- |
| `domain/category/category.test.ts` (T006) | CA1 + group inválido + name vazio | `Cannot find module .../domain/category/category.ts` |
| `adapters/persistence/category-read.in-memory.test.ts` (T007) | FR-004/005/006/007 | `Cannot find module .../repos/category-read.in-memory.ts` |
| `adapters/http/categories.http.test.ts` (T008) | borda 200/403, agrupamento | `200 !== 404` e `403 !== 404` (rota `GET /categories` ausente) |

## Contrato exercido pelos testes (alvo do W1 GREEN)

- **Domínio** (`domain/category/`, padrão module-as-namespace, espelha `cedente-account-id.ts` + `entry-type.ts`):
  - `CategoryId.generate()` / `CategoryId.rehydrate(raw) → Result`.
  - `Category.create({ id, name, group, active? }) → Result<Category, 'category-name-empty' | 'category-group-invalid'>`.
  - `group` validado contra union `'despesa' | 'receita' | 'ajuste'`; `active` default `true`.
- **Port** `CategoryReadPort.list() → Promise<Result<readonly Category[], CategoryReadError>>`:
  - in-memory: `createInMemoryCategoryReadStore(categories)` → só `active`, ordenado por `(group, name)`, `[]` quando vazio.
- **Borda HTTP**: `GET /api/v2/financial/categories` → 200 `[{id,name,group}]` atrás de `reference:read` (slug novo T005); sem a permissão → 403. Seed in-memory popula categorias agrupadas.

## Notas para o W1

- Slug `reference:read` ainda **não existe** no catálogo `FINANCIAL_PERMISSION` — adicionar `referenceRead: 'reference:read'` (+ seed RBAC do auth).
- `buildFinancialHttpDeps({ driver: 'memory' })` precisa expor `listCategories` e semear o in-memory (UUIDs fixos — SC-002).
- Schema `fin_categories` + migration `0012` (próxima livre; última é `0011_smooth_zodiak.sql`) + seed idempotente.
- O cast `row.group → CategoryGroup` é seguro pós-CHECK (padrão #120/#159).
