# Phase 0 — Research: Conciliação Bancária (módulo Financeiro)

Decisões técnicas que resolvem o Technical Context. Cada decisão: **Decisão / Rationale / Alternativas**.
Fonte de domínio: `handbook/domain_questions/financeiro/bounded-contexts/conciliacao.md`.

## D-FORMATS — Importação OFX + CSV sem dependência de terceiros

- **Decisão**: suportar **OFX** e **CSV** nesta feature, ambos parseados por leitor escrito à mão em
  Node (`adapters/statement-parsers/{ofx,csv}-parser.ts`), atrás do port `BankStatementParser`.
  **XLSX** (container ZIP+XML) e **PDF** (OCR) ficam **fora de escopo** (exigem lib externa).
- **Rationale**: clarify travou "todos os formatos que NÃO precisam de lib". OFX é SGML/tag-based e
  CSV é texto delimitado — ambos parseáveis com `node:*` puro (zero dependência nova, ADR-0011
  supply-chain; memória `no-python-scripts`/baixo nível). XLSX/PDF quebrariam isso.
- **Alternativas**: lib `ofx`/`xlsx`/`pdf-parse` (rejeitado por ora — supply-chain + clarify); só OFX
  (rejeitado — CSV é trivial e o operador exporta CSV de vários bancos).

## D-FITID — Chave anti-duplicidade (nativa no OFX, sintética no CSV)

- **Decisão**: VO branded `Fitid`. OFX usa o `<FITID>` nativo. CSV (sem FITID) deriva uma `Fitid`
  **sintética determinística** = `sha256(debitAccountRef | date | valueCents | memo | seqNoArquivo)`
  (`node:crypto`). Persistência garante unicidade via índice único `(debit_account_ref, fitid)`;
  reimportação descarta silenciosamente as colisões e **reporta a contagem** (R5).
- **Rationale**: R5 exige descarte silencioso por FITID; CSV nem sempre traz FITID. O hash estável
  reproduz a mesma chave na reimportação do mesmo arquivo, preservando a invariante.
- **Alternativas**: rejeitar CSV sem FITID (rejeitado — inviabiliza o formato); chave por
  `(data+valor)` (rejeitado — colide em transações legítimas idênticas no mesmo dia).

## D-AGGREGATES — `BankStatement` e `Reconciliation` como agregados separados

- **Decisão**: dois agregados. **`BankStatement`** (raiz) contém `StatementTransaction` como
  entidades **dentro do boundary** (criadas/lidas juntas na importação). **`Reconciliation`** é
  agregado **próprio** que referencia a transação e os títulos **por identidade** (`transactionId`,
  `payableId[]`), nunca por objeto. O título (`fin_payables`) pertence ao agregado `Document` — a
  conciliação só o referencia.
- **Rationale**: Vernon — "model true invariants in consistency boundaries" + "reference other
  aggregates by identity": transação e conciliação têm ciclos de vida distintos (transação nasce na
  importação; conciliação nasce/desfaz depois). Agregados pequenos evitam carregar o documento
  inteiro para conciliar.
- ✅ **Princípio IX** (citação canônica — MCP `acdg-skills` ON):

  > "Rule: Reference Other Aggregates by Identity — When designing Aggregates, we may desire a
  > compositional structure that allows for traversal through deep object graphs, but that is not the
  > motivation of the pattern. [Evans] states that one Aggregate may hold references to the Root of
  > other Aggregates. However, we must keep in mind that this does not place the referenced Aggregate
  > inside the consistency boundary of the one referencing it. The reference does not cause the
  > formation of just one whole Aggregate. There are still two (or more)."
  > — Vaughn Vernon, _Implementing Domain-Driven Design_, p. 458 (linha 9074).

  Ancora a separação `Reconciliation` ↔ `payable`/`transaction` por **identidade** (não compõe um
  agregado único). Reforço (small aggregates): Vernon p. 446 (linha 8816) — "design small Aggregates"
  - "reference other Aggregates by identity".

## D-MATCH — Score determinístico, sugestão como read-model (nunca automático)

- **Decisão**: o score (0–100) é função **pura** no domínio sobre critérios ponderados (favorecido
  idêntico, valor exato, data D0 = alto; referência no memo = médio; nº de títulos abertos do
  fornecedor = baixo). A `MatchSuggestion` é **computada sob demanda** (read-model), não um agregado
  pesado persistido. A conciliação é um **comando separado** que exige confirmação humana (R1). A
  **rejeição** persiste um marcador (`fin_rejected_suggestions`) para a sugestão não reaparecer.
- **Rationale**: R1 ("nunca automático") é invariante de produto — separar _cálculo_ (read) de
  _efeito_ (command) garante que score nunca dispara conciliação. Persistir só a rejeição mantém o
  modelo enxuto.
- **Alternativas**: persistir todas as sugestões (rejeitado — ruído + invalidação a cada importação);
  ML/heurística externa (rejeitado — YAGNI, score determinístico basta e é auditável).

## D-TRANSITION — `Paid → Reconciled` (e volta) na mesma transação do módulo

- **Decisão**: o use-case de conciliação, numa **única transação** MySQL, cria a `Reconciliation`,
  transiciona o(s) `fin_payables` de `Paid→Reconciled` (operação de domínio `reconcile()`), marca a
  transação como `Conciliada` e faz `append` no outbox. O desfazimento faz o inverso
  (`Reconciled→Paid`, `unreconcile()`), preservando a `Reconciliation` como `Desfeita` (R7).
- **Rationale**: a invariante "título conciliado ⇒ existe conciliação ativa" é uma **true invariant**
  que exige consistência transacional (imediata/atômica), e ambos os agregados vivem no mesmo BC
  (`financial`). `fin_payables.status` **já** aceita `Reconciled` (schema atual) — sem migration para
  o enum.
- ✅ **Princípio IX** (citação canônica — MCP `acdg-skills` ON):

  > "Rule: Model True Invariants in Consistency Boundaries — When trying to discover the Aggregates in
  > a Bounded Context, we must understand the model's true invariants. [...] An invariant is a business
  > rule that must always be consistent. There are different kinds of consistency. One is transactional
  > consistency, which is considered immediate and atomic. There is also eventual consistency. When
  > discussing invariants, we are referring to transactional consistency."
  > — Vaughn Vernon, _Implementing Domain-Driven Design_, p. 450 (linha 8985).

  A regra geral de Vernon é _eventual consistency outside the boundary_ (p. 462) — desvio **deliberado
  e justificado**: a invariante é verdadeira (R6, auditoria) e intra-BC, então a transação única é a
  fronteira de consistência correta aqui.

- **Dependência**: hoje só `Draft/Open/Approved` têm transição implementada; **como o título chega a
  `Paid`** vem do caminho remessa→retorno→extrato D+1 (fatia 016+ / futura) ou pagamento manual.
  Para esta feature, `Paid` é **pré-condição** (testes semeiam título `Paid`). Ver D-DEP.
- **Alternativas**: consistência eventual via evento interno (rejeitado — janela em que título está
  `Reconciled` sem conciliação ativa; pior para auditoria/R6).

## D-EVENTS — Nomes EN-passado e escopo produtor-only no outbox

- **Decisão**: eventos EN-passado: `BankStatementImported`, `PayableReconciled` (TituloConciliado —
  **por título**), `ReconciliationUndone` (ConciliacaoDesfeita), `ManualEntryRecorded`,
  `ReconciliationPeriodClosed`. **Cross-módulo via outbox** (ADR-0015): `PayableReconciled` e
  `ReconciliationUndone` (consumidos por Contratos/Orçamento em features próprias). Os demais são
  domínio/auditoria intra-financial. `MatchSugerido`/`MatchRejeitado`/`LoteSugerido` são read/UX —
  **não** vão ao outbox.
- **Rationale**: clarify travou "só produtor". Segue o padrão EN-passado existente (`DocumentSaved`,
  `PayableApproved` — `public-api/events.ts`) e o ADR-0015.
- **Alternativas**: publicar todos no outbox (rejeitado — sem consumidor; ruído/DLQ à toa).

## D-PERSIST — Tabelas `fin_*`, índice único de FITID, migrations serializadas

- **Decisão**: novas tabelas `fin_bank_statements`, `fin_statement_transactions`,
  `fin_reconciliations`, `fin_reconciliation_items`, `fin_manual_entries`,
  `fin_reconciliation_periods`, `fin_rejected_suggestions` (prefixo `fin_*`, ADR-0014). Money em
  bigint cents, UUID varchar(36), enums via `varchar+CHECK`, FK ON DELETE CASCADE dentro do boundary
  (`statement → transactions`; `reconciliation → items`). **Índice único** `(debit_account_ref,
fitid)` para a anti-duplicidade. Migrations geradas por `pnpm run db:generate`, **uma por ticket**
  (serialização — lição PRs #83–86).
- **Rationale**: replica os mapeamentos canônicos do schema atual (`schemas/mysql.ts`: bigint cents,
  varchar+CHECK, version optimistic-lock, CASCADE no boundary). ON DUPLICATE/índice único é feature
  permitida (ADR-0020). Sem JSON/ENUM/trigger.
- **Alternativas**: JSON para guardar a lista de títulos da conciliação (rejeitado — ADR-0020 proíbe
  JSON; itens em tabela 1FN `fin_reconciliation_items`).

## D-HTTP — Borda `/api/v2/financial/...` (Fastify + Zod), separação de funções

- **Decisão**: endpoints sob `/api/v2/financial/` (versão já usada pelo plugin financial —
  `adapters/http/plugin.ts`), Fastify + Zod/OpenAPI (ADR-0027/0033). Novas permissões
  `reconciliation:{import,read,reconcile,undo,close}`. **Separação de funções** (handbook §2): quem
  gera remessa (`payable:transmit`) ≠ quem concilia (`reconciliation:reconcile`).
- **Rationale**: clarify travou "incluir borda HTTP". Mantém consistência com a 016 (`/api/v2`).
- **Alternativas**: `/api/v1` (rejeitado — diverge do plugin financial real, que está em v2).

## D-DEP — Dependências de fatias anteriores

- **Decisão**: a feature **depende** de (a) `fin_cedente_accounts` (conta-cedente/conta-débito —
  introduzida na 016, migration `0004`, **ainda não implementada**) para vincular o extrato à conta;
  (b) títulos atingirem `Paid`. Enquanto 016 não pousar, a conciliação modela a `debit_account_ref`
  como referência lógica e os testes semeiam conta + título `Paid` diretamente.
- **Rationale**: o extrato é importado **por conta**; conciliação casa contra título `Paid`. Ordenar
  016 (remessa) → retorno/extrato → 017 (conciliação) é a sequência natural do ciclo.
- **Alternativas**: introduzir `fin_cedente_accounts` aqui (rejeitado — pertence à 016; duplicaria a
  decisão D-CEDENTE e ofenderia a serialização de migrations).

## Resolução de NEEDS CLARIFICATION

Nenhum `[NEEDS CLARIFICATION]` permanece — formatos (D-FORMATS), borda (D-HTTP), escopo do evento
(D-EVENTS) e fallback de FITID (D-FITID) resolvidos. Layout exato de campos OFX/CSV é detalhe do
adapter (ticket `FIN-RECON-PARSERS`).

## Princípio IX — citações canônicas (RESOLVIDO)

MCP `acdg-skills` **ON** nesta sessão. As decisões-chave de fronteira/consistência estão ancoradas em
citação literal ≥4 linhas:

- **D-AGGREGATES** → Vernon, _Implementing DDD_, p. 458 (linha 9074) — _Rule: Reference Other
  Aggregates by Identity_; reforço p. 446 (linha 8816) — small aggregates.
- **D-TRANSITION** → Vernon, _Implementing DDD_, p. 450 (linha 8985) — _Rule: Model True Invariants in
  Consistency Boundaries_ (transactional consistency = imediata/atômica).

Citações extraídas via `skills_citar` (grounding OK). Restam para o gate de cada ticket as citações de
TDD (Beck) e Clean Code (Uncle Bob) das decisões de teste/implementação — produzidas no W0/W2.
