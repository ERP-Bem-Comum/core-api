# ETL-COLLABORATOR-COUNT-3 — escopo

> Size **S** (trivial, test-only). Issue **#522**. Suítes `etl` / `etl:orchestrate`. Exposto pelo CI de
> integração do #523 (2 jobs vermelhos). Solução pesquisada por `tdd-strategist` (SOL-520-521-522).

## Problema (asserção desatualizada, NÃO fixture quebrada)

A fixture `tests/etl/fixtures/legacy-mini.sql` tem **3 collaborators** (ids 1,2 nas linhas 88-92; **id 3
"Aprovador Fake" nas linhas 178-181**). Duas asserções ainda esperam **2**:

- `tests/etl/orchestrate.integration.test.ts:43` — `assert.equal(report.collaborators.read, 2)`
- `tests/etl/legacy/reader.integration.test.ts:31` — `assert.equal(data.collaborators.rows.length, 2)`

O reader faz `SELECT * FROM collaborators` sem filtro → devolve 3. As asserções `==2` são **stale**.

## Por que 3 (intencional, verificado no git blame)

O collaborator 3 foi adicionado **de propósito** no commit `468c47de` (fatia ETL-FINANCIAL-WRITER,
2026-07-02 13:22): é o **aprovador** dos payables 1/2. No legado `approvals.userId` é NULL (defeito F1),
então a identidade do aprovador resolve por `collaboratorId → email` casando com o user 1 (decisão
D11/F1, documentada na própria fixture, linhas 175-177). As asserções `==2` foram (re)escritas ~2h depois
(`5ebe9fa1`, 15:29), quando a fixture **já** tinha 3 — nasceram desatualizadas, e nunca rodaram porque a
suíte é gated e não rodava em CI até o #523.

## Alvo (fix trivial — 2 edições de 1 linha)

Atualizar as duas asserções **2 → 3** (a fixture está certa; **NÃO** reverter a fixture — remover o
collaborator 3 quebraria o join do aprovador dos payables):

- `orchestrate.integration.test.ts:43` → `assert.equal(report.collaborators.read, 3);`
- `reader.integration.test.ts:31` → `assert.equal(data.collaborators.rows.length, 3);`

## Critérios de aceite

- [ ] **CA1** — as 2 asserções esperam 3; `test:integration:etl` e `test:integration:etl:orchestrate` verdes.
- [ ] **CA2 (não-afrouxamento)** — os guards permanecem: `quarantined === 0` (as 3 migram limpo — colab 3 tem
      CPF/e-mail distintos entre collaborators, role não-nulo), a reconciliação `read === migrated + quarantined
      + alreadyExists` (agora 3=3), o backstop do inativo `id===2` (`reader:41`), e `archived===2` (history,
      entidade separada, `reader:58`).
- [ ] **CA3** — os jobs `etl` e `etl:orchestrate` do `integration.yml` viram verdes.

## Disciplina

Só as suítes ETL (`tests/etl/**`). Corrige a asserção, **não** a fixture (o 3º collaborator é requisito do
ETL-FINANCIAL-WRITER). W0 = validar 3 collaborators migrando limpo contra MySQL real.

## Rastreio

Issue #522 · exposto pelo #523 · solução (com git blame do "por que 3") em `SOL-520-521-522.md`.
