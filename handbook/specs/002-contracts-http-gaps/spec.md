# Feature Specification: Gaps de borda HTTP do módulo `contracts` (épico)

**Feature Branch**: `002-contracts-http-gaps`

**Created**: 2026-06-06

**Status**: Draft

**Input**: User description: "Épico: fechar os gaps de borda HTTP do módulo `contracts` do core-api (sob `/api/v2`) que bloqueiam o frontend (web-app), conforme o ticket do front-end e o `po-feedback/0001` + ADR-0032 (composição de leitura transitória na borda). Inverte o relatório de gap em requisitos de borda HTTP. NÃO toca o núcleo além do que o ADR-0032 autoriza."

> **Épico.** Guarda-chuva dos gaps de borda HTTP que o front reportou no módulo
> **Contratos** (`/api/v2`), distintos dos gaps de Parceiros (`/api/v1`) cobertos pela spec
> `001-partners-http-gaps`. Cada user story é **independentemente entregável** (P1) e será
> fatiada em ticket próprio (W0→W3) na fase de planejamento. A feature **estende** o módulo
> `contracts` existente; a borda HTTP já está habilitada (ADR-0025/0028) e a estratégia de
> composição já está decidida (ADR-0032). Não altera o frontend — entrega a superfície que o
> BFF/cliente consome.

## Glossário / Linguagem ubíqua

| Termo                       | Significado                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Contratado / contractor** | A parte contratada de um contrato: um `Supplier`, `Financier`, `Collaborator` ou `Act` (referência por `type` + `id`).     |
| **Snapshot do contratado**  | Projeção read-only do contratado (`name`, `document`, bancário/PIX só de Supplier, `updatedAt`) composta na leitura.       |
| **Rota gorda / composta**   | Endpoint de leitura que junta o agregado + dados de outro módulo na **borda**, marcado como transitório (ADR-0032).        |
| **Metadado de cadastro**    | Atributo próprio do contrato editável sem aditivo: `title`, `objective`, `observations`, `email`, `telephone`.             |
| **Campo imutável**          | `originalValue`, período/datas, `sequentialNumber` — só mudam via **aditivo homologado** (princípios #12/#14 do handbook). |
| **Envelope de erro**        | `{ error: { code, message, requestId } }` — formato canônico de erro HTTP do core-api.                                     |
| **`Sunset`**                | Header RFC 8594 que declara a transitoriedade da rota composta (removível quando o BFF v2 assumir — ADR-0032).             |

## Clarifications

### Session 2026-06-06

- Q: O `contractor` pode ser alterado depois da criação (via PATCH ou rota própria)? → A: **Não nesta fase.** O `contractor` é definido na criação (`POST`) e é **obrigatório**; a troca de contratado fica **fora de escopo** (não consta no PATCH de metadados). Reavaliar se o produto exigir "substituição de contratado".
- Q: O que o `GET /contracts/:id` devolve quando o contratado referenciado não é encontrado na public-api de Parceiros (ETL incompleto, parceiro removido)? → A: **Degradar com graça** — devolver a referência (`contractor: { type, id }`) com `snapshot: null` (mais um indicador de indisponibilidade), **nunca** 500. A indisponibilidade do parceiro não derruba a leitura do contrato.
- Q: `Act` (4º tipo de contratado) — qual o shape do snapshot, já que é placeholder clone enxuto de `Collaborator`? → A: **Espelhar `CollaboratorView`** (name, document, e os campos análogos que o placeholder expõe) até o BC de Act ganhar forma própria. O foco do épico é fechar a paridade dos **4** tipos no `contractor-view.mapper.ts` (hoje só 3).
- Q: FR-002 — o agregado `Contract` modela `contractor` como union rica das 4 variantes ou como referência leve? → A: **Referência leve** `ContractorRef = { type: ContractorType; id: ContractorId }` (`type` é string-literal union `'supplier'|'financier'|'collaborator'|'act'`; `id` branded). As variantes ricas (`Supplier|Financier|Collaborator|Act` com payload) vivem **só** no `ContractorView` da public-api de Parceiros, compostas na borda. A union rica no domínio violaria ADR-0032 invariante 1 + FR-012 (importaria `partners/*` em `contracts/domain`). Exhaustividade vem de `switch` sobre `type` com `const _: never`.
- Q: PATCH com campo imutável (ex.: `originalValue`) no corpo — status e camada de rejeição? → A: **400 na borda** via Zod `.strict()`. O schema do PATCH declara **apenas** os 5 metadados; qualquer chave extra (incluindo campos imutáveis) é rejeitada com 400 antes de chegar ao domínio (alinha ADR-0027: shape inválido = 400). Não é 422 (o campo imutável nunca chega ao domínio). Corpo vazio `{}` também é rejeitado (`.refine` exigindo ≥1 campo).
- Q: A tabela `ctr_contracts` já tem dados em ambiente persistente (define estratégia de migration)? → A: **Vazia** (fase inicial, sem deploy). As colunas `contractor_type`/`contractor_id` entram **`NOT NULL` diretamente**, sem `DEFAULT`/backfill. Premissa registrada no REPORT do ticket; se surgir dado em prod antes da entrega, reabrir para estratégia de backfill.
- Q: A criação (`POST`) valida que `contractor.id` existe em Parceiros antes de gravar? → A: **Gravar sem validar** (caminho mínimo). A referência é persistida sem checagem síncrona; a leitura degrada com `snapshot: null` se o parceiro não existir (FR-006). Evita oráculo de enumeração de ids de parceiros e não acopla a criação à disponibilidade de Parceiros. Risco aceito: contrato "órfão" silencioso.
- Q: O PATCH verifica ownership por organização/tenant (IDOR)? → A: **Não — modelo RBAC puro.** O módulo `contracts` não tem scoping por organização/tenant (confirmado: zero referência a `organization`/`tenant` em `src/modules/contracts/`). Qualquer `contract:write` edita qualquer contrato existente; PATCH em contrato inexistente → 404. Tenancy fica fora de escopo (exigiria modelagem própria). _(resolve achado H1 do `/speckit-analyze`)_
- Q: Status do DELETE recusado e timeout da composição? → A: **DELETE → 405** (`contract-delete-forbidden`); **timeout da leitura de Parceiros → 2s** (config). _(resolve A1/A2 do `/speckit-analyze`)_

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Vínculo de parceiro no contrato (Priority: P1)

Como gestor de contratos, quero **vincular o parceiro contratado a um contrato** na criação e **ver os
dados do contratado** no detalhe, para que o contrato deixe de ser "solto" e a tela do front mostre quem
foi contratado, com dados bancários/PIX quando aplicável.

**Why this priority**: P1 — **bloqueador real**. Hoje o body de criação não aceita contratado, o agregado
não tem o campo, `ctr_contracts` não tem coluna, e o detalhe não devolve parceiro. Sem isso o contrato
não tem contratado — é o que "trava de verdade o front". O `ContractorReadPort` já existe na public-api de
Parceiros (`src/modules/partners/public-api/read.ts`) mas **ninguém consome** — alto valor com caminho
arquitetural já decidido (ADR-0032).

**Independent Test**: Criar um contrato informando `contractor: { type, id }`, depois ler o detalhe e
confirmar que o snapshot do contratado vem composto — sem depender da US-002.

**Acceptance Scenarios**:

1. **Given** um parceiro existente (supplier/financier/collaborator/act), **When** crio um contrato via `POST /api/v2/contracts` com `contractor: { type, id }`, **Then** o contrato é criado vinculado ao contratado e a persistência grava `contractor_type` + `contractor_id`.
2. **Given** uma criação **sem** `contractor`, **When** envio o `POST`, **Then** recebo erro de validação (envelope) — `contractor` é obrigatório — e nada é criado.
3. **Given** um contrato com contratado **Supplier**, **When** leio `GET /api/v2/contracts/:id`, **Then** o detalhe inclui o snapshot `{ type, name, document, bankAccount, pixKey, updatedAt }` composto via public-api de Parceiros, e a resposta declara `Sunset` (rota transitória).
4. **Given** um contrato com contratado **Financier/Collaborator/Act**, **When** leio o detalhe, **Then** o snapshot vem **sem** bancário/PIX (existem só em Supplier), com os campos do respectivo tipo.
5. **Given** um contratado do tipo **Act**, **When** o detalhe é composto, **Then** o `contractor-view.mapper.ts` resolve o `ActView` (4º tipo) — não falha por tipo não mapeado.
6. **Given** o contratado referenciado não existe na public-api de Parceiros, **When** leio o detalhe, **Then** recebo `contractor: { type, id, snapshot: null }` (degradação graciosa), nunca 500 — e a resposta é idêntica a um erro de IO de Parceiros (sem campo distinguindo o motivo).
7. **Given** uma requisição sem sessão/permissão, **When** crio ou leio, **Then** recebo 401/403 com envelope (`requestId` presente).

---

### User Story 2 - Update de metadados do contrato (Priority: P1)

Como gestor de contratos, quero **editar os metadados de cadastro de um contrato** (título, objetivo,
observações, contato), para corrigir/atualizar informações sem violar a imutabilidade do valor e do
período — que só mudam por aditivo homologado.

**Why this priority**: P1/P2 — **bloqueador parcial**. Não existe `PATCH`/`PUT /api/v2/contracts/:id`. O
helper `updateContract` já existe no domínio (`src/modules/contracts/domain/contract/contract.ts`); falta
o use-case + a rota. Resolve o Bucket D do `po-feedback/0001` (edição vs. imutabilidade) na fatia segura.

**Independent Test**: Editar `title`/`observations` de um contrato via `PATCH` e confirmar a alteração na
leitura; tentar editar `originalValue` e receber 400 — sem depender da US-001.

**Acceptance Scenarios**:

1. **Given** um contrato existente, **When** envio `PATCH /api/v2/contracts/:id` com `{ title?, objective?, observations?, email?, telephone? }`, **Then** os metadados informados são atualizados e a leitura reflete a mudança.
2. **Given** uma tentativa de alterar campo imutável (`originalValue`, período, datas, `sequentialNumber`), **When** envio o `PATCH` com essa chave no corpo, **Then** recebo **400** com envelope (chave não declarada — Zod `.strict()`) e nada é alterado; campo imutável não chega ao domínio.
3. **Given** um `PATCH` com corpo vazio (`{}`), **When** envio, **Then** recebo **400** com envelope (schema exige ≥1 campo via `.refine`) — não um no-op silencioso.
4. **Given** uma tentativa de `DELETE /api/v2/contracts/:id`, **When** envio, **Then** recebo **405** com envelope (`code: 'contract-delete-forbidden'`) informando a política de imutabilidade (exclusão física proibida, princípio #14).
5. **Given** um `PATCH` em contrato inexistente, **When** envio, **Then** recebo **404** (`contract-not-found`) — modelo RBAC puro, sem ownership por tenant.
6. **Given** uma requisição sem sessão/permissão, **When** edito, **Then** recebo 401/403 com envelope (`requestId` presente).

### Edge Cases

- **Criação** com `contractor.id` inexistente em Parceiros → a referência é gravada **sem validar** (decisão fixada em Clarifications); a leitura degrada com graça (cenário US1-6). Não há checagem síncrona na criação (evita oráculo de enumeração).
- **Detalhe** quando a public-api de Parceiros está indisponível (erro de IO) → `snapshot: null`, nunca 500, **resposta idêntica** ao caso "parceiro inexistente" (sem campo de motivo); chamada com timeout (a leitura do contrato não depende da disponibilidade de Parceiros).
- **PATCH** com campo desconhecido/não anunciado no corpo → **400** pela validação Zod `.strict()` da borda (envelope), sem efeito colateral.
- **PATCH** que tenta zerar um metadado obrigatório (ex.: `title` vazio `""`) → **400** de validação (regra `min(1)` no schema).
- **PATCH** em contrato inexistente → **404** (`contract-not-found`). Modelo RBAC puro: não há ownership por tenant (qualquer `contract:write` edita qualquer contrato existente).
- Qualquer rota nova sem sessão válida → 401 com envelope (`requestId` presente).
- Permissão insuficiente → 403 com envelope (nunca vazar detalhe interno).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O `POST /api/v2/contracts` MUST aceitar `contractor: { type, id }` **obrigatório**, onde `type ∈ { supplier, financier, collaborator, act }`, e o contrato criado MUST ficar vinculado ao contratado.
- **FR-002**: O agregado `Contract` MUST modelar o `contractor` como **referência leve** `ContractorRef = { type: ContractorType; id: ContractorId }` — atributo **próprio** do contrato (modelagem legítima, ADR-0032 §"Campos do próprio contrato ≠ composição"). `ContractorType` é string-literal union (`'supplier' | 'financier' | 'collaborator' | 'act'`); `ContractorId` é branded com smart constructor (`Result<T,E>`). O domínio MUST NOT modelar as variantes ricas (`Supplier|Financier|Collaborator|Act` com payload) — essas vivem só no `ContractorView` da borda (FR-012).
- **FR-003**: A persistência MUST gravar `contractor_type` + `contractor_id` em `ctr_contracts` via migration gerada (Drizzle), **sem FK física** cross-database (ADR-0014). As colunas são `NOT NULL` (tabela vazia — sem `DEFAULT`/backfill); `contractor_type` é `varchar(16)` com CHECK `IN ('supplier','financier','collaborator','act')` (sem ENUM nativo — ADR-0020), `contractor_id` é `varchar(36)`. Sem índice secundário nesta fase (nenhuma query "contratos por contratado" — YAGNI).
- **FR-004**: O `GET /api/v2/contracts/:id` MUST **compor** o snapshot do contratado lendo a **public-api de Parceiros** (`ContractorReadPort`, hoje órfão). O bloco `contractor` tem `type` + `id` (referência) e `snapshot` (`{ name, document, bankAccount, pixKey (só Supplier), updatedAt }` | `null`); `type` mora no `contractor`, não dentro do `snapshot`. MUST declarar a transitoriedade via header `Sunset`/`Deprecation` (ADR-0032).
- **FR-005**: A composição MUST cobrir os **4** tipos de contratado; o `contractor-view.mapper.ts` MUST ganhar o `ActView` (hoje mapeia só 3 — supplier/financier/collaborator).
- **FR-006**: Quando o contratado referenciado não for encontrado/legível na public-api de Parceiros, o detalhe MUST devolver `snapshot: null` (degradação graciosa) — **nunca** 500. Todas as causas (parceiro inexistente, erro de IO, timeout) MUST colapsar na **mesma** resposta observável (`snapshot: null`, sem campo que distinga o motivo) — não expor oráculo de enumeração de ids de parceiros. A chamada à public-api MUST ter timeout explícito de **2s** (default ajustável por config; indisponibilidade de Parceiros não bloqueia a leitura do contrato).
- **FR-007**: O sistema MUST expor `PATCH /api/v2/contracts/:id` aceitando **apenas** metadados de cadastro `{ title?, objective?, observations?, email?, telephone? }`, acionando o use-case sobre o helper `updateContract` existente. O schema Zod da borda MUST ser `.strict()` (rejeita chaves não declaradas) e MUST exigir ≥1 campo (`.refine` — corpo vazio `{}` é inválido).
- **FR-008**: O `PATCH` MUST **rejeitar com 400** qualquer campo não declarado no schema — incluindo campos imutáveis (`originalValue`, período, datas, `sequentialNumber`) — na borda (Zod `.strict()`), antes do domínio (alinha ADR-0027: shape inválido = 400). Campos imutáveis não são declarados no schema do PATCH; mudam só via aditivo homologado.
- **FR-009**: Os atributos `observations`, `email`, `telephone` MUST entrar no agregado `Contract` (atributos próprios) na mesma leva da US-001, viabilizando o `PATCH` da US-002.
- **FR-010**: O `DELETE /api/v2/contracts/:id` MUST ser **recusado** explicitamente com **405** (`code: 'contract-delete-forbidden'`) — imutabilidade; exclusão física proibida (princípio #14) —, exigindo `requireAuth` antes da política.
- **FR-011**: Toda rota nova/alterada MUST exigir `requireAuth` + `authorize(<permissão>)` (`contract:read`/`contract:write`, já existentes em `contracts/public-api/permissions.ts`) e usar o envelope de erro `{ error: { code, message, requestId } }`, com contrato Zod na borda (entrada e saída). O `DELETE` recusado (FR-010) MUST exigir `requireAuth` antes de responder a política (não vazar existência da rota a não-autenticado). O modelo de autorização é **RBAC puro** — o módulo `contracts` **não** tem scoping por organização/tenant; o `PATCH` em contrato inexistente retorna **404** (`contract-not-found`). Não há checagem de ownership por tenant (fora do modelo atual).
- **FR-012**: O núcleo (`domain/` + `application/`) MUST permanecer livre de qualquer import de `partners/*`; a composição vive **só** no adapter HTTP (ADR-0032, invariante 1; ESLint/code-review barram o import).
- **FR-013**: As capacidades MUST permanecer sob `/api/v2` (módulo contracts); nenhuma migra para `/api/v1`.

### Key Entities

- **ContractorRef (referência)**: vínculo do contrato com a parte contratada — `{ type: ContractorType; id: ContractorId }`, `type ∈ { supplier, financier, collaborator, act }` (string-literal union, lowercase, casa com a public-api de Parceiros). Atributo próprio do agregado `Contract`; persistido como `contractor_type` + `contractor_id` em `ctr_contracts`. **Não** carrega payload das variantes ricas — só a referência por identidade.
- **ContractorSnapshot**: projeção read-only do contratado composta na leitura a partir da public-api de Parceiros — `{ type, name, document, bankAccount/pixKey (só Supplier), updatedAt }`. Não persiste no contrato; é junção de borda transitória.
- **ContractMetadata**: conjunto de atributos de cadastro editáveis do contrato — `title`, `objective`, `observations`, `email`, `telephone`. Mutáveis via `PATCH`, ao contrário de valor/período/datas.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% dos contratos criados após a entrega possuem contratado vinculado (`contractor` obrigatório) — nenhum contrato "solto" é criável via `/api/v2`.
- **SC-002**: O front consegue exibir o detalhe do contrato com o contratado **sem fan-out manual** nem montar a junção no cliente — verificável pelo casamento de contrato do `GET /contracts/:id`.
- **SC-003**: O detalhe compõe os **4** tipos de contratado (incl. Act) corretamente, com bancário/PIX presentes apenas para Supplier.
- **SC-004**: A leitura do detalhe permanece disponível (≠ 500) quando o contratado está ausente/ilegível em Parceiros, 100% das vezes (degradação graciosa).
- **SC-005**: O `PATCH` altera metadados e **rejeita 100%** das tentativas de mudar campos imutáveis (400 na borda, Zod `.strict()`), preservando a imutabilidade de valor/período.
- **SC-006**: `DELETE` de contrato é recusado 100% das vezes (imutabilidade), com mensagem de política.
- **SC-007**: Toda rota nova rejeita acesso sem sessão (401) e sem permissão (403), 100% das vezes, com envelope contendo `requestId`.
- **SC-008**: A rota composta carrega `Sunset`/`Deprecation` e o núcleo não importa `partners/*` (verificável por lint/code-review) — a dívida é declarada e o caminho de remoção (BFF v2) preservado.

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [x] Contratos (`ctr_*`) — escrita/leitura no próprio módulo. Leitura **cross-módulo de Parceiros** acontece **só na borda HTTP** via public-api (ADR-0032/ADR-0006), sem SELECT em `par_*` (ADR-0014 preservado). Sem escrita cross-BC.
- **Novos agregados / Value Objects?**: nenhum agregado novo. O agregado `Contract` ganha **atributos próprios**: `contractor` (VO de referência leve `ContractorRef = { type, id }`; `ContractorType` string-literal union, `ContractorId` branded) e os metadados `observations`/`email`/`telephone` — cada um com smart constructor + `Result<T,E>` conforme regras de domínio. Forma exata fixada no `domain.md` (planejamento).
- **Novos eventos de domínio (outbox)?**: nenhum previsto (capacidades são criação/edição/leitura de borda). Reavaliar se vincular contratado precisar notificar outro módulo.
- **Novos subcomandos de CLI?**: não obrigatório (a UX-alvo é a borda HTTP que o front consome). Opcional espelhar create/patch na CLI.
- **Borda HTTP envolvida?**: **SIM** — e é o foco. Já habilitada (ADR-0025 Fastify adapter; ADR-0028 HTTP em `adapters/http/`). A rota composta de leitura é **transitória** por ADR-0032 (com `Sunset`). Esta feature **estende** o plugin/rotas existentes do módulo contracts.
- **Possíveis violações da constituição (I–IX)?**: nenhuma prevista, **desde que** a composição de Parceiros fique na borda (Princ. V — domínio puro) e o cross-módulo só por public-api (ADR-0006/0014). Atenção ao ADR-0032 invariante 1: `domain/`/`application/` de contracts **não** podem importar `partners/*`. `DELETE` recusado honra a imutabilidade (#14).

## Assumptions

- A stack de auth/RBAC (`requireAuth` + `authorize`) já existe e protege as rotas atuais de `contracts` — as novas reusam o mesmo mecanismo (mesmas permissões já usadas em create/read de contrato, salvo permissão específica revelada no planejamento).
- O `ContractorReadPort` da public-api de Parceiros (`buildPartnersReadPort` / `read.ts`) está correto e suficiente para compor o snapshot dos tipos já mapeados; o trabalho de Parceiros nesta feature é **somente** adicionar o `ActView` ao `contractor-view.mapper.ts` (paridade 4/4) — não há outra mudança em `par_*`.
- O helper `updateContract` no domínio (`contract.ts`/`types.ts`) já cobre a edição de metadados; o trabalho é de **borda + application** (use-case + rota + contrato Zod), salvo ajuste mínimo para acomodar `observations`/`email`/`telephone`.
- A **validação de existência** do `contractor.id` em Parceiros na criação foi **decidida**: não há checagem (grava a referência; a leitura degrada com graça) — ver Clarifications. Evita oráculo de enumeração e desacopla a criação da disponibilidade de Parceiros.
- O **casing** de `contractor_type` é **lowercase** (`'supplier'`…) para casar 1:1 com o que o `contractor-view.mapper.ts` da public-api de Parceiros retorna (zero conversão na borda), divergindo intencionalmente do PascalCase usado por outros enums de `ctr_contracts`.
- A migration assume `ctr_contracts` **vazia** (sem dados persistentes) — `NOT NULL` direto. Se houver dado antes da entrega, reabrir para estratégia de backfill (decisão registrada em Clarifications).
- O `Act` permanece como **placeholder** (clone enxuto de `Collaborator`, commit `PARTNERS-ACT-PLACEHOLDER`); o `ActView` espelha `CollaboratorView` até o BC de Act ganhar modelagem própria.
- "Composição transitória" (ADR-0032): a rota gorda nasce com `Sunset` e sai de cena quando o BFF v2 assumir — não é dívida escondida.
- Os gaps de **Parceiros** (`/api/v1`: agregador `/partners`, paridade de export CSV) estão **fora** deste épico — pertencem à spec `001-partners-http-gaps`.
- Itens do `po-feedback/0001` bloqueados por BC inexistente (`program`/`budgetPlan` — Planejamento Orçamentário, Inquiry-0014) estão **fora** deste épico.
