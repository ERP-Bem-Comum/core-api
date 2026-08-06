# Feature Specification: Financial Hardening (pós-Fatia 2)

**Feature Branch**: `011-financial-hardening`

**Created**: 2026-06-16

**Status**: Draft

**Input**: Agrupa 4 débitos/achados de code-review do módulo `financial` (GitHub issues [#52](https://github.com/ERP-Bem-Comum/core-api/issues/52), [#54](https://github.com/ERP-Bem-Comum/core-api/issues/54), [#55](https://github.com/ERP-Bem-Comum/core-api/issues/55), [#56](https://github.com/ERP-Bem-Comum/core-api/issues/56)) descobertos nos tickets `FIN-LISTAGEM-TIMELINE` e `FIN-DOCUMENTO-INGESTAO`. Objetivo: harmonizar e endurecer a borda já entregue (Fatias 1+2), sem alterar comportamento existente exceto onde um critério de aceite explicitamente exige.

---

## Clarifications

### Session 2026-06-16

- Q: FR-009 (#56b) — como sanear `DocumentCancelled` no conjunto de tipos da trilha (tipo inalcançável, pois cancelar apaga a trilha por cascade)? → A: **Contrato + CHECK (migration)** — remover o tipo tanto do conjunto publicado (response schema/OpenAPI) quanto da restrição CHECK da tabela de trilha, via migration versionada. `DocumentCancelled` **permanece** em `DOCUMENT_EVENT_TYPES` (é evento de domínio legítimo); apenas o **subconjunto da trilha** o exclui. Storage e contrato ficam 100% alinhados.

---

## User Scenarios & Testing _(mandatory)_

As quatro histórias são **independentes** e cada uma é um slice entregável por si só. A ordem reflete prioridade por risco: segurança → correção de concorrência → consistência de modelo → fidelidade de contrato.

### User Story 1 - Erros 4xx não vazam o mecanismo interno (Priority: P1)

Quem integra com a API financeira (front web-app v2, futuros consumidores) recebe, em respostas de erro 4xx, um **código público estável** e uma **mensagem legível em PT-BR** — nunca o identificador interno de domínio. O slug interno (ex.: `document-version-conflict`) fica restrito ao log do servidor.

**Why this priority**: É o único item com classificação de **segurança** (OWASP API8:2023 — Security Misconfiguration). Vazar o slug interno revela o mecanismo de concorrência (versão-baseado) e a máquina de estados, facilitando enumeração por retry. Maior risco do lote, ainda que severidade baixa.

**Independent Test**: Disparar uma mutação com versão defasada e um GET de recurso inexistente e inspecionar o body: o código deve ser público (`conflict`, `not-found`, `bad-request`, `unprocessable`) e a mensagem em PT-BR; o slug interno não aparece. Testável de ponta a ponta na borda HTTP, sem depender das demais histórias.

**Acceptance Scenarios**:

1. **Given** uma mutação de documento com `version` defasada, **When** o caso de uso sinaliza conflito de versão, **Then** a resposta é **409** com `code: "conflict"` e `message` em PT-BR, **e** o slug interno NÃO aparece no body.
2. **Given** um GET de documento inexistente, **When** o caso de uso sinaliza não-encontrado, **Then** a resposta é **404** com `code: "not-found"`, sem slug interno no body.
3. **Given** uma transição de estado inválida, **When** o caso de uso a rejeita, **Then** a resposta é **422** (`unprocessable`) com mensagem PT-BR, sem expor `invalid-state-transition`.
4. **Given** qualquer falha 5xx, **When** o erro é tratado, **Then** o comportamento atual de ocultação é preservado (sem regressão).

---

### User Story 2 - Cancelamento respeita controle de concorrência (Priority: P2)

Quem cancela um documento financeiro fornece a **versão que leu** (`expectedVersion`). O cancelamento só procede se a versão lida ainda for a corrente; caso outra transação tenha mutado o documento nesse intervalo, o cancelamento é **rejeitado** em vez de apagar silenciosamente um estado mais novo.

**Why this priority**: Correção de concorrência (lost-update / TOCTOU entre leitura e exclusão). `adjust`/`approve`/`undo` já exigem versão; `cancel` é a única mutação fora dessa proteção, criando assimetria e risco de perda silenciosa de um ajuste concorrente. Destrutivo e irreversível (hard-delete + cascade), o que eleva o impacto acima das histórias de consistência/contrato.

**Independent Test**: Ler um documento na versão `v`, em paralelo aplicar um ajuste (`v`→`v+1`), então tentar cancelar com `expectedVersion=v`: deve ser rejeitado com conflito e o documento permanece. Repetir sem mutação concorrente: cancela com sucesso.

**Acceptance Scenarios**:

1. **Given** um cliente que leu `version=v` e a versão atual ainda é `v`, **When** cancela com `expectedVersion=v`, **Then** o cancelamento tem sucesso (resposta de sucesso, documento removido).
2. **Given** que outra transação incrementou a versão para `v+1`, **When** o cliente cancela com `expectedVersion=v`, **Then** a resposta é **409** (conflito de versão) e o documento **NÃO** é apagado.
3. **Given** uma requisição de cancelamento sem `expectedVersion`, **When** recebida na borda, **Then** é rejeitada como entrada inválida (4xx de validação), mantendo a simetria com as demais mutações.

---

### User Story 3 - Modelo da trilha consistente com a convenção (Priority: P3)

A trilha de auditoria do documento usa nomenclatura **consistente** com o restante do domínio: o campo que carrega o tipo de evento chama-se `eventType` (não `kind`). O conjunto de tipos de evento da trilha **não anuncia** um tipo que jamais aparece numa leitura.

**Why this priority**: Apenas legibilidade/consistência de modelo (smell), zero efeito funcional. `kind` está reservado para variantes de entidade; tipos de evento devem usar `type`/`eventType`. `DocumentCancelled` consta no conjunto mas é inalcançável na leitura (cancelar faz hard-delete + cascade — a trilha some junto), então anunciá-lo desinforma o contrato.

**Independent Test**: Após o rename, a resposta de `/timeline` permanece **byte-idêntica** para os fluxos existentes e a verificação de tipos passa. O conjunto de tipos publicado não inclui um tipo inalcançável (ou, se mantido, há justificativa testada).

**Acceptance Scenarios**:

1. **Given** o modelo de domínio da trilha, **When** o campo discriminador é renomeado para `eventType`, **Then** a resposta de `/timeline` é byte-idêntica à atual e a verificação de tipos passa.
2. **Given** o fluxo de cancelamento, **When** um documento é cancelado, **Then** a trilha correspondente é removida (cascade) e nenhuma entrada do tipo "documento cancelado" é jamais lida — comprovado por teste.
3. **Given** o conjunto publicado de tipos de evento da trilha (response schema/OpenAPI) **e** a restrição CHECK da tabela de trilha, **When** inspecionados, **Then** nenhum dos dois inclui `DocumentCancelled` — alinhados via migration versionada.

---

### User Story 4 - Contrato da trilha reflete os limites reais de armazenamento (Priority: P3)

Quem consome o contrato publicado (OpenAPI) da trilha vê os **limites de tamanho** reais dos campos de mudança (`changes.field`, `changes.before`, `changes.after`), coerentes com o que o armazenamento comporta.

**Why this priority**: Gap de contrato documental (ADR-0027 contract-first — o contrato deve refletir a realidade do armazenamento). É **response** schema (saída do banco, não entrada do usuário), então não há risco de runtime; apenas o contrato fica mais fiel. Menor risco do lote.

**Independent Test**: Inspecionar o schema de resposta da trilha: `changes.field` tem limite coerente com o armazenamento (60); `changes.before`/`after` têm limite/anotação coerentes com o tipo de texto longo. O documento OpenAPI gerado exibe os `maxLength`.

**Acceptance Scenarios**:

1. **Given** o schema de resposta da trilha, **When** inspecionado, **Then** `changes.field` declara limite máximo coerente com o armazenamento (60).
2. **Given** `changes.before`/`changes.after`, **When** inspecionados, **Then** declaram limite explícito (limite do tipo texto longo) ou anotação documentando esse limite.
3. **Given** o OpenAPI gerado, **When** consultado, **Then** os `maxLength` aparecem nos campos de `changes`.
4. **Given** qualquer dado válido já existente no banco, **When** serializado na resposta, **Then** continua sendo aceito (nenhum dado válido passa a ser rejeitado).

---

### Edge Cases

- **#52** — erro de validação de body (entrada malformada): deve mapear para código público (`bad-request`/`unprocessable`), nunca expor regra interna; 5xx permanece com ocultação atual.
- **#52** — garantir que a mensagem PT-BR vem do dicionário de formatação ao humano, não de string literal espalhada.
- **#55** — requisição de cancelamento legada (sem `expectedVersion`) passa a ser entrada inválida: é uma **mudança de contrato de entrada intencional**, comunicada ao front (web-app v2).
- **#54** — valor de `changes.field` exatamente no limite (60) é aceito; `before`/`after` no limite do tipo texto longo são aceitos.
- **#56** — confirmar via teste que cancelar realmente remove a trilha (cascade) antes de remover o tipo do conjunto.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001** (#52): O sistema MUST mapear cada erro de domínio 4xx do módulo financial para um **código público estável** dentre `conflict`, `not-found`, `bad-request`, `unprocessable`, expondo apenas esse código no body.
- **FR-002** (#52): O sistema MUST acompanhar cada erro 4xx com uma **mensagem em PT-BR** legível ao humano, sem o identificador interno de domínio.
- **FR-003** (#52): O sistema MUST registrar o slug interno de domínio **apenas no log** do servidor, nunca no body de resposta.
- **FR-004** (#52): O sistema MUST preservar o comportamento atual de ocultação das respostas 5xx (sem regressão).
- **FR-005** (#55): O cancelamento de documento MUST exigir `expectedVersion` e participar do controle de concorrência otimista, idêntico a `adjust`/`approve`/`undo`.
- **FR-006** (#55): Quando a versão corrente difere de `expectedVersion`, o sistema MUST rejeitar o cancelamento com conflito **409** e MUST NOT remover o documento.
- **FR-007** (#55): Uma requisição de cancelamento sem `expectedVersion` MUST ser rejeitada como entrada inválida na borda.
- **FR-008** (#56): O campo discriminador de tipo de evento da trilha MUST se chamar `eventType` no domínio, mantendo a resposta de `/timeline` byte-idêntica para os fluxos existentes.
- **FR-009** (#56): O conjunto de tipos de evento **da trilha** MUST excluir `DocumentCancelled` (inalcançável na leitura) tanto do schema de resposta publicado (OpenAPI) quanto da restrição CHECK da tabela de trilha, via migration versionada. `DocumentCancelled` MUST permanecer em `DOCUMENT_EVENT_TYPES` (evento de domínio legítimo) — apenas o subconjunto da trilha o exclui. Um teste MUST comprovar que cancelar remove a trilha (cascade).
- **FR-010** (#54): O schema de resposta da trilha MUST declarar `changes.field` com limite máximo coerente com o armazenamento (60).
- **FR-011** (#54): O schema de resposta da trilha MUST declarar `changes.before`/`changes.after` com limite explícito do tipo texto longo, ou anotação documentando esse limite, de modo que o OpenAPI exiba os `maxLength`.
- **FR-012** (#54): Nenhuma alteração de schema de resposta MUST fazer com que um dado válido já existente no banco passe a ser rejeitado.
- **FR-013** (transversal): O conjunto de mudanças MUST se restringir ao módulo `financial` (`fin_*`), sem tocar `contracts`/`auth`/`partners`.

### Key Entities _(include if feature involves data)_

- **Documento financeiro**: agregado já existente (`fin_documents`); ganha exigência de `expectedVersion` no cancelamento (FR-005/006/007). Sem novos atributos.
- **Entrada de trilha (timeline entry)**: registro de auditoria já existente; campo discriminador renomeado para `eventType` (FR-008); conjunto de tipos saneado (FR-009); bounds dos campos de `changes` espelhados no contrato (FR-010/011).
- **Envelope de erro HTTP**: estrutura de resposta de erro já existente; ganha mapeamento slug-interno → código público para a faixa 4xx (FR-001/002/003).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001** (#52): 100% das respostas 4xx do módulo financial expõem código público (`conflict`/`not-found`/`bad-request`/`unprocessable`); **zero** ocorrências de slug interno de domínio no body em toda a superfície de erro testada.
- **SC-002** (#52): 100% das respostas 4xx trazem mensagem ao humano em PT-BR.
- **SC-003** (#55): Em cenário de cancelamento concorrente sobre versão defasada, **100%** dos casos são rejeitados sem remoção — nenhum lost-update observável.
- **SC-004** (#54): O contrato OpenAPI publicado exibe `maxLength` em 100% dos campos de `changes` da trilha.
- **SC-005** (#56 + #54): A resposta de `/timeline` permanece **byte-idêntica** à atual para os fluxos existentes — zero regressão observável pelo cliente.
- **SC-006** (transversal): Contagem de testes ≥ baseline e gate de qualidade verde (typecheck + format + lint + test) — política de regressão zero respeitada.

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [ ] Contratos (`ctr_*`) · [x] Financeiro (`fin_*`) · [ ] Auth (`auth_*`) · [ ] Parceiros (`partners_*`)
  - Toca **apenas** o BC Financeiro — sem ofensa ao isolamento (ADR-0014).
- **Novos agregados / Value Objects?**: Nenhum. Apenas rename de campo de leitura (`kind`→`eventType`) e exigência de `expectedVersion` já modelado.
- **Novos eventos de domínio (outbox)?**: Nenhum.
- **Novos subcomandos de CLI?**: N/A (CLI embutida removida — ADR-0037; validação E2E via Bruno + `fastify.inject`).
- **Borda HTTP envolvida?**: **Sim** — `adapters/http` do módulo financial já é ativo (ADR-0037, Fatias 1+2 entregues). Toca o envelope de erro (#52) e o response schema da trilha (#54). Não é novo servidor; não exige novo ADR.
- **Migração de banco?**: **Sim, uma** — #56(b) recria a restrição CHECK da tabela de trilha sem `DocumentCancelled` (migration versionada via `pnpm run db:generate`, conforme ADR-0020). #52/#54/#55 não alteram schema (a coluna `version` já existe).
- **Possíveis violações da constituição (I–VIII)?**: Nenhuma — escopo restrito a um módulo, sem 5º módulo, sem JSON/ENUM nativo novo, sem infra adicional.

## Assumptions

- **Idioma do envelope de erro (#52)**: a mensagem PT-BR ao humano vem do dicionário de formatação (`cli/formatters/` ou equivalente da borda HTTP), não de literais espalhados — alinhado à regra de idioma do AGENTS.md.
- **Mapeamento de código público (#52)**: os 4 códigos públicos (`conflict`/`not-found`/`bad-request`/`unprocessable`) cobrem a superfície 4xx atual do financial; o mapeamento slug-interno→público já existe para 5xx e é estendido ao 4xx.
- **Mudança de contrato de entrada (#55)**: passar a exigir `expectedVersion` no cancelamento é uma alteração **intencional** de contrato, coordenada com o front web-app v2 — não é regressão.
- **Decisão de `DocumentCancelled` (#56b)** _(resolvida no clarify — ver Clarifications)_: remover o tipo do **subconjunto da trilha** em ambos os pontos — schema de resposta publicado e restrição CHECK (migration versionada). O tipo permanece em `DOCUMENT_EVENT_TYPES` como evento de domínio legítimo.
- **Bounds de `before`/`after` (#54)**: default é declarar o limite do tipo texto longo (65535) explicitamente; anotação via metadado é alternativa equivalente — detalhe de implementação a resolver no plano.
- **Sem novos endpoints**: nenhuma rota nova; apenas ajuste de payloads/contrato/validação nas rotas existentes do financial.
- **Dependências externas**: nenhuma. As 3 issues correlatas fora de escopo (#47 listagem real, #48 categorização derivada do contrato, #53 isolamento multi-tenant) não bloqueiam nem são bloqueadas por esta feature.
