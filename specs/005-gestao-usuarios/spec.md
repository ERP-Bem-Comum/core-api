# Feature Specification: Gestão Administrativa de Usuários

**Feature Branch**: `005-gestao-usuarios`

**Created**: 2026-06-07

**Status**: Draft

**Input**: User description: "Gestão administrativa de usuários no core-api (backend que serve a tela /usuarios do ERP). CRUD de usuários, ativar/desativar, foto de perfil, aprovador em massa, Minha Conta e redefinir senha. Insumo: `handbook/research/feture_propose/gestao_de_usuarios`. Spec irmã: `006-gestao-acessos` (papéis/permissões)."

> **Contexto de reuso.** O agregado `User` já existe no módulo `auth` (`auth/domain/identity/user`), com autenticação, troca de senha e reset de senha já implementados. Esta feature adiciona **somente o lado administrativo/CRUD** que ainda não existe. A **gestão de papéis e permissões** é a spec irmã `006-gestao-acessos`. A **fronteira de Bounded Context** (estender `auth` vs novo módulo `users`) é decidida no `/speckit-plan` com consultoria DDD e citação (Princípio IX), **não** nesta spec.

## Clarifications

### Session 2026-06-07

- Q: "Aprovador em massa" (`massApprovalPermission`) é atributo de perfil (005) ou permissão RBAC (006)? → A: **Permissão RBAC** — a concessão vive na `006-gestao-acessos`; a 005 apenas **exibe** o estado (read-only), não concede.
- Q: Ao criar um usuário (admin), como se dá o primeiro acesso? → A: **Convite/ativação por email** — criar dispara convite; o usuário define a própria senha pelo fluxo existente (`request/confirm-password-reset` + EmailPort, ADR-0010). Nenhuma senha é definida pelo admin.
- Q: `collaboratorId` é vínculo gerenciável (escopo 005) ou dado opaco read-only? → A: **Opaco/read-only por ora** — persistido e exibido, mas **não** gerenciável nesta feature; `partners`/RH fora do escopo da 005.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Listar, buscar e filtrar usuários (Priority: P1)

Um administrador acessa a área de usuários e vê a lista de todas as contas, podendo navegar por páginas, buscar por nome e filtrar por status (ativos/inativos). É o ponto de entrada de toda a gestão.

**Why this priority**: Sem a listagem não há como localizar um usuário para qualquer outra operação. É o MVP — entrega valor sozinha (visibilidade do cadastro) e é pré-requisito de todas as demais histórias.

**Independent Test**: Popular N usuários e verificar que a listagem retorna a página correta (tamanhos 5/10/25), que a busca por nome restringe o resultado e que o filtro por status separa ativos de inativos.

**Acceptance Scenarios**:

1. **Given** 23 usuários cadastrados, **When** o admin abre a lista com 5 por página, **Then** vê os 5 primeiros e a indicação de página atual e total.
2. **Given** a lista aberta, **When** o admin digita parte de um nome na busca, **Then** apenas usuários cujo nome corresponde são exibidos.
3. **Given** a lista aberta, **When** o admin aplica o filtro "Inativo", **Then** apenas usuários inativos são listados.
4. **Given** uma busca sem correspondência, **When** os resultados são calculados, **Then** o sistema retorna lista vazia (zero itens), sem erro.

---

### User Story 2 - Ver detalhe de um usuário (Priority: P1)

O administrador seleciona um usuário e vê todos os seus dados cadastrais em modo leitura, antes de decidir editar, ativar ou desativar.

**Why this priority**: É a ponte entre a lista e qualquer mutação; valida que o sistema expõe o registro completo (campos que não vêm na listagem, como telefone e foto).

**Independent Test**: Dado um usuário conhecido, requisitar seu detalhe por identificador e conferir que todos os campos cadastrais retornam com os valores corretos.

**Acceptance Scenarios**:

1. **Given** um usuário existente, **When** o admin abre seu detalhe, **Then** vê nome, CPF, email, telefone, foto (se houver), status e a flag "aprovador em massa".
2. **Given** um identificador inexistente, **When** o detalhe é solicitado, **Then** o sistema responde "não encontrado" sem vazar dados.

---

### User Story 3 - Criar usuário (Priority: P2)

O administrador cadastra um novo usuário informando nome, CPF, email, telefone, opcionalmente foto e a flag "aprovador em massa".

**Why this priority**: Habilita o crescimento do cadastro, mas depende de listagem/detalhe para ser verificável. Toca o ponto sensível de credenciais (ver clarificação).

**Independent Test**: Submeter um cadastro válido e confirmar que o usuário passa a aparecer na listagem; submeter um cadastro inválido e confirmar a recusa com mensagens por campo.

**Acceptance Scenarios**:

1. **Given** dados válidos, **When** o admin cria o usuário, **Then** ele é persistido como **ativo** e passa a constar na listagem.
2. **Given** um email já usado por outro usuário, **When** o admin tenta criar, **Then** o sistema recusa informando conflito de email.
3. **Given** campos obrigatórios ausentes ou CPF/email/telefone com formato inválido, **When** o admin submete, **Then** o sistema recusa e indica cada campo problemático.

---

### User Story 4 - Editar perfil de um usuário (Priority: P2)

O administrador altera os dados cadastrais de um usuário existente.

**Why this priority**: Correção/manutenção do cadastro é rotineira, mas vem depois de criar/listar.

**Independent Test**: Editar um campo de um usuário e confirmar via detalhe que o novo valor foi persistido e os demais preservados.

**Acceptance Scenarios**:

1. **Given** um usuário existente, **When** o admin altera nome/telefone e salva, **Then** o detalhe passa a refletir os novos valores.
2. **Given** uma edição que deixa o email igual ao de outro usuário, **When** o admin salva, **Then** o sistema recusa por conflito.
3. **Given** uma edição inválida, **When** o admin salva, **Then** nenhuma alteração é persistida (atomicidade) e os erros por campo são informados.

---

### User Story 5 - Ativar e desativar usuário (Priority: P2)

O administrador desativa um usuário ativo (revogando seu acesso) ou reativa um inativo, sempre com confirmação explícita.

**Why this priority**: É o mecanismo de offboarding/onboarding de acesso; substitui exclusão (ver Assumptions).

**Independent Test**: Desativar um usuário ativo e confirmar que seu status muda e que ele passa a ser filtrável como inativo; reativar e confirmar o inverso.

**Acceptance Scenarios**:

1. **Given** um usuário ativo, **When** o admin confirma a desativação, **Then** o status passa a inativo.
2. **Given** um usuário inativo, **When** o admin confirma a ativação, **Then** o status passa a ativo.
3. **Given** um usuário já inativo, **When** o admin tenta desativar novamente, **Then** a operação é idempotente (sem erro, sem efeito duplicado).

---

### User Story 6 - Foto de perfil (Priority: P3)

O administrador (ou o próprio usuário em Minha Conta) envia ou troca a foto de perfil.

**Why this priority**: Enriquece o cadastro, mas não é essencial para gerir contas.

**Independent Test**: Enviar uma imagem para um usuário e confirmar que o detalhe passa a referenciar a nova foto; remover e confirmar retorno ao estado sem foto.

**Acceptance Scenarios**:

1. **Given** um usuário sem foto, **When** uma imagem válida é enviada, **Then** o detalhe passa a referenciar essa foto.
2. **Given** um arquivo que excede o tamanho permitido ou tem tipo não suportado, **When** o envio ocorre, **Then** o sistema recusa informando o motivo.

---

### User Story 7 - Minha Conta e redefinição de senha (Priority: P3)

O usuário autenticado edita o próprio perfil e redefine a própria senha, sem privilégio administrativo.

**Why this priority**: Autosserviço reduz carga do admin, mas reaproveita fluxos de senha já existentes no `auth`.

**Independent Test**: Como usuário comum, editar o próprio nome/telefone e confirmar persistência; iniciar e concluir a redefinição de senha pelo fluxo existente.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado, **When** edita seu próprio perfil, **Then** as alterações são salvas sem exigir permissão administrativa.
2. **Given** um usuário autenticado, **When** redefine a senha cumprindo a política de senha vigente, **Then** a nova senha passa a valer e a anterior é invalidada.
3. **Given** um usuário comum, **When** tenta editar o perfil de **outro** usuário, **Then** o sistema nega por falta de permissão.

### Edge Cases

- **Nome com capitalização irregular** (ex.: "vinicius") vindo de dados legados: saneado apenas na apresentação; o valor armazenado não é corrompido.
- **CPF/telefone sem máscara** na origem: armazenados normalizados (somente dígitos); a formatação é responsabilidade da apresentação.
- **Coluna "perfil"** exibida na tela legada **não existe** no backend: não é um campo desta feature.
- **Busca vazia / página além do total**: retorna conjunto vazio com metadados de paginação coerentes (zero itens), nunca erro.
- **Email duplicado** em criação ou edição: recusado de forma consistente.
- **Desativar a si mesmo / último administrador**: protegido por regra (ver Assumptions) para evitar lockout.
- **Concorrência**: duas edições simultâneas do mesmo usuário não devem gerar estado parcial.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema MUST listar usuários com paginação configurável (tamanhos 5, 10 e 25) e retornar metadados de paginação (página atual, total de páginas, total de itens).
- **FR-002**: O sistema MUST permitir busca textual por nome, restringindo a listagem aos correspondentes.
- **FR-003**: O sistema MUST permitir filtrar a listagem por status (ativo, inativo, todos).
- **FR-004**: O sistema MUST expor o detalhe completo de um usuário por identificador, incluindo campos não presentes na listagem (telefone, foto, indicador **read-only** de "aprovador em massa" — ver FR-015, vínculo opaco a colaborador — ver FR-017).
- **FR-005**: O sistema MUST permitir criar um usuário com nome, CPF, email, telefone e foto opcional, persistindo-o como **ativo**. A criação **não** define a permissão "aprovador em massa" (concedida na `006`) nem senha (ver FR-016).
- **FR-006**: O sistema MUST validar nome e email como obrigatórios, e CPF, email e telefone quanto ao formato, recusando entradas inválidas com indicação por campo.
- **FR-007**: O sistema MUST garantir unicidade de email entre usuários, recusando criação/edição que viole essa regra.
- **FR-008**: O sistema MUST armazenar CPF e telefone **normalizados** (somente dígitos), deixando formatação para a camada de apresentação.
- **FR-009**: O sistema MUST permitir editar os dados cadastrais de um usuário existente de forma atômica (ou tudo é salvo, ou nada).
- **FR-010**: O sistema MUST permitir ativar e desativar um usuário, sendo a operação **idempotente** em relação ao status-alvo.
- **FR-011**: O sistema MUST tratar a desativação como o mecanismo de remoção de acesso; **não** MUST oferecer exclusão física de usuários (ver Assumptions).
- **FR-012**: O sistema MUST permitir enviar, trocar e remover a foto de perfil, validando tipo e tamanho do arquivo.
- **FR-013**: O sistema MUST permitir que o usuário autenticado edite o **próprio** perfil e redefina a **própria** senha, reusando os fluxos de senha existentes no módulo `auth`.
- **FR-014**: O sistema MUST exigir autorização para toda ação administrativa (listar, detalhar, criar, editar, ativar/desativar, gerir foto de terceiros), negando por padrão quando o ator não tem permissão (fail-closed).
- **FR-015**: O sistema MUST **exibir** (read-only) se um usuário tem a permissão "aprovador em massa". A **concessão/revogação** dessa permissão NÃO pertence a esta feature — é modelada como permissão RBAC na `006-gestao-acessos`. A 005 não cria nem altera esse estado, apenas o reflete no detalhe do usuário.
- **FR-016**: Ao criar um usuário, o sistema MUST iniciar o primeiro acesso por **convite/ativação por email**: o novo usuário recebe um convite e define a própria senha pelo fluxo de ativação existente no `auth` (`request-password-reset` / `confirm-password-reset`, via EmailPort — ADR-0010). O administrador **não** define senha; nenhuma senha trafega fora do fluxo de ativação.
- **FR-017**: O sistema MUST persistir e exibir o vínculo do usuário a um colaborador (`collaboratorId`) como **referência opaca somente-leitura** herdada do legado. A 005 **não** gerencia esse vínculo nem acessa o módulo `partners`/RH; criação/alteração do vínculo fica fora de escopo (eventual feature futura).

### Key Entities _(include if feature involves data)_

- **Usuário (perfil administrativo)**: representa uma conta gerenciável do ERP. Atributos cadastrais geridos aqui: nome, CPF (normalizado), email (único), telefone (normalizado), foto (opcional), status (ativo/inativo). Atributos apenas **refletidos** (read-only): indicador "aprovador em massa" (fonte: RBAC, `006`) e `collaboratorId` (referência opaca, legado). **Reusa** a identidade já existente no `auth` — esta feature trata da faceta administrativa/cadastral, não da credencial.
- **Status do usuário**: estado binário (ativo/inativo) que governa a capacidade de acesso; transita por ativação/desativação explícitas.
- **Foto de perfil**: artefato binário associado ao usuário, armazenado em storage de objetos; o cadastro referencia o artefato, não o conteúdo.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Um administrador localiza um usuário específico (por nome ou status) em no máximo 3 interações a partir da lista.
- **SC-002**: 100% das criações/edições com dados inválidos são recusadas com indicação clara do(s) campo(s) — nenhuma persistência parcial.
- **SC-003**: A listagem retorna resultados de forma perceptivelmente instantânea para o volume operacional esperado (ordem de milhares de usuários).
- **SC-004**: Nenhuma ação administrativa é concluída por um ator sem a permissão correspondente (0 acessos indevidos em teste de autorização).
- **SC-005**: Desativar um usuário remove seu acesso de forma verificável; reativar o restaura — ambos sem exclusão de histórico.
- **SC-006**: Dados legados problemáticos (capitalização, máscara de CPF/telefone) não corrompem o armazenamento — o valor canônico permanece normalizado.

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [x] Auth (`auth_*`) — reuso da identidade existente · possível novo BC `users_*` (decisão no plano) · [ ] Parceiros (`partners_*`) — **fora de escopo** (`collaboratorId` é opaco read-only, FR-017).
  - ⚠️ `collaboratorId` é persistido como referência opaca — **nenhuma** leitura cruzada de tabelas nem chamada a `partners` nesta feature (ADR-0006/0014).
- **Novos agregados / Value Objects?**: candidatos a VO — `Cpf`, `Telephone`, `ProfilePhotoRef`; o agregado `User` provavelmente é **estendido**, não recriado (a confirmar no plano com DDD).
- **Novos eventos de domínio (outbox)?**: `UserCreated`, `UserProfileUpdated`, `UserEnabled` (par do `UserDisabled` existente — ver `data-model.md`). `UserCreated` é o gatilho do convite de ativação (FR-016).
- **Validação E2E (ADR-0037)**: por **coleção Bruno** (`api-collections/users/`, ADR-0034) contra a borda HTTP real + `fastify.inject` — **não** há paridade CLI (CLI embutida aposentada).
- **Borda HTTP envolvida?**: SIM, é a UX primária (ADR-0037) — HTTP oficial (ADR-0025/0027/0028); rotas sob `adapters/http` com Zod/OpenAPI.
- **Dependências de infra**: storage S3/MinIO para foto (ADR-0019); **EmailPort** para o convite de ativação (ADR-0010) — reuso do canal de `request/confirm-password-reset` do `auth`.
- **Possíveis violações da constituição (I–IX)?**: o Princípio VII passou a **HTTP-first** (ADR-0037); foto (S3) e email (EmailPort) são permitidos. Se o plano propuser **novo módulo** `users`, isso adiciona um 6º BC — justificar em "Complexity Tracking" do plano.

## Assumptions

- **Remoção = desativação** (soft): usuários nunca são fisicamente excluídos; "remover" significa desativar. Preserva auditoria e integridade referencial (`collaboratorId`, papéis).
- **Paginação por offset** (página/tamanho), espelhando o comportamento observado no legado (`page`/`limit`); cursor não é requisito.
- **Busca por nome** é por correspondência parcial, case-insensitive; ordenação default alfabética por nome.
- **CPF/telefone**: armazenamento normalizado (dígitos); validação de formato na borda; saneamento de máscara/capitalização apenas na apresentação.
- **Identidade reusada**: o `User` do `auth` é a fonte de identidade; esta feature não cria um segundo conceito de "usuário autenticável".
- **Política de senha**: a redefinição em Minha Conta segue a política e os fluxos já vigentes no `auth` (`change-password`, `request/confirm-password-reset`) — sem nova política aqui.
- **Autorização**: nomes de permissão específicos por operação são definidos em conjunto com `006-gestao-acessos`; esta spec assume que cada ação administrativa exige uma permissão correspondente.
- **Proteção mínima**: o sistema não permite que um administrador desative a própria conta na mesma sessão (evita lockout acidental); regra refinável no plano.
- **Primeiro acesso por convite**: criar usuário não define senha; dispara convite de ativação por email (FR-016), reusando `request/confirm-password-reset` + EmailPort (ADR-0010). Até ativar, o usuário existe como ativo no cadastro mas sem credencial utilizável.
- **`collaboratorId` opaco**: persistido e exibido como referência herdada do legado; nenhuma gestão de vínculo nem integração com `partners`/RH nesta feature (FR-017).
- **Dependências**: storage de objetos (S3/MinIO, ADR-0019) para foto; canal de email (EmailPort, ADR-0010) para o convite de ativação.
