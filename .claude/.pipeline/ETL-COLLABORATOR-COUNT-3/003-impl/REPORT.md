# W1 — REPORT (GREEN) · ETL-COLLABORATOR-COUNT-3 (#522)

## Fix (test-only, 2 asserções 2→3)

- `orchestrate.integration.test.ts:43`: `report.collaborators.read` 2 → 3.
- `reader.integration.test.ts:31`: `data.collaborators.rows.length` 2 → 3.

A fixture está certa (3 collaborators; o id 3 é requisito do ETL-FINANCIAL-WRITER — aprovador dos
payables 1/2). NÃO reverter a fixture.

## RED→GREEN contra MySQL 8.4 real (x99, legacy+core isolados)

- ANTES: 4 tests · 2 fail (`actual: 3, expected: 2` no reader e no orchestrate).
- DEPOIS: **4 tests · 4 pass · 0 fail**.

## Não-afrouxamento (provado, não só argumentado)

O `orchestrate` passar **prova** que o guard `quarantined === 0` segue de pé — as **3** linhas migram
limpo (colab 3 tem CPF/e-mail distintos e role não-nula), e a reconciliação `read === migrated +
quarantined + alreadyExists` fecha com 3=3. Os backstops `inativo id===2` (reader) e `archived===2`
(collaborator_history, entidade separada) inalterados.

## Gates estáticos

`typecheck` ✅ · `format:check` ✅ · `lint` ✅. Só as suítes ETL (`tests/etl/**`).
