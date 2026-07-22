# W0 — Testes (RED) · PAR-SUPPLIER-SEARCH-FANTASY

**Skill:** tdd-strategist (terreno mapeado por Explore)
**Data:** 2026-06-30T22:23Z
**Estado:** **RED** — `matchesSearch` ainda não casa `fantasyName`/`corporateName`.

## Arquivo (W0)
- `tests/modules/partners/application/use-cases/list-suppliers-search.test.ts` — testa a função pura
  exportada `supplierMatchesFilter` (`list-suppliers.ts`), fixture via `Supplier.register`.

## Casos
- **CA1** `fantasyName="Padaria do Zé"`, `search="padaria"` → `true`.
- **CA2** `corporateName="Comércio Alpha LTDA"`, `search="alpha"` → `true`.
- **CA3** (regressão) `name` e `cnpj` (dígitos) → `true`.
- **CA4** case-insensitive/substring em `fantasyName` (`search="PADARIA"`) → `true`.

## Evidência RED
```
ℹ tests 4 · pass 1 · fail 3
✖ CA1: casa por fantasyName  (false !== true)
✖ CA2: casa por corporateName
✖ CA4: match case-insensitive em fantasyName
```
CA3 (regressão name+cnpj) passa — o predicado atual (`list-suppliers.ts:25-31`) já cobre. CA1/CA2/CA4
falham por inexistência do match em `fantasyName`/`corporateName`.

## API alvo (W1)
- `matchesSearch` (`list-suppliers.ts:25-31`): acrescentar ao OR o teste substring case-insensitive
  contra `s.fantasyName` e `s.corporateName` (mesmo critério do `name`). Sem SQL, sem schema.
