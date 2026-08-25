# Feature Specification: Dados de referência de categorização (Programa / Categoria / Centro de custo)

**Feature Branch**: `020-fin-categorization-ref`

**Created**: 2026-06-20

**Status**: Draft

**Input**: User description: "#142 dados de referência de categorização"

## User Scenarios & Testing _(mandatory)_

O ator é o **operador financeiro** (Contas a Pagar / Conciliação). Em três telas — lançamento manual de transação (#124), tratamento da diferença na conciliação (#5) e categorização do documento no Lançar Documento (#147) — ele precisa **classificar** o registro por Categoria, Centro de custo e Programa. Hoje esses selects não têm dados estáveis para popular (exceto Programa, que já existe). Esta feature entrega as **listas de referência** consumíveis pelo módulo financeiro.

### User Story 1 - Selecionar Categoria agrupada (Priority: P1)

Ao classificar um lançamento/documento, o operador abre o select de **Categoria** e vê as opções **agrupadas por natureza** — Despesas, Receitas e Ajustes — exatamente como no protótipo (§9.4.5). Ele escolhe uma categoria estável (mesmo `id` entre sessões), que é gravada no registro financeiro.

**Why this priority**: É a classificação central de qualquer lançamento; sem ela, o select fica desabilitado e o operador não consegue categorizar. Desbloqueia #124, #5 e #147 de uma vez.

**Independent Test**: Listar as categorias e confirmar que vêm agrupadas (despesa/receita/ajuste), com `id`/`name` estáveis, prontas para um select — sem depender das outras duas listas.

**Acceptance Scenarios**:

1. **Given** a base de referência povoada, **When** o financeiro solicita as categorias, **Then** recebe a lista com cada item contendo `id`, `name` e `group` ∈ {despesa, receita, ajuste}.
2. **Given** uma categoria já usada num lançamento, **When** ela é listada novamente em outra sessão, **Then** mantém o mesmo `id` (estabilidade referencial).

---

### User Story 2 - Selecionar Centro de custo (Priority: P1)

O operador abre o select de **Centro de custo** e vê os centros cadastrados (ex.: CC-001 Administrativo, CC-002 Programa Saúde), com código + nome, e escolhe um para o registro.

**Why this priority**: Centro de custo é dimensão obrigatória do rateio financeiro no protótipo; sem a lista, o campo fica inerte.

**Independent Test**: Listar os centros de custo e confirmar `id`/`name` (e código) estáveis, independente das outras listas.

**Acceptance Scenarios**:

1. **Given** centros de custo cadastrados, **When** o financeiro os solicita, **Then** recebe a lista com `id` e `name` estáveis para o select.

---

### User Story 3 - Selecionar Programa (Priority: P2)

O operador abre o select de **Programa** (ex.: Saúde Comunitária, Educação Infantil, Captação) e escolhe um. O Programa **já possui fonte canônica** no sistema; esta história garante que o financeiro o consome pela mesma natureza de dado das outras duas listas (consistência de contrato), via leitura cross-módulo.

**Why this priority**: Programa já está funcional para o front em outra tela; aqui é alinhamento de contrato/consistência, não habilitação nova — daí P2.

**Independent Test**: Listar os programas pelo financeiro e confirmar `id`/`name` estáveis, consistentes com a fonte existente.

**Acceptance Scenarios**:

1. **Given** programas cadastrados na fonte canônica, **When** o financeiro os solicita, **Then** recebe a lista com `id`/`name` estáveis, sem duplicar a fonte.

### Edge Cases

- Lista vazia (nenhuma categoria/centro/programa cadastrado) → retorna lista vazia, sem erro; o select aparece vazio (não quebrado).
- Item referenciado por um lançamento e depois inativado → o lançamento histórico preserva o `id`/label gravado; o item some das **novas** listas (não rompe o histórico).
- Categoria sem grupo definido → não deve ocorrer (grupo é obrigatório); se ocorrer no dado, é rejeitado/normalizado na borda, nunca exposto sem grupo.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O módulo financeiro MUST expor uma leitura da lista de **Categorias**, cada item com `id` estável, `name` e `group` ∈ {despesa, receita, ajuste}.
- **FR-002**: O módulo financeiro MUST expor uma leitura da lista de **Centros de custo**, cada item com `id` estável e `name` (código + descrição).
- **FR-003**: O módulo financeiro MUST expor uma leitura da lista de **Programas**, cada item com `id` estável e `name`, **sem duplicar** a fonte canônica existente (consumo/passthrough).
- **FR-004**: As listas MUST ter `id` estável entre chamadas e ordenação determinística (por `name` ou código), o suficiente para popular um `select`.
- **FR-005**: As Categorias MUST vir **agrupadas** pela natureza (despesa/receita/ajuste) para o front renderizar os grupos do protótipo (§9.4.5).
- **FR-006**: Itens inativados MUST sair das listas de seleção **sem** apagar/alterar o que já foi gravado em lançamentos históricos (estabilidade referencial — o registro guarda o `id`/label do momento).
- **FR-007**: Lista vazia MUST retornar vazio sem erro (select vazio, não quebrado).
- **FR-008**: A leitura é **somente leitura** pela borda financeira (esta feature não oferece tela de cadastro/edição). **Decisão (2026-06-20):** a fonte canônica de **Categoria** e **Centro de custo** vive **local no financeiro** (`fin_*`), povoada por seed/migração — o financeiro **possui e expõe** essas duas listas. **Programa** continua sendo **consumido por leitura cross-módulo** da fonte canônica existente (módulo de programas), sem duplicar. Revisitável: se Categoria/CC virarem dimensões org-wide, migram para um dono compartilhado via novo ADR.

### Key Entities _(include if feature involves data)_

- **Categoria de classificação**: opção de classificação financeira; atributos: identidade estável, nome exibível, grupo (despesa | receita | ajuste), situação (ativo/inativo). Agrupada por natureza.
- **Centro de custo**: dimensão de rateio; atributos: identidade estável, código, nome, situação. Possivelmente compartilhada com outras dimensões organizacionais.
- **Programa** (referência externa): já modelado na fonte canônica existente; o financeiro o referencia por identidade (sem possuir o dado).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: O operador consegue popular e selecionar valores nos três selects (Categoria, Centro de custo, Programa) das telas de lançamento manual, tratamento de diferença e categorização do documento — sem campos desabilitados por falta de dado.
- **SC-002**: 100% dos itens retornados têm `id` estável entre sessões (um item selecionado hoje é encontrável amanhã pelo mesmo `id`).
- **SC-003**: As Categorias aparecem agrupadas em despesa/receita/ajuste em 100% das respostas (nenhum item sem grupo).
- **SC-004**: Nenhuma duplicação da fonte de Programa — o dado de Programa exibido é consistente com a fonte canônica existente (mesma lista, mesmos ids).
- **SC-005**: Desbloqueio mensurável: as tarefas #124 (lançamento manual), #5 (tratamento da diferença) e #147 (categorização do documento) deixam de ter selects honestos/desabilitados por ausência de dados de referência.

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [ ] Contratos (`ctr_*`) · [x] Financeiro (`fin_*`) · [ ] Auth (`auth_*`) · [ ] Parceiros (`partners_*`)
  - O **consumo** é do financeiro. Se a fonte de Categoria/Centro de custo for um **módulo de referência/Orçamento** distinto, a leitura cross-módulo MUST ser via **public-api** (ADR-0006), nunca tocando tabelas de outro módulo direto (ADR-0014) — espelhando o read-port `ContractCategorizationReadPort` (#178). Programa já é consumido da sua fonte canônica (módulo de programas) por identidade.
- **Novos agregados / Value Objects?**: Possivelmente `Category` (com `group`) e `CostCenter` como dados de referência (entidades simples de leitura). Programa é referência externa (sem agregado novo no financeiro). A modelagem definitiva depende da decisão de fonte canônica (FR-008).
- **Novos eventos de domínio (outbox)?**: Não previsto — feature de leitura de referência (sem mutação de agregado de domínio que dispare evento cross-módulo).
- **Novos subcomandos de CLI?**: N/A (UX é HTTP — ADR-0037).
- **Borda HTTP envolvida?**: Sim — endpoint(s) de leitura `GET` das listas, atrás do RBAC do financeiro (read). Contrato Zod (ADR-0027).
- **Possíveis violações da constituição (I–VIII)?**: Atenção ao **5º módulo**: se a decisão for "módulo de referência compartilhado", isso é um novo BC — exige justificativa/ADR. A opção "dados locais do financeiro" evita novo módulo. Sem JSON nativo, sem Redis/Kafka.

## Assumptions

- **Programa**: a fonte canônica **já existe** no módulo de programas (consumido pelo front em outra tela via `listProgramsFn`). Esta feature **não** recria Programa — apenas o disponibiliza ao financeiro pela mesma natureza de contrato, por leitura cross-módulo (ADR-0006).
- **Categoria** e **Centro de custo**: **não existem** hoje em nenhum módulo (verificado: zero tabelas de referência). **Decisão A (2026-06-20):** ficam **locais no financeiro** (`fin_categories` / `fin_cost_centers`), povoadas por seed/migração — sem inventar módulo novo (YAGNI). Ver FR-008.
- O **cadastro/administração** dos itens de referência (CRUD) está **fora do escopo** desta feature; aqui é só a **leitura** consumível pelo financeiro. O povoamento inicial pode ser por seed/migração até existir uma tela de administração.
- Estabilidade referencial: registros financeiros guardam o `id` (e label desnormalizado, se necessário) do item escolhido no momento — inativar um item de referência não corrompe o histórico (mesmo princípio do label desnormalizado do histórico do colaborador, #126).
- Esta feature **desbloqueia** #147 (categorização editável do documento) e atende #124/#5 (categorização no lançamento manual e no tratamento da diferença).
