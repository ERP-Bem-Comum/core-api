# CLAUDE.md

> Este arquivo é um **stub**. O contexto canônico deste repo vive em `AGENTS.md`
> (padrão aberto, multi-ferramenta). O Claude Code carrega o conteúdo via import abaixo.

@AGENTS.md

<!-- SPECKIT START -->

Plano corrente: `specs/036-budget-plans-monthly/plan.md` (**Orçamento mensal** — issue #413, guarda-chuva #404/#454). O defeito não é "falta tela": **o mês não existe no contrato** — com o alvo `(budgetId, subcategoryId)` os 12 POSTs colidem, e por isso os 4 formulários de "Calculando Gastos" do front estão órfãos ("calculam e não gravam", #454). **Mudança ADITIVA, não reformulação:** o cálculo segue server-side e **gravando** (o `FR-003` da spec 030 fica **intacto**); o **alvo** passa a `(budgetId, subcategoryId, month)`. Decisões da P.O.: orçado é **mês a mês** ("o mensal é a ENTRADA; o anual é o RESULTADO" = soma dos 12; prova: R$ 3.670,92 × 12 = R$ 44.051,04) e grão = **rede × subcategoria × mês** (abandona a paridade de **grão** com o legado, que orça em categoria × mês; a de **fórmula** continua). Design: **linha por mês** (`month TINYINT` + CHECK 1..12) — **nunca JSON** (a "opção 1" da issue #413 viola ADR-0020); **`UNIQUE (budget_id, subcategory_id, month)` + `ON DUPLICATE KEY UPDATE`**, que de quebra **corrige um bug pré-existente**: hoje o `add` é INSERT puro sem UNIQUE → recalcular duplica e o total por Rede **conta em dobro**. Migration **greenfield** (zero planos medidos em dev/QA — causa: #374). Tamanho **M** fatiado em 3 tickets (VO → PERSIST → HTTP), 1 módulo. ⚠️ **#374 bloqueia a ENTREGA** (sem o driver, o dado some no restart) e a **clarification da 030 `:37`** (folha × qtd) **volta a bloquear o W1** — o cálculo persiste, divergência corrompe dado real. **#443/taxonomia NÃO é dependência** (verificado; ADR-0051/#448 confirma o budget-plans como owner). Próximo: `/speckit-tasks`.
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan.

<!-- SPECKIT END -->
