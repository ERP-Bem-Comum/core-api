# PAR-COLLAB-FOODCAT-LENGTH — escopo + CAs

> Corrige a **issue #274**. Size **S**. Módulo `partners`.
> ⚠️ **Mudança de schema em tabela com dados de prod (migração legado→core)** → migration validada por **MCP canônico** (teoria de schema evolution) + **agentes especialistas** (drizzle/mysql) escrevem o DDL.

## Problema

A coluna `par_collaborators.food_category` é `varchar(20)`, mas o domínio `FoodCategory` tem `PREFIRO_NAO_RESPONDER` (**21 chars**) como valor válido. O ETL legado→core falha o INSERT desses colaboradores com `ER_DATA_TOO_LONG (1406)` → quarentena. As colunas enum-irmãs (`gender_identity`/`race`/`education`) já são `varchar(30)`; só `food_category` ficou sub-dimensionada.

## Solução

`ALTER` de `food_category` para `varchar(30)` (alinha com as irmãs; cabe os 21 chars + folga). **Widening** de coluna — operação aditiva/back-compat (não trunca dado existente).

## Critérios de aceite

- **CA1** — Dado um colaborador com `foodCategory = 'PREFIRO_NAO_RESPONDER'`, Quando persistido, Então o INSERT/round-trip sucede (sem 1406).
- **CA2** — Dado o maior literal de `FoodCategory` (21), Então a coluna comporta (`varchar(30)`).
- **CA3** — Dados existentes em `food_category` permanecem íntegros após o ALTER (widening não trunca).
- **CA4** — Re-rodando o ETL na VM de validação, os colaboradores antes quarentenados por `food_category` passam a migrar.

## Garantias de migração (obrigatórias — banco legado/prod)

- **MCP `acdg-skills` (database)**: teoria de evolução de schema / migração backward-compat.
- **`drizzle-orm-expert` + Refman MySQL 8.4**: confirmar que `ALTER ... MODIFY varchar(20)→varchar(30)` é `ALGORITHM=INPLACE`/instant e não reconstrói a tabela nem perde dados (ambos < 64 chars utf8mb4 → mesmo length-prefix de 1 byte).
- Migration gerada por `pnpm run db:generate` (nunca SQL à mão).

## DoD (W3)

`typecheck` + `format:check` + `lint` + `test` verdes; `test:integration:partners` (Docker) cobrindo CA1/CA3; migration versionada; validação E2E na VM (re-rodar ETL).
