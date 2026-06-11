# Feature Specification: Contagem de contratos/aditivos por parceiro nos grids

**Feature Branch**: `feat/backlog-residual-sdd`

**Created**: 2026-06-11

**Status**: Draft

**Input**: Ticket `handbook/tickets/todo/PAR-GRID-CONTRACTS-COUNT.md` — resíduo (≈30%) consolidado de
`PAR-COLLABORATOR-GRID-GAPS` + `PAR-GRID-FILTROS-EXPORT` após verificação em código. Os grids de Parceiros
(Colaborador, Fornecedor, ACT) exibem `—` na coluna **Contratos/Aditivos** porque o backend não traz a
contagem dos contratos que referenciam o parceiro como **contratado**; e o grid de Fornecedor não tem o
filtro **"Status de contrato"**.

## Clarifications

### Session 2026-06-11

- Q: A coluna mostra contratos, aditivos ou os dois? → A: **Os dois** — cada item de lista expõe
  `contractsCount` **e** `amendmentsCount`.
- Q: Quais estados de contrato entram na contagem? → A: **Todos** — conta qualquer contrato que referencie o
  parceiro como contratado, em qualquer estado (inclusive Cancelado). Os aditivos contam os desses contratos.
- Q: R3 — filtro "Programa" no grid de Colaborador exige modelar o vínculo colaborador↔programa (inexistente
  no domínio). Fazer agora ou adiar? → A: **Modelar agora** — o vínculo colaborador↔programa entra **nesta**
  feature (referência por ID ao módulo `programs`, ADR-0014: domínio + schema/migration + borda + filtro).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Coluna Contratos/Aditivos preenchida nos grids de parceiros (Priority: P1)

Um gestor abre a lista de Colaboradores (ou Fornecedores, ou Acordos) e quer ver, em cada linha, **quantos
contratos** aquele parceiro tem como contratado (e quantos aditivos). Hoje a coluna mostra `—` porque o dado
não vem do backend. O esperado é que cada item da lista traga a **contagem real** de contratos e de aditivos
vinculados àquele parceiro.

**Why this priority**: É o núcleo do ticket — a coluna `—` é o que bloqueia a tela. Entregar isto já resolve
a dor principal nos três grids.

**Independent Test**: criar um parceiro referenciado por N contratos (com M aditivos no total), listar o
grid e confirmar que a linha daquele parceiro mostra contratos=N e aditivos=M.

**Acceptance Scenarios**:

1. **Given** um colaborador referenciado como contratado por 3 contratos (com 5 aditivos no total),
   **When** o grid de Colaboradores é listado, **Then** a linha dele traz contratos=3 e aditivos=5.
2. **Given** um fornecedor sem nenhum contrato, **When** o grid de Fornecedores é listado, **Then** a linha
   dele traz contratos=0 e aditivos=0.
3. **Given** um acordo (ACT) referenciado por contratos, **When** o grid de Acordos é listado, **Then** a
   linha traz a contagem correta.
4. **Given** uma página com vários parceiros, **When** o grid é listado, **Then** as contagens de todos os
   itens da página são obtidas de uma só vez (sem uma consulta por linha).

---

### User Story 2 - Filtro "Status de contrato" no grid de Fornecedores (Priority: P2)

Um gestor quer filtrar a lista de Fornecedores por **situação contratual** — por exemplo, "fornecedores com
contrato vigente" ou "fornecedores sem contrato". Hoje esse filtro está desabilitado no front por falta de
suporte no backend.

**Why this priority**: complementa a US1 (reusa o mesmo vínculo fornecedor↔contrato) e destrava um filtro do
grid de Fornecedores. Secundário porque a coluna de contagem (US1) é o que mais dói.

**Independent Test**: marcar o filtro de status de contrato e confirmar que a lista retorna apenas os
fornecedores que satisfazem aquela situação contratual.

**Acceptance Scenarios**:

1. **Given** fornecedores com e sem contrato vigente, **When** o filtro "com contrato vigente" é aplicado,
   **Then** a lista retorna apenas os que têm contrato vigente.
2. **Given** o mesmo conjunto, **When** o filtro "sem contrato" é aplicado, **Then** a lista retorna apenas
   os que não têm nenhum contrato.

---

### User Story 3 - Filtro "Programa" no grid de Colaboradores (Priority: P3)

Um gestor quer filtrar a lista de Colaboradores pelo **Programa** ao qual estão vinculados. Hoje esse filtro
está desabilitado no front porque o Colaborador **não tem vínculo com Programa** no backend. Esta história
modela o vínculo (referência ao módulo de Programas) e habilita o filtro.

**Why this priority**: depende de modelar um vínculo de domínio novo (Colaborador→Programa) — é o item de
maior custo/risco da feature e o mais isolável dos demais. Por isso fica por último.

**Independent Test**: vincular um colaborador a um programa, aplicar o filtro por aquele programa e confirmar
que a lista retorna apenas os colaboradores daquele programa.

**Acceptance Scenarios**:

1. **Given** colaboradores vinculados a programas distintos (e alguns sem programa), **When** o filtro por um
   programa específico é aplicado, **Then** a lista retorna apenas os colaboradores daquele programa.
2. **Given** um colaborador sem programa, **When** nenhum filtro de programa é aplicado, **Then** ele aparece
   normalmente; **When** um filtro de programa é aplicado, **Then** ele não aparece.
3. **Given** o cadastro/edição de um colaborador, **When** um programa é informado por referência, **Then** o
   vínculo é persistido e refletido nas leituras.

---

### Edge Cases

- **Parceiro sem contratos**: contagem = 0 (não omitir a linha; não mostrar `—`).
- **Contratos cancelados/encerrados**: a definição de quais estados de contrato contam é uma decisão de
  produto (ver Assumptions) — a contagem deve ser consistente com essa definição.
- **Página grande**: a contagem dos itens da página é obtida em **lote** (uma operação), nunca uma consulta
  por linha (proteção contra degradação N+1).
- **Parceiro de outro tipo**: a contagem é por (tipo de contratado + id) — um colaborador e um fornecedor
  com ids distintos nunca compartilham contagem.
- **Aditivos**: contam-se os aditivos dos contratos daquele parceiro (não aditivos "soltos").

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Cada item das listas de **Colaboradores**, **Fornecedores** e **Acordos (ACT)** MUST expor a
  **quantidade de contratos** em que o parceiro figura como contratado e a **quantidade de aditivos** desses
  contratos.
- **FR-002**: As contagens MUST ser obtidas do módulo de Contratos **sem acoplar** os módulos além do
  contrato público already estabelecido (a listagem de parceiros não acessa o estado interno de contratos —
  apenas pede a contagem por contratado).
- **FR-003**: A contagem dos itens de uma página MUST ser resolvida em **lote** (uma única operação para
  todos os ids da página), sem uma consulta por linha.
- **FR-004**: Um parceiro sem contratos MUST aparecer com contagem **0** (contratos=0, aditivos=0) — nunca
  omitido nem exibido como indefinido.
- **FR-005**: A contagem MUST ser por **(tipo de contratado, id do parceiro)** — não pode haver vazamento de
  contagem entre parceiros de tipos/ids diferentes.
- **FR-006**: O grid de **Fornecedores** MUST oferecer um filtro por **situação contratual** que restrinja a
  lista aos fornecedores que satisfazem a situação selecionada.
- **FR-007**: A contagem (FR-001) MUST considerar **todos os contratos** que referenciam o parceiro, em
  **qualquer estado** (inclusive Cancelado); os aditivos contados são os desses contratos. O filtro de
  situação contratual do Fornecedor (FR-006) é uma operação **distinta**, parametrizada pelo estado escolhido.
- **FR-008**: O agregado **Colaborador** MUST passar a referenciar um **Programa** por ID (referência leve ao
  módulo `programs`, sem importar seu domínio — ADR-0014); o vínculo é **opcional** (colaborador pode não ter
  programa). Cadastro/edição do colaborador MUST aceitar/preservar essa referência.
- **FR-009**: O grid de **Colaboradores** MUST oferecer um filtro por **Programa** que restrinja a lista aos
  colaboradores vinculados ao(s) programa(s) selecionado(s).

### Key Entities _(include if feature involves data)_

- **Parceiro** (Colaborador / Fornecedor / Acordo): já existente; ganha, na projeção de lista, os campos
  derivados **contratos (contagem)** e **aditivos (contagem)**.
- **Contrato**: já existente; referencia um **contratado** por (tipo, id). A feature precisa da **consulta
  inversa**: dado um conjunto de contratados, quantos contratos (e aditivos) cada um possui.
- **Vínculo contratado→contagem**: projeção de leitura (read-model) exposta pelo módulo de Contratos para
  consumo por outros módulos — **não existe hoje** e é o coração desta feature.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% das linhas dos grids de Colaborador, Fornecedor e ACT exibem a contagem real de contratos
  e aditivos (0 quando não há), sem `—`.
- **SC-002**: A listagem de uma página de N parceiros resolve as contagens em **1 operação de contagem**
  (não N) — verificável por contagem de consultas/chamadas.
- **SC-003**: O filtro de situação contratual do grid de Fornecedores retorna exatamente o subconjunto
  correto (0 falsos positivos/negativos) para cada situação suportada.
- **SC-004**: Nenhuma contagem vaza entre parceiros de tipos/ids diferentes (0 cross-contamination).
- **SC-005**: Após vincular colaboradores a programas, o filtro por programa do grid de Colaboradores retorna
  exatamente o subconjunto vinculado (0 falsos positivos/negativos); colaboradores sem programa nunca casam
  um filtro de programa.

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [x] Contratos (`ctr_*`) · [ ] Financeiro · [ ] Auth · [x] Parceiros
  (`par_*`)
  - ⚠️ **Dois BCs** — justificado: a contagem é **dado de Contratos**, consumido por **Parceiros**. O
    acoplamento é **unidirecional e por contrato público** (Parceiros → `contracts/public-api`), exatamente
    o padrão sancionado pelo ADR-0006 para leitura cross-módulo (já usado pelo bloco `contractor` no sentido
    inverso). Não há leitura cruzada de tabelas nem import de `domain`/`application` alheio.
- **Novos agregados / Value Objects?**: Nenhum agregado novo. (1) Surge uma **projeção de leitura** (read
  port) no `contracts/public-api`: "contagem de contratos/aditivos por contratado". (2) O agregado
  **Colaborador** ganha uma **referência opcional a Programa** (`programId`, UUID — ref leve cross-módulo,
  sem importar `programs/domain`; ADR-0014).
- **Novos eventos de domínio (outbox)?**: Não — contagem é leitura síncrona sob demanda; o vínculo de
  programa é cadastro (não evento novo nesta feature).
- **Novos subcomandos de CLI?**: N/A (ADR-0037).
- **Borda HTTP envolvida?**: Sim, **aditivo** — (a) os list items dos grids de Parceiros (`/api/v1/...`)
  incluem `contractsCount`/`amendmentsCount`; (b) o item/cadastro de Colaborador inclui `programId`; (c) a
  query de listagem de Colaboradores aceita filtro por programa. Sem rota nova.
- **Migration (ADR-0020)**: `par_collaborators` ganha a coluna `program_id` (`varchar(36)` nullable). Gerada
  via `pnpm run db:generate:partners` (nunca SQL à mão); ref leve, sem FK física cross-módulo (ADR-0014).
- **Possíveis violações da constituição (I–VIII)?**: Nenhuma — cross-módulo via `public-api`/ref por ID
  (ADR-0006/0014); MySQL único; domínio puro; contagem em lote (sem N+1). ⚠️ Toca **3 BCs** (contracts +
  partners + ref a programs) — justificado: leitura por contrato público (contagem) + ref leve por ID
  (programa), padrões sancionados; sem leitura cruzada de tabelas nem import de domínio alheio.

## Assumptions

- **A coluna mostra os dois números** (contratos **e** aditivos) — resolvido (Clarifications): expõe
  `contractsCount` + `amendmentsCount`.
- **Quais contratos contam** — resolvido (Clarifications): **todos os estados** (inclusive Cancelado). A
  contagem é state-agnostic; o filtro de situação do Fornecedor (FR-006) é a operação state-specific.
- **R3 — vínculo Colaborador↔Programa** — resolvido (Clarifications): **entra nesta feature**. Modela-se a
  referência `programId` (UUID) no Colaborador + coluna `program_id` em `par_collaborators` (migration) +
  cadastro/edição + filtro na listagem. Referência leve por ID (ADR-0014), sem FK física nem import de
  `programs/domain`. ⚠️ É o eixo de maior custo/tamanho da feature (US3, P3).
- **Já entregue (fora de escopo, verificado em código)**: filtros do colaborador
  (educations/races/genderIdentities/disableReasons/occupationAreas/employmentRelationships/roles/
  yearOfContract), filtros do ACT (hasFinancialTransfer/occupationArea), export CSV dos 4 submódulos, import
  CSV de colaboradores. **Idade** do colaborador foi adiada de propósito — não reabrir.
- **Front**: liga a coluna e o filtro quando o backend expor; nenhuma regra de negócio nova no front.
