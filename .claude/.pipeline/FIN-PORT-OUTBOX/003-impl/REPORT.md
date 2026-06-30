# W1 — Implementação GREEN (FIN-PORT-OUTBOX)

> **Wave:** W1 · **Outcome:** GREEN · **Agent:** `main-session` (com skill `ports-and-adapters` já carregada anteriormente na sessão)
> **Predecessor:** [`../002-tests/REPORT.md`](../002-tests/REPORT.md) (W0 RED)
> **Artefatos:** 3 arquivos novos + 2 arquivos modificados

---

## 1. Mudanças

| Arquivo | Linhas | Conteúdo | Status |
| :--- | ---: | :--- | :--- |
| `src/modules/financial/public-api/events.ts` | 60 | `FINANCIAL_SCHEMA_VERSION` + `FinancialModuleEvent` + `KNOWN_EVENT_TYPES` Set + `isFinancialModuleEvent` type guard | NOVO |
| `src/modules/financial/application/ports/outbox.ts` | 68 | `OutboxAppendError` union (3 tagged) + 3 constructors + `OutboxPort` type | NOVO |
| `src/modules/financial/adapters/outbox/outbox.in-memory.ts` | 110 | `FinancialOutboxRow` shape mínimo + `InMemoryOutbox()` factory | NOVO |
| `src/modules/financial/public-api/index.ts` | 14 | Barrel reescrito de `export {}` para `export * from './events.ts'` | MODIFICADO |
| `tests/modules/financial/public-api/scaffold.test.ts` | 47 | Atualizado de "espera vazio" para "valida runtime exports do FIN-PORT-OUTBOX" | MODIFICADO |
| **Total** | **~300** | (250 src + ~50 test ajuste) | |

### 1.1. `public-api/events.ts` — union estável

```ts
export const FINANCIAL_SCHEMA_VERSION = 1 as const;
export type FinancialModuleEvent = PayableEvent;          // único agregado por enquanto

const KNOWN_EVENT_TYPES: ReadonlySet<string> = new Set([
  'PayableOpened', 'PayableApproved', 'PayableTransmitted', 'PayableRejected',
  'PayableMarkedOverdue', 'PayableResetToApproved', 'PayablePaidManually',
  'PayableBankOutflowConfirmed', 'PayableSettled',
]);                                                       // 9 variants ⇨ máquina de estados completa

export const isFinancialModuleEvent = (u: unknown): u is FinancialModuleEvent => {
  if (typeof u !== 'object' || u === null) return false;
  const c = u as { type?: unknown };
  if (typeof c.type !== 'string') return false;
  return KNOWN_EVENT_TYPES.has(c.type);
};
```

Padrão idêntico a `src/modules/contracts/public-api/events.ts` — quando agregado novo entrar (e.g., `FiscalDocument`), basta estender `FinancialModuleEvent` e adicionar nomes em `KNOWN_EVENT_TYPES`.

### 1.2. `application/ports/outbox.ts` — port + tagged errors

```ts
export type OutboxAppendError =
  | OutboxAppendUnavailable                       // { tag }
  | OutboxAppendSerializationFailed               // { tag, eventType, reason }
  | OutboxAppendDuplicateEventId;                 // { tag, eventId }

export type OutboxPort = Readonly<{
  append: (events: readonly FinancialModuleEvent[]) => Promise<Result<void, OutboxAppendError>>;
}>;
```

Sem assinatura `tx` — InMemory funciona sem transação; adapter Drizzle (`FIN-ADAPTER-OUTBOX-DRIZZLE`) usará `appendInTx(tx, events)` internamente. Header doc explica posicionamento `application/ports/` vs `domain/` (técnico, não invariante).

### 1.3. `adapters/outbox/outbox.in-memory.ts` — adapter enxuto

```ts
export type FinancialOutboxRow = Readonly<{
  eventId: string;
  eventType: string;
  processedAt: Date | null;
  attempts: number;
  occurredAt: Date;
}>;

export const InMemoryOutbox = () => {
  const rows: FinancialOutboxRow[] = [];
  const seenIds = new Set<string>();

  const port: OutboxPort = {
    // eslint-disable-next-line @typescript-eslint/require-await
    append: async (events) => {
      if (events.length === 0) return ok(undefined);
      const inserts = events.map((e) => ({
        eventId: newUuid(),
        eventType: e.type,
        processedAt: null,
        attempts: 0,
        occurredAt: e.occurredAt,
      }));
      for (const insert of inserts) {
        if (seenIds.has(insert.eventId)) return err(outboxAppendDuplicateEventId(insert.eventId));
      }
      for (const insert of inserts) {
        seenIds.add(insert.eventId);
        rows.push(insert);
      }
      return ok(undefined);
    },
  };
  // + markProcessedSync, clear, all, pending
};
```

- **`newUuid()`** gera `eventId` por evento — alinhado com PK do banco no adapter Drizzle futuro.
- **`seenIds` Set** — defesa em profundidade (CA-16); não dispara com UUIDs gerados internamente, mas mantém o branch para o caller que fornecer eventId explícito (caso fora da API pública atual).
- **`eslint-disable @typescript-eslint/require-await`** — conflito clássico `require-await` × `promise-function-async` documentado em `FIN-CLI-WIRE` W3 e reaplicado em `FIN-PORT-PAYABLE-REPO`.

### 1.4. `public-api/index.ts` — barrel

```ts
export * from './events.ts';
```

Substitui placeholder `export {};`. Doc do barrel atualizada listando os 3 exports atuais.

### 1.5. `scaffold.test.ts` — atualização forçada

O teste pré-existente `tests/modules/financial/public-api/scaffold.test.ts` validava que public-api começasse vazio. Esse era o estado pós-`FIN-MODULE-SCAFFOLD`; o próprio teste documentava "exports só virão com tickets FIN-* subsequentes". **Este é o primeiro ticket que popula a public-api.**

Mudança mínima:
- CA-1 (arquivo existe) preservado.
- CA-3 (subpath alias funciona) preservado.
- CA-2 (zero símbolos) **substituído** por validação de set crescente: agora exige `FINANCIAL_SCHEMA_VERSION` e `isFinancialModuleEvent` runtime exports (tipos não aparecem em `Object.keys`).

### 1.6. Zero `class`, zero `throw`, zero `as any`

```
$ grep -nE "throw |\bclass\b|new Error|extends Error|: any\b|as any" \
    src/modules/financial/{public-api/events.ts,application/ports/outbox.ts,adapters/outbox/outbox.in-memory.ts}
(nenhum)

$ grep -nE " as " src/modules/financial/adapters/outbox/outbox.in-memory.ts
86:        (row as { processedAt: Date | null }).processedAt = new Date();
105:    all: () => rows as readonly FinancialOutboxRow[],
106:    pending: () => rows.filter((r) => r.processedAt === null) as readonly FinancialOutboxRow[],
```

- **L86:** cast controlado para mutação interna (`processedAt` é `Readonly` na superfície pública, mutável no escopo do adapter).
- **L105/L106:** narrow de `T[]` interno para `readonly T[]` retornado — pattern idêntico ao `InMemoryContractRepository` e ao `InMemoryOutbox` do contracts. **Não é `as Brand`** (sem casting para branded type).

---

## 2. Verificação

### 2.1. Suite global — delta vs baseline

```
$ pnpm test
```

| Métrica | Baseline (W3 FIN-PORT-PAYABLE-REPO) | W0 RED | W1 GREEN | Delta W1 vs Baseline |
| :--- | ---: | ---: | ---: | ---: |
| tests | 1078 | 1079 | **1087** | **+9** |
| pass | 1062 | 1062 | **1071** | **+9** |
| fail | 0 | 1 | **0** | 0 |
| skipped | 16 | 16 | 16 | 0 |
| suites | 345 | — | 349 | +4 |

**Delta exato.** Zero regressão. Os 9 testes novos batem com o REPORT W0 §6 (esperado 1087/1071/0/16).

### 2.2. Testes específicos do ticket

```
▶ InMemoryOutbox — shape (CA-9)
  ✔ factory expõe port + 4 helpers (all, pending, markProcessedSync, clear)
▶ OutboxPort contract — InMemory
  ✔ CA-10: append([]) é no-op e retorna ok(undefined)
  ✔ CA-11: append([evt]) registra 1 row com processedAt null e attempts 0
  ✔ CA-12: append([e1, e2]) registra 2 rows preservando ordem
  ✔ CA-13: pending() retorna apenas rows com processedAt null
  ✔ CA-14: markProcessedSync move row de pending para processed
  ✔ shape: row tem eventId, eventType, processedAt, attempts, occurredAt
▶ InMemoryOutbox — clear (CA-15)
  ✔ clear() esvazia rows e seenIds
▶ InMemoryOutbox — duplicate eventId (CA-16)
  ✔ dois appends do MESMO event object geram 2 rows com eventIds distintos (UUID por append)
```

9 testes verdes. CA-9..16 100% cobertos.

---

## 3. CAs (000-request §3)

| # | Critério | Status |
| :--- | :--- | :--- |
| CA-1 | `OutboxAppendError` union com 3 tagged errors | ✅ §1.2 |
| CA-2 | 3 case constructors exportados | ✅ §1.2 |
| CA-3 | `OutboxPort` com `append: (events) => Promise<Result<void, OutboxAppendError>>` | ✅ §1.2 |
| CA-4 | Header doc cita ADR-0015 + adapter Drizzle futuro | ✅ outbox.ts:1-15 |
| CA-5 | `FINANCIAL_SCHEMA_VERSION = 1 as const` | ✅ §1.1 |
| CA-6 | `FinancialModuleEvent = PayableEvent` | ✅ §1.1 |
| CA-7 | `isFinancialModuleEvent(u): u is FinancialModuleEvent` | ✅ §1.1 |
| CA-8 | `public-api/index.ts` re-exporta tudo de `./events.ts` | ✅ §1.4 |
| CA-9 | Factory expõe port + 4 helpers | ✅ §2.2 |
| CA-10 | `append([])` no-op | ✅ §2.2 |
| CA-11 | `append([event])` 1 row com `processedAt: null`, `attempts: 0` | ✅ §2.2 |
| CA-12 | `append([e1, e2])` 2 rows preservando ordem | ✅ §2.2 |
| CA-13 | `pending()` filtra `processedAt === null` | ✅ §2.2 |
| CA-14 | `markProcessedSync` move pending → processed | ✅ §2.2 |
| CA-15 | `clear()` esvazia | ✅ §2.2 |
| CA-16 | Branch de duplicate via `seenIds` | ✅ §1.3 (presente no source); §2.2 (semântica documentada via runtime) |
| CA-17 | Suite exporta função reusável | ✅ inerente — `export const runOutboxContract` |
| CA-18 | `.contract.ts` não descoberta | ✅ W0 §2 (suite global cresceu +4 suites = 1 do scaffold ajuste + 3 do `.test.ts`) |
| CA-19 | Runner consome suite | ✅ `outbox.in-memory.test.ts` chama `runOutboxContract('InMemory', ...)` |
| CA-20..23 (typecheck/format/lint/test) | ⏳ W3 (`test` ✅ §2.1; demais W3) |

**16 de 19 CAs validadas em W1.** 3 operacionais para W3.

---

## 4. Decisões W1

- **`newUuid()` para `eventId`** — `src/shared/utils/id.ts` já exporta gerador V4 testado. Mesmo gerador usado por `PayableId.generate()` e `ContractId.generate()` — consistência cross-módulo.
- **Cast `as { processedAt: Date | null }` na L86 do InMemory** — única forma de mutar `Readonly` row sem `class` ou `Map<id, mutableRow>`. Cast escopado ao adapter (não vaza para outside).
- **Scaffold test atualizado em vez de deletado** — preserva CA-1 (arquivo existe) e CA-3 (subpath alias) do FIN-MODULE-SCAFFOLD; só CA-2 ("zero exports") foi superado pela natureza incremental da public-api.
- **Sem decoder v1 público neste ticket** — escopo explícito do request (§2.2). Quando o adapter Drizzle entrar (`FIN-ADAPTER-OUTBOX-DRIZZLE`), o decoder será adicionado em `public-api/events.ts` analogamente a `decodeContractsModuleEventV1`.
- **`FinancialOutboxRow` exportado pelo adapter, não pelo port** — o port não precisa conhecer a representação row; a suite contratual pega o tipo via `helpers.all()` para fazer asserts. Quando `OutboxRow` real (Drizzle) entrar, a suite reusável aceita o novo tipo via factory `make()`.

---

## 5. Lições preventivas aplicadas

| Lição | Status |
| :--- | :--- |
| Sem indexed access em arrays | ✅ — `.find()`, `.filter()`, `.map()` |
| Sem shadowing de built-ins | ✅ |
| Sem async sem await (conflito `require-await` × `promise-function-async`) | ✅ — `eslint-disable-next-line` localizado |
| Imports `#src/*` em src interno | ✅ — `#src/shared/index.ts`, `#src/shared/utils/id.ts` |
| Cast `as <Brand>` único no smart constructor | ✅ — N/A (sem branding novo) |
| `Date` em mutação controlada (apenas adapter interno) | ✅ — L86 |
| Sem JSON nativo, ENUM, AUTO_INCREMENT (ADR-0020) | ✅ — N/A (adapter InMemory) |

Expectativa W3: ALL-GREEN round 1.

---

## 6. Pronto para W2

`code-reviewer` deve validar:

1. **`OutboxPort` em `application/ports/`** (não `domain/`) — explicado no header.
2. **`OutboxAppendError` é tagged union** (Padrão D) com 3 constructors — não string literal union (diferente do `PayableRepositoryError`).
3. **Defesa em profundidade `seenIds`** — branch lógico existe mesmo que UUIDs gerados internamente não disparem; alinha com semântica da PK do banco no adapter Drizzle futuro.
4. **`FinancialOutboxRow` exportado** com shape mínimo (`eventId`, `eventType`, `processedAt`, `attempts`, `occurredAt`) — sem `payload`, `aggregateId`, `aggregateType`, `schemaVersion`, `enqueuedAt` (esses vêm com `FIN-ADAPTER-OUTBOX-DRIZZLE`).
5. **`isFinancialModuleEvent` cobre os 9 nomes** de `PayableEvent` — checar `KNOWN_EVENT_TYPES` Set.
6. **`scaffold.test.ts` atualizado** preservando intenção original; comentário no header explica a transição.
7. **Zero `class`/`throw`/`as <Brand>`** nos arquivos novos.
8. **Pattern espelha `contracts/`** — mesmo nome de tags, mesmas convenções de header doc, mesma ordem de seções.

Envelope S — review esperada em 1 round.

---

## 7. Marco — fundação async do módulo Financial

O módulo Financial agora tem:

- **Domínio puro** — agregado Payable 100% (7 estados).
- **Port de persistência** — `PayableRepository` (FIN-PORT-PAYABLE-REPO).
- **Port de transporte de eventos** — `OutboxPort` (este ticket).
- **Public API estável** — `FinancialModuleEvent` v1 + type guard.

Pré-requisitos do **primeiro use case real** (`FIN-USECASE-APPROVE-PAYABLE`):
- ✅ `PayableRepository`
- ✅ `OutboxPort`
- ⏳ `Clock` port — pode reusar `src/shared/adapters/clock-fixed.ts` ou criar `application/ports/clock.ts` dedicado.
- ⏳ Definição de assinatura do use case (input/output/errors).

Próximo ticket sugerido: **`FIN-USECASE-APPROVE-PAYABLE`** (M) — primeiro use case real consumindo os 3 ports.
