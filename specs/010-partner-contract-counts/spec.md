# Feature Specification: Contagem de contratos/aditivos por parceiro nos grids

**Feature Branch**: `feat/backlog-residual-sdd`

**Created**: 2026-06-11

**Status**: Draft

**Input**: Ticket `handbook/tickets/todo/PAR-GRID-CONTRACTS-COUNT.md` — resíduo (≈30%) consolidado de
`PAR-COLLABORATOR-GRID-GAPS` + `PAR-GRID-FILTROS-EXPORT` após verificação em código. Os grids de Parceiros
(Colaborador, Fornecedor, ACT) exibem `—` na coluna **Contratos/Aditivos** porque o backend não traz a
contagem dos contratos que referenciam o parceiro como **contratado**; e o grid de Fornecedor não tem o
filtro **"Status de contrato"**.

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
- **FR-007**: A definição de **quais estados de contrato entram na contagem** (e no filtro de situação) MUST
  ser única e consistente entre a coluna de contagem e o filtro.

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

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [x] Contratos (`ctr_*`) · [ ] Financeiro · [ ] Auth · [x] Parceiros
  (`par_*`)
  - ⚠️ **Dois BCs** — justificado: a contagem é **dado de Contratos**, consumido por **Parceiros**. O
    acoplamento é **unidirecional e por contrato público** (Parceiros → `contracts/public-api`), exatamente
    o padrão sancionado pelo ADR-0006 para leitura cross-módulo (já usado pelo bloco `contractor` no sentido
    inverso). Não há leitura cruzada de tabelas nem import de `domain`/`application` alheio.
- **Novos agregados / Value Objects?**: Nenhum agregado novo. Surge uma **projeção de leitura** (read port)
  no `contracts/public-api`: "contagem de contratos/aditivos por contratado".
- **Novos eventos de domínio (outbox)?**: Não — é leitura síncrona sob demanda (não evento).
- **Novos subcomandos de CLI?**: N/A (ADR-0037).
- **Borda HTTP envolvida?**: Sim, indiretamente — os list items dos grids de Parceiros (`/api/v1/...`)
  passam a incluir os campos de contagem. Sem rota nova; mudança aditiva no DTO de item de lista.
- **Possíveis violações da constituição (I–VIII)?**: Nenhuma — o cross-módulo é via `public-api` (ADR-0006);
  MySQL único; domínio puro; contagem em lote (sem N+1).

## Assumptions

- **A coluna mostra os dois números** (contratos **e** aditivos) — o cabeçalho é "Contratos/Aditivos".
  _(a confirmar no `/speckit-clarify`.)_
- **Quais contratos contam** _(a confirmar no clarify)_: assumido **todos os contratos não-cancelados**
  (Pending/Active/Expired/Terminated) em que o parceiro é contratado; "Cancelados" (rascunho descartado) não
  contam. Os **aditivos** contam os dos contratos contados.
- **R3 — filtro "Programa" no grid de Colaborador**: **ADIADO/bloqueado** nesta feature. O agregado
  Collaborator **não tem vínculo com programa** no domínio (achado de código); modelar esse vínculo é um
  trabalho próprio (referência por ID ao módulo `programs`, ADR-0014) e fica como **follow-up** — _a
  confirmar no clarify se entra agora ou vira sub-ticket._
- **Já entregue (fora de escopo, verificado em código)**: filtros do colaborador
  (educations/races/genderIdentities/disableReasons/occupationAreas/employmentRelationships/roles/
  yearOfContract), filtros do ACT (hasFinancialTransfer/occupationArea), export CSV dos 4 submódulos, import
  CSV de colaboradores. **Idade** do colaborador foi adiada de propósito — não reabrir.
- **Front**: liga a coluna e o filtro quando o backend expor; nenhuma regra de negócio nova no front.
