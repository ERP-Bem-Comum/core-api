# Implementation Plan: Orçamento mensal no Plano Orçamentário

**Branch**: `feat/413-budget-plans-monthly` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/036-budget-plans-monthly/spec.md` (checklist 16/16, sem `[NEEDS CLARIFICATION]`)

## Summary

Acrescentar a dimensão **mês** ao Orçamento. O defeito não é "falta uma tela" — é que **o mês não existe no contrato**: com o alvo atual `(budgetId, subcategoryId)`, os 12 POSTs colidiriam na mesma chave, e por isso os 4 formulários de "Calculando Gastos" do front estão órfãos ("calculam e não gravam", #454).

**Abordagem: mudança aditiva, não reformulação.** O cálculo permanece server-side e continua gravando (o `FR-003` da spec 030 fica **intacto**); o que muda é o **alvo**, que passa a ser `(budgetId, subcategoryId, month)`. Uma linha por mês, com `UNIQUE` + upsert idempotente.

**Bônus de correção:** a chave que o mês exige contém o par `(budget_id, subcategory_id)`, hoje **sem UNIQUE** — o que faz recálculo gravar linha duplicada e o total por Rede **contar em dobro**. A feature corrige esse defeito pré-existente por construção (ver [research.md §D2](./research.md)).

## Technical Context

**Language/Version**: TypeScript 6.0 · Node.js 24 LTS · ESM/NodeNext (ADR-0009 / ADR-0002)

**Primary Dependencies**: Drizzle ORM 0.45 + mysql2 · Fastify 5 + Zod (ADR-0025 / ADR-0027)

**Storage**: MySQL 8.4 — `bgp_budget_results` (+1 coluna, +1 CHECK, +1 UNIQUE, −1 índice redundante)

**Testing**: `node:test` + `--experimental-strip-types` · `fastify.inject` na borda · integração com MySQL real

**Target Platform**: Linux server (Fargate prod · Docker QA)

**Project Type**: Modular monolith — módulo `budget-plans` (ADR-0006)

**Performance Goals**: grid por rede ≤ ~1.9k linhas (158 subcategorias × 12) — carga única, passador de mês client-side

**Constraints**: Money em centavos (bigint) · sem JSON nativo · sem ENUM nativo · sem FK cross-agregado replace-all · domínio puro funcional

**Scale/Scope**: ~51k linhas por plano no pior caso (27 redes × 158 × 12); o grid nunca materializa isso — só agregação

## Constitution Check

_GATE: passa antes da Phase 0. Re-checado após a Phase 1._

| #        | Princípio                           | Status | Nota                                                                                         |
| :------- | :---------------------------------- | :----- | :------------------------------------------------------------------------------------------- |
| **I**    | TDD fail-first W0→W3                | ✅     | 3 tickets, cada um com W0 RED antes de tocar `src/`                                          |
| **II**   | Regressão zero                      | ✅     | Suíte atual do budget-plans deve seguir verde; contagem ≥ baseline                           |
| **III**  | pnpm único                          | ✅     | Nenhuma dependência nova                                                                     |
| **IV**   | Modular monolith, isolamento por BC | ✅     | **Um só módulo** (`budget-plans`/`bgp_*`). Zero cross-módulo, zero import de outro `domain/` |
| **V**    | Domínio puro (sem classe/throw)     | ✅     | VO `ExerciseMonth` com smart constructor + `Result<T,E>`                                     |
| **VI**   | MySQL 8 + Drizzle; migration gerada | ✅     | `pnpm run db:generate`; sem JSON/ENUM/trigger/proc                                           |
| **VII**  | HTTP-first                          | ✅     | Borda Fastify + Zod; nenhuma CLI                                                             |
| **VIII** | TS strict + ESM + idioma por camada | ✅     | Código EN; erros EN kebab (`exercise-month-invalid`); docs PT                                |
| **IX**   | Decisões ancoradas no cânone        | ✅     | Decisões de schema fundamentadas em ADR-0020 (citado) e no código medido, não em precedente  |

**Violações:** nenhuma. **Complexity Tracking:** N/A.

> ⚠️ **A opção 1 da issue #413 ("JSON de 12 posições no `budget_result`") violaria o ADR-0020** (JSON nativo vetado). **Rejeitada** — ver [research.md §D1](./research.md).

## Project Structure

### Documentation (this feature)

```text
specs/036-budget-plans-monthly/
├── spec.md              # decisões de negócio (FR-008, FR-013, FR-009)
├── plan.md              # este arquivo
├── research.md          # Phase 0 — D1..D6
├── data-model.md        # Phase 1 — VO, agregado, tabela, upsert
├── contracts/
│   └── budget-results-monthly.md
├── quickstart.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/modules/budget-plans/
├── domain/
│   ├── shared/
│   │   └── exercise-month.ts              ← NOVO (VO 1..12, branded, Result)
│   └── budget-result/
│       ├── budget-result.ts               ← +month no agregado e no create
│       └── repository.ts                  ← add → save (upsert)
├── application/
│   └── use-cases/
│       ├── add-budget-result.ts           ← +month no command; sem gerar id se já existe
│       └── get-budget-results.ts          ← devolve month
└── adapters/
    ├── http/
    │   ├── schemas.ts                     ← +month em budgetResultTargetSchema (herdado por 4)
    │   └── routes.ts                      ← repassa month
    └── persistence/
        ├── schemas/mysql.ts               ← +coluna, +CHECK, +UNIQUE, −índice redundante
        ├── mappers/budget-result.mapper.ts ← row ↔ domínio com month
        └── repos/
            ├── budget-result-repository.drizzle.ts    ← INSERT → ON DUPLICATE KEY UPDATE
            └── budget-result-repository.in-memory.ts  ← mesma chave, paridade

tests/modules/budget-plans/          # espelha a árvore acima
```

**Structure Decision**: módulo existente `budget-plans`, sem novos diretórios além do VO. Nenhum outro módulo é tocado.

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] colunas (`month`) · [x] índices (+UNIQUE, −`budget_id_idx`) · [ ] tabelas novas · [ ] FKs
- **Prefixo de isolamento correto?** `bgp_*` — **sim** (ADR-0014)
- **Outbox**: novo evento? **não** (`bgp_outbox` só publica `BudgetPlan`; o Realizado do #416 lê via port)
- **Comando**: `pnpm run db:generate:budget-plans` e versionar a migration gerada — **nunca escrever à mão**
- **Restrições MySQL 8 (ADR-0020)**: sem JSON nativo ✅ · sem ENUM (VARCHAR/TINYINT + CHECK) ✅ · sem trigger/proc ✅ · `ON DUPLICATE KEY UPDATE` **permitido** ✅
- **Greenfield**: `month NOT NULL` **sem default** — não há linha para preencher (zero planos em todos os ambientes)

## Contrato HTTP

Detalhe em [`contracts/budget-results-monthly.md`](./contracts/budget-results-monthly.md).

- **Alterados** (nenhuma rota nova): `POST /budget-plans/budget-results/{ipca,caed,personal-expenses,logistics-expenses}` — `+month` no body, via `budgetResultTargetSchema`; `GET /budget-plans/budget-results/by-budget/:budgetId` — `+month` na response, `?month=` opcional.
- **Backward-compat**: **breaking, sem versionamento** — zero dado em qualquer ambiente e o front já espera o campo (#454). Versionar seria cerimônia sobre o vazio.

## Estimativa de Pipeline (W0 size)

**Tamanho: M** — fatiado em **3 tickets**, um por camada de risco.

**Justificativa:** não é **L** porque não há BC novo, agregado novo, outbox nem cross-módulo — o agregado ganha **um campo** e a tabela **uma coluna + uma chave**. Não é **S** porque envolve migration + mudança de contrato + troca de semântica de escrita (INSERT → upsert), com teste de integração em MySQL real.

| #   | Ticket              | Size  | Escopo                                                                                                      | W0 (RED primeiro)                                                                                                                                                              |
| :-- | :------------------ | :---- | :---------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `BGP-MONTH-VO`      | **S** | VO `ExerciseMonth` + `month` no agregado `BudgetResult`                                                     | `domain/shared/exercise-month.test.ts` (1..12, 0, 13, −1, 3.5, NaN → `exercise-month-invalid`); `domain/budget-result/*.test.ts` (create com month)                            |
| 2   | `BGP-MONTH-PERSIST` | **M** | schema (+coluna/CHECK/UNIQUE, −índice), migration gerada, mapper, repo `add`→`save` (upsert) nos 2 adapters | `adapters/persistence/.../budget-result-repository.drizzle-mysql.test.ts`: **recalcular atualiza, não duplica**; 12 meses coexistem; `SUM` = ×12; paridade in-memory ↔ drizzle |
| 3   | `BGP-MONTH-HTTP`    | **S** | `month` em `budgetResultTargetSchema` (herdado por 4) + use case + leitura do grid                          | `adapters/http/*.http.test.ts` via `fastify.inject`: 201 com month; **400** em 0/13/−1/3.5; 403 em plano Aprovado; GET devolve month                                           |

**Ordem:** 1 → 2 → 3 (domínio → persistência → borda). Cada um fecha W0→W3 antes do próximo.

**Plano de testes W0 (RED):** as suítes acima falham por **inexistência da API** — não existe `exercise-month.ts`, o `BudgetResult` não aceita `month`, o repo não tem `save`, o schema HTTP não tem o campo.

## Riscos e dependências

| Risco                               | Mitigação                                                                                                                                                                                                                                                        |
| :---------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔴 **#374 — driver `memory`**       | **Bloqueia a ENTREGA, não a construção.** Sem `BUDGET_PLANS_DRIVER`/`_DATABASE_URL` no deploy, o mensal é implementado e o planejador **continua perdendo tudo no restart**. Já resolvido em QA; produção aguarda o deploy (taskdef mergeado em ERP-INFRA#20)    |
| 🔴 **Clarification da 030 (`:37`)** | **Bloqueia o W1 do ticket 2/3 para `DESPESAS_PESSOAIS`.** Volta a ser bloqueante porque o cálculo **persiste** (12× por conta) — divergência de fórmula corrompe dado real. Confirmar com a P.O. antes da fatia de cálculo. Ver [research.md §D6](./research.md) |
| 🟡 **Spec 030 `:74`**               | Reescrever o Success Criteria: paridade de **fórmula** continua; a de **grão** foi abandonada (FR-013). Dívida documental, não bloqueia                                                                                                                          |
| 🟢 **#443 / taxonomia**             | **Não é dependência** — verificado. O mensal usa `bgp_subcategories` (árvore do próprio módulo). O ADR-0051 (#448) confirma o `budget-plans` como owner                                                                                                          |

## Próximo passo

`/speckit-tasks` — gerar `tasks.md` dependency-ordered a partir dos 3 tickets acima.
