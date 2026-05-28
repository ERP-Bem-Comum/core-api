# Code Review — Ticket CTR-OUTBOX-SKIPLOCKED-DUP — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-26T15:50Z
**Escopo revisado:**

- `src/modules/contracts/worker/outbox-worker.ts`
- `src/modules/contracts/adapters/persistence/repos/outbox-repository.drizzle.ts`
- `src/modules/contracts/adapters/outbox/outbox.in-memory.ts`
- `src/modules/contracts/cli/drivers/memory.ts`
- `src/modules/contracts/cli/drivers/mysql.ts`

Cruzado com: `handbook/architecture/adr/0015-mysql-outbox-pattern.md` (fluxo do worker,
§"Sobre `FOR UPDATE SKIP LOCKED`"), `handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md`
(lista normativa de features SQL), `.claude/rules/adapters.md`.

---

## Correção funcional — núcleo do ticket

A causa-raiz do W0 (`SELECT ... FOR UPDATE SKIP LOCKED` em autocommit → lock liberado no
mesmo statement → 2º worker relê as rows) é resolvida de forma **correta e mínima**:
`withPendingBatch` abre uma única `db.transaction`, trava as rows e mantém o lock vivo
até o COMMIT (ao fim do handler), depois de delivery + marcação. Confirmado empiricamente
(W0: `tx2 viu=0`) e por 3× execução estável de `CA-I2`.

Conformidade normativa verificada por citação literal:

- **ADR-0020:74-86** — `Transações: BEGIN / COMMIT / ROLLBACK (via db.transaction(...) do Drizzle)`
  está na lista de **permitidas**. O fix usa exatamente isso. ✅
- **ADR-0020:107** — `Isolation level explícito por transação (SET TRANSACTION ISOLATION LEVEL)`
  é **proibido**. O fix **não** força isolation; usa o default InnoDB (`REPEATABLE READ`).
  O W0 prova que `FOR UPDATE SKIP LOCKED` particiona corretamente sob esse default. ✅
- **ADR-0015:84-86** — `FOR UPDATE SKIP LOCKED ... essencial para múltiplos workers
  consumirem sem race condition. Confirmado disponível.` Uso conforme. ✅
- **`.claude/rules/adapters.md`** — `try/catch permitido aqui, mas converter para Result
  na borda`. O `catch` de `withPendingBatch` retorna `err(outboxQueryUnavailable(...))`,
  nunca vaza exceção. ✅

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, registrar)

#### Issue 1 — direção da dependência de tipo (adapter → worker)

`outbox-repository.drizzle.ts:15` importa `OutboxBatchOps` de `../../../worker/outbox-worker.ts`,
e `worker/outbox-worker.ts:11` importa `OutboxQueryError`/`OutboxRow` do próprio adapter.
Há um **ciclo de tipo** adapter ↔ worker, e um adapter passa a depender de um tipo
declarado na camada worker.

- **Por que não bloqueia:** ambos são `import type` puros — apagados em runtime por
  `verbatimModuleSyntax` + `isolatedModules` (typecheck verde, sem ciclo de runtime).
  Segue a convenção local já existente (`WorkerOutboxOps` também mora no worker).
- **Dívida registrada:** o lar canônico de um contrato consumido por adapter + worker é
  um port (`application/ports/outbox.ts`), não a camada worker. Mover `OutboxBatchOps`
  (e idealmente `OutboxQueryError`) para o port quebraria o ciclo e inverteria a
  dependência na direção correta (adapter → port ← worker). Candidato a ticket futuro,
  fora do escopo deste fix.

### 🔵 Sugestão (estilo / clareza / performance)

#### Sugestão 1 — `ORDER BY occurredAt` apenas vs. ADR-0015:70

O `orderBy(asc(occurredAt))` (`outbox-repository.drizzle.ts:230`) diverge da query
canônica do ADR-0015:70 — `ORDER BY processed_at, occurred_at`. Como o `WHERE
processed_at IS NULL` torna `processed_at` constante no resultado, **a correção não é
afetada**; é só uso de índice. O índice composto recomendado pelo ADR é
`(processed_at, occurred_at)` (ADR-0015:78), e ordenar só por `occurred_at` pode forçar
filesort. **Pré-existente** — idêntico ao `findPendingForUpdate` original (linha 205),
não introduzido por este ticket. Vale alinhar num ticket de tuning, não aqui.

#### Sugestão 2 — delivery I/O dentro da transação

`deps.delivery.deliver()` (`outbox-worker.ts:218`) roda **dentro** da tx que segura os
locks. É inerente e necessário à abordagem B (o lock precisa sobreviver até a marcação),
mas mantém locks abertos durante I/O de delivery de todo o batch. Mitigação já presente:
`batchSize` pequeno (default recomendado 10, `outbox-worker.ts:17`) limita o blast radius
de lock-wait. Registrar para observabilidade caso delivery fique lento em produção.

#### Sugestão 3 — robustez depende de `deliver` não lançar

Se `EventDelivery.deliver` **lançar** (em vez de retornar `err`), a exceção propaga do
handler → `db.transaction` faz ROLLBACK → batch inteiro reprocessa. At-least-once é
preservado (ADR-0015 §Idempotência), mas o comportamento ideal (marcação seletiva) só
vale se o adapter de delivery converter `throw → Result` na borda
(`.claude/rules/adapters.md`). Verificar no adapter concreto de delivery (fora do escopo
deste diff).

---

## O que está bom

- **Mínimo e cirúrgico:** o fix não reescreve o fluxo de decisão (deliver → mark/fail/DLQ);
  apenas o reentrega dentro de `withPendingBatch`, trocando `deps.outbox.*` por `ops.*`.
- **Paridade adapter Drizzle ↔ InMemory:** ambos expõem `withPendingBatch` com a mesma
  assinatura; o InMemory documenta corretamente que o "lock" é implícito em ambiente
  single-threaded (`outbox.in-memory.ts:195-198`). `markFailed`/`moveToDeadLetter` do
  batch espelham fielmente os helpers diretos (inclusive `void now/errorTag` por ausência
  de coluna).
- **Helpers diretos preservados** com comentário explícito de que **não** servem para
  consumo concorrente (`outbox-worker.ts:63-65`) — evita reincidência do bug.
- **Comentários no ponto certo:** cada bloco transacional explica *por que* o lock precisa
  sobreviver ao COMMIT, citando o ticket. Densidade adequada (zero ruído).
- **`markProcessed` idempotente** mantido (`WHERE ... AND processed_at IS NULL`) também na
  versão transacional (`outbox-repository.drizzle.ts:241`).
- **Best-effort consciente:** ops capturam I/O em `Result` sem abortar a tx; só o `SELECT`
  inicial lançando dispara rollback. Decisão coerente com at-least-once.

---

## Próximo passo

- **APPROVED** → pipeline-maestro avança para **W3** (gate de qualidade: typecheck +
  format:check + test). As 3 sugestões 🔵 e a dívida 🟡 são informativas; nenhuma
  bloqueia o avanço nem exige mudança neste ticket.

---

## Adendo pós-aprovação (2026-05-26, a pedido do humano)

Os 3 pontos registrados foram **endereçados** após o APPROVED, por solicitação explícita.
Revalidados pelo gate W3 completo (typecheck + lint + format + test, todos verdes; única
falha = pré-existente `CA-5` / `CTR-INFRA-READONLY-BI-GRANT`).

- **🟡 Ciclo adapter↔worker:** `OutboxQueryError` (+ constructors) movido de
  `outbox-repository.drizzle.ts` → `application/ports/outbox.ts`. Worker e InMemory passam
  a importar do port. O ciclo concreto `drizzle.ts ↔ outbox-worker.ts` foi **quebrado** (a
  aresta `worker→adapter` deixou de existir; resta só `adapter→worker` via `OutboxBatchOps`,
  unidirecional). **Dívida residual:** mover `OutboxBatchOps`/`WorkerOutboxOps` ao port
  exigiria mover `OutboxRow = typeof ctrOutbox.$inferSelect`, o que viola `application.md`
  ("application não importa de `adapters/`"). Fica para ticket de refatoração próprio.
- **🔵 ORDER BY:** alinhado com ADR-0015:70 → `ORDER BY processed_at, occurred_at` em
  `findPendingForUpdate` e `withPendingBatch`. Casa com o índice composto existente
  `ctr_outbox_processed_at_occurred_at_idx` (schema mysql.ts:247). Suíte do repo Drizzle
  (17 testes, inclui CA-3 ordenação + CA-7 SKIP LOCKED) verde.
- **🔵 deliver não lançar:** guard `.catch()` em torno de `delivery.deliver()`
  (`outbox-worker.ts`) converte `throw → err(deliveryUnavailable(...))`, evitando que um
  adapter mal-comportado aborte a transação e cause rollback do batch já entregue.
