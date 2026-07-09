# BDG-PLAN-LIFECYCLE — escopo

> Issue **#318** (US4 · Plano Orçamentário, fatia 4/6). Módulo **`budget-plans`**. Size **L**.
> Spec: `specs/030-budget-plans-reproducao/spec.md` · **Gated pós-#246**. Portar de `../../ERP-BACKEND/budget-plans`.

## Escopo (in)

1. **Máquina de estados** do plano: transições `Rascunho→Em Calibração→Aprovado` e `Aprovado→(start-calibration)→Em Calibração` (nova versão editável, sem alterar a aprovada).
2. **Endpoints**: `POST /budget-plans/scenery` (cenário) · `POST /budget-plans/:id/start-calibration` · aprovar · `GET /budget-plans/:id/insights` (Planejado×Realizado).
3. **Insights cross-módulo**: **Realizado** vem do `financial` com status `CONCILIADO`, via **read-model/evento** (ADR-0022/0006) — **não importar `financial/domain`**. Requer definir o contrato de leitura (`financial/public-api` hoje só expõe `events.ts` — **lacuna**).

## Fora de escopo
- Consolidado/CSV (#319); cálculo (#317).

## Critérios de aceite
- **CA1** `start-calibration` em plano `Aprovado` → cria versão `Em Calibração` editável; a aprovada permanece intacta.
- **CA2** aprovar plano `Em Calibração` válido → `Aprovado` e volta a bloquear edição; transição inválida → `budget-plan-not-editable`/`400`.
- **CA3** `GET /:id/insights` → Planejado (plano) × Realizado (`financial` `CONCILIADO`) por categoria/subcategoria.

## Pipeline (agentes por wave)
| Wave | Atividade | Especialista |
| :-- | :-- | :-- |
| W0 | RED (transições CA1/CA2 + insights CA3 com fake do read-model) | skill **`tdd-strategist`** |
| W1 | state machine + port de leitura cross-módulo + borda | skill **`ts-domain-modeler`** + skill **`modular-monolith`** + agente **`drizzle-orm-expert`** |
| W2 | audit (fronteira de módulo + ADR-0022) | skill **`code-reviewer`** + agente **`drizzle-orm-expert`** |
| W3 | gate + `test:integration` | skill **`ts-quality-checker`** |

## Research (agentes + MCPs)
- **`acdg-skills`**: máquina de estados no agregado; projeção evento-carregada (ADR-0022).
- **`modular-monolith`** (skill) + **`Explore`** sobre `src/modules/financial/public-api/` (como expor leitura de `CONCILIADO` sem acoplar).
- **`Explore`** sobre `../../ERP-BACKEND` (scenery/calibration/insights).

## DoD
Gate W3 verde. Ciclo de vida completo + insights via read-model do financeiro (sem acoplamento). Fecha #318.

---

## ⚠️ ESCOPO REVISADO (decisões 2026-07-09, pós-research — ver 001-research/LEGADO-E-FINANCIAL.md)

A research revelou que o `000-request` acima estava impreciso. Decisões do Gabriel:

- **CA3 "Planejado × Realizado" SAI da US4** → é o módulo `reports` (**spec 032**) no legado; Realizado vem da
  conciliação e exige `financial/public-api/read.ts` + query nova — entra junto com a 032, não aqui.
- **Lifecycle portado FIEL ao legado:** árvore de planos (`parentId`) + clonagem profunda. **Promoção (decisão
  2026-07-09, W2): semântica limpa** — aprovar o filho o torna a versão vigente; o pai fica como histórico.
  NÃO replicamos o `copy` do legado (que apaga+reclona o pai e deixa pai+filho ambos APROVADO duplicados).
- **CA3 redefinido** = **insights ano-a-ano** (o `/insights` real do legado: compara totais planejados entre anos; autocontido).

### Fatiamento interno (fiel, incremental)
1. **W1-A — Domínio da state machine + derivação de filhos**: `BudgetPlan` ganha `parentId`/`scenarioName`;
   funções puras `startCalibration` (filho EM_CALIBRACAO, version major+1), `createScenery` (filho RASCUNHO,
   version minor+1, máx. 2), `approve` (→APROVADO). Guards de transição. **Sem persistência/clonagem ainda.**
2. **W1-B — Persistência da árvore**: `+parentId`/`scenario_name` no schema `bgp_budget_plans` (migration) + repo.
3. **W1-C — Clonagem profunda**: copiar cost-structure + budgets + budget_results do pai→filho (casar subcategoria por nome).
4. **W1-D — Aprovar (semântica limpa)** + borda HTTP (scenery/start-calibration/approve) + insights ano-a-ano.

### CAs revisados
- **CA1** `start-calibration` em `APROVADO` → filho `EM_CALIBRACAO` editável (version major+1, alocada do máx da família);
  aprovado intacto; bloqueia se já há calibração aberta.
- **CA2** `approve` de plano não-aprovado → `APROVADO` (filho aprovado vira vigente — sem mutação do pai); já-aprovado → 409.
- **CA3** `GET /:id/insights` → comparação ano-a-ano de totais planejados (autocontido). Planejado×Realizado → spec 032.
- **CA4 (novo)** `scenery` → filho `RASCUNHO` (version minor+1), máx. 2 por plano em calibração.
