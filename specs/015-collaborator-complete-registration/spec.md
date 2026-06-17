# Feature Specification: Cadastro completo de Colaborador + contagem de contratos nos grids

**Feature Branch**: `015-collaborator-complete-registration`

**Created**: 2026-06-17

**Status**: Draft

**Input**: épico #65 (Colaborador — cadastro completo) + issue #46 (contagem Contratos/Aditivos nos grids). Issues filhas: #40, #41, #42, #43, #44, #46.

> **Histórico relevante:** uma tentativa anterior (PRs #83–86) foi **resetada** porque quatro trilhas rodaram **em paralelo e colidiram na mesma migration** (`0009`). Esta feature corrige a causa-raiz por **processo**: branch única, user stories **serializadas**, **uma migration por vez** (`0010`→`0015`), `db:generate` nunca concorrente, sem worktrees paralelas na camada de persistência. Implementação **fresh / fail-first** (W0 RED genuíno), sem cherry-pick dos diffs resetados.

## Clarifications

### Session 2026-06-17

- Q: TTL (validade) do convite de autocadastro do colaborador (US5)? → A: **7 dias** corridos (onboarding tem cadência mais lenta que reset de senha; token uso-único + hash é a defesa primária).
- Q: Como modelar `childrenAges` (lista de idades dos filhos) sem JSON nativo (US2, ADR-0020)? → A: **`varchar` com lista delimitada por vírgula** (ex.: `5,8,12`); texto delimitado ≠ JSON nativo (permitido); YAGNI (sem query por idade).
- Q: Formato do CSV de histórico (US4)? → A: **cabeçalho legado literal** `tipo_alteracao;historico_antes;historico_depois;data_alteracao`, **mantendo a coluna `programa` vazia** para compatibilidade com importadores legados.
- Q: (A1) US6 cross-BC — fatiar em tickets por BC? → A: **2 tickets separados** — `6a` no `contracts` (enriquece evento) e `6b` no `partners` (projeta); `6b` depende de `6a` mergeado (respeita "não misturar módulos numa sessão", anti-padrão #4).
- Q: (A2) Enriquecer o evento do Contratos com `contractorRef` — aditivo ou bump? → A: **campo aditivo ao wire-format v1** (`CONTRACTS_SCHEMA_VERSION=1` mantido; decoder tolerante; consumers antigos ignoram o campo extra). Sem breaking change.
- Q: (B1) Fonte das citações canônicas (Princípio IX)? → A: **MCP `acdg-skills` com fallback local** `acdg/skills_base/shared-references/` quando o MCP estiver off.
- Q: (B2) Escopo da exigência de citação literal ≥4 linhas? → A: **todo W0 de toda US** (rigor máximo) — cada W0 (US1–US6) registra citação canônica, não só as decisões-chave.

## User Scenarios & Testing _(mandatory)_

> **Ordem de implementação (serializada):** US1 → US2 → US3 → US4 → US5 → US6. A ordem é ditada por **dependência técnica + serialização de migration**, não só pela prioridade de valor. Cada US fecha o gate W3 (e sua migration) **antes** de a próxima abrir.

### User Story 1 - Dados bancários/PIX em Financiador e Colaborador (Priority: P1)

Como **operador de cadastro**, quero registrar conta bancária e chave PIX ao criar/editar um **Financiador** ou um **Colaborador**, para que o módulo Financeiro possa pagá-los — hoje só Fornecedor e ACT têm esses campos, e os formulários de "novo Financiador"/"novo Colaborador" mantêm o bloco bancário desabilitado.

**Why this priority**: É a base do épico — desbloqueia dois formulários do front e **consolida o Value Object de destino de pagamento** que as US seguintes assumem. Independente das demais.

**Independent Test**: criar um Financiador e um Colaborador com banco/PIX via API e confirmar que o detalhe os retorna; rejeitar agência malformada e tipo de chave inválido.

**Acceptance Scenarios**:

1. **Dado** um `POST /financiers` com `bankAccount` e `pixKey` válidos, **Quando** cria, **Então** retorna 201 e o `GET /financiers/:id` traz ambos os objetos.
2. **Dado** um `POST /collaborators` com `bankAccount`/`pixKey` válidos, **Quando** cria, **Então** retorna 201 e o detalhe traz ambos.
3. **Dado** `agency` fora do formato (≠ 4 dígitos + DV opcional), **Quando** valida, **Então** retorna 422 com slug `bank-agency-invalid`.
4. **Dado** `pixKey.keyType` fora do conjunto (`cpf|cnpj|email|phone|random-key`), **Quando** valida, **Então** retorna 422.
5. **Dado** uma alteração via `PUT`, **Quando** altera banco/PIX, **Então** persiste e o detalhe reflete.
6. **Dado** um Financiador/Colaborador **sem** banco/PIX, **Quando** cria, **Então** retorna 201 (ambos os blocos são **opcionais** — não há a invariante "ao menos um destino" do Fornecedor).

---

### User Story 2 - Campos do cadastro completo do Colaborador (Priority: P2)

Como **operador de cadastro**, quero preencher os campos de perfil do colaborador (sexo, estado civil, filhos, PCD, afastamento, tempo de experiência no setor público), para concluir o cadastro completo que o front hoje mantém bloqueado.

**Why this priority**: alto valor (destrava o cadastro completo, a montante de benefícios/território), mas depende da consolidação da US1 estar mergeada para serializar a migration.

**Independent Test**: completar um cadastro com os novos campos e confirmar que o detalhe os retorna; rejeitar `sex`/`maritalStatus` fora do enum; campos omitidos voltam como `null` explícito.

**Acceptance Scenarios**:

1. **Dado** um colaborador em `PreRegistration`, **Quando** `PATCH .../complete-registration` com os campos válidos, **Então** retorna 200, status vira `Complete` e o `GET /:id` retorna os valores.
2. **Dado** `sex: "X"` (fora de `F|M`), **Quando** valida, **Então** retorna 422 com slug `sex-invalid`.
3. **Dado** `maritalStatus` fora de `single|married|divorced|widowed|stable_union`, **Quando** valida, **Então** retorna 422 com slug `marital-status-invalid`.
4. **Dado** campos nullable omitidos, **Quando** lê o detalhe, **Então** vêm como `null` explícito (não omitidos).
5. **Dado** um colaborador legado (sem os campos novos), **Quando** é lido/editado, **Então** segue válido (aditivo backward-compatible).

> **Decisão registrada (PO):** `sex` (`F|M`) é campo **novo e independente**, que **coexiste** com o `genderIdentity` já existente — sexo biológico ≠ identidade de gênero, ambos legítimos. `publicSectorExperienceDuration` **estende** (não substitui) o booleano `experienceInThePublicSector`.

---

### User Story 3 - Território do Colaborador (Priority: P3)

Como **operador de cadastro**, quero informar UF e município de atuação do colaborador, para rastrear a localidade — hoje enviar `territory` retorna 422.

**Why this priority**: campo de baixo risco (S), porém menos crítico que perfil/banco; serializado após US2.

**Independent Test**: criar colaborador com e sem `territory`; confirmar persistência e que UF inválida é rejeitada; território preservado ao desativar.

**Acceptance Scenarios**:

1. **Dado** um `POST /collaborators` com `territory: { uf, municipality }`, **Quando** cria, **Então** retorna 201, persiste e o `GET /:id` retorna o objeto.
2. **Dado** um `POST` **sem** `territory`, **Quando** cria, **Então** retorna 201 e o detalhe traz `territory: null` (backward-compatible).
3. **Dado** `uf` que não é sigla de UF brasileira, **Quando** valida, **Então** retorna 422 com slug `territory-uf-invalid`.
4. **Dado** um colaborador com território, **Quando** é desativado (soft-delete), **Então** o território é **preservado**.

> **Nota de fronteira (ADR-0035):** território aqui é **atributo do colaborador** (UF/município de atuação), distinto da _parceria territorial_ (`par_states`/`par_municipalities`, que marca uma localidade como parceira). A UF é validada contra o **catálogo geográfico read-only** já existente.

---

### User Story 4 - Histórico de alterações do Colaborador + export CSV (Priority: P3)

Como **gestor de RH**, quero exportar o histórico de alterações de um colaborador (o que mudou, de/para, quando), para auditar dados sensíveis (nome, e-mail, CPF, cargo) — hoje a opção "Exportar → Histórico" não funciona.

**Why this priority**: valor de auditoria, porém L e dependente dos campos (US1–US3) já existirem para o snapshot capturá-los sem retrabalho.

**Independent Test**: alterar um colaborador, confirmar que uma linha de histórico nasce, e exportar o CSV no formato legado.

**Acceptance Scenarios**:

1. **Dado** um colaborador com cargo `Diretor`, **Quando** `PUT /:id` muda para `Diretor Adjunto`, **Então** nasce uma linha de histórico com `tipo_alteracao`, valor `antes`, valor `depois` e `data_alteracao`.
2. **Dado** ≥1 alteração registrada, **Quando** `GET /collaborators/export?type=history`, **Então** retorna 200 `text/csv` no formato legado — cabeçalho literal `tipo_alteracao;historico_antes;historico_depois;data_alteracao` (coluna `programa` mantida vazia), separador `;`, aspas, datas `dd/MM/aaaa`, 1 linha por alteração.
3. **Dado** o repositório de histórico indisponível, **Quando** exporta, **Então** retorna 503 com slug `collaborator-repo-unavailable`.
4. **Dado** a criação inicial de um colaborador, **Quando** consulta o histórico, **Então** **não** há entrada (cadastro inicial não gera histórico).

---

### User Story 5 - Autocadastro público do Colaborador (Priority: P2)

Como **colaborador convidado**, quero concluir meu próprio cadastro por um link seguro recebido por e-mail, sem precisar de login — hoje existe um use case público **órfão** (não ligado à borda), sem token, e-mail nem rota.

**Why this priority**: alto valor (destrava o fluxo de autocadastro do front) e é o item **mais sensível à segurança** (IDOR). Serializado após os campos, pois o pré-cadastro pode incluí-los.

**Independent Test**: gerar um convite, validar o token na rota pública, concluir o cadastro e confirmar que o token vira inutilizável; rejeitar token expirado/usado e CPF divergente sem vazar dados.

**Acceptance Scenarios**:

1. **Dado** um `POST /collaborators` por operador autenticado, **Quando** cria, **Então** gera um convite uso-único com expiração de **7 dias** e **dispara e-mail** com link tokenizado.
2. **Dado** um token válido, **Quando** `GET /collaborators/autocadastro?token=…`, **Então** retorna 200 com os dados de pré-cadastro (CPF mascarado).
3. **Dado** um token **expirado** ou **já usado**, **Quando** acessa, **Então** retorna 404 com slug `collaborator-autocadastro-token-expired` / `…-token-used`, **sem vazar dados**.
4. **Dado** um `POST /collaborators/autocadastro { token, …dados }` válido, **Quando** submete, **Então** o status vira `Complete` e o token é marcado como usado.
5. **Dado** um token cujo CPF informado não bate, **Quando** submete, **Então** retorna 400 com slug `collaborator-autocadastro-cpf-mismatch`.

> **Segurança (obrigatório):** token **uso-único + TTL** (armazenado como **hash**) é a defesa primária contra IDOR; a revalidação de CPF é secundária. A rota pública não expõe enumeração de colaboradores. Esta US passa por review com `web-security-backend`.

---

### User Story 6 - Contagem de Contratos/Aditivos + filtro de status nos grids (Priority: P3)

Como **gestor**, quero ver nos grids de parceiros (Colaborador/Fornecedor/ACT/Financiador) quantos contratos e aditivos cada um tem, e filtrar Fornecedores por status de contrato — hoje a coluna mostra "—".

**Why this priority**: valor real porém **adiado** (front degrada para 0/0, não está bloqueado) e é o item de **maior risco/tamanho** (XL): exige decisão de arquitetura (ADR), enriquecimento dos eventos do módulo Contratos e um novo projetor.

**Independent Test**: com o read-model populado, ler um grid e confirmar contagens corretas em uma única consulta por página; filtrar por status; com o read-model vazio/indisponível, a lista não quebra (degrada para 0/0).

**Acceptance Scenarios**:

1. **Dado** o read-model populado, **Quando** `GET` o grid de um tipo de parceiro, **Então** cada item traz `contractsCount`/`amendmentsCount` em **uma consulta batch por página** (sem N+1).
2. **Dado** o grid de Fornecedor, **Quando** filtra por `contractStatus` (`Pending|Active|Expired|Cancelled|none`), **Então** retorna só os que casam.
3. **Dado** o read-model indisponível, **Quando** `GET` o grid, **Então** degrada para `0/0` **sem** derrubar a lista.
4. **Dado** contratos legados pré-existentes, **Quando** o backfill one-shot roda, **Então** as contagens iniciais refletem o estado atual.

> **Pré-requisito bloqueante:** um **novo ADR (ADR-0046)** decide o read-model `partners←contracts` via projeção sobre o outbox (estende ADR-0022, **não** port síncrono — evita ciclo de dependência ADR-0006) e o **enriquecimento dos eventos de integração do Contratos com `contractorRef`** (hoje os eventos só carregam `contractId`). Sem esse ADR, a US6 **não entra em W0**. **Fatiamento (Clarifications):** US6 = 2 tickets — `6a` no `contracts` enriquece o evento (campo **aditivo** ao wire-format v1, sem breaking change) e `6b` no `partners` projeta o read-model; `6b` depende de `6a` mergeado.

---

### Edge Cases

- **Migração concorrente** (causa-raiz do reset): duas US gerando `db:generate` ao mesmo tempo → **proibido**; serialização é invariante de processo.
- **PIX sem banco / banco sem PIX** em Financier/Collaborator: permitido (ambos opcionais).
- **`childrenCount > 0` mas `hasChildren = false`** (incoerência): rejeitar ou normalizar — ver Assumptions.
- **Token de convite reusado em corrida** (duas submissões simultâneas): o consumo é atômico; a segunda vê `token-used`.
- **Evento de contrato fora de ordem / reentregue** no projetor da US6: idempotente por `occurred_at` (não regride).
- **Parceiro sem nenhum contrato** no grid: `0/0`, não ausência de linha.
- **UF válida + município inexistente**: município é texto livre (catálogo de municípios não é exaustivamente validado) — ver Assumptions.

## Requirements _(mandatory)_

### Functional Requirements

**US1 — Banco/PIX (Financier + Collaborator)**

- **FR-001**: O sistema MUST aceitar, persistir e retornar `bankAccount { bank, agency, accountNumber, checkDigit }` e `pixKey { keyType, key }` (ambos **opcionais**) em Financiador e Colaborador, em create/update/detail.
- **FR-002**: O sistema MUST validar `agency` no formato 4 dígitos + dígito verificador opcional, rejeitando o malformado com `bank-agency-invalid`, e MUST aplicar a mesma regra de forma harmonizada a Fornecedor e ACT.
- **FR-003**: O sistema MUST validar `pixKey.keyType` contra `cpf|cnpj|email|phone|random-key`.
- **FR-004**: O Value Object de destino de pagamento MUST ser **único e compartilhado** pelos quatro tipos de parceiro (sem duplicação).

**US2 — Campos de perfil do Colaborador**

- **FR-005**: O sistema MUST aceitar e retornar os campos (todos nullable): `sex` (`F|M`), `maritalStatus`, `hasChildren`, `childrenCount`, `childrenAges` (lista de idades persistida como `varchar` delimitado por vírgula — sem JSON nativo), `isPwd`, `pwdDescription`, `isOnLeave`, `leaveDuration`, `leaveRenewable`, `leaveRenewalDuration`, `publicSectorExperienceDuration`.
- **FR-006**: `sex` MUST coexistir com `genderIdentity` como campos independentes.
- **FR-007**: Campos nullable omitidos MUST retornar como `null` explícito; colaboradores legados sem os campos MUST permanecer válidos.

**US3 — Território**

- **FR-008**: O sistema MUST aceitar/persistir/retornar `territory { uf, municipality }` (nullable) e MUST validar `uf` contra o catálogo de UFs, rejeitando inválida com `territory-uf-invalid`.
- **FR-009**: O território MUST ser preservado em edição e desativação.

**US4 — Histórico + export**

- **FR-010**: O sistema MUST registrar, a cada alteração de colaborador, uma entrada de histórico com tipo da alteração, valor anterior, valor novo e data; a criação inicial NÃO gera entrada.
- **FR-011**: O sistema MUST exportar o histórico em CSV no formato legado — cabeçalho literal `tipo_alteracao;historico_antes;historico_depois;data_alteracao` com a coluna `programa` vazia, separador `;`, aspas, datas `dd/MM/aaaa` — e MUST retornar 503 (`collaborator-repo-unavailable`) quando o repositório estiver indisponível.

**US5 — Autocadastro público**

- **FR-012**: Ao criar um colaborador, o sistema MUST emitir um convite **uso-único com expiração de 7 dias** (armazenado como hash) e disparar e-mail com link tokenizado.
- **FR-013**: A rota pública de autocadastro MUST pré-popular dados (CPF mascarado) para token válido e MUST recusar token expirado/usado com 404 sem vazar dados.
- **FR-014**: A conclusão MUST mudar o status para `Complete`, invalidar o token, e MUST rejeitar CPF divergente com `collaborator-autocadastro-cpf-mismatch`.
- **FR-015**: O acesso a e-mail/notificação MUST respeitar o isolamento de módulos (sem importar `auth` diretamente).

**US6 — Contagem nos grids**

- **FR-016**: O sistema MUST expor, por item de grid de cada tipo de parceiro, `contractsCount` e `amendmentsCount`, computados em **uma consulta batch por página** (sem N+1).
- **FR-017**: O grid de Fornecedor MUST oferecer filtro por `contractStatus` (`Pending|Active|Expired|Cancelled|none`, espelhando o `ContractStatus` do módulo Contratos + `none` para parceiro sem contrato).
- **FR-018**: A contagem MUST ser mantida por **projeção sobre o stream de eventos** do Contratos (read-model derivado, reconstruível), **idempotente** e tolerante a eventos fora de ordem/reentregues.
- **FR-019**: Os eventos de integração do Contratos MUST passar a carregar a referência do contratado (`contractorRef`) para que a projeção atribua a contagem ao parceiro correto.
- **FR-020**: Um backfill one-shot MUST inicializar as contagens a partir dos contratos legados, coordenado para execução única (sem dupla-contagem em múltiplas instâncias).
- **FR-021**: Com o read-model indisponível, os grids MUST degradar para `0/0` sem falhar a listagem.

### Key Entities

- **Collaborator** (estendido): agregado pessoa-física do `partners`; ganha banco/PIX, campos de perfil e território (todos nullable, aditivos).
- **Financier** (estendido): ganha banco/PIX opcionais.
- **PaymentTarget VOs** — `BankAccount`, `PixKey`: destino de pagamento compartilhado pelos quatro tipos de parceiro.
- **CollaboratorInviteToken**: convite uso-único (hash, expiração, vínculo ao colaborador) para autocadastro.
- **CollaboratorHistory**: trilha append-only de alterações (snapshot antes/depois, agnóstico aos campos do agregado).
- **ContractCountView** (read-model em `partners`): contagem de contratos/aditivos por parceiro, projetada do stream de eventos do Contratos; derivada e reconstruível.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Os formulários de novo Financiador e novo Colaborador passam a gravar banco/PIX — 100% dos campos antes bloqueados ficam funcionais.
- **SC-002**: O cadastro completo do colaborador aceita todos os campos de perfil, território e banco; um cadastro legado continua válido (zero regressão de leitura/edição).
- **SC-003**: O autocadastro permite a um convidado concluir o cadastro pelo link em uma sessão, e um link expirado/usado nunca expõe dados pessoais.
- **SC-004**: O gestor exporta o histórico de alterações no formato legado, com uma linha por alteração registrada.
- **SC-005**: Os grids de parceiros exibem a contagem de contratos/aditivos corretamente; a contagem é computada em **1 consulta batch por página** (sem N+1 / sem consultas por-linha).
- **SC-006**: Nenhuma colisão de migration ocorre durante a entrega (a numeração avança de forma estritamente sequencial, um ticket por vez).
- **SC-007**: O gate de qualidade W3 (typecheck + format + lint + testes) fica verde ao fim de **cada** user story, sem regressão acumulada.

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [x] Contratos (`ctr_*`, **somente US6**, como produtor de eventos enriquecidos) · [ ] Financeiro (`fin_*`) · [ ] Auth (`auth_*`) · [x] Parceiros (`par_*`, principal)
  - ⚠️ **Justificativa de tocar 2 BCs:** a US6 é um read-model **cross-BC via outbox** (ADR-0022) — a comunicação é por **eventos**, não por import direto; o Contratos só ganha enriquecimento de payload de evento; o Parceiros consome via projeção. Não há acoplamento de domínio (ADR-0006). As US1–US5 são exclusivamente `par_*`.
- **Novos agregados / Value Objects?**: VOs `Sex`, `MaritalStatus`, `Territory`; **promoção** de `BankAccount`/`PixKey` para escopo compartilhado do módulo; entidade `CollaboratorInviteToken`; entidade/projeção `CollaboratorHistory`; read-model `ContractCountView`.
- **Novos eventos de domínio (outbox)?**: enriquecimento dos eventos de integração do Contratos com `contractorRef` (contrato registrado no ADR-0046). Eventos do Collaborator já existem.
- **Novos subcomandos de CLI?**: N/A (CLI embutida aposentada — ADR-0037).
- **Borda HTTP envolvida?**: SIM (HTTP ativo — ADR-0037). Rotas novas: autocadastro público (US5), `export?type=history` (US4), campos novos em create/update/detail (US1–US3), contagem/filtro nos grids (US6).
- **Possíveis violações da constituição (I–VIII)?**: (a) tocar 2 BCs — mitigado por outbox (justificado acima); (b) rota pública sem auth (US5) — mitigado por token hash uso-único + review de segurança; (c) sem JSON/ENUM nativo (ADR-0020) — enums como `varchar` snake_case, `childrenAges` decomposto (ver Assumptions). Nenhuma exige escalonamento de constituição.

## Assumptions

- **Serialização de migration**: `0010` (US1) → `0011` (US2) → `0012` (US3) → `0013` (US4) → `0014` (US5) → `0015` (US6). Cada uma só é gerada após o W3 verde da anterior. Esta é a correção direta da causa-raiz do reset.
- **TTL do convite (US5)**: **decidido (Clarifications 2026-06-17) = 7 dias** corridos, configurável via env (`COLLABORATOR_INVITE_TTL_DAYS`, default 7); sem renovação automática (novo convite = novo token).
- **`childrenAges` (US2)**: **decidido (Clarifications 2026-06-17) = `varchar` delimitado por vírgula** (`5,8,12`), sem JSON nativo (ADR-0020); texto delimitado é permitido.
- **Coerência filhos (US2)**: `hasChildren = false` ⇒ `childrenCount`/`childrenAges` vazios; invariante validada no agregado (não no banco).
- **Município (US3)**: `uf` validada contra catálogo; `municipality` é texto livre (não há validação exaustiva de catálogo de municípios nesta feature).
- **Enriquecimento de evento do Contratos (US6)**: tratado como **aditivo backward-compatible** ao wire-format v1 (campo novo no payload), decidido formalmente no ADR-0046; consumers antigos ignoram o campo extra.
- **`contractStatus` no filtro (US6)**: valores `Pending|Active|Expired|Cancelled` (espelham o `ContractStatus` = `Contract['status']` do Contratos) + `none` (parceiro sem contrato); deriva do estado vigente projetado no read-model.
- **Reaproveitamento dos PRs resetados**: **não** será feito cherry-pick; os diffs #83–86 servem no máximo como referência conceitual. Implementação é fresh, fail-first.
- **Export em memória / gatilho de streaming (US4)**: a geração de CSV usa o util compartilhado `src/shared/utils/csv.ts`, que monta a saída **em memória** — aceitável para o volume atual de histórico por colaborador (YAGNI). **Gatilho de revisão:** se qualquer export ultrapassar ~dezenas de MB / dezenas de milhares de linhas, migrar a geração para **streaming** (Node stream + gerador) sem trocar o formato observável. O plano deve detalhar esse limite na US4.
- **Hardening anti-fórmula do CSV (débito externo)**: o `csv.ts` cobre os gatilhos `= + - @ \t \r` (OWASP), mas faltam `\n` (LF) e os full-width `＝＋－＠`. É débito do util compartilhado, **fora do escopo desta feature** (afeta todos os exports) — rastrear via issue própria, não corrigir dentro da 015. A US4 herda o util como está.
- **Citação canônica (Princípio IX, Clarifications)**: **todo W0** (US1–US6) registra citação literal ≥4 linhas de fonte canônica, via **MCP `acdg-skills`** (`skills_buscar`/`skills_citar`) com **fallback local** `acdg/skills_base/shared-references/` quando o MCP estiver off.
- **Idioma**: código/identifiers em EN; CAs/docs em PT-BR; erros internos em EN kebab-case; eventos em EN passado.
