# PAR-SUPPLIER-SEARCH-FANTASY — escopo

> Issue #288 (sub-issue da #89 umbrella "Lançar Documento"). Módulo **partners**. Size **S (XS)**.
> Pipeline W0→W3 enxuto (sem SDD — escopo trivial, `priority:p3`).

## Objetivo

Estender a **busca textual de fornecedor** (`GET /api/v1/suppliers?search=`) para também casar o
**nome fantasia** (`fantasyName`, "apelido") e a **razão social** (`corporateName`), além de `name`
e `cnpj` (já cobertos). A busca permanece **em memória** na application (predicado puro
`matchesSearch`), coerente com ADR-0031/0032 (cardinalidade modesta, migração a SQL é trabalho
futuro fora desta fatia).

## Estado atual (mapeado)

- `matchesSearch` (`src/modules/partners/application/use-cases/list-suppliers.ts:25-31`) casa só
  `name` (substring case-insensitive) **OU** `cnpj` (dígitos). `fantasyName`/`corporateName` ficam de fora.
- Campos já existem: `SupplierCore.fantasyName`/`corporateName` (`domain/supplier/types.ts:28-29`);
  colunas `fantasy_name`/`corporate_name` (`adapters/persistence/schemas/mysql.ts:101-102`).
- **Não há** campo `nickname`/`apelido` no agregado — o "apelido" da issue **é o `fantasyName`**.

## Escopo (in)

1. **Application** (`list-suppliers.ts`): estender `matchesSearch` para casar o termo (substring
   case-insensitive, mesmo critério do `name`) também contra `fantasyName` **e** `corporateName`.
2. **Teste**: cobrir match por `fantasyName` e por `corporateName`, mantendo `name`/`cnpj` (regressão).

## Fora de escopo

- Migrar a busca para **SQL** (`LIKE`/`FULLTEXT`), adicionar índice em `fantasy_name`, ou método de
  busca no port/adapter Drizzle — é trabalho futuro (quando a cardinalidade crescer; ADR-0031/0032).
  FULLTEXT exigiria ADR próprio (ADR-0020 §94).
- Qualquer mudança no `financial` (resolve fornecedor por `supplierRef` UUID, não busca textual).
- Novo campo `nickname` no agregado (não existe; `fantasyName` cobre).

## Critérios de aceite

- **CA1** Fornecedor com `fantasyName = "Padaria do Zé"`, busca `search=padaria` → **aparece** no resultado.
- **CA2** Fornecedor com `corporateName = "Comércio Alpha LTDA"`, busca `search=alpha` → **aparece**.
- **CA3** (regressão) busca por `name` e por `cnpj` (dígitos) → **continua** funcionando.
- **CA4** match é **case-insensitive** e por **substring** em `fantasyName`/`corporateName` (igual ao `name`).
- **CA5** (borda) `GET /api/v1/suppliers?search=<termo de fantasyName>` reflete o fornecedor no HTTP.

## Definition of Done

Gate W3 verde (`typecheck` + `format:check` + `lint` + `test`) com teste cobrindo `fantasyName` e
`corporateName` além de `name`/`cnpj`. Sem migration, sem mudança de schema, sem regressão.
