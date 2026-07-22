# Research — Fase 0 · Transferência entre contas com contrapartida pendente (#269)

## Decisão 1 (central) — Como modelar a "contrapartida esperada"

**Decision:** modelar como **agregado próprio** do `financial` — `ExpectedCounterpart` (tabela `fin_expected_counterpart`), com ciclo de vida próprio `Pending → Matched | Discarded`. **Não** reusar `StatementTransaction` marcada como "esperada/pendente".

**Rationale:**

- A contrapartida é uma **expectativa**, não um **fato** de extrato. `StatementTransaction` (`domain/statement/types.ts`) exige `fitid` (nativo OFX ou sintético CSV) e nasce de um import real (`BankStatement`); injetar transações sintéticas polui o modelo de fatos e ameaça a **dedup de import por `fitid`**.
- A contrapartida tem **invariantes e ciclo de vida distintos** do extrato (valor = espelho da origem, sinal oposto, vínculo à perna A, estados Pending/Matched/Discarded). Pela regra de Vernon, isso define um **agregado separado** — o cluster se dá pelas invariantes verdadeiras, não pela proximidade de tabela:

> "When trying to discover the Aggregates in a Bounded Context, we must understand the model's true invariants. Only with that knowledge can we determine which objects should be clustered into a given Aggregate. An invariant is a business rule that must always be consistent."
> — Vaughn Vernon, _Implementing Domain-Driven Design_, p. 450 (`ddd--vernon-livro-vermelho.md:8985`)

- O casamento vira **transação real (fato) consome a contrapartida (expectativa)** — dedup por consumo, sem uma segunda transação. Mantém `BankStatement` puro (só dados importados) e isola o novo conceito.

**Alternatives considered:**

- **(B) `StatementTransaction` com flag `expected/pending`** — rejeitada: polui o agregado de fatos, exige `fitid` sintético, arrisca a dedup de import, e mistura duas invariantes num agregado só.
- **(C) manter só metadado na `Reconciliation` de origem (status quo)** — rejeitada: não dá presença consultável na conta B (sem fila/seletor), não há o que o motor de sugestão case, e o import de B geraria duplicidade.

## Decisão 2 — Casamento transação × contrapartida (FR-005/FR-008)

**Decision:** estender `suggest-matches` para, na conta de destino, comparar transações `Pending` importadas contra **contrapartidas `Pending`** da mesma conta, reusando `match-score` (`domain/reconciliation/match-score.ts`): **valor exato** + **proximidade de data** (janela default ~5 dias corridos). Empate → contrapartida mais antiga não consumida (estável).

**Rationale:** reusa o motor de score existente (não duplica regra); valor exato evita falso-positivo no MVP (tarifa/IOF fica fora — Q2). A sugestão ganha um `kind: 'counterpart'` (além de `payable`), rotulada "outra perna da transferência de [Conta A] em [data]".

**Alternatives:** casamento por id explícito informado pelo usuário — rejeitado (perde o "acende sozinho" do SC-002).

## Decisão 3 — Dedup e desfazer (FR-007/FR-010)

**Decision:** confirmar o par transação×contrapartida transita a contrapartida para `Matched` (guarda `matchedTransactionRef`), concilia a transação real e grava o **vínculo A↔B** — sem criar segunda transação (dedup por consumo). Desfazer a conciliação de **origem**: se a contrapartida está `Pending` → `Discarded` (evento `TransferCounterpartDiscarded`); se `Matched` → reabrir (desfaz o par no destino e volta a contrapartida a `Pending` ou descarta conforme a operação), sem contagem dobrada.

**Rationale:** operação idempotente e auditável; o vínculo permite navegar A↔B (SC-004). Segue o padrão `Active/Undone` já existente na `Reconciliation`.

## Decisão 4 — Persistência e eventos (FR-012)

**Decision:** tabela `fin_expected_counterpart` (Drizzle → `db:generate`), `varchar(36)` ids, `bigint` cents, `movement`/`status`/`type` como `varchar` (ADR-0020, sem ENUM), datas como `date`/`datetime`. Eventos `TransferCounterpartCreated/Matched/Discarded` (EN-passado) via **outbox** na mesma transação (ADR-0015). Módulo permanece **produtor**.

**Alternatives:** persistir a contrapartida embutida na `Reconciliation` de origem — rejeitado (ela vive na conta B, precisa de fila/índice próprios).

## Riscos / dependências

- Depende de conciliação (017), extrato/import (#59/#60), conta cedente (019) — todos na `dev`.
- **Ambiguidade** de múltiplas transferências mesmo valor/data → empate estável (mais antiga não consumida); documentado como edge case.
- Sem job de expiração (Q1) → possível acúmulo de contrapartidas `Pending` antigas; a P.O. confirma se vira follow-up.
