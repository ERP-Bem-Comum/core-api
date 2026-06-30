# W0 — Testes RED · FIN-COST-CENTER-REF (US2 Centro de custo)

**Wave**: W0 · **Agente**: tdd-strategist · **Resultado**: **RED** (esperado) · **Data**: 2026-06-20

## Comando

```bash
node --test --experimental-strip-types --enable-source-maps --no-warnings \
  tests/modules/financial/domain/cost-center/cost-center.test.ts \
  tests/modules/financial/adapters/persistence/cost-center-read.in-memory.test.ts \
  tests/modules/financial/adapters/http/cost-centers.http.test.ts
```

## Resultado

```
ℹ tests 4 · pass 0 · fail 4
```

Todos vermelhos **por inexistência da API** (fail-first correto):

| Teste | CA / FR | Falha RED |
| --- | --- | --- |
| `domain/cost-center/cost-center.test.ts` (T012) | smart constructor (code/name vazios) | módulo inexistente |
| `adapters/persistence/cost-center-read.in-memory.test.ts` (T013) | FR-004/006/007 (só active, ordenado por code) | módulo inexistente |
| `adapters/http/cost-centers.http.test.ts` (T014) | borda 200/403, ordenação por code | `200 !== 404` e `403 !== 404` (rota ausente) |

## Contrato exercido (alvo do W1 GREEN)

- **Domínio** (`domain/cost-center/`, module-as-namespace): `CostCenterId.generate()/rehydrate()`; `CostCenter.create({ id, code, name, active? }) → Result<CostCenter, 'cost-center-code-empty' | 'cost-center-name-empty'>`. `active` default `true`. **Sem `group`** (≠ Category).
- **Port** `CostCenterReadPort.list() → Promise<Result<readonly CostCenter[], CostCenterReadError>>`: in-memory só `active`, ordenado por `code`, `[]` quando vazio.
- **Borda** `GET /api/v2/financial/cost-centers` → 200 `[{id,code,name}]` atrás de `reference:read` (slug já existe); sem permissão → 403. Seed in-memory popula CC-001/CC-002/…

## Notas para o W1

- Reutiliza tudo do US1: `reference:read` já no catálogo; `buildFinancialHttpDeps` ganha `listCostCenters` + seed in-memory.
- Schema `fin_cost_centers` + migration `0013` (próxima livre após `0012`) + seed idempotente (UUIDs fixos).
- Lição do US1 aplicada no teste HTTP: sem `Array.isArray` (re-narrowa para `any`) — cast direto `readonly {...}[]`.
