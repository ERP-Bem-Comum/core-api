# W1 — Implementação GREEN · FIN-CATEGORIZATION-REF (US1 Categoria)

**Wave**: W1 · **Resultado**: **GREEN** · **Data**: 2026-06-20

## Resultado dos testes

```
# 3 testes do US1 (T006-T008)
ℹ tests 9 · pass 9 · fail 0

# suíte HTTP financial completa (regressão?)
ℹ tests 121 · pass 121 · fail 0

# typecheck
tsc --noEmit → 0 erros
```

## Arquivos criados

| Camada | Arquivo |
| --- | --- |
| Domínio | `domain/category/category-id.ts` (branded id, espelha `cedente-account-id.ts`) |
| Domínio | `domain/category/category-group.ts` (VO union `despesa\|receita\|ajuste`, espelha `entry-type.ts`) |
| Domínio | `domain/category/types.ts` (`Category`, `CreateInput`, `CategoryError`) |
| Domínio | `domain/category/category.ts` (`create()` smart constructor → `Result`) |
| Port | `application/ports/category-read.ts` (`CategoryReadPort.list()`) |
| Adapter | `adapters/persistence/repos/category-read.in-memory.ts` (filtra `active`, ordena `(group,name)`) |
| Adapter | `adapters/persistence/repos/category-read.drizzle.ts` (SELECT lean + mapper via smart constructor) |
| Seed | `adapters/persistence/seed/reference-categories.ts` (11 itens, UUIDs fixos — SC-002) |
| Migration | `adapters/persistence/migrations/mysql/0012_previous_beyonder.sql` (CREATE TABLE + CHECK + 2 índices + seed `ON DUPLICATE KEY UPDATE`) |

## Arquivos modificados

| Arquivo | Mudança |
| --- | --- |
| `adapters/persistence/schemas/mysql.ts` | + `finCategories` (varchar(12)+CHECK `group`) + `$inferSelect/Insert` |
| `public-api/permissions.ts` | + `referenceRead: 'reference:read'` (slug novo T005) |
| `adapters/http/schemas.ts` | + `categoryResponseSchema` / `categoryListResponseSchema` (Zod, `group` = `z.enum`) |
| `adapters/http/dto.ts` | + `categoriesToDto` (DTO lean `{id,name,group}` — nunca o row cru) |
| `adapters/http/error-mapping.ts` | + `category-read-unavailable` → 503 |
| `adapters/http/composition.ts` | + `categoryReader` em `Pools` (memory: seed in-memory; mysql: drizzle) + `listCategories` em `FinancialHttpDeps` |
| `adapters/http/plugin.ts` | + rota `GET /financial/categories` (preHandler `reference:read`) |

## Decisões de implementação

- **Domínio puro** (domain.md): `Result`, branded id, union fechada, `immutable`, sem `class`/`throw`.
- **`group`**: varchar+CHECK (ADR-0020 — sem ENUM); cast row→union revalidado no `create()` (domínio rejeita estado inválido — adapters.md).
- **Seed única fonte**: `reference-categories.ts` (UUIDs fixos) alimenta o in-memory; a migration 0012 replica os mesmos UUIDs via `INSERT ... AS new ON DUPLICATE KEY UPDATE` (idempotente; sem `VALUES()` deprecado).
- **Programa (US3)**: `programs/public-api` já expõe `buildProgramsReadPort` — pré-req satisfeito; não consumido nesta fatia (US3 = fatia seguinte).

## Pendência conhecida (para W3 / follow-up)

- Teste de **integração Drizzle** real (`category-read.drizzle-mysql.test.ts` + entrada no script `test:integration:financial`) não incluído nesta fatia — o adapter está coberto por `typecheck` e segue o padrão idêntico dos demais read stores. A migration 0012 (DDL + seed) será exercida pelo `applyMigrations` no boot do writer durante a integração. Avaliar adição no gate W3.
