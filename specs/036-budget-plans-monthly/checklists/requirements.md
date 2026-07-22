# Specification Quality Checklist: Orçamento mensal no Plano Orçamentário

**Purpose**: Validar completude e qualidade da spec antes de seguir para o planejamento
**Created**: 2026-07-15
**Última validação**: 2026-07-15 (iteração 3 — pós-#454, correção do FR-008)
**Feature**: [spec.md](../spec.md) · Issue #413 · Guarda-chuva #454 / #404

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

**Spec pronta para `/speckit-plan`.** `/speckit-clarify` dispensável.

### Decisões (2026-07-15)

1. **FR-008 — o alvo do cálculo ganha o mês.** O cálculo permanece server-side e continua **gravando**; o `FR-003` da spec 030 fica **preservado**. Mudança **aditiva**, não reformulação.
2. **FR-013 — grão: rede × subcategoria × mês.** Confirmado pela P.O. na #454 ("centro de custo > categoria > subcategoria MÊS A MÊS"). Abandona a paridade de **grão** com o legado (a de **fórmula** continua exigida).
3. **FR-009 — sem objeto.** Zero planos no dev local e no QA (verificado). Migração greenfield; **US4 retirada**.

### ⚠️ Correção registrada — o FR-008 foi decidido errado antes

A iteração 2 desta spec interpretou "o usuário atribui os valores **manualmente**" como _"digita o valor final; os 4 modelos viram preview"_ — o que revogaria o FR-003 da 030 e reformularia o agregado. **Errado.** Duas evidências derrubam:

- `src/modules/budget-plans/adapters/http/schemas.ts:282-285` — o alvo já é `{ budgetId, subcategoryId }` e cada modelo o estende com os **dados de entrada** (salário, IPCA, matrículas, passagem). "Atribuir manualmente" **já é** preencher esses campos.
- **#454** (fala da P.O. posterior à usada na iteração 2): _"O mensal é a ENTRADA; o anual é o RESULTADO (soma dos 12)"_, com prova de R$ 3.670,92 × 12 = R$ 44.051,04. É cálculo rodando 12×, não digitação.

A #454 nomeia o defeito: os 4 formulários _"calculam e não gravam"_ porque 12 POSTs colidiriam em `(budgetId, subcategoryId)` — _"o mês precisa entrar no contrato, não só no armazenamento"_.

**Lição:** a decisão de negócio mais recente estava numa issue (#454) que não foi lida antes de formular as opções. Ler o backlog do módulo **antes** de apresentar alternativas à decisão.

### Dependência de entrega: #374 (não bloqueia a construção)

O módulo roda em driver **`memory`** em QA e produção — faltam `BUDGET_PLANS_DRIVER` / `BUDGET_PLANS_DATABASE_URL` no deploy (`server.ts:225-233` degrada em silêncio). É a **causa** do banco vazio, e sem isso o mensal é entregue e o dado continua sumindo no restart. Evidência de QA + prod adicionada à #374 em 2026-07-15. Mesmo padrão reincide no **#444** (`REPORTS_DRIVER`).

> Gotcha de verificação: `docker exec <container> env` **não** mostra as `*_DATABASE_URL`. Use `tr '\0' '\n' < /proc/1/environ`.

### Achados colaterais

- **#443 não é dependência do #413** — taxonomias paralelas (`07-categorization-taxonomy.md:5-7,11,21`).
- **#443 confirmado:** QA tem `fin_categories`=11 e `fin_cost_centers`=5, exatamente os números da issue.
- **A opção 1 da issue #413 ("JSON de 12 posições") é proibida** por ADR-0020.
- **Clarification da 030 (`:37`, folha × qtd) volta a ser bloqueante** — o cálculo segue persistindo, então divergência de fórmula corrompe dado real.
