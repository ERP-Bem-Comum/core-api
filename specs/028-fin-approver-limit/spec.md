# Feature Specification: Validação de alçada do aprovador no Lançar Documento

**Feature Branch**: `028-fin-approver-limit`

**Created**: 2026-06-30

**Status**: Draft

**Input**: User description: validar alçada do aprovador (limite ≥ valor líquido) + cascata no Lançar Documento (issue #289, go-live p1, complementa #148; sub-validação da #89).

## Clarifications

### Session 2026-06-30

- Q: A cascata para aprovador de nível superior entra NESTA feature ou fica para depois? (FR-009) → A: **Incluir a cascata agora** — quando a alçada do aprovador indicado é insuficiente, o sistema encaminha ao próximo aprovador com alçada suficiente.
- Q: Aprovador SEM alçada definida deve ser tratado como? (FR-008) → A: **Bloqueia tudo** (fail-closed) — sem alçada = não aprova nenhum valor.
- Q: A alçada (limite monetário de aprovação) é definida por usuário ou por papel? (FR-007) → A: **Por papel, via RBAC** — porém de forma **autocontida**: reaproveitar o RBAC existente sem reformular o modelo de papéis nem abrir uma cadeia recursiva de tickets/pré-requisitos para viabilizar esta feature.
- Q: Em que momento a validação de alçada ocorre? → A: **Na criação E na submissão** — sempre que houver um aprovador indicado e um valor líquido conhecido (create e transição Draft→Open, #91).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Bloquear aprovador sem alçada suficiente (Priority: P1)

Como responsável financeiro que lança um documento, quando indico quem vai aprová-lo, quero que o sistema só aceite um aprovador cuja **alçada** (limite monetário de aprovação) seja **maior ou igual ao valor líquido** do documento — caso contrário, a indicação é recusada com uma mensagem clara. Assim nenhum documento segue para aprovação nas mãos de quem não tem alçada para autorizá-lo.

**Why this priority**: É o coração da issue #289 e o controle financeiro que falta hoje — sem ele, qualquer aprovador pode ser atribuído a qualquer valor, furando a política de alçadas. Entrega valor sozinho (mesmo sem gestão de alçada nem cascata) assim que houver uma alçada conhecida por aprovador.

**Independent Test**: Com um aprovador de alçada conhecida, atribuir a ele documentos de líquido abaixo, igual e acima da alçada e verificar que apenas os dois primeiros são aceitos e o terceiro é recusado por alçada insuficiente — sem depender de US2 ou US3.

**Acceptance Scenarios**:

1. **Given** um aprovador com alçada de R$ 1.000 e um documento de líquido R$ 5.000, **When** o documento é indicado/submetido a esse aprovador, **Then** o sistema recusa a operação sinalizando alçada insuficiente.
2. **Given** um aprovador com alçada de R$ 5.000 e um documento de líquido R$ 5.000, **When** o documento é indicado/submetido a esse aprovador, **Then** a operação é aceita (limite no exato é permitido — comparação ≥).
3. **Given** um aprovador com alçada de R$ 10.000 e um documento de líquido R$ 5.000, **When** o documento é indicado/submetido, **Then** a operação é aceita.
4. **Given** um identificador de aprovador que não existe ou que não tem permissão de aprovar pagamentos, **When** o documento é indicado/submetido a ele, **Then** o sistema recusa com erro tratado, sem expor código ou identificador interno.

---

### User Story 2 - Definir a alçada de um aprovador (Priority: P2)

Como administrador, quero definir e atualizar a alçada (limite monetário de aprovação) de cada aprovador, para que a validação da US1 tenha uma base de dados confiável e auditável.

**Why this priority**: É o pré-requisito de dados da US1 num cenário real. Fica em P2 porque a US1 pode ser validada com alçadas semeadas/pré-existentes; a gestão pela interface é o passo que torna a política operável pelo negócio.

**Independent Test**: Definir a alçada de um aprovador para um valor X, depois consultá-la e confirmar que persiste; alterar para Y e confirmar a atualização — sem depender de nenhum documento.

**Acceptance Scenarios**:

1. **Given** um aprovador sem alçada definida, **When** o administrador define a alçada como R$ 20.000, **Then** o aprovador passa a ter alçada de R$ 20.000 e a US1 a utiliza nas validações seguintes.
2. **Given** um aprovador com alçada de R$ 20.000, **When** o administrador atualiza para R$ 50.000, **Then** o novo limite passa a valer para validações futuras.

---

### User Story 3 - Cascata para nível superior (Priority: P3)

Como responsável financeiro, quando a alçada do aprovador indicado é insuficiente para o valor líquido, quero que o documento seja encaminhado ao próximo aprovador com alçada suficiente, para que valores altos cheguem automaticamente a quem pode autorizá-los.

**Why this priority**: É a parte de maior valor agregado e **confirmada no escopo** (Clarifications 2026-06-30). Fica em P3 porque US1+US2 já entregam o controle de alçada (MVP demonstrável); a cascata é a camada de automação por cima. A "cadeia" deve ser derivada do RBAC já existente (papéis ordenados por alçada), **sem** introduzir uma estrutura de hierarquia nova nem dependências em outros tickets — mantendo a feature autocontida.

**Independent Test**: Com uma cadeia de aprovadores de alçadas crescentes, submeter um documento cujo líquido excede a alçada do primeiro e confirmar que o encaminhamento atinge o primeiro aprovador da cadeia com alçada suficiente.

**Acceptance Scenarios**:

1. **Given** uma cadeia A (R$ 1.000) → B (R$ 10.000) e um documento de líquido R$ 5.000 indicado a A, **When** submetido, **Then** o documento é encaminhado a B (primeiro nível com alçada ≥ líquido).
2. **Given** que nenhum aprovador da cadeia tem alçada suficiente, **When** submetido, **Then** o sistema sinaliza que não há aprovador com alçada para o valor.

---

### Edge Cases

- **Limite exato**: líquido igual à alçada deve ser aceito (regra é `alçada ≥ líquido`, não `>`).
- **Documento sem líquido (Draft)**: enquanto o documento é rascunho sem líquido calculado, a validação de alçada não se aplica; ela incide quando há líquido e um aprovador indicado.
- **Aprovador sem alçada definida**: papel sem alçada = **não pode aprovar nenhum valor** (fail-closed); qualquer documento com líquido positivo é recusado.
- **Alçada alterada após indicação**: mudança de alçada não revalida retroativamente documentos já encaminhados nesta fatia (validação ocorre no momento da indicação/submissão).
- **Perda de permissão**: aprovador que perde `aprovar pagamentos` após ser indicado — a próxima indicação/submissão recusa; documentos já em curso não são afetados nesta fatia.
- **Comparação monetária**: feita em valor inteiro (centavos), sem ponto flutuante, na mesma moeda.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema MUST conhecer a alçada (limite monetário de aprovação) de cada aprovador.
- **FR-002**: Ao indicar ou submeter um documento a um aprovador, o sistema MUST comparar o **valor líquido** do documento com a **alçada** do aprovador.
- **FR-003**: O sistema MUST impedir que um documento siga para aprovação quando a alçada do aprovador for **menor** que o valor líquido, sinalizando erro de alçada insuficiente.
- **FR-004**: O sistema MUST permitir que o documento siga para aprovação quando a alçada do aprovador for **maior ou igual** ao valor líquido.
- **FR-005**: O sistema MUST verificar que o aprovador indicado **existe** e **possui a permissão de aprovar pagamentos**; caso contrário, recusa a indicação.
- **FR-006**: As mensagens de erro ao usuário MUST NOT expor identificadores, códigos internos ou detalhes de implementação (alinhado ao tratamento da #52).
- **FR-007**: A alçada de aprovação MUST ser definida **por papel (RBAC)** — o limite monetário está associado ao papel/perfil do aprovador, não a cada usuário individualmente. O sistema MUST permitir definir e atualizar a alçada de um papel.
- **FR-007a**: A modelagem da alçada por papel MUST ser **autocontida**: reaproveitar o RBAC já existente (papéis e permissões do Auth) sem reformular o modelo de papéis e sem criar dependência bloqueante em outros tickets/decisões de RBAC em aberto. _(Restrição de escopo explícita do solicitante: evitar cadeia recursiva de pré-requisitos.)_
- **FR-008**: Para um aprovador cujo papel **não tem alçada definida**, o sistema MUST tratá-lo como **sem autorização para aprovar qualquer valor** (fail-closed): qualquer documento com líquido positivo é recusado.
- **FR-009**: Quando a alçada do aprovador indicado for insuficiente, o sistema MUST **encaminhar o documento ao próximo aprovador com alçada suficiente** (cascata). A ordem de encaminhamento MUST derivar dos papéis ordenados por alçada (do menor suficiente para cima), sem estrutura de hierarquia nova fora do RBAC.
- **FR-009a**: Quando **nenhum** aprovador alcançável possui alçada suficiente para o valor líquido, o sistema MUST sinalizar que não há aprovador com alçada para o valor, sem encaminhar.
- **FR-010**: A validação MUST ocorrer de forma síncrona na indicação/submissão do documento, sem encaminhar para aprovação um documento que falhe na regra de alçada.
- **FR-011**: A validação de alçada MUST incidir **tanto na criação quanto na submissão** (transição Draft→Open, #91) do documento — sempre que houver um aprovador indicado e um valor líquido conhecido. Em rascunho sem líquido calculado, a validação não se aplica.

### Key Entities _(include if feature involves data)_

- **Alçada de aprovação (Approval Limit)**: valor monetário máximo que um papel está autorizado a aprovar. Expresso em moeda (valor inteiro em centavos). Vinculado ao **papel (RBAC)** do aprovador (FR-007). Pode ser indefinido — papel sem alçada não aprova nada (FR-008).
- **Aprovador (Approver)**: usuário com a permissão de aprovar pagamentos, cuja alçada vem do seu papel. Já listável hoje (entregue na #148).
- **Documento financeiro (Document)**: agregado existente; possui valor líquido calculado e a indicação de aprovador (`approverRef`). A regra desta feature compara o líquido do documento com a alçada do papel do aprovador indicado.
- **Cadeia de aprovação (Approval Chain)**: ordenação dos papéis por alçada (crescente) usada para o encaminhamento automático (cascata, FR-009). Derivada do RBAC existente — não é uma estrutura de hierarquia nova.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% das indicações/submissões com aprovador de alçada **inferior** ao líquido são bloqueadas (nenhum documento segue para aprovação violando a política de alçada).
- **SC-002**: 100% das indicações/submissões com aprovador de alçada **≥** líquido são aceitas sem fricção adicional.
- **SC-003**: 0 mensagens de erro expõem identificador ou código interno em respostas de recusa.
- **SC-004**: A verificação de alçada é imperceptível ao usuário no fluxo de lançamento (resposta sob 1 segundo em condições normais).
- **SC-005**: 100% dos aprovadores indicados inexistentes ou sem a permissão de aprovar pagamentos são recusados.

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [ ] Contratos (`ctr_*`) · [x] Financeiro (`fin_*`) · [x] Auth (`auth_*`) · [ ] Parceiros (`partners_*`)
  - ⚠️ Toca **dois BCs**. Justificativa: a **alçada é dado do Auth** (atributo do usuário/papel aprovador) e a **regra de comparação é do Financeiro** (líquido do documento). O acoplamento é **somente leitura via `public-api`** (ADR-0006), seguindo o precedente já existente do `AuthUserReadPort` consumido pelo financial. Cada BC mantém seu schema e prefixo (ADR-0014); nenhum acesso direto a tabela de outro módulo.
- **Novos agregados / Value Objects?**: VO de **alçada/limite** (baseado em Money/centavos) associado ao **papel (RBAC) no Auth** — reaproveitando o modelo de papéis existente, sem reformulá-lo (FR-007a). Possível VO/regra no domínio do Financeiro para a comparação e para a cascata. Cada um com smart constructor + branded type + `Result<T,E>`. Detalhe no plano.
- **Novos eventos de domínio (outbox)?**: A validação é síncrona (sem evento). A **cascata** (FR-009) pode emitir evento de encaminhamento — a definir no plano (manter autocontido; sem novo módulo/broker).
- **Novos subcomandos de CLI?**: N/A (CLI embutida retirada — ADR-0037).
- **Borda HTTP envolvida?**: SIM (Fastify ativo, ADR-0025). A validação incide nos endpoints de criação/submissão de documento do financial; a gestão da alçada (US2) pode exigir endpoint próprio (no Auth). Schemas de borda validados com Zod (ADR-0027), par fastify-server-expert + zod-expert.
- **Possíveis violações da constituição (I–VIII)?**: O único ponto de atenção é tocar dois BCs — mitigado por `public-api` (sem violar isolamento). Sem JSON nativo MySQL, sem ENUM, sem broker/Redis. Comparação monetária inteira (sem float).

## Assumptions

- O **valor líquido** já é calculado pelo domínio do Document (regra R1 em `financial-data.ts`); esta feature **consome** o líquido, não o recalcula.
- A **alçada é lida pelo Financeiro via `public-api` do Auth** (precedente `AuthUserReadPort`), sem acesso direto ao schema do Auth (ADR-0006/0014).
- A validação ocorre **sempre que há um `approverRef` indicado e um líquido conhecido** — **tanto na criação quanto na submissão** (`submitDraft` Draft→Open, #91), conforme Clarifications.
- **Money em centavos** (valor inteiro), comparação `>=` sem ponto flutuante, mesma moeda (BRL).
- Erros internos em **EN kebab-case** (ex.: `approver-limit-exceeded`, `approver-not-found`, `approver-missing-permission`, `no-approver-with-sufficient-limit`); mensagens ao humano em PT via dicionário da borda.
- O **escopo confirmado é US1 + US2 + US3 (cascata)**; o MVP demonstrável continua sendo US1+US2, com a cascata como camada de automação por cima.
- A alçada é **por papel (RBAC)** e modelada de forma **autocontida** (FR-007a) — reaproveita papéis/permissões existentes do Auth, sem reformular o RBAC e sem abrir dependência bloqueante em outros tickets.
- A permissão usada na verificação é a já existente `payable:approve` (catálogo de permissões do Auth); esta feature **não** cria nova permissão de aprovação, apenas, se necessário, permissão de **gestão de alçada do papel** (US2).
