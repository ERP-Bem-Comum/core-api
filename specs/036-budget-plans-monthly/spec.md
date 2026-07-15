# Feature Specification: Orçamento mensal no Plano Orçamentário

**Feature Branch**: `036-budget-plans-monthly`

**Created**: 2026-07-15

**Status**: Draft

**Input**: Issue #413 — "[budget-plans] 🔴 Grid mensal de Orçamento sem fonte real". Decisões da P.O. (Alessandra, 2026-07-15) em `.claude/.planning/DECISOES-PO-ORCAMENTO-2026-07-15.md` e, **de forma mais precisa e posterior**, na issue **#454** (que consolida os 3 buracos de contrato do Orçamento). Guarda-chuva: **#404**.

## Contexto

A tela **Planejamento > Detalhes > Orçamento** exibe um grid de contas × 12 meses. Hoje é **placeholder**: o sistema guarda **um único valor por rede/conta**, sem dimensão de mês em nenhuma camada do módulo (`grep month src/modules/budget-plans/` não retorna nada).

A P.O. decidiu (2026-07-15) que o orçado é lançado **mês a mês**. A formulação canônica é a da **#454**, mais precisa que a primeira:

> O orçamento **é anual, vale pro ano todo**, porém o usuário **atribui os valores para centro de custo > categoria > subcategoria MÊS A MÊS**, conforme o legado. Até porque **a execução do orçamento é analisada mensalmente**.
>
> **O mensal é a ENTRADA; o anual é o RESULTADO** (soma dos 12).

Prova anexada pela P.O.: no legado, "Assessoria Jurídica" tem **R$ 3.670,92 em cada um dos 12 meses**, e o anual da subcategoria é **R$ 44.051,04** = 3.670,92 × 12.

O defeito, portanto, não é "falta uma tela" — é que **o mês não existe no contrato**. Os 4 formulários de "Calculando Gastos" já estão construídos no front e hoje são _"órfãos — calculam e não gravam"_ (#454), porque com o alvo atual `(budgetId, subcategoryId)` os 12 POSTs colidiriam na mesma chave.

## Escopo

**Dentro:** acrescentar o **mês** ao alvo do cálculo e ao armazenamento do orçado; ler o grid do exercício com passador de mês; derivar o total anual como soma dos 12 nas visões que já existem (por Rede, Consolidado, Planejado do Insight).

**Fora:**

- Taxonomia de referência do Financeiro (#443) — **não é dependência**, ver Assumptions.
- Realizado do Insight (#416) — já entregue (PR #452).
- Relatórios (#114) — congelados pela P.O. em 2026-07-15.
- Parcelamento temporal (ADR-0048 / #233).
- Distribuição automática do anual nos 12 meses — **não existe**: o mensal é a entrada, não uma repartição do anual.
- Migração de dado legado — **sem objeto** (zero planos em todos os ambientes; ver "Verificação de volume").
- `DELETE /budget-plans/:id` (#453) e editar/desativar a estrutura de custo (#454, gap 3) — são os outros dois buracos do Orçamento, com escopo próprio.
- Corrigir o driver `memory` no deploy (**#374**) — dependência de **entrega**, tratada fora desta spec.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Orçar conta a conta, mês a mês (Priority: P1)

Como planejador, rodo o cálculo de uma conta para um mês específico — preenchendo os dados de entrada daquele mês — e o valor calculado fica guardado naquele mês, sem sobrescrever os outros.

**Why this priority**: é o núcleo do #413 e a única coisa que tira a tela do estado de placeholder. Destrava os 4 formulários de "Calculando Gastos", que o front já construiu e que hoje estão órfãos (#454: _"calculam e não gravam"_). Todas as demais histórias dependem desta.

**Independent Test**: rodar o cálculo da mesma conta em dois meses diferentes, recarregar, e conferir que cada mês guardou o seu valor — entregando por si só o fim da colisão que deixa os formulários órfãos.

**Acceptance Scenarios**:

1. **Given** um plano editável com a árvore de custos montada, **When** o planejador roda um cálculo para uma conta no mês de março, **Then** o sistema persiste o valor calculado associado àquela conta **e** àquele mês, e o devolve inalterado na leitura seguinte.
2. **Given** uma conta com valor já calculado em março, **When** o planejador roda o cálculo de novo para março com outros dados de entrada, **Then** apenas março é atualizado e os demais meses permanecem como estavam.
3. **Given** uma conta com valor calculado em março, **When** o planejador roda o cálculo para abril, **Then** os dois meses coexistem com valores independentes — **sem colisão** (é o defeito que a #454 aponta no alvo atual).
4. **Given** um plano no status **Aprovado**, **When** o planejador tenta rodar ou alterar qualquer cálculo mensal, **Then** o sistema rejeita a alteração, mantendo a regra de edição por status já vigente.
5. **Given** um valor mensal calculado, **When** o planejador o remove, **Then** o mês volta a não ter valor orçado, distinguível de "valor zero calculado".
6. **Given** um mês fora do intervalo do exercício (0, 13, negativo), **When** submetido, **Then** o sistema rejeita a entrada com erro tipado.
7. **Given** os mesmos dados de entrada aplicados aos 12 meses, **When** o planejador consulta o total anual da conta, **Then** o total é o valor mensal × 12 — reproduzindo a prova da P.O. na #454 ("Assessoria Jurídica": R$ 3.670,92 × 12 = R$ 44.051,04).

---

### User Story 2 - Ver o ano inteiro dividido por mês (Priority: P1)

Como planejador, visualizo o grid do exercício com as contas nas linhas e os meses nas colunas, navegando entre os meses sem recarregar o plano inteiro.

**Why this priority**: é a metade de leitura do mesmo destravamento. A P.O. especificou "grid anual com passador de mês (vê o ano inteiro dividido por mês), layout do legado". Sem a leitura, os dados da US1 existem mas não aparecem.

**Independent Test**: com valores semeados em vários meses e contas, abrir o grid e conferir que cada célula (conta, mês) mostra o valor correto e que o total de cada linha e de cada coluna fecha com a soma das células.

**Acceptance Scenarios**:

1. **Given** um plano com valores mensais informados, **When** o planejador abre a visão de Orçamento, **Then** vê cada conta com seus 12 meses e o total do ano por conta.
2. **Given** o grid aberto, **When** o planejador usa o passador de mês, **Then** navega entre os meses do exercício sem perder o contexto do plano.
3. **Given** contas sem nenhum valor informado, **When** o grid é exibido, **Then** essas contas aparecem com os meses vazios (não são omitidas do grid).
4. **Given** o grid aberto, **When** exibido, **Then** o total por mês (coluna) corresponde à soma das contas naquele mês.

---

### User Story 3 - Totais anuais consistentes nos consumidores existentes (Priority: P2)

Como gestor, vejo os totais já existentes (visão por Rede, Consolidado, Planejado do Insight) refletindo a soma dos valores mensais, sem divergir entre telas.

**Why this priority**: a visão "Por Rede" hoje já mostra o anual **correto** e é a única parte não-placeholder. Se o mensal virar a fonte e os totais não forem derivados dele, teremos dois números para a mesma coisa — exatamente o tipo de inconsistência invisível que precisamos evitar. É P2 porque depende da US1 estar de pé.

**Independent Test**: informar valores mensais, consultar a visão por Rede / Consolidado / Insight, e conferir que o anual apresentado é a soma exata dos meses.

**Acceptance Scenarios**:

1. **Given** uma conta com valores informados em vários meses, **When** o total anual é apresentado em qualquer visão, **Then** ele é igual à soma dos meses informados.
2. **Given** valores mensais alterados, **When** as visões são consultadas novamente, **Then** todas refletem o novo total, sem divergência entre elas.
3. **Given** um plano cujos valores mensais somam X, **When** o Consolidado agrega planos aprovados, **Then** a contribuição daquele plano é X.

---

### ~~User Story 4 - Migrar os planos que já existem~~ _(retirada — sem objeto)_

Prevista como P3, foi **retirada do escopo em 2026-07-15**: a contagem em todos os ambientes acessíveis encontrou **zero planos** (ver "Verificação de volume"). Não há total anual a preservar, logo não há migração de dado a fazer. A causa do vazio é a **#374** (módulo em driver `memory`), não desuso.

---

### Edge Cases

- **Conta removida da árvore com valores mensais gravados**: a árvore de custos é reescrita por inteiro a cada salvamento da estrutura. O que acontece com os valores mensais de uma conta que deixou de existir? Devem ser descartados junto, e a remoção deve ser visível ao usuário (não silenciosa).
- **Valor zero vs. valor ausente**: "orçado R$ 0,00 em julho" e "julho não orçado" são estados diferentes e devem permanecer distinguíveis.
- **Valores negativos**: o domínio hoje aceita IPCA negativo (deflação) e "barra só se o resultado final < 0" (`schemas.ts:279`). Confirmar que essa regra segue valendo por mês.
- **Concorrência**: dois planejadores rodando o cálculo do mesmo mês/conta simultaneamente — a última escrita vence, ou o conflito é reportado?
- **Recálculo do mesmo mês**: rodar o cálculo duas vezes para `(rede, conta, mês)` deve **atualizar**, não duplicar — hoje não há chave única que garanta isso.
- **Plano em Calibração derivado de um Aprovado**: a derivação deve copiar os 12 meses de cada conta, não apenas o total.
- **Cardinalidade**: rede × conta × 12 multiplica por 12 o volume de linhas do modelo atual — o grid precisa continuar respondendo dentro do aceitável.
- **Troca de modelo entre meses**: a mesma conta pode ser calculada por modelos diferentes em meses diferentes, ou o `model` é fixo por conta (herdado do `launchType` da subcategoria)?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema MUST associar cada valor orçado a um **mês** do exercício do plano, além da conta e da rede às quais já é associado hoje.
- **FR-002**: O sistema MUST permitir que o planejador informe os **dados de entrada do cálculo por mês**, na funcionalidade "Calculando Gastos" — é isso que a P.O. chama de "atribuir os valores manualmente": o planejador preenche os campos do modelo (salário e encargos, IPCA, nº de matrículas, passagem/diárias), e o sistema calcula o valor daquele mês.
- **FR-003**: O sistema MUST persistir cada valor mensal de modo que a leitura posterior devolva exatamente o valor calculado, sem perda ao recarregar.
- **FR-004**: O sistema MUST permitir alterar e remover o valor de um mês sem afetar os demais meses da mesma conta.
- **FR-005**: O sistema MUST rejeitar mês fora do intervalo do exercício.
- **FR-006**: O sistema MUST manter a regra de edição por status já vigente: plano **Aprovado** bloqueia alteração de valores mensais; **Rascunho** e **Em Calibração** permitem.
- **FR-007**: O sistema MUST apresentar o total anual de uma conta como a **soma dos seus valores mensais**, e MUST usar essa mesma soma em todas as visões que hoje mostram o anual (por Rede, Consolidado, Planejado do Insight) — sem segunda fonte de verdade para o mesmo número.
- **FR-008**: O **cálculo permanece server-side e continua sendo a fonte única** do valor orçado — o `FR-003` da spec 030 fica **intacto**. O que muda é o **alvo** do cálculo: onde hoje ele endereça `(rede, subcategoria)`, passa a endereçar `(rede, subcategoria, mês)`. Os 4 modelos (IPCA / CAED / DESPESAS*PESSOAIS / DESPESAS_LOGISTICAS) continuam calculando **e gravando**; o planejador roda o cálculo uma vez por mês, com os dados de entrada daquele mês. *(Decisão de 2026-07-15 — ver "Como se chegou ao FR-008" abaixo.)\_
- **FR-009**: **Não há dado a migrar.** A verificação em 2026-07-15 encontrou **zero registros** em todas as 7 tabelas do módulo, tanto no dev local quanto no **QA** (ver "Verificação de volume" abaixo). A migração parte do zero: nenhum backfill, nenhuma regra de atribuição de mês, nenhuma conversão de anual → mensal. **A US4 fica sem objeto** e deve ser retirada do escopo caso a produção confirme o mesmo. _(Pendente só a confirmação de produção.)_
- **FR-010**: O sistema MUST manter o valor monetário em centavos, sem perda de precisão, na escrita, na leitura e nas somas.
- **FR-011**: O sistema MUST distinguir "mês orçado com valor zero" de "mês não orçado".
- **FR-012**: Os erros MUST ser tipados e específicos (mês inválido, plano não editável, conta inexistente no plano).

### Grão do orçado

- **FR-013**: O grão do valor orçado mensal MUST ser **rede × subcategoria × mês** — o orçado "conta a conta" que a P.O. pediu. _(Decisão de 2026-07-15.)_ Consequências registradas:
  - É coerente com o modelo atual, que já orça por subcategoria (`budget_id` + `subcategory_id`); a mudança é acrescentar a dimensão de mês, não mudar o grão da conta.
  - **Diverge do legado**, que orça em centro de custo + categoria × mês e **não tem subcategoria** no payload real interceptado (`handbook/research/feture_propose/plano_orcamentario/back_referencia.md:124-137`: `{"costCenter": "Consultoria", "category": "A RECEBER", "months": {"1": 0.00, … "12": 0.00}}`). A **paridade de grão com o legado está abandonada por decisão** — o Success Criteria da spec 030 (`:74`) precisa ser revisto.
  - O grid do legado (categoria × mês) permanece obtenível por **agregação** das subcategorias, caso a P.O. queira as duas visões.

### Como se chegou ao FR-008 _(registro de uma leitura errada, corrigida)_

Uma primeira versão desta spec interpretou "o usuário atribui os valores **manualmente**" (fala da P.O.) como _"o planejador digita o valor final, e os 4 modelos viram preview não-vinculante"_ — o que **revogaria** o `FR-003` da spec 030 e reformularia o agregado. **Essa leitura estava errada.** Duas evidências a derrubam:

1. **O contrato já recebe os valores do planejador.** `src/modules/budget-plans/adapters/http/schemas.ts:282-285` define o alvo como `{ budgetId, subcategoryId }`, e cada modelo o estende com os **dados de entrada** (`baseValueInCents`, `ipca`, `numberOfEnrollments`, salário e encargos, passagem/diárias). "Atribuir manualmente" já é o que acontece: o planejador preenche os campos, o sistema calcula.
2. **A P.O., na issue #454 (2026-07-15):** _"O orçamento **é anual, vale pro ano todo**, porém o usuário **atribui os valores para centro de custo > categoria > subcategoria MÊS A MÊS**, conforme o legado. Até porque a execução do orçamento é analisada mensalmente."_ E: _"**O mensal é a ENTRADA; o anual é o RESULTADO** (soma dos 12)."_ A prova que ela anexou — "Assessoria Jurídica" com **R$ 3.670,92 em cada um dos 12 meses** e anual de **R$ 44.051,04** (= 3.670,92 × 12) — é o cálculo rodando doze vezes, não um número digitado à mão.

A #454 nomeia o defeito com precisão: os 4 formulários de "Calculando Gastos" **já estão construídos no front** e hoje são _"órfãos — calculam e não gravam"_, porque com o alvo `(budgetId, subcategoryId)` os 12 POSTs colidiriam na mesma chave. Daí a conclusão dela, que esta spec adota: _"**o mês precisa entrar no contrato**, não só no armazenamento"_.

**Consequências de adotar a leitura correta:**

- **A spec 030 fica intacta.** O `FR-003` (cálculo server-side como fonte única) é preservado, não revogado. Não há dívida documental a pagar na 030 por conta do FR-008.
- **O campo `model` continua fazendo sentido** — ele descreve como o valor foi produzido, e continua sendo verdade.
- **`BDG-BUDGET-CALC` (#317) não é retrabalho** — os 4 POSTs continuam gravando; ganham `month` no alvo.
- **A mudança é aditiva, não reformulação** — o que reduz materialmente o tamanho do #413.
- **A clarification pendente da 030** (`:37` — folha `DESPESAS_PESSOAIS` × "Qtd de {subcategoria}") **continua valendo e volta a ser bloqueante**, porque o cálculo segue persistindo: uma divergência de fórmula corrompe dado real.

### Dívida documental remanescente na spec 030

Só uma, e vem do FR-013 (grão), não do FR-008:

- **`specs/030-budget-plans-reproducao/spec.md:74`** — o Success Criteria _"Os 4 modelos de cálculo reproduzem o legado (teste de paridade contra Apêndice B)"_ precisa ser revisto: a paridade de **fórmula** continua exigida, mas a paridade de **grão** foi abandonada (o legado orça em categoria × mês; esta spec orça em subcategoria × mês).

### Key Entities _(include if feature involves data)_

- **Valor orçado mensal**: o resultado do cálculo de um dos 4 modelos para uma conta em um mês. Identificado por **rede + subcategoria + mês** (FR-013), onde hoje é identificado só por rede + subcategoria. Carrega o `model` que o produziu e o valor em centavos.
- **Dados de entrada do cálculo**: os campos que o planejador preenche por mês em "Calculando Gastos" (salário e encargos, IPCA, nº de matrículas, passagem/diárias — variam por modelo). Já existem no contrato; passam a ser informados por mês.
- **Exercício**: o ano do plano, que delimita os meses válidos (1..12).
- **Conta**: a **subcategoria** — folha da árvore de custos do plano. Já existe, é escopada ao plano e o Plano Orçamentário é seu owner.
- **Rede**: o recorte por Estado ou Município já existente; cada rede tem seu próprio conjunto de valores orçados.
- **Total anual**: **derivado**, nunca armazenado — a soma dos 12 meses (FR-007). _"O mensal é a ENTRADA; o anual é o RESULTADO"_ (P.O., #454).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% dos valores informados no grid sobrevivem a um recarregamento da página — a perda de dados relatada na issue #413 vai a zero.
- **SC-002**: O total anual apresentado em qualquer visão (por Rede, Consolidado, Insight) é igual à soma dos meses informados em **100%** dos casos, sem divergência entre telas.
- **SC-003**: O planejador consegue orçar uma conta nos 12 meses e conferir o total do ano sem sair da tela de Orçamento.
- **SC-004**: A tela de Orçamento deixa de ser placeholder e os **4 formulários de "Calculando Gastos" deixam de ser órfãos** — cada um grava o valor no mês para o qual foi rodado.
- **SC-005**: Rodar o cálculo dos 12 meses de uma conta com os mesmos dados de entrada produz total anual igual ao valor mensal × 12 — reproduzindo a prova da P.O. (R$ 3.670,92 × 12 = R$ 44.051,04).
- **SC-006**: O grid de um plano no maior volume real (redes × contas × 12 meses) carrega sem degradação perceptível ao planejador.

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: **Plano Orçamentário (`bgp_*`)** — apenas. Não toca Contratos (`ctr_*`), Financeiro (`fin_*`), Auth (`auth_*`) nem Parceiros (`partners_*`). O isolamento (ADR-0014) é respeitado: um único BC.
  - A conta (subcategoria) é **escopada ao plano** e o `budget-plans` é o **owner** da árvore — `handbook/domain_questions/financeiro/07-categorization-taxonomy.md:5-7`. Nenhuma leitura cross-módulo é necessária.
- **Novos agregados / Value Objects?**: um VO de **mês do exercício** (1..12) com smart constructor e `Result<T,E>`. O agregado `BudgetResult` **não muda de natureza** — segue sendo o resultado do cálculo server-side; ganha a dimensão de mês na sua identidade (rede + subcategoria + **mês**). O campo `model` **permanece** (continua descrevendo como o valor foi produzido). Mudança **aditiva**, não reformulação.
- **Novos eventos de domínio (outbox)?**: nenhum previsto. O `bgp_outbox` só publica `BudgetPlan`; o Realizado (#416) já lê via port/ACL sem evento. Reavaliar no `/speckit-plan` se algum consumidor precisar do mensal.
- **Novos subcomandos de CLI?**: N/A — CLI embutida removida (ADR-0037).
- **Borda HTTP envolvida?**: **sim** — Fastify + Zod (ADR-0025 / ADR-0027), contrato de escrita e leitura do grid mensal.
- **Possíveis violações da constituição (I–VIII)?**:
  - ⚠️ **A opção 1 sugerida na issue #413 ("JSON de 12 posições no `budget_result`") é PROIBIDA** — ADR-0020 veta JSON nativo. A dimensão mensal precisa ser modelada relacionalmente (linha por mês ou coluna por mês), nunca como documento JSON.
  - Sem ENUM nativo (VARCHAR + CHECK), Money em bigint centavos, prefixo `bgp_*` — todos já vigentes no módulo, sem exceção pedida aqui.
  - **Sem conflito com a spec 030**: o FR-008 **preserva** o FR-003 da 030 (cálculo server-side como fonte única). A única dívida documental é o Success Criteria `:74` (paridade de **grão**, não de fórmula) — decorre do FR-013. Registrar no `/speckit-plan`.
  - **Borda HTTP — mudança de contrato**: `budgetResultTargetSchema` (`src/modules/budget-plans/adapters/http/schemas.ts:282-285`) ganha `month`. É **breaking** para os 4 POSTs de `/budget-results/{modelo}`; o front já espera isso (#454) e não há dado em produção (ver "Verificação de volume"), então não requer versionamento nem convivência.

## Assumptions

- **O #443 não é dependência desta feature.** A decisão da P.O. anotou o #413 como dependente da taxonomia, mas a verificação no código e no handbook mostra que são taxonomias **paralelas**: o `budget-plans` é owner da sua árvore per-plano (`bgp_cost_centers → bgp_categories → bgp_subcategories`), enquanto o #443 semeia a taxonomia de **referência global** do Financeiro (`fin_cost_centers` + `fin_categories`), consumida no lançamento e na conciliação — `07-categorization-taxonomy.md:11`. A unificação das duas é **follow-up explicitamente adiado** (`:21`). O grid mensal não cruza fronteira de módulo e pode ser construído sem o #443.
- **A árvore de custos já existe e não muda aqui.** Centro de Custo → Categoria → Subcategoria foi entregue na Fatia 2 (#316) e é montada pelo próprio planejador no CRUD do plano.
- **O mensal é por rede.** O valor orçado hoje já é por rede (Estado/Município); assume-se que o mensal preserva esse recorte, resultando em rede × conta × mês. O grid é exibido no contexto de uma rede por vez, como hoje.
- **Não há distribuição do anual nos 12 meses** — o mensal é a **entrada** e o anual é o **resultado** (#454), não o contrário. Qualquer repartição automática seria escopo novo e contraria a P.O.
- **O exercício é o ano civil** (12 meses, janeiro a dezembro), coerente com o `year` do plano e com o legado.
- **A derivação de cenário (start-calibration) copia os meses**, não apenas totais.
- **O front não é o gargalo.** A #454 registra que o Orçamento está inteiro no front — grid, modal de estrutura, os 4 formulários de cálculo, o modal de despesas por mês. Liga sozinho quando o contrato aceitar o mês.

## Dependências

- **Nenhuma bloqueia a construção.**
- **#443 (taxonomia)** — verificado: **não é dependência** (ver Assumptions).
- **#374 (driver `memory` no deploy)** — **bloqueia a entrega, não a construção.** Sem `BUDGET_PLANS_DRIVER`/`_DATABASE_URL`, o mensal é implementado e o planejador continua perdendo tudo no restart. Ver "Por que está zerado".
- **#416 (Realizado)** já entregue (PR #452) — o Planejado do Insight passa a somar os meses (FR-007); o Realizado não muda.
- **#454** é a issue guarda-chuva do Orçamento e contém a formulação canônica da P.O. Os outros dois gaps que ela lista (#453 excluir plano; editar/desativar estrutura) têm escopo próprio.
- **Decisões de negócio**: FR-008 e FR-013 **resolvidas em 2026-07-15**; FR-009 fechado por verificação.

## Verificação de volume _(2026-07-15 — fecha o FR-009)_

Contagem real das tabelas do módulo. O x99 estava offline; a verificação correu no **dev local (OrbStack)** e no **QA** (`erp-bem-comum-qa`, via Tailscale, read-only).

| Tabela               | Dev local |  QA |
| :------------------- | --------: | --: |
| `bgp_budget_plans`   |         0 |   0 |
| `bgp_budgets`        |         0 |   0 |
| `bgp_budget_results` |         0 |   0 |
| `bgp_cost_centers`   |         0 |   0 |
| `bgp_categories`     |         0 |   0 |
| `bgp_subcategories`  |         0 |   0 |
| `bgp_outbox`         |         — |   0 |

**O QA não está vazio — o módulo é que nunca foi usado.** No mesmo banco: `fin_documents` = 9, `fin_payables` = 8, `fin_reconciliations` = 18, `auth_permission` = 42, `prg_programs` = 1. As 6 migrations do `budget_plans` estão aplicadas (`__drizzle_migrations_budget_plans` = 6), logo o schema existe e está pronto — **nunca se criou um único plano orçamentário**.

**Consequências:**

- **FR-009 e US4 ficam sem objeto** — não há total anual a preservar. A migração é greenfield.
- **O `bgp_outbox` está zerado**, confirmando que nenhum evento de plano jamais foi publicado.
- **Liberdade de modelagem no `/speckit-plan`**: sem dado a preservar, acrescentar `month` ao `BudgetResult` e ao contrato dos 4 POSTs não precisa de convivência, versionamento de API nem migração incremental — mesmo sendo breaking.

### Por que está zerado: a causa raiz (issue #374)

**O módulo roda com driver `memory` em QA e em produção.** `src/server.ts:225-233` só liga o MySQL com `BUDGET_PLANS_DRIVER=mysql` **+** `BUDGET_PLANS_DATABASE_URL`; sem as duas, cai em `memory` — **em silêncio**, sem warning e sem falhar o boot. Verificado:

- **QA:** o environ do PID 1 do `erp-bem-comum-qa-core-api-1` tem driver + URL para auth, contracts, financial, partners e programs, e **nada** para budget-plans. Fonte: `/opt/erp-qa/compose.yaml:74-78`, que declara 5 drivers e omite o do budget-plans.
- **Produção:** `ERP-INFRA/platform/aws-ecs-prod/taskdefs/api.taskdef.json` tem a mesma lacuna. _(Ressalva: é template com placeholders; se alguém setou a env à mão no console AWS, muda — não há acesso ao RDS para medir.)_

> ⚠️ **Gotcha de verificação:** `docker exec <container> env` **não** mostra as `*_DATABASE_URL` (injetadas em runtime) e induz à conclusão errada de que nenhum módulo tem URL. Use `tr '\0' '\n' < /proc/1/environ`.

Isso está registrado na **#374** (aberta antes desta spec, com evidência de QA/prod acrescentada em 2026-07-15) e **é dependência real de entrega** desta feature: sem as envs, o mensal é implementado e o planejador continua perdendo tudo no primeiro restart. O mesmo defeito já reincidiu no **#444** (`REPORTS_DRIVER`) — dois módulos novos com o mesmo furo, invisível pelo mesmo motivo.

**Achado colateral (confirma o #443):** o QA tem `fin_categories` = 11 e `fin_cost_centers` = 5 — exatamente os números que a issue #443 reporta. O diagnóstico dela foi levantado contra este ambiente e está correto.

**Divergência esclarecida:** a issue #413 afirma que _"o DETALHE 'Por Rede' já exibe o ANUAL real"_. Com zero linhas no banco, esse número veio do **estado em memória do processo**. A #454 fecha a questão ao registrar que a validação da P.O. foi feita **no ambiente local**, _"onde a env está setada e o módulo funciona"_. Nada de mock — mas nada persistido também.

## Decisões registradas

| #      | Decisão                    | Resultado                                                                                                                                                                                        | Data       |
| :----- | :------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------- |
| FR-008 | Regime de valor            | **O alvo do cálculo ganha o mês.** Cálculo segue server-side e gravando; FR-003 da 030 **preservado**; mudança aditiva. Corrige uma leitura errada de "manual" (ver "Como se chegou ao FR-008"). | 2026-07-15 |
| FR-013 | Grão do orçado             | **Rede × subcategoria × mês** ("conta a conta") — confirmado pela P.O. na #454. Abandona a paridade de **grão** com o legado (a de fórmula continua).                                            | 2026-07-15 |
| FR-009 | Migração dos planos atuais | **Sem objeto** — dev local e QA com **zero** planos (verificado). A causa é a #374 (driver `memory`), não falta de uso. Migração é greenfield; **US4 retirada do escopo**.                       | 2026-07-15 |
| —      | Dependência do #443        | **Inexistente** — taxonomias paralelas, verificado no código e no handbook. Não bloqueia.                                                                                                        | 2026-07-15 |
| —      | Dependência do #374        | **Real, mas externa a esta spec** — sem `BUDGET_PLANS_DRIVER`/`_DATABASE_URL` no deploy, o mensal é implementado e o dado continua sumindo. Bloqueia a **entrega**, não a construção.            | 2026-07-15 |

## Próximo passo spec-kit

`/speckit-plan` — a spec está pronta. O plano precisa decidir:

1. **A forma relacional da dimensão mensal** em `bgp_budget_results` — linha por mês (12 linhas por conta/rede) vs. coluna por mês (12 colunas). **Nunca JSON** (ADR-0020 veta JSON nativo, apesar de a issue #413 sugerir "JSON de 12 posições"). Definir também a chave única `(budget_id, subcategory_id, month)`, que hoje não existe.
2. **O contrato HTTP** — `month` em `budgetResultTargetSchema` (`adapters/http/schemas.ts:282-285`), herdado pelos 4 POSTs; e a leitura do grid com o passador de mês.
3. **Escrita idempotente por mês** — rodar o cálculo duas vezes para o mesmo `(rede, conta, mês)` deve atualizar, não duplicar (SELECT-then-UPDATE-or-INSERT; `ON DUPLICATE KEY UPDATE` é permitido por ADR-0020, mas a convenção do módulo é a primeira).
4. **A cardinalidade** rede × subcategoria × 12 e o impacto no carregamento do grid (SC-006).
5. **A atualização da spec 030** — só o Success Criteria `:74` (paridade de grão). O FR-003 fica intacto.
6. **A clarification pendente da 030** (`:37`, folha `DESPESAS_PESSOAIS` × "Qtd de {subcategoria}") — volta a ser bloqueante, já que o cálculo segue persistindo.

**`/speckit-clarify` é dispensável** — as lacunas bloqueantes foram decididas e o FR-009 foi fechado por verificação.

**Dependência de entrega (fora desta spec):** a **#374** precisa ser resolvida para o mensal chegar ao usuário — sem `BUDGET_PLANS_DRIVER`/`_DATABASE_URL` no deploy, o módulo segue em `memory` e o dado continua sumindo no restart.
