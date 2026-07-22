# BDG-CONSOLIDATED-CSV — escopo

> Issue **#319** (US5 · Plano Orçamentário, fatia 5/6). Módulo **`budget-plans`**. Size **M**.
> Spec: `specs/030-budget-plans-reproducao/spec.md` · **Gated pós-#246**. Portar de `../../ERP-BACKEND/budget-plans/consolidated-result`.

## Escopo (in)

1. **Consolidado ABC**: agrega planos **`Aprovados`** por **Ano Base × Programa(s)** (read-model/query de agregação, centavos).
2. **Endpoints**: `GET /budget-plans/consolidated-result` · `GET /budget-plans/consolidated-result/csv` · `GET /budget-plans/:id/generate-csv`.
3. **CSV server-side** reusando **`src/shared/utils/csv.ts`** (Decisão 11); layout = `HANDBOOK-plano-orcamentario-consolidado-abc-export-exemplo.csv`.

## Fora de escopo
- `/shared` e `/csv/shared` (compartilhamento externo → #320, deferred).

## Critérios de aceite
- **CA1** `GET /consolidated-result` (Ano×Programa) → agregação de planos `Aprovados` em centavos; sem plano aprovado → `plan-not-approved-for-consolidation`/lista vazia coerente.
- **CA2** `GET /consolidated-result/csv` → CSV server-side batendo com a amostra real (ordem de colunas + totalizações).
- **CA3** `GET /:id/generate-csv` → CSV do plano.

## Pipeline (agentes por wave)
| Wave | Atividade | Especialista |
| :-- | :-- | :-- |
| W0 | RED (agregação CA1 + CSV vs amostra CA2) | skill **`tdd-strategist`** |
| W1 | query de agregação + geração CSV + borda | skill **`ts-domain-modeler`** + agente **`drizzle-orm-expert`** (agregação) + skill **`nodejs-fs-scripter`** (CSV) + **`fastify`**↔**`zod`** |
| W2 | audit (query + CSV) | skill **`code-reviewer`** + agente **`zod-expert`** |
| W3 | gate + `test:integration` | skill **`ts-quality-checker`** |

## Research (agentes + MCPs)
- **`src/shared/utils/csv.ts`** (reúso — não reimplementar CSV).
- **`mysql-database-expert`**: query de agregação (GROUP BY Ano×Programa), índice de cobertura.
- **`aws-docs`** (MCP): **só se** o CSV for persistido em S3/Magalu (ADR-0019); se for streaming na response, ignorar.
- **`Explore`** sobre `../../ERP-BACKEND/consolidated-result` + amostra CSV real.

## DoD
Gate W3 verde. Consolidado agrega aprovados; CSV bate com amostra. Fecha #319.
