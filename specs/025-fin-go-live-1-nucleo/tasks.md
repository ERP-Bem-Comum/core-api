---
description: 'Tasks — Go-Live 1 Núcleo Operacional do Financeiro (Fase 1, épico #246)'
---

# Tasks: Go-Live 1 — Núcleo Operacional do Financeiro (Fase 1)

**Input**: [`plan.md`](./plan.md) · [`spec.md`](./spec.md) · [`discovery-246.md`](./discovery-246.md)

## ⭐ Regra de ouro — a ISSUE é a Definition of Done

> O **`goal`** de cada ticket é **FECHAR a issue do GitHub**. Os **critérios de aceite da issue** são a **Definition of Done** — não os ignoramos nunca. Cada ticket cita a(s) issue(s) original(is); o **W3 só fecha o ticket quando**: (1) todos os CAs da issue estão verdes, (2) gate W3 verde (`typecheck`+`format:check`+`lint`+`test`, regressão zero), (3) a **issue é encerrada** referenciando o PR. Se durante a execução um CA não couber no recorte, **não se descarta** — registra-se via skill `issue-report` (ADR-0040) e mantém-se a issue aberta para a parte restante.

## Formato

`[Txxx] [Wave] [Ticket] descrição (arquivo:path)` · **[P]** = paralelizável (arquivos distintos).
**Agentes por wave (invariante):** W0 `tdd-strategist` · W1 `contratos-orchestrator`→especialista (indicado por ticket) · W2 `code-reviewer` · W3 `ts-quality-checker`.

---

## Phase 0 — Dependências bloqueantes (cross-módulo · sessão separada · ADR-0014)

> Estes **não** são do módulo financial — rodam em sessão/ticket próprios para não ofender o isolamento. Bloqueiam tickets do financial indicados.

### TICKET `AUTH-USER-EVENTS-PUBLISH` — publica eventos de usuário na public-api · Tam M · W1: `nodejs-runtime-expert` + `ts-domain-modeler`

**🎯 Goal:** desbloquear o nome do operador (#207) — pré-requisito de `FIN-USER-VIEW-NAMES`.
**📋 DoD (parte de #207):**

- [ ] `auth/public-api/user-events.ts` exporta contrato consumível de `UserRegistered`/`UserCreated`/`UserProfileUpdated` (id + name/email), com decoder versionado v1 (molde `auth/public-api/email-events.ts`).
- [ ] eventos vão ao outbox do auth de forma idempotente (eventId).
- [ ] gate W3 verde.
- [ ] _#207 permanece aberta_ até o consumidor `fin_user_view` existir (fecha em `FIN-USER-VIEW-NAMES`).
- [ ] T001 [W0] [AUTH-UE] teste RED do decoder v1 de `user-events` (`tests/unit/auth/public-api/user-events.test.ts`).
- [ ] T002 [W1] [AUTH-UE] criar `user-events.ts` + emitir no outbox (`src/modules/auth/public-api/`, `adapters/outbox/`).
- [ ] T003 [W2/W3] [AUTH-UE] review + gate.

### TICKET `PAR-CONTRACT-COUNT-BACKFILL` — backfill `par_contract_count_view` · Tam S · W1: `drizzle-orm-expert` + `nodejs-process-runner`

**🎯 Goal:** fechar a issue **#110**.
**📋 DoD (CAs da #110):**

- [ ] após o backfill, `GET /api/v1/partners` (e grids) retornam `contractCount` coerente com os contratos ativos.
- [ ] idempotente (rodar 2× não duplica).
- [ ] gate W3 verde + **#110 fechada**.
- [ ] T004 [W0] [PAR-CC] teste RED idempotência do backfill.
- [ ] T005 [W1] [PAR-CC] dispatcher de backfill no módulo partners.
- [ ] T006 [W2/W3] [PAR-CC] review + gate + fechar #110.

---

## Phase 1 — User Story 1 · paidAt (P1) 🎯 MVP — continua o #228

### TICKET `FIN-MANUAL-PAYMENT-PAIDAT-CMD` — baixa aceita `paidAt` no body · Tam S · W1: `fastify-server-expert`+`zod-expert`

**🎯 Goal:** fechar a issue **#232**.
**📋 DoD (CAs da #232):**

- [ ] `manualPaymentBodySchema` + `RegisterManualPaymentCommand` aceitam `paidAt` (ISO `YYYY-MM-DD`) opcional.
- [ ] use-case usa `cmd.paidAt` quando presente; **fallback `clock.now()`** quando ausente.
- [ ] `paidAt` futura é rejeitada (422).
- [ ] gate W3 verde + **#232 fechada**.
- [ ] T007 [W0] [US1] teste RED: baixa com `paidAt` retroativo grava a data; sem `paidAt` usa clock; futura → erro (`tests/.../register-manual-payment*.test.ts`).
- [ ] T008 [W1] [US1] add `paidAt` a `schemas.ts:776` + `register-manual-payment.ts:22/60` (usa `cmd.paidAt ?? clock.now()`).
- [ ] T009 [W2/W3] [US1] review + gate + fechar #232.

### TICKET `FIN-PAYABLE-PAIDAT-READ` — expõe `paidAt` na leitura · Tam M (migration) · W1: `drizzle-schema-author`+`fastify-server-expert` · dep: #232

**🎯 Goal:** fechar a issue **#231**.
**📋 DoD (CAs da #231):**

- [ ] `paidAt` (`string|null`, ISO date) por item em `GET /financial/payable-titles` (null enquanto não pago).
- [ ] a baixa manual **grava** o `paidAt` informado (coluna `fin_payables.paid_at`).
- [ ] (automático/remessa: `paidAt` = data da saída bancária — nota de follow-up se fora do escopo agora).
- [ ] gate W3 verde + **#231 fechada**.
- [ ] T010 [W0] [US1] teste RED: payable Pago expõe `paidAt`; não-pago → null (integração Drizzle, `test:integration`).
- [ ] T011 [W1] [US1] migration `0021` add `fin_payables.paid_at` nullable + gravar no `DocumentRepository.save` + `payableSummarySchema`/`payable-list.mapper.ts`.
- [ ] T012 [W2/W3] [US1] review + gate + fechar #231.

---

## Phase 2 — User Story 2 · Conciliação (P1)

### TICKET `FIN-RECON-DIFF-VERIFY` — diferença/parcial (verificar+refinar) · Tam S · W1: `ts-domain-modeler`+`tdd-strategist`

**🎯 Goal:** fechar a issue **#141** (⚠️ recon indica que está **majoritariamente entregue** — domínio/schema/borda já têm `DifferenceTreatment`).
**📋 DoD (CAs da #141):**

- [ ] diferença = 0 → conciliação cheia (atual).
- [ ] diferença ≠ 0 **sem** classificação → bloqueia.
- [ ] diferença classificada (Juros/Multa/Desconto/Tarifa) → conciliação parcial com categoria + centro de custo.
- [ ] "pagamento parcial" → título mantém saldo aberto pelo restante.
- [ ] gate W3 verde + **#141 fechada** (ou, se um CA faltar, `issue-report` do delta e #141 segue só nele).
- [ ] T013 [W0] [US2] teste RED cobrindo os 4 CAs contra o código atual (`confirm-reconciliation*.test.ts`) — **revela o que já passa vs. o gap real**.
- [ ] T014 [W1] [US2] implementar só o delta (provável: semântica sinal×treatment + lançamento da diferença + "manter aberto").
- [ ] T015 [W2/W3] [US2] review + gate + fechar #141.

### TICKET `FIN-RECON-INTERACCOUNT` — contra-partida entre contas próprias · Tam M · W1: `ts-domain-modeler`+`drizzle-orm-expert`

**🎯 Goal:** fechar a issue **#143**.
**📋 DoD (CAs da #143):**

- [ ] Transferência exige **conta de destino** (outra `fin_cedente_accounts`).
- [ ] Aplicação/Resgate exige **produto** de destino.
- [ ] **contra-partida** criada/conciliável na conta destino.
- [ ] lançamentos desse tipo **não** entram como despesa/receita nos relatórios.
- [ ] gate W3 verde + **#143 fechada**.
- [ ] T016 [W0] [US2] teste RED: transferência cria espelho na conta destino; sem destino → bloqueia.
- [ ] T017 [W1] [US2] add `destinationAccountRef` ao `ManualEntry`/comando (+migration `fin_manual_entries`) + criar reconciliação-espelho + evento (`domain/reconciliation/`, use-case, `schemas/mysql.ts`).
- [ ] T018 [W2/W3] [US2] review + gate + fechar #143.

### TICKET `FIN-STATEMENT-VARCHAR-BOUNDS` — trunca bounds no mapper · Tam S · W1: `drizzle-orm-expert`+`mysql-database-expert`

**🎯 Goal:** fechar a issue **#161**.
**📋 DoD (CAs da #161):**

- [ ] CA1: `memo` 600 chars → `save` ok, `listTransactions` devolve truncado em 500.
- [ ] CA2: `entry_type` 40 / `payee_name` 300 → truncados a 32/255 (round-trip do mapper).
- [ ] CA3: falha real de INSERT → ainda `err('bank-statement-repository-failure')` (truncamento não mascara erro).
- [ ] gate W3 verde + **#161 fechada**.
- [ ] T019 [W0] [US2] teste RED do mapper para CA1/CA2/CA3 (`statement.mapper*.test.ts`).
- [ ] T020 [W1] [US2] truncar em `statement.mapper.ts` (`transactionsToRows`) aos limites do schema.
- [ ] T021 [W2/W3] [US2] review + gate + fechar #161.

---

## Phase 3 — User Story 3 · Identidades/auditoria (P2)

### TICKET `FIN-USER-VIEW-NAMES` — nome do operador via `fin_user_view` · Tam M · W1: `drizzle-schema-author`+`fastify-server-expert` · **dep: `AUTH-USER-EVENTS-PUBLISH`**

**🎯 Goal:** fechar a issue **#207**.
**📋 DoD (CAs da #207):**

- [ ] modal de detalhes exibe **nome** do operador que conciliou (`reconciledByName`) e que fechou o período (`closedByName`), com `reconciliation:read` (sem `user:read`).
- [ ] resolvido no backend (sem N+1).
- [ ] gate W3 verde + **#207 fechada**.
- [ ] T022 [W0] [US3] teste RED: response traz `reconciledByName`/`closedByName` a partir de `fin_user_view` (integração).
- [ ] T023 [W1] [US3] migration `fin_user_view` (id,name) + worker projeção (consome `auth` user-events via outbox, molde `supplier-view-projection`) + JOIN no `dto.ts`/`schemas.ts`.
- [ ] T024 [W2/W3] [US3] review (`security-backend-expert`: gate de permissão) + gate + fechar #207.

### TICKET `FIN-RECON-SUPPLIER-ENRICH` — fornecedor + nº doc no match · Tam S-M · W1: `fastify-server-expert`+`zod-expert` · dep: #111 populado

**🎯 Goal:** fechar a issue **#172**.
**📋 DoD (pedido da #172):**

- [ ] `GET …/suggestions` e `GET /payables?status=Paid` trazem `documentNumber`, `type`, `supplierName` + `supplierTaxId`/ref.
- [ ] gate W3 verde + **#172 fechada**.
- [ ] T025 [W0] [US3] teste RED: response de suggestions e paid-payables expõem nome+nº doc.
- [ ] T026 [W1] [US3] expor campos já presentes em `SuggestionCandidate` no `matchSuggestionSchema` (`schemas.ts:429`) + enriquecer `paidPayableSchema` (`schemas.ts:408`).
- [ ] T027 [W2/W3] [US3] review + gate + fechar #172.

### TICKET `FIN-RECON-REOPEN` — reabrir período · Tam M · W1: `ts-domain-modeler`+`fastify-server-expert`

**🎯 Goal:** fechar a issue **#203**.
**📋 DoD (pedido da #203):**

- [ ] `POST /financial/reconciliation-periods/:id/reopen` volta `Closed → Open`.
- [ ] decidir reabrir já-`Open` (no-op idempotente vs erro) — registrar a escolha.
- [ ] gate W3 verde + **#203 fechada**.
- [ ] T028 [W0] [US3] teste RED: período Closed → reopen → Open; já-Open conforme decisão.
- [ ] T029 [W1] [US3] `reopenPeriod()` (`domain/reconciliation/period.ts`) + use-case + rota (`plugin.ts`).
- [ ] T030 [W2/W3] [US3] review + gate + fechar #203.

---

## Phase 4 — User Story 4 · Campos fiscais (P2)

### TICKET `FIN-DOC-ACCESSKEY` — chave de acesso DANFE · Tam S-M · W1: `ts-domain-modeler`+`zod-expert`

**🎯 Goal:** fechar a issue **#115**.
**📋 DoD (CAs da #115):**

- [ ] `accessKey` (`^\d{44}$`, normalizada) no `createDocumentBodySchema`; obrigatória quando `type === 'DANFE'`.
- [ ] persistida e exposta no `GET /documents/:id`.
- [ ] erro de formato → slug i18n (`invalid-access-key`, 422).
- [ ] gate W3 verde + **#115 fechada**.
- [ ] T031 [W0] [US4] teste RED: DANFE sem accessKey → 422; com 44 dígitos → persiste/expõe.
- [ ] T032 [W1] [US4] add ao schema + agregado Document + migration `fin_documents.access_key` + detalhe.
- [ ] T033 [W2/W3] [US4] review + gate + fechar #115.

### TICKET `FIN-DOC-COMPETENCIA-DEBITO` — competência (VO) + conta-débito · Tam M · W1: `ts-domain-modeler`+`drizzle-schema-author`

**🎯 Goal:** fechar a issue **#197**.
**📋 DoD (CAs da #197):**

- [ ] decisões de modelagem registradas (R-1a VO `Competencia`; R-1b `contaDebitoRef`→`fin_cedente_accounts`).
- [ ] create aceita `competencia` e `contaDebitoRef`; persistem em `fin_documents`.
- [ ] expostos nos DTOs de lista e detalhe.
- [ ] migration aditiva (nullable); sem regressão; gate W3 verde + **#197 fechada**.
- [ ] T034 [W0] [US4] teste RED: VO `Competencia` (válido/ inválido) + create persiste competencia + contaDebitoRef validado por `CedenteAccountStore.findById`.
- [ ] T035 [W1] [US4] VO `domain/document/competencia.ts` + fluir `contaDebitoRef` (coluna `debit_account_ref` já existe) + migration `competencia` + DTOs.
- [ ] T036 [W2/W3] [US4] review + gate + fechar #197.

---

## Phase 5 — User Story 5 · Detalhe (P2)

### TICKET `FIN-DETAIL-DTO` — enriquecer detalhe (recortado) · Tam M · W1: `fastify-server-expert`+`zod-expert`

**🎯 Goal:** fechar a issue **#95** (recorte: arquivo/PDF e dados bancários → follow-up dep. feature 018/cross-módulo).
**📋 DoD (CAs da #95 no recorte):**

- [ ] `series` no `documentResponseSchema` (já no domínio/lista).
- [ ] rótulos de categorização (`categoryName`/`costCenterName`/`programName`) além das refs.
- [ ] **arquivo do documento + dados bancários**: `issue-report` de follow-up (dependem da feature 018/cross-módulo) — **#95 só fecha se a P.O. aceitar o recorte**; senão segue aberta na parte de arquivo.
- [ ] gate W3 verde.
- [ ] T037 [W0] [US5] teste RED: detalhe expõe `series` + labels de categorização.
- [ ] T038 [W1] [US5] add `series` + JOIN labels (`fin_categories`/`fin_cost_centers`) no `dto.ts`/`schemas.ts`.
- [ ] T039 [W2/W3] [US5] review + gate + decidir fechamento/recorte de #95 com a P.O.

---

## Phase 6 — User Story 6 · Grid (P2)

### TICKET `FIN-PAYABLE-TITLES-ENRICH` — 6 campos no grid por título · Tam S · W1: `fastify-server-expert`+`zod-expert`

**🎯 Goal:** fechar a issue **#229**.
**📋 DoD (pedido da #229):**

- [ ] item de `GET /payable-titles` traz `issueDate`, `paymentMethod`, `version`, `grossValueCents`, `netValueCents` (`dueDate` date-only).
- [ ] gate W3 verde + **#229 fechada**.
- [ ] T040 [W0] [US6] teste RED: item expõe os 6 campos.
- [ ] T041 [W1] [US6] add ao SELECT (`payable-list.mapper.ts:59`) + `payableSummarySchema:746`.
- [ ] T042 [W2/W3] [US6] review + gate + fechar #229.

### TICKET `FIN-LIST-FILTERS-SORT-SEARCH` — filtros/ordenação/busca · Tam M-L · W1: `mysql-database-expert`+`drizzle-orm-expert`

**🎯 Goal:** fechar as issues **#164** (filtros/sort) + **#167** (busca textual).
**📋 DoD (pedido de #164/#167):**

- [ ] filtros `numDoc`, `cnpjCpf`, `valorMin/Max`, `contractRef`, `programRef` (multi-valor onde fizer sentido).
- [ ] `sort` + `order` (Vencimento/Líquido/Fornecedor).
- [ ] busca textual `q` server-side cruzando fornecedor/nº doc/CNPJ em todas as páginas.
- [ ] gate W3 verde + **#167 fechada** e **#164 parcialmente** (saved-views em ticket próprio).
- [ ] T043 [W0] [US6] teste RED dos filtros + sort + busca `q`.
- [ ] T044 [W1] [US6] estender `listDocumentsQuerySchema:158` + query (avaliar `LIKE` vs FULLTEXT com `mysql-database-expert`).
- [ ] T045 [W2/W3] [US6] review + gate + fechar #167 (e marcar #164 parcial).

### TICKET `FIN-SAVED-VIEWS` — visões salvas (core-api, sem JSON) · Tam M · W1: `drizzle-schema-author`+`fastify-server-expert`

**🎯 Goal:** fechar a parte "visões salvas" da issue **#164** (R-3).
**📋 DoD (pedido da #164 · saved-views):**

- [ ] `fin_saved_views` por usuário (nome + filtros em colunas/serial, **sem JSON** — ADR-0020) + CRUD + RBAC.
- [ ] salvar/recarregar uma visão sem reconfigurar o grid (SC-005).
- [ ] gate W3 verde + **#164 fechada** (junto com `FIN-LIST-FILTERS-SORT-SEARCH`).
- [ ] T046 [W0] [US6] teste RED: criar/listar/aplicar/excluir visão salva.
- [ ] T047 [W1] [US6] migration `fin_saved_views` + agregado + repo + rotas CRUD.
- [ ] T048 [W2/W3] [US6] review + gate + fechar #164.

### TICKET `FIN-BULK-DUE-DATE` — vencimento em lote (falha por item) · Tam M · W1: `fastify-server-expert`+`zod-expert`

**🎯 Goal:** fechar a issue **#162**.
**📋 DoD (pedido da #162):**

- [ ] `PATCH /documents/due-date` `{ items:[{id,version}], dueDate }` → resultado por id (`ok`/`version-conflict`).
- [ ] **falha por item** (R-2): conflito isolado não derruba o lote.
- [ ] gate W3 verde + **#162 fechada**.
- [ ] T049 [W0] [US6] teste RED: lote com 1 conflito → demais aplicam, conflito reportado.
- [ ] T050 [W1] [US6] nova rota de coleção + use-case por item (`plugin.ts`, use-case).
- [ ] T051 [W2/W3] [US6] review + gate + fechar #162.

---

## Phase 7 — User Story 8 · Backfill (P3)

### TICKET `FIN-SUPPLIER-VIEW-BACKFILL-DISPATCH` — dispatcher do backfill · Tam S · W1: `nodejs-process-runner`+`drizzle-orm-expert`

**🎯 Goal:** fechar a issue **#111**.
**📋 DoD (CAs da #111):**

- [ ] `GET /api/v2/financial/documents` retorna `supplierName`/`supplierDocument` não-nulos para docs com fornecedor projetado.
- [ ] idempotente.
- [ ] (doc) como acionar o backfill localmente.
- [ ] gate W3 verde + **#111 fechada**.
- [ ] T052 [W0] [US8] teste RED: dispatcher popula `fin_supplier_view`; 2ª execução não duplica.
- [ ] T053 [W1] [US8] dispatcher one-shot (usa `backfillSupplierViews` existente em `src/jobs/financial/supplier-view-backfill/`).
- [ ] T054 [W2/W3] [US8] review + gate + fechar #111.

---

## Dependências & ordem

```
AUTH-USER-EVENTS-PUBLISH ──▶ FIN-USER-VIEW-NAMES (#207)
#111 (backfill) ──▶ FIN-RECON-SUPPLIER-ENRICH (#172)  [dados de fornecedor não-nulos]
FIN-MANUAL-PAYMENT-PAIDAT-CMD (#232) ──▶ FIN-PAYABLE-PAIDAT-READ (#231)
```

**Caminho crítico (ordem de execução):**

1. `FIN-MANUAL-PAYMENT-PAIDAT-CMD` (#232) — começar (livre, continua #228).
2. `FIN-PAYABLE-PAIDAT-READ` (#231) · `FIN-RECON-DIFF-VERIFY` (#141) · `FIN-STATEMENT-VARCHAR-BOUNDS` (#161) · `FIN-PAYABLE-TITLES-ENRICH` (#229) — paralelizáveis [P].
3. `FIN-DOC-ACCESSKEY` (#115) · `FIN-DOC-COMPETENCIA-DEBITO` (#197) · `FIN-DETAIL-DTO` (#95) · `FIN-RECON-REOPEN` (#203) · `FIN-RECON-INTERACCOUNT` (#143).
4. `FIN-LIST-FILTERS-SORT-SEARCH` (#164/#167) · `FIN-SAVED-VIEWS` (#164) · `FIN-BULK-DUE-DATE` (#162) · `FIN-SUPPLIER-VIEW-BACKFILL-DISPATCH` (#111).
5. Sessões separadas: `AUTH-USER-EVENTS-PUBLISH` → `FIN-USER-VIEW-NAMES` (#207); `FIN-RECON-SUPPLIER-ENRICH` (#172); `PAR-CONTRACT-COUNT-BACKFILL` (#110).

## Notas

- **Issue = DoD** em todo ticket — fechar a issue é o `goal`, os CAs dela são o gate. Nada de "implementei mas não fechei".
- W0 RED de `FIN-RECON-DIFF-VERIFY` (#141) tem valor extra de **diagnóstico**: revela quanto da issue já está entregue antes de qualquer código novo.
- Cada ticket nasce com `pnpm run pipeline:state init <TICKET> --size <S|M|L>` e um `000-request.md` que **cola os CAs da issue** + linka a issue.
- Achados fora de escopo durante a execução → `issue-report` (não scope-creep, não perder o achado — ADR-0040).
