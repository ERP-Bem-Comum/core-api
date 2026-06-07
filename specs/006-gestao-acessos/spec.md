# Feature Specification: Gestão de Acessos (Papéis e Permissões)

**Feature Branch**: `006-gestao-acessos`

**Created**: 2026-06-07

**Status**: Draft

**Input**: User description: "Gestão de acessos / RBAC administrativo no core-api. Catálogo de permissões, CRUD de papéis (Role), atribuir e revogar papéis a usuários, consultar permissões efetivas. Spec irmã: `005-gestao-usuarios`."

> **Contexto de reuso.** O módulo `auth` já modela o RBAC (ADR-0024): `Permission` (branded `resource:action`, ex.: `contract:mass-approve`), `Role` agrega `Permission[]`, `User` agrega `Role[]`, e um serviço puro `authorize(user, required)`. Já existem os use cases `assign-role`, `list-user-permissions` e `list-permissions`. Esta feature adiciona o **lado administrativo** que falta: catálogo, CRUD de papéis e revogação. **Estende o módulo `auth`** (mesma decisão DDD da `005` — um único dono do agregado). A faceta de **perfil/cadastro** de usuário é a spec irmã `005-gestao-usuarios`.

## Clarifications

### Session 2026-06-07

- Q: O catálogo de permissões (`resource:action`) é fixo em código ou gerenciável em runtime? → A: **Fixo em código** (deploy-time). Cada permissão nasce com a feature que a verifica; o admin **compõe papéis** a partir do catálogo, mas **não cria permissões** em runtime. Não há CRUD de permissão — apenas de papel.
- Q: Como remover um papel e o que acontece com quem o possui? → A: **Desativar + bloquear se em uso**. Papéis nunca são excluídos fisicamente; desativar torna o papel não-atribuível. Desativar um papel ainda atribuído exige revogá-lo dos usuários primeiro (ou mantém-no como histórico read-only). Preserva auditoria, sem permissões órfãs.
- Q: "Aprovador em massa" é permissão específica ou papel dedicado? → A: **Permissão específica** (`contract:mass-approve`, já citada no ADR-0024), concedida por qualquer papel que a contenha. A `005` exibe "aprovador em massa = sim" quando o usuário tem essa permissão efetiva.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Consultar permissões efetivas de um usuário (Priority: P1)

Um administrador de acessos consulta o que um usuário específico pode fazer — seus papéis e as permissões resultantes —, para auditar ou decidir um ajuste.

**Why this priority**: Visibilidade de "quem pode o quê" é a base de qualquer gestão de acesso e pré-requisito para atribuir/revogar com segurança. Reusa `list-user-permissions`.

**Independent Test**: Dado um usuário com papéis conhecidos, consultar suas permissões efetivas e conferir que correspondem à união das permissões de seus papéis.

**Acceptance Scenarios**:

1. **Given** um usuário com dois papéis, **When** o admin consulta suas permissões, **Then** vê a lista consolidada (união) das permissões dos papéis.
2. **Given** um usuário sem papéis, **When** o admin consulta, **Then** vê lista vazia (nenhuma permissão), sem erro.

---

### User Story 2 - Catálogo de permissões (Priority: P1)

O administrador lista todas as permissões existentes no sistema (`resource:action`), para saber o que pode ser concedido ao montar papéis.

**Why this priority**: Sem conhecer o catálogo não há como compor papéis corretamente. Reusa `list-permissions`.

**Independent Test**: Solicitar o catálogo e conferir que todas as permissões conhecidas do sistema aparecem, sem duplicatas.

**Acceptance Scenarios**:

1. **Given** o sistema em operação, **When** o admin lista o catálogo, **Then** recebe todas as permissões disponíveis, cada uma com seu identificador `resource:action`.

---

### User Story 3 - Listar papéis (Priority: P1)

O administrador vê todos os papéis cadastrados e as permissões que cada um contém.

**Why this priority**: É o ponto de entrada da gestão de papéis; pré-requisito de atribuição e edição.

**Independent Test**: Listar os papéis e conferir nome + conjunto de permissões de cada um.

**Acceptance Scenarios**:

1. **Given** papéis cadastrados, **When** o admin os lista, **Then** vê cada papel com nome e suas permissões.

---

### User Story 4 - Atribuir e revogar papel de um usuário (Priority: P2)

O administrador concede um papel a um usuário e, quando necessário, o revoga.

**Why this priority**: É a operação central de distribuição de acesso. `assign-role` já existe; falta a revogação.

**Independent Test**: Atribuir um papel e confirmar que as permissões do usuário aumentam; revogar e confirmar que retornam ao estado anterior.

**Acceptance Scenarios**:

1. **Given** um usuário sem o papel X, **When** o admin atribui X, **Then** o usuário passa a ter as permissões de X (operação idempotente).
2. **Given** um usuário com o papel X, **When** o admin revoga X, **Then** o usuário deixa de ter as permissões exclusivas de X.
3. **Given** um ator sem a permissão de gerir acessos, **When** tenta atribuir/revogar, **Then** o sistema nega (fail-closed).

---

### User Story 5 - Criar papel (Priority: P2)

O administrador cria um novo papel, dando-lhe um nome e selecionando permissões do catálogo.

**Why this priority**: Permite modelar acessos sob medida; depende do catálogo (US2).

**Independent Test**: Criar um papel com um conjunto de permissões e confirmar que ele aparece na listagem com exatamente essas permissões.

**Acceptance Scenarios**:

1. **Given** permissões válidas do catálogo, **When** o admin cria o papel, **Then** ele passa a constar na listagem com as permissões escolhidas.
2. **Given** um nome de papel já existente, **When** o admin tenta criar, **Then** o sistema recusa por conflito.
3. **Given** uma permissão inexistente no catálogo, **When** o admin tenta incluí-la, **Then** o sistema recusa.

---

### User Story 6 - Editar papel (Priority: P2)

O administrador altera o nome e/ou o conjunto de permissões de um papel existente.

**Why this priority**: Manutenção de acessos é rotineira; mudanças propagam a todos os usuários do papel.

**Independent Test**: Adicionar/remover uma permissão de um papel e confirmar que as permissões efetivas dos usuários que o possuem refletem a mudança.

**Acceptance Scenarios**:

1. **Given** um papel atribuído a usuários, **When** o admin adiciona uma permissão a ele, **Then** todos os usuários do papel passam a tê-la.
2. **Given** um papel, **When** o admin remove uma permissão, **Then** os usuários do papel deixam de tê-la (salvo se outro papel a conceder).

---

### User Story 7 - Desativar/arquivar papel (Priority: P3)

O administrador retira um papel de circulação sem necessariamente removê-lo dos usuários históricos.

**Why this priority**: Higiene do catálogo de papéis; menos frequente.

**Independent Test**: Desativar um papel e confirmar que ele não pode mais ser atribuído, mantendo a consistência para quem já o possui (conforme política definida).

**Acceptance Scenarios**:

1. **Given** um papel ativo **sem usuários**, **When** o admin o desativa, **Then** ele não pode mais ser atribuído a novos usuários.
2. **Given** um papel ainda **atribuído** a usuários, **When** o admin tenta desativá-lo, **Then** o sistema **bloqueia** e orienta revogar o papel dos usuários antes (sem permissões órfãs).

### Edge Cases

- **Revogar papel que o usuário não tem**: operação idempotente (no-op), sem erro.
- **Editar papel removendo permissão concedida também por outro papel**: o usuário mantém a permissão pela outra via.
- **Desativar papel ainda atribuído**: bloqueado até revogação (FR-012) — nunca exclusão física nem revogação em massa silenciosa.
- **Ator se auto-rebaixa** (revoga o próprio papel de gestão de acessos): protegido para evitar lockout administrativo.
- **Permissão inexistente** referenciada em criação/edição de papel: recusada.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema MUST listar as permissões efetivas de um usuário (união das permissões de seus papéis).
- **FR-002**: O sistema MUST expor o catálogo completo de permissões disponíveis (`resource:action`), sem duplicatas.
- **FR-003**: O sistema MUST listar os papéis existentes, cada um com seu nome e conjunto de permissões.
- **FR-004**: O sistema MUST permitir atribuir um papel a um usuário (reuso de `assign-role`), de forma **idempotente**.
- **FR-005**: O sistema MUST permitir **revogar** um papel de um usuário, de forma **idempotente**.
- **FR-006**: O sistema MUST permitir criar um papel com nome único e um conjunto de permissões **validadas contra o catálogo**.
- **FR-007**: O sistema MUST permitir editar o nome e o conjunto de permissões de um papel; mudanças propagam às permissões efetivas dos usuários que o possuem.
- **FR-008**: O sistema MUST garantir unicidade de nome de papel, recusando criação/edição que viole a regra.
- **FR-009**: O sistema MUST exigir autorização para toda operação de gestão de acessos, negando por padrão (fail-closed) — reuso de `authorize`.
- **FR-010**: O sistema MUST impedir que um ator remova de si mesmo o papel/permissão que lhe dá a gestão de acessos (proteção contra lockout administrativo).
- **FR-011**: O sistema MUST tratar o catálogo de permissões (`resource:action`) como **fixo, definido em código** (deploy-time). O sistema NÃO MUST oferecer criação/edição de permissões em runtime; a gestão administrativa cobre apenas **papéis**. A criação/edição de papel valida cada permissão contra esse catálogo fixo.
- **FR-012**: O sistema MUST tratar a remoção de um papel como **desativação** (nunca exclusão física): um papel desativado não pode ser atribuído a novos usuários. Desativar um papel **ainda atribuído** MUST ser bloqueado até que ele seja revogado dos usuários (ou mantido como histórico read-only) — nunca deixando permissões órfãs nem revogando acesso em massa silenciosamente.
- **FR-013**: O sistema MUST representar "aprovador em massa" como a **permissão específica** `contract:mass-approve` do catálogo, concedida por qualquer papel que a contenha. As permissões efetivas de um usuário (FR-001) indicam se ele a possui; a `005` exibe esse estado read-only (FR-015 de lá).

### Key Entities _(include if feature involves data)_

- **Permissão (`Permission`)**: capacidade atômica no formato `resource:action` (ex.: `user:create`, `contract:mass-approve`). Identidade pelo próprio par. **Já existe** no `auth`.
- **Papel (`Role`)**: agrupa um conjunto de permissões sob um nome único; atribuível a usuários. **Já existe** (agregado com `RoleId`, `RoleRepository`); esta feature adiciona criação/edição/ciclo de vida.
- **Atribuição Usuário↔Papel**: relação N:N; o `User` agrega `Role[]`. Atribuir/revogar altera as permissões efetivas.
- **Permissões efetivas**: visão derivada (união das permissões dos papéis de um usuário); não é armazenada, é computada.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Um administrador identifica todas as permissões efetivas de um usuário em uma única consulta.
- **SC-002**: 100% das tentativas de compor papéis com permissões fora do catálogo são recusadas.
- **SC-003**: Alterar as permissões de um papel reflete nas permissões efetivas de todos os seus usuários sem ação manual adicional.
- **SC-004**: Nenhuma operação de gestão de acessos é concluída por ator sem a permissão correspondente (0 acessos indevidos).
- **SC-005**: Nenhum ator consegue se trancar para fora da gestão de acessos (proteção de lockout verificável).

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [x] Auth (`auth_*`) — **estende** o RBAC existente. Sem novo BC.
- **Novos agregados / Value Objects?**: `Role` já é agregado; candidatos a operação nova — `Role.create/rename/setPermissions/deactivate`. `Permission` já é VO. Possível `RoleName` como VO (unicidade/normalização).
- **Novos eventos de domínio (outbox)?**: candidatos — `RoleCreated`, `RolePermissionsChanged`, `RoleDeactivated`, `RoleRevokedFromUser` (já há `RoleAssigned`). Para AuditLog/futuro.
- **Novos subcomandos de CLI?**: paridade CLI para listar/criar/editar papéis e atribuir/revogar.
- **Borda HTTP envolvida?**: SIM — rotas sob `auth/adapters/http` (Zod/OpenAPI, ADR-0025/0027/0028).
- **Possíveis violações da constituição (I–IX)?**: nenhuma prevista; reuso do RBAC existente. Decisão de fronteira já citada na `005` (estender `auth`).

## Assumptions

- **Reuso do RBAC**: `Permission`/`Role`/`authorize`/`assign-role`/`list-permissions` são reaproveitados; esta feature **adiciona** revogação e CRUD de papéis, não reescreve o modelo.
- **Idempotência**: atribuir/revogar papel são idempotentes em relação ao estado-alvo.
- **Propagação por referência**: como `User` agrega `Role[]` e `Role` agrega `Permission[]`, alterar um papel propaga naturalmente às permissões efetivas — sem cópia por usuário.
- **Autorização própria**: a gestão de acessos é, ela mesma, protegida por permissões (ex.: `role:create`, `role:update`, `role:assign`, `role:revoke`); `user:assign-role` já existe.
- **Coordenação com 005**: a definição de "aprovador em massa" (FR-013) determina o que a `005` exibe read-only (FR-015 de lá).
