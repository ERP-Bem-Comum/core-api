# Feature Specification: Permissão `reference:read` no catálogo central de autorização

**Feature Branch**: `021-reference-read-permission`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "Registrar a permissão `reference:read` no catálogo central de autorização e concedê-la às roles que devem ler dados de referência financeira, corrigindo o 403 que os endpoints GET /api/v2/financial/categories, /cost-centers e /programs retornam para todos os usuários (inclusive admin). Issue #200, épico #64, feature 020."

## Clarifications

### Session 2026-06-22

- Q: Concessão de `reference:read` além do administrador — qual o escopo da feature agora? → A: Só catálogo + admin (mínimo/YAGNI). Registrar `reference:read` no catálogo central; o administrador recebe automaticamente via o conjunto completo do catálogo. **Nenhuma role de negócio é pré-concedida em código** — as demais roles recebem a permissão sob demanda pelo gerenciamento de acessos em runtime, respeitando o menor privilégio (OWASP/ENISA: "Grant access only to functions necessary for each user's role or purpose") e YAGNI (Fowler: evitar "speculative flexibility"). Decisão alinhada ao grão da arquitetura: catálogo é deploy-time, atribuição de role é runtime.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Administrador lê dados de referência financeira (Priority: P1)

Um administrador (que possui o conjunto completo de permissões do sistema) abre a tela de categorização de um documento financeiro. A interface precisa carregar as listas de **Categoria**, **Centro de Custo** e **Programa** para popular os seletores. Hoje essas três chamadas falham com **403 para todos os usuários — inclusive o administrador** — porque a permissão exigida pelas rotas não pode sequer ser concedida a nenhuma role.

**Why this priority**: É o bloqueador nº 1 entregue pela feature 020 (#147/#200). Sem ele, a categorização editável do documento no front fica inutilizável: os seletores nunca carregam, mesmo havendo dados de referência já populados (11 categorias, 5 centros de custo). É o caminho mínimo que destrava valor real ao usuário.

**Independent Test**: Autenticar um usuário com o perfil que detém todas as permissões e chamar os três endpoints de leitura de referência; cada um deve retornar **200** com a respectiva lista, e não mais 403.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado com o conjunto completo de permissões do sistema, **When** ele solicita a lista de categorias de referência, **Then** o sistema responde com sucesso (200) e a lista de categorias.
2. **Given** o mesmo usuário, **When** ele solicita a lista de centros de custo e a lista de programas, **Then** ambas respondem com sucesso (200) e suas respectivas listas.
3. **Given** o conjunto de permissões concedíveis do sistema, **When** uma role é configurada para incluir a leitura de dados de referência, **Then** a configuração é aceita (a permissão é reconhecida como pertencente ao catálogo) e não rejeitada como permissão desconhecida.

---

### User Story 2 - Usuário sem a permissão é barrado (Priority: P2)

Um usuário autenticado que **não** recebeu a permissão de leitura de dados de referência tenta acessar os mesmos endpoints. O sistema deve negar o acesso de forma consistente com as demais leituras protegidas do módulo.

**Why this priority**: Garante que a correção não vire um "abre para todos". A permissão deve ser efetivamente verificada contra o catálogo central e contra as permissões reais da role — não mascarada por um atalho de teste. Esta é a história que prova que a autorização real (e não um substituto de teste) está sendo exercida.

**Independent Test**: Autenticar um usuário sem a permissão de leitura de referência e chamar os três endpoints; cada um deve retornar **403**. O mesmo cenário, executado contra o mecanismo de autorização **real** (não um substituto que lê cabeçalho), deve reproduzir o 403 — provando que o gate cobre o caminho que hoje passa despercebido.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado sem a permissão de leitura de dados de referência, **When** ele solicita qualquer um dos três endpoints de referência, **Then** o sistema responde com 403 (acesso negado).
2. **Given** o mesmo usuário, **When** a verificação é feita pelo mecanismo de autorização real (ligado ao catálogo central), **Then** o 403 se mantém — o gap não é mascarado por substitutos de teste.

---

### Edge Cases

- **Permissão fora do catálogo**: antes desta correção, tentar conceder a permissão de leitura de referência a uma role é **rejeitado** como permissão desconhecida (não pertence ao catálogo). Após a correção, a concessão é aceita.
- **Perfil "todas as permissões"**: o perfil que recebe o conjunto completo de permissões precisa passar a incluir a leitura de referência automaticamente, sem alteração manual de cada role — caso contrário o administrador continua barrado.
- **Consistência com outras leituras protegidas**: os três endpoints devem exigir a permissão exatamente como hoje declarado; a correção é no catálogo/concessão, não no relaxamento do gate.
- **Regressão silenciosa de teste**: um teste que use um substituto de autorização (que apenas lê um cabeçalho) continuaria "verde" mesmo com o catálogo quebrado. O critério de aceite exige cobertura que exercite a autorização **real**.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O catálogo central de permissões do sistema (fonte única de verdade, deploy-time) MUST incluir a permissão de **leitura de dados de referência financeira** (`reference:read`), hoje exigida pelos endpoints de Categoria, Centro de Custo e Programa, mas ausente do catálogo.
- **FR-002**: O perfil que recebe o **conjunto completo de permissões** (usado pelo seed de desenvolvimento/administrador) MUST passar a incluir a permissão de leitura de dados de referência, de modo que o administrador obtenha acesso de leitura sem configuração manual adicional.
- **FR-003**: A configuração de uma role MUST aceitar a permissão de leitura de dados de referência como válida (pertencente ao catálogo), em vez de rejeitá-la como permissão desconhecida.
- **FR-004**: Um usuário **com** a permissão de leitura de dados de referência MUST conseguir ler as listas de Categoria, Centro de Custo e Programa (resposta de sucesso).
- **FR-005**: Um usuário **sem** a permissão de leitura de dados de referência MUST ser impedido de ler esses dados (acesso negado), de forma consistente com as demais leituras protegidas do módulo financeiro.
- **FR-006**: A correção MUST ser validada por cobertura automatizada que exercite o **mecanismo de autorização real** (ligado ao catálogo central e às permissões reais da role) — não um substituto que apenas inspeciona um cabeçalho de requisição —, de modo que o gap de catálogo não possa reaparecer despercebido.
- **FR-007**: A correção MUST permanecer dentro das fronteiras de cada módulo: o módulo financeiro continua declarando/exigindo a permissão; o módulo de autorização é o dono do catálogo central. Nenhum módulo passa a depender de internos do outro além das interfaces públicas já existentes.
- **FR-008**: A correção MUST se limitar a tornar a permissão **concedível** (catálogo) e concedida ao perfil completo (administrador); ela MUST NOT pré-criar/pré-conceder a permissão a qualquer role de negócio específica em código. A concessão a demais roles ocorre sob demanda pelo gerenciamento de acessos em runtime — em conformidade com o menor privilégio (conceder só o necessário ao propósito de cada role) e com YAGNI (sem estrutura especulativa de role/preset).

### Key Entities _(include if feature involves data)_

- **Permissão**: par `recurso:ação` que nomeia uma capacidade do sistema. A capacidade em questão é "ler dados de referência" (`reference:read`). Atributo-chave: deve existir no catálogo central para poder ser concedida.
- **Catálogo de permissões**: lista fixa, definida em deploy-time e imutável em runtime, de todas as permissões reconhecidas. É consultado tanto pela listagem de catálogo quanto pela validação de cada permissão atribuída a uma role, e pelo seed.
- **Role / Perfil de acesso**: agrupamento de permissões atribuído a usuários. O perfil "completo" (administrador/seed de dev) recebe todas as permissões do catálogo.
- **Dados de referência financeira**: Categoria, Centro de Custo e Programa — listas de apoio à categorização de documentos. São o recurso lido pelos três endpoints protegidos.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: O administrador (perfil com todas as permissões) obtém **sucesso (200)** nas três leituras de referência — Categoria, Centro de Custo e Programa — onde hoje recebe 403. Taxa de sucesso: 3/3.
- **SC-002**: A tela de categorização do documento no front carrega os três seletores (Categoria, Centro de Custo, Programa) sem erro de acesso, deixando de exibir os campos como desabilitados por falta de backend.
- **SC-003**: Um usuário sem a permissão de leitura de referência recebe **acesso negado (403)** nas três leituras. Taxa: 3/3.
- **SC-004**: Existe cobertura automatizada que falha caso a permissão de leitura de referência saia do catálogo central — exercitando a autorização real — garantindo que a regressão de catálogo seja detectada antes do deploy.

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [x] Financeiro (`fin_*`) · [x] Auth (`auth_*`)
  - ⚠️ Tocar dois BCs: justificado e **inerente ao defeito**. O contrato entre eles já existe — o módulo financeiro declara a permissão `reference:read` em sua public-api e a exige nas rotas; o módulo de autorização é o **dono do catálogo central** (`CATALOG_RAW`). O bug é exatamente a permissão existir em um lado e faltar no catálogo do outro. A correção (registrar no catálogo + conceder via seed) respeita o isolamento: nenhum módulo passa a importar internos (`domain/`/`application/`) do outro — apenas o catálogo central de auth ganha mais uma entrada, e o financeiro continua consumindo via sua própria public-api (ADR-0006).
- **Novos agregados / Value Objects?**: Nenhum. Acrescenta-se uma string canônica ao catálogo existente.
- **Novos eventos de domínio (outbox)?**: Nenhum.
- **Novos subcomandos de CLI?**: Nenhum (CLI embutida aposentada — ADR-0037).
- **Borda HTTP envolvida?**: Sim, apenas como **validação** — os três endpoints de leitura já existem (feature 020). Nenhuma rota nova; apenas a permissão exigida passa a ser concedível/concedida. A cobertura de validação exercita a autorização real na borda.
- **Possíveis violações da constituição (I–VIII)?**: Nenhuma identificada. Não cria 5º módulo, não adiciona classe ao domínio, não usa JSON nativo MySQL nem broker externo. É correção de catálogo RBAC + grant de seed + teste.

## Assumptions

- **Concessão a roles além do administrador** (resolvido — ver Clarifications 2026-06-22): apenas o perfil "todas as permissões" (seed de dev/admin) recebe a leitura de referência automaticamente, via o conjunto completo do catálogo. **Nenhuma role de negócio é pré-concedida em código**; as demais roles recebem a permissão sob demanda pelo gerenciamento de acessos em runtime (menor privilégio + YAGNI). Não há, no código atual, role de negócio seedada além do admin — então o escopo da feature fecha o #200 (admin → 200, front desbloqueado) sem introduzir estrutura de role nova.
- **Escopo restrito a leitura**: os endpoints de referência entregues pela feature 020 são somente leitura; não há permissão de escrita de referência neste escopo. Apenas a capacidade de **leitura** (`reference:read`) é tratada.
- **Dados de referência já existem**: assume-se que os dados de Categoria/Centro de Custo/Programa e seus endpoints já estão implementados (feature 020) — esta feature corrige somente a autorização que os bloqueia.
- **Reuso do mecanismo de autorização existente**: a validação real reusa o gate de autorização já existente da borda HTTP (fail-closed, ligado ao catálogo central), em vez de introduzir um novo mecanismo.
