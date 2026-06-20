# W1 — Implementação GREEN · FIN-COST-CENTER-REF (US2 Centro de custo)

**Wave**: W1 · **Resultado**: **GREEN** · **Data**: 2026-06-20

## Resultado dos testes

```
# 3 testes do US2 (T012-T014)
ℹ tests 9 · pass 9 · fail 0

# suíte HTTP financial completa (regressão?)
ℹ tests 123 · pass 123 · fail 0   (era 121 no US1; +2 do /cost-centers)

# typecheck
tsc --noEmit → 0 erros
```

## Arquivos criados

| Camada | Arquivo |
| --- | --- |
| Domínio | `domain/cost-center/cost-center-id.ts` (branded id) |
| Domínio | `domain/cost-center/types.ts` (`CostCenter`, `CreateInput`, `CostCenterError`) — sem `group` |
| Domínio | `domain/cost-center/cost-center.ts` (`create()` valida code/name não-vazios) |
| Port | `application/ports/cost-center-read.ts` (`CostCenterReadPort.list()`) |
| Adapter | `adapters/persistence/repos/cost-center-read.in-memory.ts` (só `active`, ordena por `code`) |
| Adapter | `adapters/persistence/repos/cost-center-read.drizzle.ts` (SELECT lean + mapper via smart constructor) |
| Seed | `adapters/persistence/seed/reference-cost-centers.ts` (5 itens CC-001..005, UUIDs fixos — SC-002) |
| Migration | `adapters/persistence/migrations/mysql/0013_far_shriek.sql` (CREATE TABLE + 2 índices + seed `ON DUPLICATE KEY UPDATE`) |

## Arquivos modificados

| Arquivo | Mudança |
| --- | --- |
| `adapters/persistence/schemas/mysql.ts` | + `finCostCenters` + `$inferSelect/Insert` |
| `adapters/http/schemas.ts` | + `costCenterResponseSchema` / `costCenterListResponseSchema` |
| `adapters/http/dto.ts` | + `costCentersToDto` (DTO lean `{id,code,name}`) |
| `adapters/http/error-mapping.ts` | + `cost-center-read-unavailable` → 503 |
| `adapters/http/composition.ts` | + `costCenterReader` em `Pools` (memory: seed; mysql: drizzle) + `listCostCenters` |
| `adapters/http/plugin.ts` | + rota `GET /financial/cost-centers` (`reference:read`) |

## Notas

- Reusa o slug `reference:read` (já no catálogo desde o US1) — sem mudança em `permissions.ts`.
- Padrão idêntico ao US1 (Categoria), menos o `group`; ordenação por `code` (vs `(group,name)`).
- Lição do US1 aplicada no teste HTTP: cast direto `readonly {...}[]` (sem `Array.isArray`).
