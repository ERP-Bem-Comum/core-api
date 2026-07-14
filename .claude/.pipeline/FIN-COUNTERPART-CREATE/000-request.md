# FIN-COUNTERPART-CREATE — escopo (US1 · spec 029 · #269)

> Frente 1 do #404. Módulo **`financial`**. Size **M**. Primeiro dos 3 tickets serializados da feature 029.

## Contexto
Ao conciliar uma transferência A→B (via `record-manual-entry` com `type='Transfer'` + `destinationAccountRef`), criar na conta de **destino** uma **Contrapartida Esperada** — novo agregado `expected-counterpart` (`fin_expected_counterpart`), ciclo `Pending → Matched | Discarded`. Hoje são 2 lançamentos soltos, sem vínculo. Decisão de modelagem (research.md): agregado **próprio**, não `StatementTransaction` marcada — é uma *expectativa*, não *fato* de extrato (Vernon, IDDD p.450).

## Escopo (in)
Inclui a **Foundational** (Phase 2 do tasks.md — pré-requisito de US1-US3, entregue neste 1º ticket):
- Agregado `src/modules/financial/domain/expected-counterpart/` — branded id, `types.ts` (`ExpectedCounterpart`, status, type, erros EN kebab), `events.ts` (`TransferCounterpartCreated/Matched/Discarded`).
- Port `application/ports/expected-counterpart-store.ts` + adapter in-memory + adapter Drizzle.
- Schema Drizzle `fin_expected_counterpart` (varchar ids, bigint cents, varchar movement/status/type; índices `(destination_account_ref,status)` e `(origin_reconciliation_ref)`) + migration gerada.
- **US1:** `create` no agregado (deriva movement oposto, valida, emite `TransferCounterpartCreated`) + integração no `record-manual-entry` (type=Transfer + destino → cria contrapartida na mesma unit-of-work + outbox) + wiring.

## Fora de escopo
- US2 (match/confirm) → `FIN-COUNTERPART-MATCH`. US3 (undo) → `FIN-COUNTERPART-UNDO`.

## Critérios de aceite
- **CA1** `record-manual-entry(type=Transfer, destino=B, valor V)` cria contrapartida `Pending` em B: movement oposto ao da origem, valor V.
- **CA2** Sem `destinationAccountRef` **ou** `type≠Transfer` → **nenhuma** contrapartida criada (guard de não-regressão — transferência sem destino segue igual).
- **CA3** Domínio `create`: valor > 0, `destino ≠ origem`, status `Pending`, evento `TransferCounterpartCreated`.
- **CA4** Evento publicado no outbox só após o save (produtor; ADR-0015).

## Pipeline (skills por wave)
| Wave | Atividade | Skill / agente |
| :-- | :-- | :-- |
| W0 | RED — T011 domínio `create` + T012 application (cria/não-cria) | `tdd-strategist` |
| W1 | Foundational (agregado/port/adapters/tabela) + `create` + integração | `ts-domain-modeler` + `drizzle-schema-author` + `drizzle-orm-expert` |
| W2 | audit read-only | `code-reviewer` |
| W3 | gate + integração MySQL 8.4 (x99) | `ts-quality-checker` |

## DoD
Gate W3 verde + migration validada no x99. Contrapartida Pending criada no destino. Não fecha #269 (é US1/3).
