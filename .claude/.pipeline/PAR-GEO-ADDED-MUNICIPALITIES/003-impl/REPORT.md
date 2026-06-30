# 003 — W1 (GREEN) — PAR-GEO-ADDED-MUNICIPALITIES

Novo endpoint `GET /api/v1/partner-municipalities/added` — lista os municípios parceiros (status
Active) de **todas as UFs**, alimentando o painel "Municípios Parceiros Adicionados" (cross-state).

## Camadas (sem mudança de schema — reusa `listMunicipalities`)

- **Application**: `list-added-partner-municipalities.ts` — filtra parcerias Active, resolve `name`
  via catálogo IBGE (`Municipality.findMunicipalityByCod`), ordena por nome. Erro só
  `geography-repo-unavailable`.
- **Composition**: `listAddedPartnerMunicipalities` exposto em `PartnersHttpDeps`.
- **HTTP**: `partner-geography-schemas.ts` (`addedMunicipalitiesQuerySchema` search/page/limit +
  `addedMunicipalitiesPagedSchema`) · `partner-geography-plugin.ts` (rota com busca por nome
  case-insensitive + paginação na borda; meta harmonizada). Path estático precede a rota raiz.

## Decisões

- **Novo endpoint** (em vez de tornar `uf` opcional) — não altera o contrato existente do GET por UF.
- Municípios podem ser parceiros mesmo com a UF não-parceira (FR do ticket) → fonte é a tabela de
  parcerias, não varredura de estados.

## Gate

typecheck ✅ · lint ✅ · format ✅ · `pnpm test` 2656 pass/0 fail. Sem persistência nova → sem migration.
