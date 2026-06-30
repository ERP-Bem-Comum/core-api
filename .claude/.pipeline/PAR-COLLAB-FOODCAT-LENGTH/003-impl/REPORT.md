# W1 — Implementação GREEN · PAR-COLLAB-FOODCAT-LENGTH

**Outcome**: GREEN ✅ · **Agentes**: drizzle-orm-expert (schema/migration) + mysql-database-expert (diagnóstico DDL) · **Issue**: #274

## Mudança

- `schemas/mysql.ts:184` → `foodCategory: varchar('food_category', { length: 30 })` (era 20). Alinha com `gender_identity`/`race`/`education`.
- Migration `0017_perpetual_iceman.sql`: `ALTER TABLE par_collaborators MODIFY COLUMN food_category varchar(30);` (**sem hint de ALGORITHM**).

## ⚠️ Achado de migração (validação E2E na VM refutou a teoria)

A 1ª versão da migration forçava `ALGORITHM=INPLACE, LOCK=NONE` (com base no Refman "Extending VARCHAR = In Place"). **A validação E2E no MySQL 8.4.9 real (VM) refutou isso**:

- `ALGORITHM=INPLACE` → `ERROR 1845`.
- `ALGORITHM=INSTANT` → `ERROR 1845` (testado em utf8mb4 **e** latin1 → não é charset).
- `ALTER` **sem hint** → **funciona** (servidor usa o melhor algoritmo disponível, aqui COPY).

Diagnóstico (mysql-database-expert + Refman 8.4): a Table 17.17 lista `Extending VARCHAR: Instant=No, In Place=Yes`, mas o 8.4.9 real não expõe caminho INSTANT/INPLACE para esta operação → forçar qualquer um falha. Decisão: **migration sem hint** (mais robusta e portável; o servidor escolhe o melhor). `par_collaborators` é tabela pequena → COPY é rápido/aceitável; nota na migration recomenda pt-osc/gh-ost para tabelas grandes.

> **Lição (registrada):** no MySQL 8.4.9, forçar `ALGORITHM` no widening de VARCHAR pode falhar (1845) mesmo quando a doc sugere o contrário — **validar o ALTER no banco real, não só na teoria.**

## Gates (validados pelo orquestrador)

- `pnpm run typecheck` → verde · `pnpm run format:check` → verde (após reformatar os JSONs gerados pelo `db:generate` + o teste — não passam pelo hook prettier) · `pnpm test` → **3224 pass · 0 fail**.

## Validação E2E na VM (dump de prod migrado)

Após aplicar o `ALTER` (coluna → `varchar(30)`) e **re-rodar o ETL**:
```
collaborators: read=91  migrated=5  quarantined=0  alreadyExists=86
```
Os **5 colaboradores** antes quarentenados por `food_category` migraram; **quarentena 5 → 0**. CA1/CA4 provados com dados reais.
