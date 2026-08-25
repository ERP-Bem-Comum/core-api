# Feature Specification: Gaps de borda HTTP do módulo `partners` (épico)

**Feature Branch**: `001-partners-http-gaps`

**Created**: 2026-06-06

**Status**: Draft

**Input**: User description: "Épico: fechar os gaps de borda HTTP do módulo `partners` do core-api que bloqueiam o frontend (web-app, épico 008-partners). Inverte o api-readiness-report do front: capacidades já existentes no domínio mas sem rota, e as ausentes, viram requisitos de borda HTTP sob /api/v1."

> **Épico.** Guarda-chuva dos 5 gaps que a Arquitetura Frontend v2 reportou no
> `web-app/specs/008-partners/api-readiness-report.md`. Cada gap é uma **user story
> independentemente entregável** (P1–P3) que será fatiada em ticket próprio (W0→W3) na Fase 5 (plano).
> A feature **estende** o módulo `partners` existente (borda HTTP já habilitada por ADR-0025/0033),
> não inaugura HTTP. Não altera o frontend — entrega a superfície que o BFF consome.

## Glossário / Linguagem ubíqua

| Termo                  | Significado                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| **Gap de borda**       | Capacidade cuja lógica de domínio/aplicação existe (ou pode existir) mas **não tem rota HTTP** exposta. |
| **Órfão**              | Use-case/exporter implementado mas não conectado ao `composition.ts` nem a uma rota.                    |
| **Toggle de parceria** | Marcar/desmarcar uma localidade (estado/município) como parceira; efeito persistente.                   |
| **Cross-state**        | Seleção de municípios parceiros de UFs diferentes coexistindo.                                          |
| **Espelho do legado**  | `/api/v1` preserva shapes/códigos herdados (ex.: `ServiceCategory` com typos) — ADR-0033.               |
| **Envelope de erro**   | `{ error: { code, message, requestId } }` — formato canônico de erro HTTP do core-api.                  |

## Clarifications

### Session 2026-06-06

- Q: FR-010 — remoção de parceria territorial: hard delete (legado) ou soft-delete padronizado? → A: **Soft-delete padronizado** (coluna de inativação em `par_states`/`par_municipalities`, consistente com o padrão de colaboradores `disableBy`). Formalizado como ADR na Fase 3.
- Q: FR-011 — import aceita só CSV ou também `.xlsx`? E o formato deveria ser porta genérica + adapter? → A: **Só CSV (UTF-8)** na Fase 1. A serialização/parsing é **util puro compartilhado** (`src/shared/utils/csv.ts`), separando projeção (agregado → `Table`) da serialização; **porta genérica N-formatos destrancada, não construída** (YAGNI / Rule of Three, conforme `EXPORT-ABSTRACTION-DESIGN.md`). Precede o ticket `CORE-CSV-SHARED-UTIL` (extração da mecânica hoje `private` em `contracts-csv.ts`), consumido por import (US-001) e export (US-003).
- Q: FR-012 — filtros `programa`/`idade`: descartar ou implementar? → A: **Descartar ambos** (fora de escopo). `programa` não é conceito do BC do colaborador; `idade` é derivável de `birthDate` no client. O contrato de listagem não anuncia esses filtros.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Import de colaboradores em lote (Priority: P1)

Como gestor, quero **importar colaboradores em lote** a partir de um arquivo, para cadastrar muitas pessoas
de uma só vez, recebendo um relatório das linhas que falharam sem perder as válidas.

**Why this priority**: P1 no relatório do front. O use-case `import-collaborators` **já existe** mas é
**órfão** (sem wiring em `PartnersHttpDeps` nem rota) — alto valor com baixo custo de implementação. Hoje o
front opera essa capacidade em **mock**.

**Independent Test**: Enviar um arquivo a `POST /api/v1/collaborators/import` e observar os colaboradores
criados na listagem + o relatório de linhas inválidas — sem depender dos outros gaps.

**Acceptance Scenarios**:

1. **Given** um arquivo CSV válido com N colaboradores, **When** enviado ao endpoint de import autenticado, **Then** os N são criados em situação `Pré Cadastrado` e o corpo retorna `{ created: N, failed: [] }`.
2. **Given** um arquivo com linhas válidas e inválidas, **When** importado, **Then** as válidas são criadas e as inválidas retornam em `failed: [{ line, error }]` (sem abortar a operação inteira).
3. **Given** uma requisição sem permissão `collaborator:write`, **When** chama o import, **Then** recebe 403 com envelope de erro.
4. **Given** um arquivo malformado (não-parseável), **When** importado, **Then** recebe erro de validação (envelope) sem criar nada.

---

### User Story 2 - Estados e Municípios parceiros (Priority: P1)

Como gestor, quero **marcar/desmarcar estados e municípios como parceiros**, para definir a abrangência
territorial das parcerias, com a seleção **persistida** no backend.

**Why this priority**: P1 no relatório (depende da decisão **D9** do ADR-0031). Hoje geografia é só
**catálogo read-only** (`listStates`, `listMunicipalitiesByUf`) — sem tabela, sem toggle, sem rota. É o gap
mais pesado e destrava 2 sub-domínios do front que estão em **mock total**.

**Independent Test**: Alternar a parceria de uma UF e de um município via API e confirmar que `GET` reflete
o estado persistido, inclusive cross-state em municípios.

**Acceptance Scenarios**:

1. **Given** o catálogo de 27 UFs, **When** marca uma UF como parceira, **Then** `GET /api/v1/partner-states` passa a indicá-la com `isPartner: true` (persistente entre requisições).
2. **Given** uma UF parceira, **When** desmarca, **Then** ela deixa de constar como parceira (conforme a política de remoção decidida na D9).
3. **Given** municípios de UFs diferentes marcados, **When** lista municípios parceiros, **Then** todos aparecem (cross-state), independentemente da UF de filtro.
4. **Given** uma requisição sem permissão adequada, **When** alterna parceria, **Then** recebe 403 com envelope de erro.

---

### User Story 3 - Export de fornecedores (Priority: P2)

Como gestor, quero **exportar a listagem de fornecedores** em CSV, respeitando os filtros aplicados, para
análise externa.

**Why this priority**: P2. O exporter `adapters/export/supplier-csv.ts` **já existe** sem rota — falta só a
borda. O front faz export client-side como fallback até a rota existir.

**Independent Test**: Chamar `GET /api/v1/suppliers/export` com filtros e validar que o CSV contém os
fornecedores que casam os filtros.

**Acceptance Scenarios**:

1. **Given** filtros `search/active/categories[]`, **When** chama o export autenticado, **Then** recebe um CSV com os fornecedores que casam os filtros.
2. **Given** nenhum filtro, **When** exporta, **Then** recebe o CSV de todos os fornecedores acessíveis.
3. **Given** requisição sem permissão `supplier:read`, **When** exporta, **Then** recebe 403 com envelope.

---

### User Story 4 - Catálogo de categorias de serviço (Priority: P2)

Como consumidor do front, quero um **endpoint de catálogo das categorias de serviço**, para popular o filtro
de fornecedores a partir da fonte canônica.

**Why this priority**: P2. `ServiceCategory` já é union fechada de **39** códigos legados (com typos
preservados, ADR-0031 §D2) — **resolve a FR-017 do front** (fonte canônica = 39, não 22). Só falta expor.

**Independent Test**: Chamar `GET /api/v1/suppliers/service-categories` e conferir que a lista é a canônica
(39 códigos legados).

**Acceptance Scenarios**:

1. **Given** o conjunto fechado de categorias, **When** chama o catálogo autenticado, **Then** recebe a lista canônica de códigos legados (read-only).
2. **Given** o legado preserva typos (`ONGANIZACAO_DE_EVENTOS`, `TRASPORTE`), **When** lista, **Then** os códigos são retornados **literais** (sem tradução/saneamento no backend).

---

### User Story 5 - Decisão sobre filtros `programa`/`idade` (Priority: P3)

Como time core-api, quero **decidir formalmente** o destino dos filtros `programa` e `idade` de
colaboradores, para que o contrato não anuncie filtros não suportados.

**Why this priority**: P3. `age` foi adiado (`list-collaborators.ts`) e `programa` não é conceito do
colaborador no domínio. A decisão (provável: fora de escopo) evita quebra de expectativa no front.

**Independent Test**: Verificar que o contrato de `GET /api/v1/collaborators` (e sua doc OpenAPI) reflete a
decisão — ou implementa `idade` (derivada de `birthDate`), ou não anuncia o filtro.

**Acceptance Scenarios**:

1. **Given** a decisão registrada (ADR/nota), **When** consulto o contrato de listagem, **Then** ele só anuncia filtros efetivamente suportados.

### Edge Cases

- **Import** com arquivo vazio → relatório `{ created: 0, failed: [] }` (não erro).
- **Import** com CPF duplicado (já existente) → linha vai para `failed` com erro de conflito, demais seguem.
- **Toggle territorial** idempotente: marcar uma UF já parceira não cria duplicata nem erra.
- **Município** cujo nome não consta no catálogo da UF → erro de validação (envelope), não 500.
- **Export** com 0 fornecedores → CSV só com cabeçalho.
- Qualquer rota nova sem sessão válida → 401 com envelope (`requestId` presente).
- Permissão insuficiente → 403 com envelope (nunca vazar detalhe interno).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema MUST expor uma rota autenticada de **import de colaboradores em lote** que aciona o use-case `import-collaborators` (hoje órfão), com wiring em `PartnersHttpDeps`, retornando relatório `{ created, failed: [{ line, error }] }`.
- **FR-002**: O sistema MUST **persistir** a parceria de **estados** (`par_states`, prefixo `par_*`) e expor listagem com `isPartner` + operação de alternância (marcar/desmarcar).
- **FR-003**: O sistema MUST **persistir** a parceria de **municípios** (`par_municipalities`) e expor listagem por UF + alternância, suportando seleção **cross-state**.
- **FR-004**: O sistema MUST expor uma rota autenticada de **export de fornecedores** (CSV) que respeita os filtros `search/active/categories[]`, via exporter existente.
- **FR-005**: O sistema MUST expor uma rota autenticada de **catálogo de categorias de serviço** (read-only), retornando os códigos legados **literais**.
- **FR-006**: O sistema MUST **registrar formalmente** (ADR ou nota de escopo) a decisão sobre os filtros `programa`/`idade`, garantindo que o contrato de listagem só anuncie filtros suportados.
- **FR-007**: Toda rota nova MUST exigir `requireAuth` + `authorize(<permissão>)` e usar o envelope de erro `{ error: { code, message, requestId } }`, com contrato Zod na borda (entrada e saída).
- **FR-008**: Os contratos HTTP novos MUST casar 1:1 com os server functions que o BFF descreve em `008-partners/contracts/README.md` (mesmos campos de input/output), preservando o shape de `/api/v1`.
- **FR-009**: As capacidades MUST permanecer sob `/api/v1` (ADR-0033); nenhuma é movida para `/api/v2`.

_Decisões registradas em Clarifications (Session 2026-06-06):_

- **FR-010**: A remoção de parceria territorial MUST usar **soft-delete padronizado** (coluna de inativação em `par_states`/`par_municipalities`), consistente com o padrão de colaboradores — **não** hard delete. Toggle off marca inativo; toggle on reativa (idempotente). Formalizado em ADR na Fase 3 (resolve a D9 do ADR-0031).
- **FR-011**: O import de colaboradores MUST aceitar **apenas CSV (UTF-8)** na Fase 1. A serialização/parsing é **util puro compartilhado** (`src/shared/utils/csv.ts`), separando a projeção (agregado → `Table`) da serialização de formato; a porta genérica N-formatos fica **destrancada, não construída** (YAGNI / Rule of Three — `EXPORT-ABSTRACTION-DESIGN.md`). Precede o ticket `CORE-CSV-SHARED-UTIL`.
- **FR-012**: A listagem de colaboradores MUST **descartar** os filtros `programa` e `idade` (fora de escopo); o contrato (e a doc OpenAPI) **não anuncia** esses filtros. `idade` permanece derivável de `birthDate` no client.
- **FR-013**: A serialização/parsing CSV (import US-001 + export US-003) MUST consumir o util compartilhado `src/shared/utils/csv.ts` (escape anti-CSV-injection + RFC 4180), extraído da mecânica hoje `private` em `contracts-csv.ts` pelo ticket-precedente `CORE-CSV-SHARED-UTIL`.

### Key Entities

- **PartnerState**: associação entre uma UF (catálogo das 27) e a condição de parceria. Atributos: `uf`, `isPartner` (+ metadados de remoção conforme D9). Persistida em `par_states`.
- **PartnerMunicipality**: associação entre um município (UF + nome, do catálogo) e a parceria; cross-state. Persistida em `par_municipalities`.
- **CollaboratorImportReport**: resultado do import — `created` (contagem/ids) + `failed` (lista de `{ line, error }`).
- **ServiceCategoryCatalog**: conjunto fechado e canônico (39) dos códigos legados de categoria de serviço (read-only).
- **SupplierExport**: representação tabular (CSV) da listagem de fornecedores filtrada.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% dos 5 gaps do `api-readiness-report` do front têm endpoint correspondente (ou decisão formal registrada, no caso de FR-006).
- **SC-002**: O front consegue trocar **mock→real** nos sub-domínios cobertos **sem alterar `client/ui` nem `*.view-model.ts`** (valida SC-005 do front) — verificável pelo casamento de contrato (FR-008).
- **SC-003**: O import processa um arquivo de teste (≤ 50 linhas) retornando relatório correto de válidas/inválidas em < 2s.
- **SC-004**: Toda rota nova rejeita acesso sem sessão (401) e sem permissão (403), 100% das vezes, com envelope contendo `requestId`.
- **SC-005**: O catálogo de categorias retorna exatamente as 39 categorias canônicas (incluindo os typos legados), confirmando a fonte de verdade da FR-017 do front.
- **SC-006**: A parceria territorial persiste entre requisições (não-volátil) e é idempotente sob toggle repetido.

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [x] Parceiros (`par_*`). Apenas o módulo `partners` — sem cross-BC (respeita ADR-0014).
- **Novos agregados / Value Objects?**: provável entidade/associação de parceria territorial (`PartnerState`/`PartnerMunicipality`) — forma exata (VO de referência vs entidade com ciclo de vida) depende da **D9** e será fixada no `domain.md` (Fase 2). `UF` branded já existe (`geography/state.ts`).
- **Novos eventos de domínio (outbox)?**: nenhum previsto na Fase 1 (capacidades são CRUD/consulta de borda). Reavaliar se a parceria territorial precisar notificar outros módulos.
- **Novos subcomandos de CLI?**: não obrigatório (a UX-alvo aqui é a borda HTTP que o BFF consome). Opcional espelhar import/toggle na CLI.
- **Borda HTTP envolvida?**: **SIM** — e é o foco. **Já habilitada por ADR-0025** (Fastify como adapter) + **ADR-0033** (`/api/v1` espelho legado). Esta feature **estende** plugins/rotas existentes; não inaugura HTTP (Princ. VII satisfeito por ADR).
- **Possíveis violações da constituição (I–IX)?**: nenhuma prevista. Atenção: import multipart e export CSV devem manter domínio puro (Princ. V) — parsing/serialização ficam no adapter. Persistência territorial usa Drizzle + migration gerada (Princ. VI). Dependência de parsing (FR-011) deve respeitar Princ. de dependências mínimas.

## Assumptions

- A stack de auth/RBAC (`requireAuth` + `authorize`) já existe e protege as rotas atuais de `partners` — as novas reusam o mesmo mecanismo.
- O `composition root` HTTP (ADR-0028) e o padrão de plugin Fastify (ADR-0025) são reusados; cada gap adiciona rota(s) ao plugin do sub-domínio correspondente.
- O exporter de fornecedores e o use-case de import existentes estão corretos quanto à lógica; o trabalho é de **borda** (wiring + rota + contrato Zod), salvo ajustes mínimos revelados no RECON (Fase 1.5).
- O catálogo geográfico (`state.ts`, `municipalities.data.ts`) é fonte suficiente para popular as listas; a novidade é a **camada de parceria** persistida.
- "Espelho do legado" (ADR-0033): shapes e códigos herdados são preservados, não redesenhados.
- A variante **PF** de Financiador (FR-018 do front) está **fora** deste épico (PJ-only permanece), salvo decisão explícita posterior.
