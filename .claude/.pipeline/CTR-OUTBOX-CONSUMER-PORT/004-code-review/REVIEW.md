# Code Review — Ticket CTR-OUTBOX-CONSUMER-PORT — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-26T17:40Z
**Escopo revisado:**

- `src/modules/contracts/application/ports/outbox.ts`
- `src/modules/contracts/worker/outbox-worker.ts`
- `src/modules/contracts/adapters/persistence/repos/outbox-repository.drizzle.ts`
- `src/modules/contracts/adapters/outbox/outbox.in-memory.ts`
- `src/modules/contracts/adapters/persistence/mappers/outbox.mapper.ts`
- `src/modules/contracts/cli/context.ts`
- `tests/modules/contracts/worker/outbox-consumer-port.boundary.test.ts`

Cruzado com: ADR-0006 (ports & adapters), `.claude/rules/application.md`,
`eslint.config.js` (naming-convention, prefer-readonly-parameter-types).

---

## Objetivo do ticket — atingido

A dívida do `CTR-OUTBOX-SKIPLOCKED-DUP` (contrato de consumo na camada worker, importado
pelos adapters) foi resolvida **de fato**, não apenas reduzida:

- **Direção de dependência correta** (ADR-0006): `OutboxRow`, `OutboxBatchOps` e
  `WorkerOutboxOps` agora moram em `application/ports/outbox.ts`. Adapters e worker
  importam o contrato do port → `adapter → port ← worker`. Verificado por grep: nenhum
  `src/` importa o contrato de `worker/outbox-worker.ts` (o único import remanescente do
  worker é `run-outbox-worker.ts` → `runLoop`/`WorkerConfig`, que são entry-points do
  worker, não o contrato — legítimo).
- **`application.md` respeitado**: `application/ports/outbox.ts` importa apenas `Result` e
  `ContractsModuleEvent` — zero imports de `adapters/`. Confirmado por grep + boundary INV-4.

## Guard CA4 — correto

`adapters/persistence/mappers/outbox.mapper.ts:33-38`:

```ts
type OutboxRowSchema = typeof ctrOutbox.$inferSelect;
type AssertTrue<T extends true> = T;
const _outboxRowDriftGuard: [
  AssertTrue<OutboxRowSchema extends OutboxRow ? true : false>,
  AssertTrue<OutboxRow extends OutboxRowSchema ? true : false>,
] = [true, true];
```

- Bidirecional (mútua atribuibilidade) → pega coluna **adicionada** (port deixa de conter
  o campo novo → 1ª direção falha), **removida** (port passa a ter campo a mais → 2ª direção
  falha) e **retipada** (ambas falham). Quando alguma vira `false`, `AssertTrue<false>`
  viola a constraint `T extends true` e quebra o `typecheck`. Comportamento comprovado no W1
  (campo de prova → `TS2344`, revertido).
- Lint-safe: tipos `OutboxRowSchema`/`AssertTrue` PascalCase (typeLike), `T` PascalCase;
  `_outboxRowDriftGuard` é `variable` com leading underscore (permitido) e ignorado por
  `no-unused-vars` (`varsIgnorePattern: '^_'`). Sem `void` (evita `no-invalid-void-type`).

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

#### Sugestão 1 — guard usa atribuibilidade mútua, não igualdade estrita

O guard CA4 usa `A extends B && B extends A` (mútua atribuibilidade), não um `Equal<A,B>`
estrito (o truque `(<T>() => T extends A ? 1 : 2) extends ...`). Para detecção de **drift de
coluna** (add/remove/retype) a mútua atribuibilidade é suficiente e mais legível. A diferença
só apareceria em equivalências exóticas (modificadores `readonly`/opcionalidade idênticos em
forma mas distintos em variância) — irrelevante para colunas escalares de `ctr_outbox`.
Manter como está; registrar a limitação conhecida.

#### Sugestão 2 — `payload: string` no `OutboxRow` do port

O `OutboxRow` canônico expõe `payload: string` (forma serializada) — levemente infra-leaky
para um tipo de port. Porém é inerente ao contrato de consumo (o worker desserializa via
`outboxRowToEvent`) e é pré-existente ao ticket. Sem ação.

---

## O que está bom

- **Decisão de design acertada**: tipo de linha canônico no port + guard de conformidade é a
  única hipótese do `000-request.md` que satisfaz CA4 (guard exige o port ter um tipo de
  linha). A alternativa genérica (`WorkerOutboxOps<Row>`) teria deixado CA4 sem objeto.
- **Churn mínimo**: o mapper **reexporta** `OutboxRow` (`export type { OutboxRow }`), então
  os ~3 importadores históricos (`worker`, `drizzle`, `in-memory`) continuam válidos sem
  alteração de path. Pragmático e correto sob `verbatimModuleSyntax`.
- **Limpeza colateral legítima**: ao tornar `OutboxRow` `Readonly`, o
  `prefer-readonly-parameter-types` deixou de disparar nos handlers de `withPendingBatch`;
  os 5 `eslint-disable` agora inúteis foram removidos (lint não acusa diretiva órfã).
- **Sem ciclo**: o port não importa de `worker/` nem de `adapters/`; mapper/worker/adapters
  importam do port. Direção única, extração futura do módulo preservada.
- **Teste W0 honesto**: a correção do INV-5 (de "ambos os tipos" para só `WorkerOutboxOps`)
  está documentada e é correta — `OutboxBatchOps` chega ao worker por inferência; exigir o
  import seria forçar import morto. INV-3 mantém a garantia de que ele mora no port.

---

## Próximo passo

- **APPROVED** → pipeline-maestro avança para **W3** (gate: typecheck + format:check + lint +
  test). As 2 sugestões 🔵 são informativas; nenhuma exige mudança neste ticket.
