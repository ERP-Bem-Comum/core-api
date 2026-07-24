# W0 — REPORT (RED) · ETL-COLLABORATOR-COUNT-3 (#522)

> Size S, test-only. Skill: `tdd-strategist`. Asserção desatualizada (não fixture quebrada).

## RED — suites etl + etl:orchestrate contra MySQL 8.4 real (x99, legacy+core isolados)

```
ℹ tests 4 · pass 2 · fail 2
✖ READER integration ... (reader.integration.test.ts:31)   actual: 3, expected: 2
✖ ORCHESTRATOR integration ... (orchestrate.integration.test.ts:43)  actual: 3, expected: 2
```

A fixture `legacy-mini.sql` tem **3** collaborators (ids 1,2 na linha 88; id 3 "Aprovador Fake" na 181);
o reader faz `SELECT * FROM collaborators` sem filtro → 3. As asserções `==2` são stale.

## Por que 3 (intencional — git blame)

Collaborator 3 adicionado no commit `468c47de` (ETL-FINANCIAL-WRITER, 2026-07-02 13:22) como aprovador
dos payables 1/2 (legado tem `approvals.userId` NULL → identidade por `collaboratorId→email` casando com
o user 1, D11/F1). As asserções `==2` foram (re)escritas ~2h depois (`5ebe9fa1`, 15:29), quando a fixture
já tinha 3 → stale-on-arrival; nunca rodaram (suíte gated, sem CI até o #523).

## Premissa para o W1

`orchestrate:43` e `reader:31`: `2` → `3`. NÃO reverter a fixture (colab 3 é requisito do
ETL-FINANCIAL-WRITER). Não afrouxa: os guards `quarantined===0` (as 3 migram limpo), a reconciliação
`read===migrated+quarantined+alreadyExists`, o inativo `id===2` (reader:41) e `archived===2`
(history, entidade separada) continuam de pé.
