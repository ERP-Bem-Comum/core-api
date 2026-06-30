# Feature Specification: Fonte única de verdade de testes de integração HTTP

**Feature Branch**: `007-integration-test-suite`

**Created**: 2026-06-08

**Status**: Draft (clarificada)

**Input**: User description: "Consolidar os testes de integração/E2E HTTP do core-api numa fonte única de verdade: (1) fechar a pendência T023 da 006 (contract suite Drizzle do RoleRepository) + integração; (2) unificar as 3 coleções Bruno (auth, contracts, partners) numa única coleção; (3) um runner único que sobe Docker e roda TODA a coleção contra infraestrutura real."

## Clarifications

### Session 2026-06-08

- **C1 (escopo da unificação)** → **Reescrever, com rede de segurança primeiro.** Antes de reescrever qualquer coleção, gerar — com base em cada `.bru` existente, **1:1** — um artefato **BDD** (cenário Gherkin Given/When/Then) e um **TDD** (caso de teste / asserções esperadas) que capturam o que aquele request valida. Só depois de a cobertura estar 100% capturada nesses artefatos é que a coleção unificada é reescrita, validando contra eles que nada foi perdido. **Uso de agentes especialistas é obrigatório** (BDD/requisitos, TDD, Bruno, Drizzle).
- **C2 (destino do legado)** → **Remover legado.** Após a coleção unificada estar verde e com cobertura comprovada (≥ original via os artefatos BDD/TDD), as 3 coleções originais e os 14 scripts `test:e2e:*`/`test:integration:*` por módulo são removidos. A coleção unificada + o runner único passam a ser a única fonte de verdade.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Rede de segurança BDD/TDD 1:1 antes de reescrever (Priority: P1) 🛡️ PRÉ-REQUISITO

Como mantenedor da suíte, antes de reescrever as coleções quero **capturar a cobertura existente** em artefatos auditáveis: para **cada** request `.bru` das três coleções atuais (~180), um cenário **BDD** (Given/When/Then) e um **TDD** (caso + asserções esperadas), em correspondência **1:1**. Assim a reescrita parte de uma especificação de cobertura validada, não da memória dos arquivos.

**Why this priority**: É o que torna a reescrita (C1) segura. Sem a rede, reescrever arrisca perder casos silenciosamente. Bloqueia US3.

**Independent Test**: Contar os `.bru` originais e os artefatos BDD/TDD gerados — a correspondência 1:1 (mesmo número, mesmo mapeamento request→cenário) prova que toda a cobertura foi capturada.

**Acceptance Scenarios**:

1. **Given** as 3 coleções originais, **When** a rede de segurança é gerada, **Then** existe exatamente um cenário BDD e um caso TDD para cada `.bru` (1:1, rastreável por nome/caminho).
2. **Given** um request com múltiplas asserções, **When** seu artefato é gerado, **Then** todas as asserções (status, shape, headers, regras de segurança) são representadas no TDD correspondente.
3. **Given** os artefatos prontos, **When** revisados por um especialista, **Then** confirmam cobertura completa antes de qualquer reescrita.

---

### User Story 2 - Contract suite do RoleRepository roda nos dois adapters (Priority: P1)

Como mantenedor do módulo `auth`, quero uma **única suíte de contrato** do `RoleRepository` que rode contra o adapter in-memory e o Drizzle/MySQL, fechando a pendência T023 da spec 006.

**Why this priority**: Pendência de qualidade explícita da 006; independente das coleções Bruno (pode andar em paralelo com US1).

**Independent Test**: Rodar a suíte com in-memory (sem Docker) e com Drizzle/MySQL (opt-in + Docker) — ambos verdes provam paridade.

**Acceptance Scenarios**:

1. **Given** a suíte de contrato, **When** executada com in-memory, **Then** todos os casos (save/findById/list/isInUse) passam sem infraestrutura.
2. **Given** a mesma suíte, **When** executada com Drizzle/MySQL real, **Then** os mesmos casos passam.
3. **Given** uma divergência num adapter, **When** a suíte roda, **Then** falha apontando o caso violado.

---

### User Story 3 - Coleção de borda única, reescrita e sem duplicação (Priority: P1)

Como desenvolvedor, quero **uma única coleção** de testes de borda cobrindo todos os módulos, **reescrita** a partir dos artefatos BDD/TDD (US1), com **um fluxo de autenticação** e **um environment** compartilhados, organizada por módulo.

**Why this priority**: É a fonte única de verdade dos contratos HTTP. Depende de US1 (rede de segurança) para garantir cobertura.

**Independent Test**: Para cada artefato BDD/TDD da rede (US1), existe o request correspondente na coleção unificada; a cobertura é ≥ a soma das 3 originais; há um único login e um único environment.

**Acceptance Scenarios**:

1. **Given** os artefatos da rede de segurança, **When** a coleção unificada é reescrita, **Then** cada cenário BDD/TDD tem um request correspondente (nenhum caso perdido).
2. **Given** um request protegido de qualquer módulo, **When** precisa de sessão, **Then** reusa o token de um único login compartilhado.
3. **Given** a coleção, **When** um desenvolvedor procura os testes de um módulo, **Then** encontra-os agrupados sob aquele módulo, num único environment.

---

### User Story 4 - Um comando sobe a infraestrutura e valida a borda inteira (Priority: P2)

Como responsável por promover `dev → main`, quero **um único comando** que suba a infraestrutura real, faça boot do servidor com todos os módulos e seeds, execute toda a coleção unificada e reporte verde/vermelho.

**Why this priority**: Objetivo final (gate único); depende da coleção unificada (US3).

**Independent Test**: Rodar o comando único numa máquina com Docker; ao final, relatório consolidado com total de requests/asserções e status, exit ≠ 0 se algo falhar.

**Acceptance Scenarios**:

1. **Given** Docker disponível, **When** o comando roda, **Then** provisiona infraestrutura, sobe o servidor com todos os módulos e roda toda a coleção, sem passos manuais.
2. **Given** a execução, **When** tudo passa, **Then** exit 0 + resumo único; **When** algo falha, **Then** exit ≠ 0 apontando os casos vermelhos.
3. **Given** o fim, **When** encerra, **Then** a infraestrutura é derrubada e limpa (sem órfãos).

---

### User Story 5 - Remover o legado fragmentado (Priority: P3)

Como mantenedor, após a coleção unificada estar verde e com cobertura comprovada, quero **remover** as 3 coleções originais e os 14 scripts por módulo, para que não exista uma segunda fonte de verdade.

**Why this priority**: Higiene final; só pode ocorrer depois de US3 e US4 verdes (senão remove a rede de baixo dos pés).

**Independent Test**: Após a remoção, não há nenhuma coleção `.bru` fora da unificada nem scripts `test:e2e:*`/`test:integration:*` por módulo; o runner único é o único caminho e roda verde.

**Acceptance Scenarios**:

1. **Given** a coleção unificada verde, **When** o legado é removido, **Then** as 3 coleções antigas e os scripts por módulo não existem mais.
2. **Given** a remoção, **When** o runner único roda, **Then** continua verde (a remoção não tirou cobertura).

### Edge Cases

- Docker indisponível → o runner falha cedo com mensagem clara, sem travar.
- Ordem de dependência entre módulos (seed de auth antes de requests de contracts) → ordem de execução determinística.
- Seeds diferentes por módulo → idempotentes e completos num único boot.
- Vazamento de estado entre módulos na mesma execução → isolamento por módulo/ordem respeitado.
- Um `.bru` original sem asserção clara → o artefato TDD deve registrar explicitamente "smoke only" para não inflar falsa cobertura.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema MUST gerar, antes de qualquer reescrita, um artefato **BDD** e um **TDD** para **cada** request `.bru` existente, em correspondência **1:1** rastreável.
- **FR-002**: Os artefatos TDD MUST representar todas as asserções do request original (status, shape, headers, regras de segurança); requests sem asserção real MUST ser marcados como "smoke only".
- **FR-003**: A reescrita da coleção unificada MUST ser validada contra os artefatos BDD/TDD — cada cenário tem um request correspondente; cobertura final ≥ soma das 3 originais.
- **FR-004**: O sistema MUST prover uma suíte de contrato única do `RoleRepository` executável por dois adapters (in-memory e Drizzle/MySQL) sem duplicar casos.
- **FR-005**: A suíte de contrato contra MySQL real MUST ficar atrás de opt-in explícito e passar quando habilitada com Docker.
- **FR-006**: O sistema MUST consolidar as três coleções numa única, organizada por módulo, com **um** fluxo de autenticação e **um** environment compartilhados.
- **FR-007**: O sistema MUST prover um runner único que provisiona infraestrutura (banco + storage), faz boot do servidor com todos os módulos e seeds, e executa toda a coleção unificada.
- **FR-008**: O runner único MUST reportar resultado consolidado e retornar exit ≠ 0 se qualquer caso falhar.
- **FR-009**: O runner único MUST derrubar e limpar a infraestrutura ao final, mesmo em falha.
- **FR-010**: O runner MUST falhar cedo com mensagem clara quando a infraestrutura não estiver disponível.
- **FR-011**: Após a unificada estar verde e com cobertura comprovada, o sistema MUST remover as 3 coleções originais e os 14 scripts por módulo (fonte de verdade única).
- **FR-012**: O processo MUST usar os agentes especialistas do projeto nas etapas correspondentes (requisitos/BDD, TDD, Bruno, Drizzle) — não é opcional.

### Key Entities

- **Artefato BDD**: cenário Gherkin (Given/When/Then) que descreve o comportamento que um request de borda valida.
- **Artefato TDD**: caso de teste com asserções esperadas (status/shape/headers/segurança) correspondente a um request.
- **Mapa de rastreabilidade 1:1**: a correspondência request `.bru` ↔ BDD ↔ TDD ↔ request unificado, que prova cobertura preservada.
- **Coleção de teste unificada**: fonte única de verdade dos contratos HTTP, por módulo, com auth/environment compartilhados.
- **Suíte de contrato de repositório**: casos que definem o contrato de um port, executável por qualquer adapter.
- **Runner de integração**: comando único que orquestra infraestrutura + boot + execução + relatório + limpeza.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Existe correspondência **1:1** auditável entre os `.bru` originais e os artefatos BDD/TDD (mesmo total; mapeamento rastreável).
- **SC-002**: Um único comando valida a borda HTTP inteira do core-api contra infraestrutura real, sem passos manuais.
- **SC-003**: O número de coleções de borda cai de 3 para 1 e o de fluxos de login duplicados para 1; os 14 scripts por módulo são removidos.
- **SC-004**: A cobertura da coleção unificada é ≥ a soma das três originais (zero casos perdidos), comprovada pelos artefatos.
- **SC-005**: A pendência T023 da 006 é fechada: a contract suite do `RoleRepository` roda verde nos dois adapters.
- **SC-006**: Introduzir uma regressão proposital faz o gate único retornar vermelho (exit ≠ 0) com identificação do caso.

## Impacto Arquitetural (core-api)

- **Bounded Contexts afetados**: [x] Contratos (`ctr_*`) · [ ] Financeiro · [x] Auth (`auth_*`) · [x] Parceiros (`partners_*`)
  - ⚠️ Toca os três BCs, mas **não altera regra de domínio** — é infra de teste (`.bru`, scripts, suíte de contrato em `tests/`, artefatos BDD/TDD). Não ofende ADR-0014 (não cruza dados entre schemas; testa bordas já existentes).
- **Novos agregados / Value Objects?**: Nenhum.
- **Novos eventos de domínio (outbox)?**: Nenhum.
- **Novos subcomandos de CLI?**: Nenhum de domínio; apenas um script `pnpm` de runner de teste.
- **Borda HTTP envolvida?**: Apenas como alvo de teste (já existe, ADR-0025/0028). Não cria rotas.
- **Possíveis violações da constituição (I–VIII)?**: Nenhuma — consolidação de testes. Cuidado central: não deixar duas fontes de verdade (FR-011).

## Assumptions

- A reescrita parte dos artefatos BDD/TDD (US1), não dos `.bru` diretamente — a rede de segurança é o contrato de cobertura.
- O runner único sobe **todos os módulos contra persistência real** (MySQL para auth/contracts/partners; MinIO para storage), num único boot com seeds completos e idempotentes.
- A ferramenta de coleção e o runner já existentes no projeto são a base; a feature consolida, não troca de ferramenta.
- Os seeds dos três módulos coexistem num único boot sem conflito (idempotentes — já validado para auth).
- O gate único é **adicional ao `pnpm test`** (unit), cobrindo a camada de integração/borda.
- A remoção do legado (US5) só ocorre após US3+US4 verdes.
