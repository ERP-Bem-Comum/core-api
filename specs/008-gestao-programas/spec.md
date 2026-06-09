# Feature Specification: Gestão de Programas

**Feature Branch**: `008-gestao-programas`

**Created**: 2026-06-09

**Status**: Draft

**Input**: User description: "Gestão de Programas — novo bounded context do core-api (backend do ERP Bem Comum). Implementa o backend que serve a feature de 'Programas' hoje existente apenas no frontend Next.js, reconstruída por engenharia reversa em `handbook/research/feture_propose/gestao_programas/` (`back_referncias.md` + `front_referencias.md` são a fonte canônica desta spec)."

> **Origem da spec.** Esta especificação é derivada de engenharia reversa do frontend Next.js em produção (`erp-financeiro-frontend-…run.app/programas`), documentada em [`handbook/research/feture_propose/gestao_programas/back_referncias.md`](../../handbook/research/feture_propose/gestao_programas/back_referncias.md) e [`front_referencias.md`](../../handbook/research/feture_propose/gestao_programas/front_referencias.md). A UI existente é **referência de comportamento**, não escopo de implementação — esta feature entrega o **backend** (domínio + persistência + borda) que serve aquela UI.

> **Novo Bounded Context.** "Programa" não pertence a nenhum agregado existente (Contratos, Auth, Parceiros, Financeiro). Esta feature introduz um **novo módulo `programs`** (`prg_*`) no modular monolith — decisão confirmada em [Clarifications](#clarifications) com base no context-map do Financeiro. A formalização contra a constituição (limite de módulos) fica para o plano.

## Clarifications

### Session 2026-06-09

- Q: Onde vive o agregado Programa no modular monolith — módulo próprio ou anexado ao Financeiro? → A: **Módulo próprio `programs`** (`prg_*`). O Financeiro apenas referencia `ProgramaID` (`handbook/domain_questions/financeiro/bounded-contexts/conciliacao.md:130`, `gestao-documentos.md:184`) e o context-map (`financeiro/02-context-map.md:46,66`) trata Contratos/Orçamento como contextos externos consumidos por evento; Programa é dimensão transversal sem dono natural, e anexá-lo ao Financeiro inverteria a dependência, ofendendo o isolamento (ADR-0014).
- Q: Ao desativar um programa, a v1 deve checar dependências (contratos/lançamentos vinculados)? → A: **Não — desativação soft sempre permitida**. Não há vínculo formal Programa↔Contrato/Orçamento no escopo atual; bloqueio por dependência fica como regra futura, quando o vínculo existir.
- Q: A reativação (INATIVO→ATIVO, US6) entra na v1? → A: **Sim**, para fechar a máquina de estados (transição simétrica à desativação).
- Q: Que identificador(es) o Programa expõe? → A: **Dois** — `id` (UUID v4 público, PK de domínio gerado no domínio per ADR-0018, usado na borda e como referência cross-módulo) e `program_number` (sequencial interno legível, `UNIQUE`, gerado pela aplicação via `MAX(program_number)+1` sob `SELECT … FOR UPDATE`, com `UNIQUE` como safety-net), espelhando o padrão real `contracts.sequential_number` (`src/modules/contracts/adapters/persistence/schemas/mysql.ts:61-62`) e respeitando ADR-0020:106 (sem `AUTO_INCREMENT` em PK de domínio).
- Q: O optimistic-lock (`version`) vale para todas as escritas ou só para editar? → A: **Só para editar (`PUT`)**. Desativar/reativar **não** exigem `version`: a proteção de concorrência vem da **guarda de estado** (desativar já INATIVO → `program-not-active`; reativar já ATIVO → `program-not-inactive`), que serializa naturalmente o duplo-clique. Pedir `version` num clique de botão seria redundante (resolve análise F1).
- Q: Como as escritas respondem, para evitar o erro "200 sem corpo" observado no front? → A: **Toda escrita retorna o recurso no corpo** — `POST` → 201 + programa; `PUT`/`deactivate`/`reactivate` → **200 com o programa atualizado** (nunca 200 vazio). Lição do handoff `handbook/tickets/todo/README.md` (PUT/deactivate/reactivate de Parceiros respondiam 200 sem corpo → BFF estourava no `response.json()`).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Criar programa (Priority: P1)

Um gestor financeiro cadastra um novo programa informando nome e sigla (e, opcionalmente, diretor, características gerais e logo), para passar a vincular orçamentos e contratos a ele.

**Why this priority**: Sem criação não existe dado nenhum — é a base de todo o resto. Entrega valor sozinha: a partir dela o sistema passa a ter programas registrados.

**Independent Test**: Criar um programa com nome e sigla válidos e confirmar que ele passa a existir com status ATIVO e um identificador próprio.

**Acceptance Scenarios**:

1. **Given** nenhum programa com a sigla "EPV", **When** o gestor cria um programa com nome "EPV" e sigla "EPV", **Then** o programa é criado com status ATIVO e recebe um identificador único.
2. **Given** a tentativa de criar sem nome, **When** o gestor submete, **Then** a criação é rejeitada indicando o campo `nome` como obrigatório, e nada é persistido.
3. **Given** a tentativa de criar sem sigla, **When** o gestor submete, **Then** a criação é rejeitada indicando o campo `sigla` como obrigatório.
4. **Given** já existe um programa com sigla "EPV", **When** o gestor tenta criar outro com a mesma sigla (ignorando caixa), **Then** a criação é rejeitada por conflito de sigla duplicada.

---

### User Story 2 - Listar e buscar programas (Priority: P1)

Um gestor financeiro visualiza a lista paginada de programas e busca por nome ou sigla, para ter visão geral e localizar um programa específico.

**Why this priority**: Visibilidade do que existe é pré-requisito de detalhar, editar e desativar. Junto com a criação forma o MVP.

**Independent Test**: Com programas cadastrados, solicitar a listagem e conferir paginação, e filtrar por um termo conferindo que só os correspondentes aparecem.

**Acceptance Scenarios**:

1. **Given** existem os programas "EPV" e "PARC", **When** o gestor lista os programas, **Then** recebe ambos com seus campos (logo, nome, características gerais, status) e os metadados de paginação.
2. **Given** existem "EPV" e "PARC", **When** o gestor busca por "EPV", **Then** apenas "EPV" é retornado e "PARC" é omitido.
3. **Given** a busca por um termo em caixa diferente ("epv"), **When** o gestor pesquisa, **Then** "EPV" é retornado (busca insensível a maiúsculas/minúsculas, por substring).
4. **Given** não há programas cadastrados, **When** o gestor lista, **Then** recebe uma lista vazia (estado vazio), sem erro.
5. **Given** 12 programas e `pageSize` 5, **When** o gestor pede a página 1, **Then** recebe 5 itens e o total que permite calcular as demais páginas.

---

### User Story 3 - Ver detalhes de um programa (Priority: P2)

Um gestor financeiro consulta todos os dados de um programa específico, para conferir as informações antes de editar ou desativar.

**Why this priority**: Necessário para conferência e ponto de entrada da edição. Depende de já existirem programas (P1).

**Independent Test**: Dado um programa conhecido, consultar por seu identificador e conferir que todos os campos atuais são retornados.

**Acceptance Scenarios**:

1. **Given** existe um programa com identificador conhecido, **When** o gestor consulta esse identificador, **Then** recebe todos os campos atuais do programa (nome, sigla, diretor, características gerais, logo, status).
2. **Given** um identificador que não corresponde a nenhum programa, **When** o gestor consulta, **Then** recebe resposta de "não encontrado".

---

### User Story 4 - Editar programa (Priority: P2)

Um gestor financeiro atualiza os dados de um programa existente (logo, nome, sigla, diretor, características gerais), para manter as informações corretas.

**Why this priority**: Manutenção dos dados é valor recorrente, mas depende de criação e consulta.

**Independent Test**: Editar um campo de um programa existente e confirmar que a alteração foi persistida e é refletida na consulta seguinte.

**Acceptance Scenarios**:

1. **Given** um programa existente, **When** o gestor altera o diretor e salva, **Then** a alteração é persistida e refletida na consulta de detalhes.
2. **Given** um programa existente, **When** o gestor tenta alterar a sigla para uma já usada por outro programa, **Then** a edição é rejeitada por conflito de sigla.
3. **Given** um programa existente, **When** o gestor tenta gravar nome vazio, **Then** a edição é rejeitada indicando o campo obrigatório.
4. **Given** dois gestores editando o mesmo programa, **When** o segundo salva sobre uma versão já alterada pelo primeiro, **Then** a gravação é rejeitada por conflito de concorrência (a versão esperada não confere).

---

### User Story 5 - Desativar programa (Priority: P2)

Um gestor financeiro desativa um programa ATIVO, para impedir novos vínculos sem apagar o histórico.

**Why this priority**: Encerra o ciclo de vida operacional preservando histórico (soft). Depende de existir o programa.

**Independent Test**: Desativar um programa ATIVO e confirmar que passa a INATIVO e deixa de aparecer como selecionável em fluxos operacionais.

**Acceptance Scenarios**:

1. **Given** um programa ATIVO, **When** o gestor o desativa, **Then** o status passa a INATIVO e o programa é preservado (não excluído).
2. **Given** um programa já INATIVO, **When** o gestor tenta desativá-lo de novo, **Then** a operação é rejeitada por estado inválido (não há transição ATIVO→INATIVO a aplicar).
3. **Given** um programa INATIVO, **When** algum fluxo operacional lista programas selecionáveis, **Then** o programa inativo não é oferecido como opção.

---

### User Story 6 - Reativar programa (Priority: P3)

Um gestor financeiro reativa um programa INATIVO, para voltar a permitir vínculos a ele.

**Why this priority**: Completa a máquina de estados (inverso da desativação). Menos frequente; pode chegar depois do MVP.

**Independent Test**: Reativar um programa INATIVO e confirmar que volta a ATIVO e a aparecer como selecionável.

**Acceptance Scenarios**:

1. **Given** um programa INATIVO, **When** o gestor o reativa, **Then** o status volta a ATIVO.
2. **Given** um programa já ATIVO, **When** o gestor tenta reativá-lo, **Then** a operação é rejeitada por estado inválido.

---

### Edge Cases

- **Sigla com espaços ou caracteres não permitidos** (ex.: "A&B", "A B") → rejeição com validação de formato.
- **Nome com 1 caractere / só espaços em branco** → rejeição por comprimento mínimo.
- **Logo em formato não-imagem** (PDF, DOCX) → rejeição no upload.
- **Logo acima do tamanho máximo** (> 5 MB) → rejeição com mensagem de tamanho.
- **Busca que não casa com nenhum programa** → lista vazia, sem erro.
- **`page` além da última página** → lista vazia com metadados coerentes (total inalterado).
- **`pageSize` fora das opções permitidas** (≠ 5/10/25) → normalizado para o default (5) ou rejeitado de forma consistente.
- **Edição concorrente do mesmo programa** → resolvida por bloqueio otimista (a gravação com versão obsoleta falha).
- **Acesso sem autenticação** → negado (não autenticado).
- **Ação sem a permissão correspondente** (ex.: visualizador tentando criar/desativar) → negada por falta de permissão.

## Requirements _(mandatory)_

### Functional Requirements

**Identidade e atributos**

- **FR-001**: O sistema MUST modelar um agregado `Programa` com: nome (obrigatório), sigla (obrigatória), diretor (opcional), características gerais (opcional), logo (opcional) e status.
- **FR-002**: O sistema MUST atribuir a cada programa, na criação: (a) um identificador público único e imutável (`id`), gerado pelo domínio, usado na borda e como referência cross-módulo; e (b) um número sequencial interno legível (`program_number`), único e crescente, gerado pela aplicação, refletindo a ordem de criação.
- **FR-003**: O sistema MUST iniciar todo programa recém-criado com status ATIVO.
- **FR-004**: O sistema MUST registrar quando cada programa foi criado e atualizado pela última vez.

**Criação (US1)**

- **FR-005**: Usuários autorizados MUST conseguir criar um programa informando ao menos nome e sigla.
- **FR-006**: O sistema MUST rejeitar a criação quando nome ou sigla estiverem ausentes ou vazios, indicando o campo ofensor.
- **FR-007**: O sistema MUST garantir que a sigla seja única no sistema, comparando de forma insensível a maiúsculas/minúsculas, e rejeitar criação com sigla já existente por conflito.

**Listagem e busca (US2)**

- **FR-008**: Usuários autorizados MUST conseguir listar programas de forma paginada, com tamanho de página entre as opções 5, 10 e 25 (default 5).
- **FR-009**: O sistema MUST permitir buscar programas por nome ou sigla, por substring e de forma insensível a maiúsculas/minúsculas.
- **FR-010**: O sistema MUST retornar, junto da lista, os metadados de paginação (total de itens e página corrente) suficientes para navegação.
- **FR-011**: O sistema MUST retornar lista vazia (sem erro) quando não houver programas ou quando a busca não casar com nenhum.

**Detalhes (US3)**

- **FR-012**: Usuários autorizados MUST conseguir consultar um programa por seu identificador e receber todos os seus campos atuais.
- **FR-013**: O sistema MUST responder "não encontrado" quando o identificador não corresponder a nenhum programa.

**Edição (US4)**

- **FR-014**: Usuários autorizados MUST conseguir editar nome, sigla, diretor, características gerais e logo de um programa existente.
- **FR-015**: O sistema MUST aplicar à edição as mesmas validações da criação (nome e sigla obrigatórios; sigla única ignorando caixa).
- **FR-016**: O sistema MUST resolver **edições** concorrentes (atualização de campos — `PUT`) por bloqueio otimista: uma gravação baseada numa `version` desatualizada MUST ser rejeitada por conflito de concorrência. Transições de status (desativar/reativar) **não** usam `version` — sua proteção de concorrência é a própria guarda de estado (FR-017/FR-018).

**Ciclo de vida — status (US5, US6)**

- **FR-017**: O sistema MUST permitir desativar somente programas que estejam ATIVOS (transição ATIVO→INATIVO), rejeitando a operação sobre programa já INATIVO.
- **FR-018**: O sistema MUST permitir reativar somente programas que estejam INATIVOS (transição INATIVO→ATIVO), rejeitando a operação sobre programa já ATIVO.
- **FR-019**: A desativação MUST ser soft — o programa e seu histórico são preservados; não há exclusão física.
- **FR-020**: A listagem MUST permitir filtrar por `status` (ex.: só `ATIVO`), para que fluxos de seleção possam excluir inativos. A **aplicação** desse filtro em fluxos operacionais que escolhem um programa (ex.: vincular a contrato/lançamento) é responsabilidade dos **módulos consumidores** (Financeiro/Contratos), fora do escopo desta feature — aqui entrega-se a _capacidade de filtro_, não a regra do consumidor.

**Logo (upload)**

- **FR-021**: O sistema MUST aceitar logo apenas em formato de imagem válido e com tamanho até 5 MB, rejeitando os demais com mensagem específica.
- **FR-022**: O sistema MUST tratar o logo como opcional — um programa sem logo é válido.

**Acesso e auditoria (NFR funcionais)**

- **FR-023**: Toda operação MUST exigir usuário autenticado; requisições não autenticadas MUST ser negadas.
- **FR-024**: O sistema MUST proteger cada operação por uma permissão correspondente (listar/ver, criar, editar, desativar, reativar), negando quando o usuário não a possuir.
- **FR-025**: O sistema MUST registrar as ações relevantes do ciclo de vida (programa criado, editado, desativado, reativado) de forma auditável.
- **FR-026**: O sistema MUST retornar, em falhas de validação, qual campo originou o erro.

### Key Entities _(include if feature involves data)_

- **Programa** (agregado raiz): representa um programa do ERP ao qual orçamentos e contratos podem ser vinculados. Atributos: identificador público `id` (imutável), número sequencial interno `program_number` (único, ordem de criação), nome, sigla, diretor (opcional), características gerais (opcional), logo (opcional), status, marcas de criação/atualização e uma versão para controle de concorrência.
- **Sigla** (value object): identificador curto e legível do programa; normalizado (uppercase, sem espaços), com comprimento limitado; **único** no sistema (ignorando caixa).
- **Status do Programa** (value object): conjunto fechado `ATIVO | INATIVO`; governa as transições permitidas (desativar exige ATIVO; reativar exige INATIVO).
- **Logo** (value object/referência): referência a uma imagem armazenada externamente; restrita por formato (imagem) e tamanho (≤ 5 MB); opcional.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Um gestor consegue cadastrar um programa válido (nome + sigla) e vê-lo aparecer na listagem em uma única operação, sem erros.
- **SC-002**: 100% das tentativas de criar/editar com sigla duplicada (ignorando caixa) ou sem campo obrigatório são rejeitadas com indicação do campo ofensor.
- **SC-003**: A busca por nome/sigla retorna exatamente os programas cujo nome ou sigla contêm o termo (substring, insensível a caixa), em todas as combinações testadas.
- **SC-004**: 100% das transições de status inválidas (desativar inativo, reativar ativo) são rejeitadas; 100% das válidas são aplicadas e preservam o histórico.
- **SC-005**: Em edição concorrente, no máximo uma das gravações simultâneas baseadas na mesma versão é aceita; as demais são rejeitadas por conflito.
- **SC-006**: Nenhuma operação é executada sem usuário autenticado e sem a permissão correspondente.
- **SC-007**: Todo upload de logo fora das regras (não-imagem ou > 5 MB) é rejeitado; uploads válidos passam a ser exibíveis na consulta do programa.
- **SC-008**: Toda ação de ciclo de vida (criado/editado/desativado/reativado) grava o evento correspondente (`Program*`) no outbox (`prg_outbox`) na mesma transação da escrita — registro auditável durável. A _consulta/recuperação_ desse histórico usa o tooling de outbox existente do projeto; um endpoint de auditoria dedicado está fora do escopo da v1.

## Impacto Arquitetural (core-api) _(obrigatório — a feature toca `src/`)_

- **Bounded Contexts afetados**: **novo módulo `programs`** (prefixo de tabela `prg_*`) — confirmado em Clarifications. Não toca Contratos/Financeiro/Auth/Parceiros como donos — apenas **reusa `auth`** (permissões) de forma transversal; Financeiro/Contratos/Documentos referenciam `ProgramaID` por evento/ID.
  - ⚠️ **Adiciona um módulo novo** ao monólito. A formalização contra a constituição (limite de módulos / ADR-0006, ADR-0014) fica para o plano. Justificativa registrada: "Programa" é um conceito autônomo, sem dono natural entre os módulos atuais.
- **Novos agregados / Value Objects?**: agregado `Program`; VOs `Sigla`, `ProgramStatus` (`ATIVO|INATIVO`), referência de `Logo`. Cada um exige smart constructor + branded type + `Result<T,E>`. **Identidade dupla**: `id` UUID v4 (PK de domínio, gerado no domínio per ADR-0018) + `program_number` sequencial (`UNIQUE`, gerado pela aplicação via `MAX+1` sob `FOR UPDATE`), espelhando `contracts.sequential_number` e respeitando ADR-0020:106 (sem `AUTO_INCREMENT` em PK de domínio).
- **Novos eventos de domínio (outbox)?**: `ProgramCreated`, `ProgramUpdated`, `ProgramDeactivated`, `ProgramReactivated` (EN-passado). Registrar contratos em `handbook/architecture/` no plano; publicar via outbox (ADR-0015).
- **Novos subcomandos de CLI?**: a definir no plano — paridade com o padrão dos demais módulos (CLI continua sendo UX de validação de domínio).
- **Borda HTTP envolvida?**: **SIM** — CRUD REST de programas (listar/criar/detalhar/editar/desativar/reativar), consistente com a borda HTTP já entregue nas features 001–004. Mapas exatos de rota/contrato no plano.
- **Storage**: logo usa armazenamento de objetos (ADR-0019, S3 + MinIO em dev). Persistir referência/chave, não o binário no banco.
- **Reuso de `auth`**: permissões `program:list`/`program:read`/`program:create`/`program:update`/`program:deactivate`/`program:reactivate` (nomes finais no plano) somadas ao catálogo fixo em código (ADR-0024).
- **Possíveis violações da constituição (I–VIII)**: criação de módulo adicional — escalar/justificar no "Complexity Tracking" do plano. Sem JSON nativo MySQL, sem ENUM nativo, sem Redis/Kafka.

## Assumptions

As ambiguidades de maior impacto (módulo, desativação × dependências, reativação, identificador) foram resolvidas em **[Clarifications](#clarifications)**. Os _defaults_ técnicos abaixo permanecem e são refináveis no plano:

- **A1 — Formato da sigla**: uppercase, sem espaços, comprimento curto (limite exato no plano, ex.: 2–20). Unicidade insensível a caixa.
- **A2 — Comprimento do nome**: obrigatório, mínimo 2 caracteres, máximo da ordem de 255.
- **A3 — Logo**: formatos de imagem comuns (PNG/JPG/JPEG/WEBP), ≤ 5 MB; armazenamento externo (ADR-0019). Detalhes de upload (multipart vs URL pré-assinada) ficam no plano.
- **A4 — RBAC reusa `auth`**: papéis (admin/gestor/visualizador) são composições de permissões `program:*`; o catálogo de permissões é fixo em código (ADR-0024), não gerenciável em runtime por esta feature.
- **A5 — Diretor é texto livre**: sem vínculo com a entidade `Usuário` (conforme observado no frontend).
- **A6 — Concorrência**: bloqueio otimista por versão (last-write-fails-on-stale-version), não por lock pessimista.
