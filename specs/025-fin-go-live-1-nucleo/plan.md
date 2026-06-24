# Implementation Plan: Go-Live 1 — Núcleo Operacional do Financeiro (Fase 1)

**Branch**: `025-fin-go-live-1-nucleo` | **Date**: 2026-06-23 | **Spec**: [`spec.md`](./spec.md) · [`discovery-246.md`](./discovery-246.md)

**Input**: spec da Fase 1 do épico #246 (7 User Stories ativas, US7 export deferida).

## Summary

Núcleo operacional do financeiro (Contas a Pagar + Conciliação) para o Go-Live 1. O **reconhecimento read-only** (3 agentes Explore, 2026-06-23) revelou que boa parte do domínio **já existe** — o gap real está majoritariamente na **borda HTTP** e em **2 dependências cross-módulo**. O plan abaixo é organizado por US, cada uma com `JÁ EXISTE → GAP → desenho`, e amarra cada ticket à(s) issue(s) original(is) como **Definition of Done** (o `goal` é fechar a issue; ver `tasks.md`).

## Technical Context

**Language/Version**: Node.js 24 LTS · TypeScript 6.0 · ESM (NodeNext) — ADR-0002/0009.
**Primary Dependencies**: Fastify 5 (borda, ADR-0025/0037) + Zod (validação, ADR-0027) · Drizzle ORM + mysql2 (MySQL 8.4, ADR-0013/0020).
**Storage**: MySQL 8 — tabelas `fin_*` (ADR-0014). Migrations Drizzle, próxima sequência **0021+** (última = `0020_mean_red_wolf.sql`).
**Testing**: `node:test` + `--experimental-strip-types`; integração Drizzle via Docker (`test:integration`).
**Project Type**: modular monolith (módulo `financial`; toca `auth` e `partners` só por evento/sessão separada).
**Scale/Scope**: single-org; 7 US → ~13 tickets (3 cross-módulo isolados).

## Constitution Check

_GATE: revalidar após o desenho._

- ✅ **Isolamento de módulo (ADR-0014)**: o grosso vive em `financial`. **2 dependências cruzam fronteira** e vão para **ticket/sessão separada**: (a) `auth` publicar `user-events` (pré-req de `fin_user_view`); (b) backfill `par_contract_count_view` no `partners` (#110). `fin_user_view` consome eventos do auth **via outbox**, sem `import` de `auth/` (ADR-0006).
- ✅ **MySQL features (ADR-0020)**: sem JSON nativo (→ `fin_saved_views` guarda filtros em colunas/serial), sem ENUM/trigger/stored-proc.
- ✅ **Outbox (ADR-0015/0022)**: novos consumidores (`fin_user_view`) e eventos (contra-partida) seguem o padrão `fin_outbox` já existente.
- ✅ **Domínio puro / Result / VO**: `Competencia` é VO branded com `Result` (R-1a).
- ⚠️ **Violações justificadas** → ver Complexity Tracking.

## Reconhecimento (Phase 0) — estado atual por US

> Fonte: 3 agentes Explore (read-only) sobre `src/modules/financial`, `auth`, `jobs`. Cada item lista `JÁ EXISTE` (arquivo:linha) e `GAP`.

### US1 — paidAt (#232, #231)

- **JÁ EXISTE**: evento `PayableManuallyPaid {paidAt, paidBy}` (`domain/document/events.ts:40`); use-case grava `clock.now()` (`register-manual-payment.ts:60`); rota `POST …/manual-payment` (`plugin.ts:390`).
- **GAP**: (a) command/`manualPaymentBodySchema` (`schemas.ts:776`) **não aceita `paidAt`** [#232]; (b) `fin_payables` **não tem coluna `paid_at`** — `payableSummarySchema`/`payableResponseSchema` não expõem [#231]. Para o match da conciliação, expor exige **coluna nova** (denormalização de leitura) — derivar do timeline é frágil para ordenação/filtro.
- **Desenho**: #232 = add `paidAt` opcional ao command + use-case (fallback `clock.now()`, rejeita futura). #231 = migration `fin_payables.paid_at` (nullable) + gravar na baixa + expor em `payable-titles`/detalhe.

### US2 — conciliação (#141, #143, #161)

- **#141 diferença/parcial — JÁ QUASE PRONTA**: `DifferenceTreatment = Interest|Penalty|Discount|Fee|Partial` (`reconciliation/types.ts:50`); `confirmReconciliationBodySchema.difference` (`schemas.ts:368`); persistido em `fin_reconciliations.difference_value_cents/difference_treatment` (mysql.ts:629). **GAP = S**: semântica sinal×treatment (Discount<0, Interest>0) + (se exigido) lançamento contábil da diferença. **⚠️ Verificar os CAs do #141 contra o que já roda — pode estar majoritariamente entregue.**
- **#143 transferência — GAP M**: tipos `Transfer|Investment|Redemption` prontos (`types.ts:18`), mas **contra-partida na conta destino não existe** (sem `destinationAccountRef`, sem dupla criação). Desenho: campo de conta destino no `ManualEntry`/comando + criar reconciliação-espelho na conta destino + evento.
- **#161 bounds — GAP S**: `statement.mapper` copia strings sem bound; truncar a 32/255/500 antes de persistir, preservando erro de infra.

### US3 — auditoria/identidades (#207, #172, #203)

- **#207 nome do operador — BLOQUEADO**: `reconciledBy`/`closedBy` já persistidos e expostos como UUID (`dto.ts:278`, `schemas.ts:685`). Falta `fin_user_view` (não existe) + JOIN. **BLOQUEIO**: `auth` emite `UserRegistered/UserCreated/UserProfileUpdated` (`auth/domain/identity/user/events.ts`) mas **só exporta `email-events` na public-api** — precisa publicar um contrato `user-events` consumível (molde `email-events.ts`). → **pré-ticket no módulo auth**.
- **#172 fornecedor/nº doc — GAP S-M**: `SuggestionCandidate` já tem `supplierName`+`documentNumber` (`ports/suggestion-view.ts:8`) mas o `matchSuggestionSchema` (`schemas.ts:429`) **não os expõe**; `paidPayableSchema` (`schemas.ts:408`) está enxuto. Expor no response (depende de `fin_supplier_view` populado — #111).
- **#203 reopen — GAP M (greenfield)**: só existe `closePeriod()` (`period.ts:46`) e `POST …/close` (`plugin.ts:871`). Falta `reopenPeriod()` + use-case + rota `POST …/:id/reopen`.

### US4 — campos fiscais (#115, #197)

- **#115 accessKey — GAP S-M**: ausente em `createDocumentBodySchema` (`schemas.ts:81`), agregado e schema. Add `accessKey` (`^\d{44}$`, normalizada, obrigatória se DANFE) + coluna.
- **#197 competencia/contaDebito — GAP S-M**: **coluna `debit_account_ref` já existe** (mysql.ts:95) e `CedenteAccountStore.findById` (by-identity) já existe (`ports/cedente-account-store.ts`) — falta só **fluir** `contaDebitoRef` da borda→use-case com validação. `competencia` = **VO novo `Competencia`** + coluna `char(7)` `YYYY-MM` (ou decomposto).

### US5 — detalhe (#95)

- **JÁ EXISTE**: `documentResponseSchema` já traz `issueDate`, refs de categorização, `paymentMethod` (`schemas.ts:184`).
- **GAP recortado**: (a) `series` no detalhe — **S** (já no domínio/lista); (b) **rótulos** de categorização (categoryName/costCenterName/programName) — **M** (join read-models `fin_categories`/`fin_cost_centers`); (c) **arquivo do documento** — depende da **feature 018 (upload)** → **FORA do go-live**, fica como follow-up; (d) dados bancários do favorecido — cross-módulo, follow-up.

### US6 — grid (#229, #164, #167, #162)

- **#229 enrich payable-titles — GAP S**: faltam só 6 campos (`issueDate`, `paymentMethod`, `version`, `grossValueCents`, `netValueCents`, refs) — colunas existem; add ao SELECT (`payable-list.mapper.ts:59`) + `payableSummarySchema`.
- **#164/#167 filtros/sort/busca — GAP M-L**: query schema atual só `status/supplier/type/due*/issued*` (`schemas.ts:158`). Add `numDoc/cnpjCpf/valorMin/Max/contractRef/programRef`, `sort/order`, `q` (busca textual server-side; avaliar índice/`LIKE` vs FULLTEXT com `mysql-database-expert`).
- **#164 saved-views — GAP M**: `fin_saved_views` nova (por usuário; filtros em colunas/serial, sem JSON — ADR-0020) + CRUD + RBAC.
- **#162 bulk due-date — GAP M (greenfield)**: só existe `PATCH /documents/:id`. Nova rota de coleção `PATCH /documents/due-date` com **falha por item** (R-2).

### US8 — backfill (#111)

- **JÁ EXISTE**: `backfillSupplierViews` idempotente (`src/jobs/financial/supplier-view-backfill/backfill.ts`) + worker de projeção (`src/workers/supplier-view-projection/run.ts`).
- **GAP S**: falta só o **dispatcher operacional** (script/job one-shot que alimenta o backfill a partir do partners). `par_contract_count_view` (#110) é ticket separado no partners (R-7).

## Project Structure

### Source Code (módulo financial)

```text
src/modules/financial/
├── domain/
│   ├── document/            # competencia.ts (VO novo), accessKey, paidAt já no evento
│   └── reconciliation/      # reopenPeriod (novo), contra-partida (novo)
├── application/
│   ├── use-cases/           # register-manual-payment (paidAt), reopen-period (novo), save-document (campos fiscais)
│   └── ports/               # cedente-account-store (findById ✓), suggestion-view (✓)
├── adapters/
│   ├── http/                # schemas.ts, plugin.ts, dto.ts — grosso das mudanças de borda
│   └── persistence/
│       ├── schemas/mysql.ts # +paid_at, +access_key, +competencia, +fin_saved_views, +fin_user_view
│       ├── migrations/mysql/ # 0021+ (db:generate)
│       └── mappers/         # statement.mapper (bounds #161), payable-list.mapper (#229)
src/jobs/financial/supplier-view-backfill/   # dispatcher (#111)
src/workers/                                  # fin_user_view projection (novo, consome auth outbox)
```

### Dependências cross-módulo (sessão/ticket separada — ADR-0014)

```text
src/modules/auth/public-api/user-events.ts   # NOVO — pré-req de fin_user_view (#207)
src/modules/partners/  (backfill par_contract_count_view #110)
```

## Migrations Drizzle (core-api)

> Sequência atual termina em `0020`. Editar `schemas/mysql.ts` e rodar `pnpm run db:generate` (nunca à mão). Uma migration por ticket (não acumular).

- **Colunas novas (ALTER ADD nullable, não-quebrante)**: `fin_payables.paid_at` (US1/#231); `fin_documents.access_key`, `fin_documents.competencia` (US4); (se #143 exigir) `fin_manual_entries.destination_account_ref`.
- **Tabelas novas**: `fin_saved_views` (US6/#164); `fin_user_view` (US3/#207 — id, name, updated_at; molde `fin_supplier_view`).
- **Sem mudança**: #141 (já tem colunas de difference), #161 (mapper), #229 (SELECT), #162 (lógica), #111 (dispatcher).
- **Restrições ADR-0020**: `fin_saved_views` sem JSON — filtros normalizados em colunas (ou serialização não-JSON delimitada).

## Contrato HTTP (Fastify ativo — ADR-0025/0037)

Pareamento `fastify-server-expert` (implementa) + `zod-expert` (revisa) em toda borda.

- **Alteradas (add campos)**: `POST …/manual-payment` (+`paidAt`); `GET /payable-titles` (+6 campos +`paidAt`); `GET /documents/:id` (+`series`, +labels); `GET /documents` (query: +filtros/sort/q); `POST /documents` (+`accessKey`/`competencia`/`contaDebitoRef`); `GET …/suggestions` + `GET /payables?status=Paid` (+supplierName/documentNumber).
- **Novas**: `POST …/reconciliation-periods/:id/reopen` (#203); `PATCH /documents/due-date` bulk por item (#162); CRUD `fin_saved_views` (#164).
- **Backward-compat**: todos os campos novos de leitura são aditivos/`optional` (front tolerante já cabeado).

## Estimativa de Pipeline — tickets e tamanhos (revisados pós-recon)

| Ticket                                | Issue(s) = DoD  | Tam                   | Dependência                           |
| ------------------------------------- | --------------- | --------------------- | ------------------------------------- |
| `FIN-MANUAL-PAYMENT-PAIDAT-CMD`       | #232            | S                     | —                                     |
| `FIN-PAYABLE-PAIDAT-READ`             | #231            | M (migration)         | após #232                             |
| `FIN-RECON-DIFF-VERIFY`               | #141            | S (verificar+refinar) | —                                     |
| `FIN-RECON-INTERACCOUNT`              | #143            | M                     | —                                     |
| `FIN-STATEMENT-VARCHAR-BOUNDS`        | #161            | S                     | —                                     |
| `FIN-RECON-REOPEN`                    | #203            | M                     | —                                     |
| `FIN-RECON-SUPPLIER-ENRICH`           | #172            | S-M                   | #111 populado                         |
| `FIN-USER-VIEW-NAMES`                 | #207            | M                     | **AUTH-USER-EVENTS**                  |
| `FIN-DOC-ACCESSKEY`                   | #115            | S-M                   | —                                     |
| `FIN-DOC-COMPETENCIA-DEBITO`          | #197            | M                     | —                                     |
| `FIN-DETAIL-DTO`                      | #95 (recortado) | M                     | arquivo→feat 018 (fora)               |
| `FIN-PAYABLE-TITLES-ENRICH`           | #229            | S                     | —                                     |
| `FIN-LIST-FILTERS-SORT-SEARCH`        | #164/#167       | M-L                   | —                                     |
| `FIN-SAVED-VIEWS`                     | #164 (saved)    | M                     | —                                     |
| `FIN-BULK-DUE-DATE`                   | #162            | M                     | —                                     |
| `FIN-SUPPLIER-VIEW-BACKFILL-DISPATCH` | #111            | S                     | —                                     |
| `AUTH-USER-EVENTS-PUBLISH` ⟂          | #207 (pré-req)  | M                     | **módulo auth — sessão separada**     |
| `PAR-CONTRACT-COUNT-BACKFILL` ⟂       | #110            | S                     | **módulo partners — sessão separada** |

**Ordem recomendada** (caminho crítico): `FIN-MANUAL-PAYMENT-PAIDAT-CMD` (#232, livre, continua o #228) → `FIN-PAYABLE-PAIDAT-READ` (#231) → `FIN-RECON-DIFF-VERIFY` (#141, provável quase-pronto) → `FIN-STATEMENT-VARCHAR-BOUNDS` (#161) → `FIN-PAYABLE-TITLES-ENRICH` (#229) → demais. Em paralelo (sessões separadas): `AUTH-USER-EVENTS-PUBLISH` destrava `FIN-USER-VIEW-NAMES`; `PAR-CONTRACT-COUNT-BACKFILL`.

**Agentes por wave** (todos os tickets): W0 `tdd-strategist` (+`test-pyramid-engineer` se integração Drizzle) · W1 `contratos-orchestrator`→especialista (ver coluna) · W2 `code-reviewer` (+`security-backend-expert` em leitura cross-org/link assinado) · W3 `ts-quality-checker`. Especialista W1 por ticket no `tasks.md`.

## Complexity Tracking

| Violação                                | Por que necessária                                                                 | Alternativa simples rejeitada porque                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Cross-BC: `auth` publica `user-events`  | #207 precisa do nome do usuário e o financial não pode importar `auth/` (ADR-0006) | Resolver via `GET /users/:id` é admin-gated (`user:read`) + N+1 — a própria #207 descartou |
| Cross-BC: backfill no `partners` (#110) | read-model `par_contract_count_view` vive no partners                              | Misturar na sessão do financial ofende ADR-0014 (anti-padrão #4)                           |
| Novo worker `fin_user_view`             | projeção idempotente de eventos do auth                                            | Query síncrona cross-módulo violaria isolamento e acoplaria latência                       |
| `fin_saved_views` sem JSON              | ADR-0020 proíbe JSON nativo                                                        | Coluna JSON seria simples mas é proibida — usar colunas/serial                             |

## Próximo passo

`tasks.md` (Phase 2) — uma task por ticket, **citando a issue original e seus critérios de aceite como Definition of Done** (goal = fechar a issue). Depois materializar os tickets W0→W3 com `pnpm run pipeline:state init`.
