# Feature Specification: Autorização na listagem de contratos (`contract:read`)

**Feature Branch**: `022-contracts-list-authorize`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "Aplicar `authorize(contract:read)` na rota de listagem GET /api/v2/contracts, que hoje só tem `requireAuth` — qualquer autenticado lista contratos sem ter a permissão. Issue #202, P2, achado de segurança."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Usuário sem permissão de leitura é barrado da listagem (Priority: P1)

Um usuário autenticado que **não** possui a permissão de leitura de contratos tenta acessar a listagem de contratos. Hoje a listagem retorna os dados (número, contratado, valores, vigência, status) para qualquer usuário autenticado, independentemente de permissão. O sistema deve negar esse acesso, de forma consistente com as demais leituras do módulo de contratos (detalhe, histórico e exportação já exigem a permissão de leitura).

**Why this priority**: É o defeito de segurança em si — vazamento de uma listagem sensível (carteira de contratos, contrapartes e valores) para usuários autenticados sem direito de leitura. Corrigir isso é o valor central da feature.

**Independent Test**: Autenticar um usuário sem a permissão de leitura de contratos e solicitar a listagem; o sistema deve negar (acesso negado), e não mais retornar a lista.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado sem a permissão de leitura de contratos, **When** ele solicita a listagem de contratos, **Then** o sistema responde com acesso negado (403) e não retorna dados de contrato.
2. **Given** um usuário não autenticado (sem credencial válida), **When** ele solicita a listagem, **Then** o sistema responde com não autenticado (401).

---

### User Story 2 - Usuário com permissão continua listando normalmente (Priority: P1)

Um usuário autenticado **com** a permissão de leitura de contratos acessa a listagem e obtém os resultados como hoje — a correção não pode regredir o caminho feliz nem alterar o conteúdo retornado.

**Why this priority**: Garante que a correção de segurança não quebre o uso legítimo (a maioria dos consumidores da listagem). Sem isso, a feature regrediria funcionalidade existente.

**Independent Test**: Autenticar um usuário com a permissão de leitura e solicitar a listagem; o sistema retorna a lista com sucesso, idêntica ao comportamento atual (mesmos filtros, paginação e campos).

**Acceptance Scenarios**:

1. **Given** um usuário autenticado com a permissão de leitura de contratos, **When** ele solicita a listagem (com ou sem filtros), **Then** o sistema responde com sucesso (200) e a lista de contratos, sem alteração de formato em relação ao comportamento atual.

---

### Edge Cases

- **Consistência entre leituras**: a listagem passa a exigir exatamente a mesma permissão de leitura já exigida pelo detalhe, pelo histórico e pela exportação — não uma permissão diferente nem mais fraca.
- **Sem alteração de contrato de dados**: a correção atua apenas na autorização; os campos, filtros e paginação da listagem permanecem idênticos para quem tem a permissão.
- **Regressão silenciosa de teste**: a cobertura que valida a listagem hoje só exercita o caminho com permissão (caminho feliz), por isso não detectou a ausência do guard. A nova cobertura precisa exercitar explicitamente o caso **sem** a permissão, contra a verificação de autorização real.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: A listagem de contratos MUST exigir a permissão de **leitura de contratos** para retornar qualquer dado, alinhada às demais leituras do módulo (detalhe, histórico, exportação).
- **FR-002**: Um usuário autenticado **sem** a permissão de leitura de contratos MUST receber acesso negado ao solicitar a listagem, sem que nenhum dado de contrato seja retornado.
- **FR-003**: Um usuário **não autenticado** MUST receber resposta de não autenticado ao solicitar a listagem (comportamento atual preservado).
- **FR-004**: Um usuário autenticado **com** a permissão de leitura de contratos MUST continuar obtendo a listagem com sucesso, sem alteração de formato, filtros, paginação ou campos em relação ao comportamento atual.
- **FR-005**: A correção MUST se restringir à autorização da listagem; MUST NOT alterar o contrato de dados da resposta, criar novas permissões, nem tocar outras rotas.
- **FR-006**: A correção MUST ser validada por cobertura automatizada que exercite a verificação de autorização **real** (ligada às permissões reais do usuário) cobrindo explicitamente o caso negado (sem permissão), de modo que a ausência do guard não possa reaparecer despercebida.

### Key Entities _(include if feature involves data)_

- **Permissão de leitura de contratos**: capacidade já existente e reconhecida pelo sistema, exigida pelas demais leituras do módulo. Não é criada nesta feature — apenas passa a ser exigida também pela listagem.
- **Listagem de contratos**: visão tabular da carteira de contratos (número, contraparte, valores, vigência, status) com filtros e paginação. É o recurso protegido por esta feature.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% das requisições à listagem feitas por usuários autenticados **sem** a permissão de leitura passam a receber **acesso negado** (antes: retornavam a lista).
- **SC-002**: 100% das requisições à listagem feitas por usuários **com** a permissão continuam recebendo **sucesso**, com a mesma resposta de antes (sem regressão de formato/filtros/paginação).
- **SC-003**: Requisições sem autenticação à listagem recebem **não autenticado** (inalterado).
- **SC-004**: Existe cobertura automatizada que falha caso a listagem deixe de exigir a permissão de leitura — exercitando a autorização real e o caso negado.
- **SC-005**: A listagem exige a **mesma** permissão de leitura que detalhe, histórico e exportação (consistência de autorização do módulo verificável).

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [x] Contratos (`ctr_*`)
  - Toca **um único** BC (contracts). A verificação de permissão usa o mecanismo de autorização já provido pelo módulo de autenticação via sua interface pública (consumo já existente neste plugin) — nenhum novo acoplamento cross-módulo é introduzido (ADR-0006).
- **Novos agregados / Value Objects?**: Nenhum.
- **Novos eventos de domínio (outbox)?**: Nenhum.
- **Novos subcomandos de CLI?**: Nenhum (CLI embutida aposentada — ADR-0037).
- **Borda HTTP envolvida?**: Sim — a rota de listagem já existe; a correção adiciona o guard de autorização ao seu fluxo de pré-tratamento. Nenhuma rota nova, nenhum schema de request/response alterado. A validação exercita a autorização real na borda.
- **Possíveis violações da constituição (I–VIII)?**: Nenhuma. Não cria 5º módulo, não adiciona classe ao domínio, não usa JSON nativo MySQL nem broker externo. É aplicação de um guard de autorização já usado pelas rotas-irmãs.

## Assumptions

- **Permissão já existente e concedível**: a permissão de leitura de contratos já está registrada no catálogo central e é concedida normalmente (diferente do #200, aqui **não** há gap de catálogo) — esta feature apenas passa a exigi-la também na listagem.
- **Mesma permissão das demais leituras**: assume-se que a listagem deve exigir a leitura de contratos (e não uma permissão nova ou específica de listagem), por paridade com detalhe/histórico/exportação. Não há indício de requisito de granularidade diferente para a listagem.
- **Sem mudança de contrato**: a resposta da listagem (campos, filtros, paginação) permanece idêntica; somente o controle de acesso muda.
- **Reuso do mecanismo de autorização existente**: a verificação reusa o gate de autorização já existente da borda (fail-closed), o mesmo aplicado às rotas-irmãs.
