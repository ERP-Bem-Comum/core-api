# Feature Specification: Financeiro — Fatia 2: Listagem de Documentos + Trilha por-campo (Time Travel)

**Feature Branch**: `feat/fin-listagem-timeline`

**Created**: 2026-06-15

**Status**: Draft

**Input**: User description: "Módulo Financeiro (fin\_\*) — Fatia 2: Listagem de Documentos + Trilha por-campo (Time Travel). Construída sobre a fatia 1 (009, já merged na dev). Substituir o stub de GET /documents por listagem real com filtros + paginação; implementar a trilha por-campo (Time Travel) materializada (fin_document_timeline + fin_timeline_field_changes), gravada na mesma transação dos use cases; expor GET /documents/:id/timeline. Resolver no clarify os follow-ups da fatia 1 (optimistic lock, permissões inertes, reader/writer split)."

## Clarifications

### Session 2026-06-15

- Q: Edição concorrente (optimistic lock) — enforçar `version` ou remover do contrato? → A: **Enforçar** — propagar `version` do cliente ao use case; repo faz `UPDATE WHERE id=? AND version=?`; versão stale → `409 document-version-conflict`. Cumpre o contrato anunciado na fatia 1.
- Q: Permissões `payable:read` e `payable:undo-approval` declaradas e não usadas — wire ou remover? → A: **Remover** ambas do catálogo do auth + `FINANCIAL_PERMISSION`; undo-approval permanece sob `payable:approve` (menor privilégio).
- Q: Read path da listagem — reusar writer pool ou já fazer reader/writer split? → A: **Reusar o writer pool** (single-node) nesta fatia; **registrar como dívida técnica** o split reader/writer (ADR-0026), a ser feito quando o backend estiver completo e após análise das métricas (com o time de back).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Listar documentos financeiros com filtros e paginação (Priority: P1)

Como **Operador de Contas a Pagar** (ou Aprovador), quero **listar os documentos financeiros** filtrando por situação, fornecedor, tipo e janela de vencimento, com paginação, para **enxergar a carteira de contas a pagar** e localizar rapidamente um documento — hoje a listagem devolve sempre vazio (stub da fatia 1).

**Why this priority**: É o gap funcional mais visível entregue como stub na fatia 1; sem ela o usuário não consegue navegar nem auditar a carteira. Entrega valor imediato e é pré-requisito de qualquer tela de listagem do frontend (handoff em andamento).

**Independent Test**: Criar N documentos em situações/fornecedores/vencimentos variados (via a borda da fatia 1) e chamar `GET /api/v2/financial/documents` com diferentes combinações de filtro/página; verificar que os itens retornados, a contagem total e o recorte de página correspondem exatamente aos critérios.

**Acceptance Scenarios**:

1. **Given** existem 3 documentos `Open` e 2 `Draft`, **When** o usuário lista filtrando `status=Open`, **Then** recebe exatamente os 3 `Open` e `total = 3`.
2. **Given** existem 25 documentos que satisfazem o filtro, **When** o usuário pede `page=2&pageSize=10`, **Then** recebe os itens 11–20, com `page=2`, `pageSize=10` e `total=25`.
3. **Given** documentos de fornecedores distintos, **When** o usuário filtra por `supplierRef=<uuid>`, **Then** recebe apenas os documentos daquele fornecedor.
4. **Given** documentos com vencimentos variados, **When** o usuário filtra `dueFrom`/`dueTo`, **Then** recebe apenas os documentos com vencimento dentro da janela (inclusiva).
5. **Given** nenhum documento satisfaz o filtro, **When** o usuário lista, **Then** recebe `items: []` e `total: 0` (200, não erro).
6. **Given** um usuário **sem** a permissão de leitura financeira, **When** tenta listar, **Then** recebe 403.

---

### User Story 2 - Consultar a trilha por-campo de um documento (Time Travel) (Priority: P2)

Como **Aprovador** (ou auditor com leitura financeira), quero **consultar o histórico imutável por-campo** de um documento e seus títulos — quem alterou, quando, e o valor anterior → novo de cada campo e de cada transição de estado — para **auditar** o ciclo de vida do Fato Gerador (FR-015/SC-006 da fatia 1).

**Why this priority**: Requisito de auditoria já comprometido como MUST na fatia 1 (FR-015), mas adiado na implementação. Depende de instrumentar todos os use cases mutantes, então vem depois da listagem; ainda assim é central para a confiança no módulo financeiro.

**Independent Test**: Criar um documento, ajustá-lo, aprová-lo e desfazer a aprovação; chamar `GET /api/v2/financial/documents/:id/timeline` e verificar que cada marco gerou uma entrada com autor, instante, alvo (documento/título) e a lista de mudanças `campo: anterior → novo` correspondente.

**Acceptance Scenarios**:

1. **Given** um documento recém-criado em `Open`, **When** consulto sua trilha, **Then** existe ao menos uma entrada de criação com o alvo `Document` e os campos iniciais registrados.
2. **Given** um documento `Open` ajustado (ex.: valor bruto alterado), **When** consulto a trilha, **Then** existe uma entrada com a mudança `grossValue: <anterior> → <novo>` e o recálculo do líquido refletido.
3. **Given** um documento aprovado, **When** consulto a trilha, **Then** existe uma entrada de transição de estado `status: Open → Approved` com o autor (aprovador) e o instante.
4. **Given** uma aprovação desfeita, **When** consulto a trilha, **Then** as entradas preservam o histórico anterior (append-only — nada é apagado) e registram a transição `Approved → Open`.
5. **Given** um documento inexistente, **When** consulto a trilha, **Then** recebo 404.
6. **Given** um usuário sem leitura financeira, **When** consulta a trilha, **Then** recebe 403.

---

### Edge Cases

- **Paginação fora do fim**: `page` além da última página → `items: []` com `total` correto (não erro).
- **`pageSize` no limite**: respeitar mínimo/máximo definidos (rejeitar `pageSize` acima do teto na borda).
- **Janela de vencimento invertida** (`dueFrom > dueTo`): retorna conjunto vazio (não erro de servidor).
- **Filtro com ref malformada** (ex.: `supplierRef` não-UUID): erro de validação na borda (400), não 500.
- **Cancelamento (hard delete) em `Open`**: ao cancelar um documento, sua trilha materializada faz parte do boundary do agregado e é removida em cascata; o registro permanente do cancelamento é o evento de domínio no outbox (já existente). A trilha **não** sobrevive ao hard delete do documento (decisão herdada da fatia 1 — data-model 009 §cascade).
- **Documento `Draft`**: aparece na listagem com `status=Draft` (sem líquido calculado) e tem trilha desde a criação do rascunho.
- **Edição concorrente** do mesmo documento por dois usuários: ver FR-009 / clarify (optimistic lock).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema MUST listar documentos financeiros em `GET /api/v2/financial/documents` retornando itens resumidos + metadados de paginação (`items`, `page`, `pageSize`, `total`), substituindo o stub da fatia 1.
- **FR-002**: A listagem MUST suportar os filtros: `status` (Draft/Open/Approved), `supplierRef`, `type`, `dueFrom`, `dueTo` — combináveis (AND). A janela `dueFrom..dueTo` é inclusiva.
- **FR-003**: A listagem MUST paginar por `page` (1-based) e `pageSize`, com teto de `pageSize` e defaults definidos na borda; `total` reflete a contagem com os filtros aplicados (não a página).
- **FR-004**: O item resumido da listagem MUST conter ao menos: `id`, `status`, `documentNumber`, `type`, `supplierRef`, `netValueCents` (null em Draft), `dueDate`. Sem os títulos/retenções (payload enxuto).
- **FR-005**: O sistema MUST registrar uma **trilha por-campo (Time Travel)** de cada documento e de seus títulos, append-only, capturando para cada marco: alvo (`Document` ou `Payable`), tipo de evento, instante, autor (quando houver) e a lista de mudanças `campo → (valor anterior, valor novo)`.
- **FR-006**: A trilha MUST ser alimentada **automaticamente e de forma síncrona** por todos os use cases mutantes da fatia 1 (criar, salvar rascunho, ajustar, aprovar, desfazer aprovação, cancelar, submeter rascunho), no mesmo limite transacional da escrita do agregado — sem janela em que o documento exista sem sua entrada de trilha correspondente.
- **FR-007**: O sistema MUST expor `GET /api/v2/financial/documents/:id/timeline` retornando as entradas em ordem cronológica, cada uma com `eventType`, `target {kind, id}`, `occurredAt`, `actor` (nullable) e `changes[] {field, before, after}`.
- **FR-008**: Leitura de lista e de trilha MUST exigir a permissão de leitura financeira já existente (`fiscal-document:read`); sem ela → 403. Documento inexistente na trilha → 404.
- **FR-009**: O sistema MUST **enforçar optimistic lock** nas operações que recebem `version` (ajuste, aprovação, desfazer aprovação): a borda propaga o `version` do cliente ao use case, que persiste com `UPDATE ... WHERE id = ? AND version = ?`; quando a versão informada estiver desatualizada (conflito), a operação MUST falhar com `409 document-version-conflict` (sem aplicar a mudança). _(clarify 2026-06-15)_
- **FR-010**: O catálogo de permissões financeiras MUST conter apenas permissões efetivamente enforçadas por rota; `payable:read` e `payable:undo-approval` (declaradas e não usadas) MUST ser **removidas** do catálogo do auth e de `FINANCIAL_PERMISSION`; o desfazer-aprovação permanece sob `payable:approve`. _(clarify 2026-06-15)_

### Key Entities _(include if feature involves data)_

- **Trilha do Documento (DocumentTimeline)**: histórico imutável por-campo de um documento e seus títulos. Atributos da entrada: alvo (Documento/Título + id), tipo de evento, instante, autor (UserRef, best-effort). Relaciona-se 1—N com **Mudança de Campo**. Espelha o padrão `contracts/domain/timeline/`.
- **Mudança de Campo (FieldChange)**: uma alteração atômica dentro de uma entrada da trilha. Atributos: nome do campo, valor anterior, valor novo (ambos serializados como texto — sem estrutura aninhada/JSON).
- **Resumo de Documento (DocumentSummary)**: projeção enxuta do documento para a listagem (sem títulos/retenções). Deriva do agregado `Document` da fatia 1.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% das combinações de filtro (situação, fornecedor, tipo, janela de vencimento) retornam exatamente o conjunto esperado de documentos, validado por cenários de aceitação.
- **SC-002**: A paginação é consistente: para qualquer `page`/`pageSize`, o recorte retornado e o `total` correspondem ao conjunto filtrado, sem itens repetidos nem omitidos entre páginas adjacentes.
- **SC-003**: 100% das alterações de campo e transições de estado de documentos/títulos (criar, ajustar, aprovar, desfazer, cancelar, rascunho, submeter) são reconstituíveis pela trilha — quem, quando, valor anterior → novo (cumpre SC-006 da fatia 1).
- **SC-004**: Nenhuma mutação de documento deixa o sistema sem a entrada de trilha correspondente (verificado: após cada operação, a trilha contém a entrada esperada na mesma transação).
- **SC-005**: A listagem de uma carteira típica (centenas de documentos) e a consulta da trilha de um documento retornam em tempo interativo (alvo de latência detalhado em `metrics.md` na fase de métricas).
- **SC-006**: A consulta da trilha de um documento cancelado reflete a regra de boundary (a trilha some com o hard delete do documento; o registro permanente é o evento de cancelamento).

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [x] Financeiro (`fin_*`). Toca o catálogo de permissões do Auth de forma **subtrativa** (remove `payable:read`/`payable:undo-approval` inertes — clarify FR-010) — sem ler/escrever tabelas de outro BC; cross-módulo só via `public-api` (ADR-0006).
- **Novos agregados / Value Objects?**: `DocumentTimeline` (agregado de auditoria, espelha `contracts/domain/timeline/`) + VO `FieldChange`. `DocumentSummary` é projeção de leitura (read-model), não agregado. Cada VO com smart constructor + branded + `Result<T,E>`.
- **Novos eventos de domínio (outbox)?**: Não — reusa os eventos da fatia 1 (`DocumentSaved`/`PayableApproved`/`ApprovalUndone`/`DocumentDraftSaved`/`DocumentCancelled`). A trilha é read-model materializado síncrono (derivado de eventos — ADR-0003), gravado na mesma transação; **não** depende de worker/projeção do outbox (research.md 009 §R2).
- **Novos subcomandos de CLI?**: N/A (CLI removida — ADR-0037).
- **Borda HTTP envolvida?**: Sim — 2 rotas de leitura sob `/api/v2/financial` (lista real + timeline), Fastify+Zod (ADR-0027/0037), já há ADR de borda ativa. Permissão `fiscal-document:read`.
- **Possíveis violações da constituição (I–VIII)?**: Nenhuma prevista. Diff por-campo em tabela filha 1FN (sem JSON nativo — ADR-0020); persistência `fin_*` isolada (ADR-0014); domínio puro. As tabelas `fin_document_timeline`/`fin_timeline_field_changes` já estão desenhadas em `data-model.md` (009).

## Assumptions

- **Construída sobre a fatia 1 (009)**: o agregado `Document`, os use cases mutantes, o schema `fin_*` base, a borda `/api/v2/financial` e o outbox já existem e estão em produção na `dev`. Esta fatia estende, não reescreve.
- **Decisão de read-model fixada (não re-litigar)**: trilha **materializada append-only** em `fin_document_timeline` + `fin_timeline_field_changes` (1FN, sem JSON), gravada na mesma transação do agregado — conforme `research.md` (009) R2/R8 e `data-model.md` (009). Alternativa de projeção on-the-fly a partir do outbox foi rejeitada lá.
- **Tabelas de trilha já desenhadas**: as colunas e índices de `fin_document_timeline`/`fin_timeline_field_changes` constam em `data-model.md` (009) §read-model — a fase de plano/data-model desta fatia as materializa via migration `fin_*`.
- **Optimistic lock (resolvido — clarify 2026-06-15, FR-009)**: **enforçar** o conflito de versão (`409 document-version-conflict`), propagando `version` ao use case.
- **Permissões inertes (resolvido — clarify 2026-06-15, FR-010)**: **remover** `payable:read`/`payable:undo-approval` do catálogo; undo permanece sob `payable:approve`.
- **Read path de persistência (resolvido — clarify 2026-06-15)**: **reusar o pool writer** (single-node) para a listagem nesta fatia. **Dívida técnica registrada**: implementar o split reader/writer (ADR-0026, como contracts/partners — reads à réplica) quando o backend estiver completo, **após análise das métricas** com o time de back (gatilho de revisão, não escopo desta fatia).
- **Sem novo perfil/ator**: Operador e Aprovador (fatia 1) com `fiscal-document:read` cobrem lista e trilha.
- **Escopo de filtros**: a listagem cobre os filtros já previstos no contrato `financial-http.md` (009); buscas textuais avançadas/ordenação custom ficam fora desta fatia.
