# Feature Specification: Go-Live 1 — Núcleo Operacional do Financeiro (Fase 1)

**Feature Branch**: `025-fin-go-live-1-nucleo`

**Created**: 2026-06-23

**Status**: Draft

**Input**: Épico [#246](https://github.com/ERP-Bem-Comum/core-api/issues/246) — Go-Live faseado do financeiro (single-org). Esta spec cobre a **Fase 1 · Núcleo operacional** do Go-Live 1: **Contas a Pagar** (DTO/UX) + **Conciliação** (refinos). Mapa do épico completo em [`discovery-246.md`](./discovery-246.md).

> **Recorte deliberado.** Fora desta spec (incrementos pós-go-live, ver discovery): OCR (#62 #145), Relatórios & Dashboard (#112 #114 #235–#243), Plano Orçamentário (#113), CNAB (#58 #59 #61), receivables (#179), multi-tenant (#53), cross-módulo (#63). Fase 2 (e-mail/auth para reset de senha — #117 #135 #131 #132 #133) é prontidão de produção e será especificada à parte.

---

## Clarifications

### Session 2026-06-23 (TL Gabriel · 7 riscos do discovery R-1…R-7)

- **R-1a (#197) — Q:** tipo de `competencia` (MM/AAAA) no domínio? **A:** VO `Competencia` próprio (branded `{year, month}`) com smart constructor + `Result`, coerente com o DDD tático do projeto (Money/Period). Persistência decidida no plano (char(7) `YYYY-MM` ou decomposto, ADR-0018).
- **R-1b (#197) — Q:** semântica de `contaDebitoId`? **A:** `contaDebitoRef` = ref para `fin_cedente_accounts` (agregado da feature 019), com validação by-identity (#160). Sem agregado novo.
- **R-2 (#162) — Q:** política de falha do bulk due-date? **A:** **por item** (parcial) — resultado sucesso/`version-conflict` por id; um conflito isolado não derruba o lote.
- **R-3 (#164) — Q:** onde moram as "visões salvas"? **A:** **no core-api agora** — entidade `fin_saved_views` por usuário + CRUD + RBAC. Filtros persistidos em colunas/serial (**sem JSON nativo**, ADR-0020). Mantida no go-live.
- **R-4 (#146/#144) — Q:** granularidade/formato do export Nibo/PDF? **A:** **adiado pós-go-live** — #146 (CSV Nibo) e #144 (PDF) saem da Fase 1. Conciliação opera sem export; vira incremento (US7 deferida).
- **R-5 (#207/#172) — Q:** id→nome de usuário com `reconciliation:read`? **A:** `reconciledByName`/`closedByName` resolvidos no response a partir de um read-model `fin_user_view` (id,name) projetado por outbox do auth (molde `fin_supplier_view`).
- **R-6 (#89) — Q:** OCR/CBS-IBS/divergência de alíquota no go-live? **A:** **fora** (Fase 3 / fora do go-live) — confirmado.
- **R-7 (#110) — Q:** isolamento do backfill Partners? **A:** #110 vira ticket próprio no módulo Partners, em sessão separada (ADR-0014) — confirmado.

---

## User Scenarios & Testing _(mandatory)_

Persona única: **operador financeiro** (single-org) que lança documentos, gerencia títulos a pagar, dá baixa em pagamentos e concilia o extrato bancário. As histórias estão ordenadas por valor para o Go-Live 1 — cada uma é uma fatia entregável e testável de forma independente.

### User Story 1 — Baixar título informando a data real de pagamento (Priority: P1)

Issues: **#232** (manual-payment aceita `paidAt` no body) · **#231** (expor `paidAt` na leitura).

O operador marca um título como pago informando a **data em que o dinheiro saiu** (normalmente retroativa). Essa data passa a aparecer no grid e ancora o casamento (match) da conciliação: um título casa com a saída bancária quando `data de pagamento == data da saída`.

**Why this priority**: É a continuação direta do ticket fechado hoje (`FIN-59a-2-MANUAL-PAYMENT-HTTP`, #228 — borda HTTP da baixa manual). Hoje o `paidAt` é gravado como `clock.now()` (`register-manual-payment.ts:60`), o que faz toda baixa retroativa **quebrar o match**. Sem isso, a Conciliação (US2/US3) opera sobre dados que não fecham. É a peça de menor atrito e maior efeito de desbloqueio.

**Independent Test**: dar baixa em um título com `paidAt` retroativo via `POST …/manual-payment` e confirmar que `GET /financial/payable-titles` devolve esse `paidAt` (não "hoje").

**Acceptance Scenarios**:

1. **Given** um título Aprovado, **When** o operador registra a baixa com `paidAt = 2026-06-10` (retroativa), **Then** o título fica Pago com `paidAt = 2026-06-10` e o evento de domínio reflete essa data.
2. **Given** uma baixa sem `paidAt` no body, **When** registra, **Then** usa `clock.now()` como fallback (compatibilidade com o comportamento atual).
3. **Given** um `paidAt` futuro, **When** registra, **Then** rejeita com erro de validação (`paidAt` não pode ser futura).
4. **Given** um título Pago, **When** o front lê `GET /financial/payable-titles`, **Then** o item traz `paidAt` (ISO date) — `null` enquanto não pago.

---

### User Story 2 — Conciliar o extrato (diferença, parcial e contas próprias) (Priority: P1)

Issues: **#141** (conciliação parcial + tratamento da diferença) · **#143** (transferência/aplicação/resgate entre contas próprias) · **#161** (robustez de bounds varchar no statement mapper).

O operador casa transações do extrato com títulos. Quando a soma dos títulos **difere** do valor do extrato, classifica a diferença (juros/multa/desconto/tarifa) ou marca pagamento parcial (mantém saldo aberto). Quando a saída **não é** pagamento de fornecedor (transferência entre contas próprias, aplicação, resgate), registra a contra-partida na conta destino.

**Why this priority**: é o coração operacional da conciliação no go-live. Sem tratamento de diferença e de movimentações não-financeiras, o operador não consegue fechar o extrato real.

**Independent Test**: conciliar uma transação cujo valor difere da soma dos títulos selecionados, classificar a diferença e confirmar o lançamento classificado + vínculo; conciliar uma transferência e confirmar a contra-partida na conta destino.

**Acceptance Scenarios**:

1. **Given** diferença = 0, **When** concilia, **Then** conciliação cheia (comportamento atual preservado).
2. **Given** diferença ≠ 0 **sem** classificação, **When** tenta conciliar, **Then** bloqueia (espelha a UI).
3. **Given** diferença classificada como `Juros|Multa|Desconto|Tarifa`, **When** concilia, **Then** registra conciliação parcial com a diferença, sua categoria e centro de custo.
4. **Given** "pagamento parcial", **When** concilia, **Then** o valor do extrato é conciliado e o título **mantém saldo aberto** pelo restante.
5. **Given** uma saída classificada como **Transferência**, **When** concilia, **Then** exige conta de destino e cria contra-partida conciliável na conta destino, marcada como realocação patrimonial (não despesa).
6. **Given** uma transação com `memo` de 600 chars, **When** importa o extrato, **Then** persiste truncado a 500 (sem 5xx); um INSERT que falhe por infra real ainda retorna `bank-statement-repository-failure`.

---

### User Story 3 — Auditar e operar períodos com identidades legíveis (Priority: P2)

Issues: **#207** (nome do operador que conciliou, não UUID) · **#172** (nome do fornecedor + nº do documento no match card e nos títulos Pagos) · **#203** (reabrir período de conciliação).

O operador audita uma conciliação e vê **quem** a executou (nome, não UUID), **qual fornecedor / nº de documento** está em cada sugestão e título Pago, e pode **reabrir** um período fechado por engano.

**Why this priority**: refino de usabilidade e controle contábil que destrava o front "100% fiel ao mock", mas não bloqueia o caminho de dados da conciliação (US2).

**Independent Test**: abrir o detalhe de uma conciliação e confirmar `reconciledByName`; listar sugestões e ver `supplierName`+`documentNumber`; fechar e reabrir um período.

**Acceptance Scenarios**:

1. **Given** uma conciliação executada por um usuário, **When** abre o detalhe, **Then** exibe o **nome** do operador (e `closedByName` no fechamento de período), com permissão `reconciliation:read` (sem exigir `user:read`).
2. **Given** sugestões e títulos Pagos, **When** lista, **Then** cada item traz `documentNumber`, `type` e identidade do favorecido (`supplierName` + `supplierTaxId`/ref).
3. **Given** um período `Closed`, **When** o operador reabre, **Then** volta a `Open` via rota dedicada (sem `UPDATE` manual no banco).

---

### User Story 4 — Lançar documento com os campos fiscais completos (Priority: P2)

Issues: **#115** (chave de acesso DANFE, 44 dígitos) · **#197** (competência MM/AAAA + conta-débito) · subconjunto de **#89** (metadados por tipo de documento; **exclui** OCR, CBS/IBS, divergência de alíquota — ver discovery).

Ao lançar um documento, o operador registra os campos fiscais que hoje ficam como chrome desabilitado no front: chave de acesso (quando DANFE), competência contábil e conta-débito.

**Why this priority**: completa o "Lançar Documento" para uso real, mas depende de decisões de modelagem (US4 tem itens `NEEDS CLARIFICATION`).

**Independent Test**: criar documento DANFE com `accessKey` de 44 dígitos + `competencia` + `contaDebitoId` e confirmar persistência e exposição nos DTOs de lista/detalhe.

**Acceptance Scenarios**:

1. **Given** `type = DANFE`, **When** cria sem `accessKey`, **Then** rejeita (422, `invalid-access-key`); **When** cria com `accessKey` de 44 dígitos, **Then** persiste e expõe no `GET /documents/:id`.
2. **Given** um `accessKey` não numérico ou ≠ 44 dígitos, **When** cria, **Then** rejeita com erro de formato.
3. **Given** `competencia` e `contaDebitoId` válidos, **When** cria, **Then** persistem em `fin_documents` e aparecem nos DTOs de lista e detalhe.

---

### User Story 5 — Ver o detalhe completo do pagamento (Priority: P2)

Issue: **#95** (enriquecer `GET /api/v2/financial/documents/:id`).

O drawer de Detalhe renderiza todas as seções do design: arquivo do documento (PDF com link de download), emissão, série, categorização (centro de custo/categoria/subcategoria/programa/plano), dados bancários da forma de pagamento e o favorecido.

**Why this priority**: enriquecimento de leitura; alto valor de UX, baixo risco. Reusa campos que outras US persistem (categorização da 020, `issueDate`, etc.).

**Independent Test**: `GET /documents/:id` de um documento com arquivo, categorização e dados bancários e confirmar todas as seções preenchidas.

**Acceptance Scenarios**:

1. **Given** um documento com arquivo anexado, **When** lê o detalhe, **Then** retorna `fileName`, `sizeBytes`, `uploadedAt` e uma `url`/`ref` de download (link assinado).
2. **Given** um documento categorizado, **When** lê o detalhe, **Then** retorna refs **e** labels exibíveis de centro de custo, categoria, subcategoria, programa e plano.
3. **Given** uma forma de pagamento com dados bancários do favorecido, **When** lê o detalhe, **Then** retorna chave PIX/tipo, banco e favorecido (sem N chamadas client-side).

---

### User Story 6 — Operar o grid de Contas a Pagar (filtrar, buscar, ordenar, lote) (Priority: P2)

Issues: **#229** (enriquecer `GET /payable-titles`: `issueDate`, `paymentMethod`, `version`, bruto/líquido) · **#164** (filtros avançados + ordenação + visões salvas) · **#167** (busca textual server-side) · **#162** (alteração de vencimento em lote).

O operador filtra, busca, ordena e age em lote sobre o grid de Contas a Pagar, tanto na visão por documento quanto por título.

**Why this priority**: produtividade do dia-a-dia; várias peças são aditivas e de baixo risco, mas "visões salvas" e "falha parcial do lote" têm decisões abertas.

**Independent Test**: aplicar filtros (`numDoc`, `cnpjCpf`, `valorMin/Max`, `contractRef`, `programRef`), busca textual `q`, ordenação `sort/order`, e um `PATCH` de vencimento em lote; confirmar resultado por item.

**Acceptance Scenarios**:

1. **Given** o grid por título, **When** lê `GET /payable-titles`, **Then** cada item traz `issueDate`, `paymentMethod`, `version`, `grossValueCents` e `netValueCents` (`dueDate` como date-only).
2. **Given** um termo de busca, **When** filtra com `q`, **Then** cruza razão social/nome, número do documento e CNPJ/CPF server-side em todas as páginas.
3. **Given** múltiplos títulos selecionados com `version`, **When** altera o vencimento em lote, **Then** retorna o resultado por id (sucesso/conflito de versão) com semântica de falha definida.

---

### User Story 7 — Exportar a conciliação para a contabilidade (Priority: P3) — ⏸️ DEFERIDA (clarify R-4)

> **Fora do Go-Live 1** (decisão R-4, 2026-06-23). #146 (CSV Nibo) e #144 (PDF) viram **incremento pós-go-live**. A conciliação opera sem export; o layout Nibo será fixado contra o template real da P.O. quando a issue for retomada. Mantida aqui só como rastreabilidade.

Issues: **#146** (CSV no layout Nibo) · **#144** (PDF com totalizações).

O operador exporta a conciliação em CSV (layout exato de Importação em Lotes do Nibo) ou em PDF (relatório com totalizações e trilha), com os mesmos filtros de conta/período.

**Why this priority**: fecha o ciclo contábil, mas não bloqueia a operação; adiado para reduzir o escopo do Go-Live 1.

**Independent Test**: exportar `?format=csv` e validar as 15 colunas/cabeçalho contra o template Nibo; exportar `?format=pdf` e validar totalizações.

**Acceptance Scenarios**:

1. **Given** uma conciliação, **When** exporta CSV, **Then** o arquivo tem as 15 colunas na ordem e cabeçalho idênticos ao template Nibo, com `Valor` sinalizado (+ recebimento / − pagamento).
2. **Given** transferências (US2), **When** exporta CSV, **Then** saem no formato de transferência (só Valor + Conta + Data).
3. **Given** uma conciliação, **When** exporta PDF, **Then** o relatório traz conta, período, conciliadas/pendentes, totais e a lista de vínculos com trilha.

---

### User Story 8 — Corrigir read-models exibidos (backfill) (Priority: P3)

Issues: **#111** (backfill `fin_supplier_view` — `supplierName`/`supplierDocument` vêm null) · **#110** (backfill `par_contract_count_view`).

Um backfill one-shot popula os read-models a partir do histórico, para que nomes de fornecedor e contagem de contratos parem de vir nulos/zerados nas listagens.

**Why this priority**: corrige display sem bloquear o front (que já exibe fielmente o que recebe). É operacional/idempotente. **⚠️ #110 toca o BC Partners (`par_*`) — ver Impacto Arquitetural.**

**Independent Test**: rodar o backfill e confirmar `supplierName`/`supplierDocument` não-nulos em `GET /financial/documents` e `contractCount` coerente em `GET /partners`.

**Acceptance Scenarios**:

1. **Given** documentos com `supplierRef` válido, **When** roda o backfill de `fin_supplier_view`, **Then** a lista passa a retornar `supplierName`/`supplierDocument`; rodar duas vezes não duplica (idempotente).
2. **Given** parceiros com contratos ativos, **When** roda o backfill de `par_contract_count_view`, **Then** `contractCount` reflete os contratos atuais; idempotente.

---

### Edge Cases

- Baixa manual com `paidAt` futura → rejeitada (US1-3).
- Conciliação com diferença não classificada → bloqueada (US2-2); arredondamento de centavos na diferença.
- Transferência sem conta de destino → bloqueada (US2-5).
- Extrato com texto acima do `varchar` → truncado, sem perder o extrato inteiro (US2-6).
- DANFE sem `accessKey` → rejeitado; `accessKey` com pontuação → normalizada antes de validar (US4-1/2).
- Vencimento em lote com um item em conflito de versão → **falha por item** (R-2): o item em conflito retorna `version-conflict`, os demais aplicam.
- Reabrir período já `Open` → no-op idempotente ou erro? (US3, confirmar no plano).

## Requirements _(mandatory)_

### Functional Requirements

**Baixa manual / pagamento (US1)**

- **FR-001**: O sistema MUST aceitar `paidAt` (ISO date `YYYY-MM-DD`) opcional no body da baixa manual e no `RegisterManualPaymentCommand`, usando `clock.now()` como fallback quando ausente.
- **FR-002**: O sistema MUST rejeitar `paidAt` futura.
- **FR-003**: O sistema MUST expor `paidAt` (`string | null`) por item em `GET /financial/payable-titles`.

**Conciliação (US2/US3)**

- **FR-004**: O sistema MUST aceitar, ao conciliar com diferença ≠ 0, um tratamento da diferença classificado (`Juros|Multa|Desconto|Tarifa`) que gera lançamento classificado vinculado, **ou** marcação de pagamento parcial que mantém o saldo do título aberto.
- **FR-005**: O sistema MUST bloquear conciliação com diferença ≠ 0 sem classificação.
- **FR-006**: O sistema MUST suportar lançamentos `Transferencia|Aplicacao|Resgate` com contra-partida na conta/produto destino, marcados como realocação patrimonial (fora de despesa/receita nos relatórios).
- **FR-007**: O sistema MUST truncar `entry_type`/`payee_name`/`memo` aos limites do schema (32/255/500) antes de persistir, preservando o erro genuíno de infra.
- **FR-008**: O sistema MUST expor o **nome** do operador que conciliou (`reconciledByName`) e que fechou o período (`closedByName`) com permissão `reconciliation:read`, resolvidos no response a partir de um read-model `fin_user_view` (id,name) projetado por outbox do auth (molde `fin_supplier_view`) — sem exigir `user:read` nem N+1 (R-5).
- **FR-009**: O sistema MUST enriquecer as respostas de sugestões e títulos Pagos com `documentNumber`, `type` e identidade do favorecido (`supplierName` + `supplierTaxId`/ref).
- **FR-010**: O sistema MUST oferecer rota para **reabrir** um período `Closed → Open`.

**Lançar documento / detalhe / grid (US4/US5/US6)**

- **FR-011**: O sistema MUST aceitar `accessKey` (`^\d{44}$`, normalizada) no create, obrigatória quando `type = DANFE`, persistida e exposta no detalhe.
- **FR-012**: O sistema MUST aceitar e persistir `competencia` (VO `Competencia` branded `{year, month}`, R-1a) e `contaDebitoRef` (ref para `fin_cedente_accounts`, validação by-identity #160, R-1b) no create, expostos em lista/detalhe.
- **FR-013**: O sistema MUST enriquecer `GET /documents/:id` com arquivo (fileName/sizeBytes/uploadedAt/url assinada), `issueDate`, `series`, categorização (refs + labels) e dados bancários da forma de pagamento.
- **FR-014**: O sistema MUST enriquecer `GET /payable-titles` com `issueDate`, `paymentMethod`, `version`, `grossValueCents`, `netValueCents` (e `dueDate` date-only).
- **FR-015**: O sistema MUST aceitar filtros adicionais na listagem (`numDoc`, `cnpjCpf`, `valorMin/valorMax`, `contractRef`, `programRef`, multi-valor onde fizer sentido) + ordenação (`sort`+`order`) + busca textual `q` server-side cruzando fornecedor/nº doc/CNPJ.
- **FR-016**: O sistema MUST oferecer alteração de vencimento em lote (`{ items: [{id, version}], dueDate }`) com **falha por item** — retorna `ok`/`version-conflict` por id; itens válidos aplicam mesmo com um conflito isolado (R-2).
- **FR-017**: O sistema MUST persistir "visões salvas" por usuário (`fin_saved_views`: nome + combinação de filtros) com CRUD + RBAC. Filtros guardados em **colunas/serial, sem JSON nativo** (ADR-0020) (R-3).

**Backfill (US8)** _(US7 export adiada — R-4)_

- **FR-018** ⏸️ _(DEFERIDA, R-4)_: export da conciliação em CSV Nibo (#146) + PDF (#144) sai do Go-Live 1; vira incremento pós-go-live, com formato/granularidade a fixar contra o template real.
- **FR-019**: O sistema MUST oferecer backfill idempotente de `fin_supplier_view` (#111). O backfill de `par_contract_count_view` (#110) é ticket do módulo Partners, em sessão separada (R-7).

### Key Entities

- **Document (Documento)** — agregado do financeiro; ganha `accessKey`, `competencia` (VO), `contaDebitoRef` (US4); já guarda `paidAt` no payable (US1).
- **Competencia (VO)** — mês contábil branded `{year, month}` com smart constructor + `Result` (R-1a, US4).
- **Payable (Título)** — derivado do documento; expõe `paidAt`, bruto/líquido, `version`, `paymentMethod` (US1/US6).
- **Reconciliation / ReconciliationItem** — vínculo extrato↔título; ganha tratamento de diferença e contra-partida (US2).
- **ManualEntry (Lançamento manual)** — ganha tipos `Transferencia|Aplicacao|Resgate` (US2, #124 estende).
- **ReconciliationPeriod** — ganha transição `Closed → Open` (US3).
- **fin_saved_views** — visões salvas por usuário (nome + filtros em colunas/serial, sem JSON) (R-3, US6).
- **fin_user_view** — read-model id→nome de usuário, projetado por outbox do auth (R-5, US3).
- **fin_supplier_view** — read-model a backfillar (US8). _(`par_contract_count_view` fica no módulo Partners.)_

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Um operador consegue dar baixa retroativa e ver o título casar com a saída bancária correspondente na conciliação (match correto em 100% das baixas com `paidAt` informado).
- **SC-002**: Conciliação de extrato com diferença e com transferências entre contas próprias fecha sem intervenção no banco.
- **SC-003**: Telas de Contas a Pagar e Conciliação exibem nomes (fornecedor, operador) em vez de UUIDs e refs nulos — zero campos "—" por falta de dado de backend nas seções cobertas.
- **SC-004**: Importação de extrato real (com textos longos) não falha por bounds de `varchar`.
- **SC-005**: O operador salva e recarrega uma "visão" de filtros (`fin_saved_views`) sem reconfigurar o grid. _(Export Nibo/PDF saiu do go-live — R-4.)_
- **SC-006**: Gate W3 (`typecheck` + `format:check` + `lint` + `test`) verde em cada ticket; sem regressão (contagem de testes ≥ baseline).

## Impacto Arquitetural (core-api) _(obrigatório)_

- **Bounded Contexts afetados**: [x] Financeiro (`fin_*`) · [x] Partners (`par_*`, **apenas** #110 backfill, ticket separado) · [ ] Contratos · [~] Auth (**consumo de eventos**, não escrita — `fin_user_view` projeta `UserRegistered`/rename via outbox, R-5)
  - ⚠️ **#110 toca Partners** — ofende o isolamento por feature (ADR-0014, anti-padrão #4 do AGENTS.md) se misturado na mesma sessão/ticket que o financeiro. **Decisão (R-7)**: #110 vira ticket próprio no módulo Partners, executado em sessão separada; fica na spec só como rastreabilidade do go-live.
  - `fin_user_view` **não** importa de `auth/` — consome eventos via outbox (ADR-0006), respeitando o isolamento.
- **Novos agregados / Value Objects?**: VO `Competencia` (R-1a, US4); tratamento de diferença da conciliação (VO classificação + valor); contra-partida de `ManualEntry`; entidade `fin_saved_views` (R-3).
- **Novos eventos de domínio (outbox)?**: evento de conciliação parcial / contra-partida de transferência. **Novo consumidor cross-BC**: `fin_user_view` projetado de eventos do **auth** (`UserRegistered`/rename) via outbox — comunicação por evento, não import direto (ADR-0006/0015/0022). Registrar contratos em `handbook/architecture/`.
- **Borda HTTP envolvida?**: **SIM** — Fastify é a borda ativa e a UX primária (ADR-0025 + ADR-0037). Quase todas as US expõem/alteram rotas `/api/v2/financial/*`. Validação de borda com Zod (ADR-0027). _(Obs.: o texto do template que diz "Fastify é Fase 2+" está desatualizado — superado por ADR-0025/0037.)_
- **Novos subcomandos de CLI?**: **N/A** — CLI embutida removida (ADR-0037). Validação E2E via Bruno + `fastify.inject`.
- **Possíveis violações da constituição?**: (1) cross-BC do #110 — mitigado isolando em ticket Partners; (2) export PDF/CSV — preferir geração leve, sem lib pesada (#144/#146 pedem isso); (3) categorização reusa a feature 020 (ADR-0048), não porta hierarquia legada.

## Assumptions

- Single-org (multi-tenant #53 é pós-go-live); todas as leituras assumem org única.
- Categorização (centro de custo/categoria/programa) reusa a feature 020 já entregue (ADR-0048), não a hierarquia legada.
- O domínio já persiste `paidAt`; US1 só muda a **fonte** do valor (command vs `clock.now()`), sem migration nova.
- OCR, CBS/IBS e divergência de alíquota do guarda-chuva #89 estão **fora** desta fase (Fase 3 / fora do go-live).
- Read-model do dashboard/reports (opção B, #235) é Fase 4 — não é pré-requisito desta spec.
- Export CSV Nibo (#146) e PDF (#144) **adiados** para pós-go-live (R-4) — a conciliação fecha sem eles.
- O auth já emite (ou emitirá) eventos de usuário consumíveis por outbox para alimentar `fin_user_view` (R-5) — confirmar contrato no plano.
