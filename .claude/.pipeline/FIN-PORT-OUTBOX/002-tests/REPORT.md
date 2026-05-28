# W0 — Testes RED (FIN-PORT-OUTBOX)

> **Wave:** W0 · **Outcome:** RED · **Agent:** `tdd-strategist` (skill)
> **Predecessor:** [`../000-request.md`](../000-request.md)
> **Artefatos criados (2):**
>
> - `tests/modules/financial/application/ports/outbox.contract.ts` — suite contratual reusável (NÃO descoberta pelo runner — sufixo `.contract.ts`)
> - `tests/modules/financial/adapters/outbox/outbox.in-memory.test.ts` — test runner (shape + suite + específicos InMemory)

---

## 1. Estratégia de teste

Espelha pattern de `tests/modules/contracts/adapters/outbox/outbox.in-memory.test.ts` + `tests/modules/contracts/application/ports/outbox.contract.ts`:

- **`.contract.ts` (comportamental)** — função `runOutboxContract(label, factory)` que **qualquer adapter** consome (InMemory agora, Drizzle/MySQL no `FIN-ADAPTER-OUTBOX-DRIZZLE`).
- **`.test.ts` (runner)** — único arquivo descoberto pelo runner (`**/*.test.ts`); invoca a suite + shape test (CA-9) + específicos do InMemory (CA-15 clear, CA-16 duplicate branch).

Convenção `.claude/rules/testing.md` validada: `.contract.ts` exporta função (não executa sozinho). Mesma factory contract será consumida pelo adapter Drizzle futuro com `make()` async real (transação + cleanup).

---

## 2. Cobertura de CAs

| Arquivo | Testes (it's) | CAs |
| :--- | ---: | :--- |
| `outbox.contract.ts` (função reusável) | 6 | CA-10, CA-11, CA-12, CA-13, CA-14 + shape mínimo |
| `outbox.in-memory.test.ts` (runner) | 3 | CA-9 (shape factory), CA-15 (clear), CA-16 (duplicate branch documentado) |
| **Total descoberto via runner** | **9** | CA-9..16 (8 CAs + shape) |

CAs **não cobertos por testes runtime W0** (validados em outras waves):

| CA | Onde valida |
| :--- | :--- |
| CA-1..4 (port shape, error union, constructors, doc) | type-level via `pnpm run typecheck` em W3; review estrutural em W2 |
| CA-5..8 (public-api events, type guard, schema version, barrel) | type-level via `pnpm run typecheck`; review em W2 |
| CA-17 (suite exporta função) | inerente — `runOutboxContract` é `export const` |
| CA-18 (`.contract.ts` não descoberta) | inerente — runner config só pega `*.test.ts`; W3 confirma com diff de fail count |
| CA-19 (runner consome suite) | já feito — `outbox.in-memory.test.ts` chama `runOutboxContract('InMemory', ...)` |
| CA-20..23 (typecheck/format/lint/test) | W3 |

### 2.1. Detalhes da suite comportamental (6 it's)

| Cenário | Cobre |
| :--- | :--- |
| `append([])` é no-op e retorna `ok(undefined)` | CA-10 |
| `append([evt])` registra 1 row com `processedAt: null` e `attempts: 0` | CA-11 |
| `append([e1, e2])` registra 2 rows preservando ordem (PayableOpened → PayableMarkedOverdue) | CA-12 |
| `pending()` retorna apenas rows com `processedAt === null` (após `markProcessed` em 1 de 2 rows, `pending().length === 1`) | CA-13 |
| `markProcessedSync(eventId)` move row de pending → processed (`processedAt` vira `Date`, `pending().length === 0`) | CA-14 |
| Shape mínimo: row tem `eventId: string`, `eventType: string`, `processedAt: Date \| null`, `attempts: number`, `occurredAt: Date` | shape |

### 2.2. Específicos do runner InMemory (3 it's)

| Cenário | Cobre |
| :--- | :--- |
| Factory expõe `port.append` + 4 helpers (`all`, `pending`, `markProcessedSync`, `clear`) | CA-9 |
| `clear()` esvazia `all()`, `pending()` e o `seenIds` interno | CA-15 |
| Dois `append` do MESMO event object geram **2 rows com eventIds distintos** (UUID por append) — documenta semântica de `seenIds` como defesa em profundidade alinhada com PK do banco no adapter Drizzle futuro | CA-16 |

---

## 3. Fixtures

Usa eventos mínimos do `PayableEvent` (sem dependência de UserRef/RemittanceId/FITID):

```ts
const makePayableOpenedEvent = (): FinancialModuleEvent => ({
  type: 'PayableOpened',
  payableId: PayableId.generate(),
  occurredAt: new Date('2026-01-15T10:00:00.000Z'),
});

const makePayableMarkedOverdueEvent = (): FinancialModuleEvent => ({
  type: 'PayableMarkedOverdue',
  payableId: PayableId.generate(),
  occurredAt: new Date('2026-01-16T10:00:00.000Z'),
});
```

Datas fixas (sem `new Date()` no fixture global) — DO B§14. `PayableId.generate()` é o único gerador não-determinístico.

---

## 4. Saída RED

### 4.1. Arquivo isolado

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/financial/adapters/outbox/outbox.in-memory.test.ts
```

```
Error [ERR_MODULE_NOT_FOUND]:
  Cannot find module '.../src/modules/financial/adapters/outbox/outbox.in-memory.ts'
  imported from '.../tests/modules/financial/adapters/outbox/outbox.in-memory.test.ts'

ℹ tests 1  pass 0  fail 1  duration_ms 81
```

Top-level import falha — adapter (e port, e public-api/events) ainda não existem.

### 4.2. Suite global — delta vs baseline

| Métrica | Baseline (W3 FIN-PORT-PAYABLE-REPO) | W0 deste ticket | Delta |
| :--- | ---: | ---: | ---: |
| tests | 1078 | 1079 | **+1** (file-load fail sintético) |
| pass | 1062 | 1062 | 0 |
| fail | 0 | **1** | **+1** |
| skipped | 16 | 16 | 0 |

**Falha única, causa única, zero regressão.** Os 1062 testes que passavam continuam passando.

---

## 5. Diagnóstico RED — checklist

| Aspecto | OK? | Nota |
| :--- | :--- | :--- |
| Causa única (uma única `ERR_MODULE_NOT_FOUND`) | ✅ | Resolução do adapter falha; resto da suite intacto |
| Falha por inexistência da API (não por assert) | ✅ | Top-level import quebra antes do runner descobrir os 9 it's |
| Suite reusável independente de adapter | ✅ | `runOutboxContract(label, factory)` aceita qualquer factory |
| `.contract.ts` apenas export de função | ✅ | Sem top-level execute; runner não descobre |
| Fixtures sem `new Date()` global, datas fixas | ✅ | DO B§14 |
| Imports via `#src/*` subpath | ✅ | 3 imports do financial via `#src/`; 1 relativo entre tests (`../../application/ports/outbox.contract.ts`) |
| Sem `class`, `throw`, `as any`, `default: throw` | ✅ | |
| Tipos `FinancialOutboxRow` / `OutboxPort` / `FinancialModuleEvent` referenciados como `import type` | ✅ | Verbatim module syntax compatível |

---

## 6. Lista pronta para W1

Implementer deve criar **4 arquivos** em `src/modules/financial/` (+ 1 modificado):

### 6.1. `application/ports/outbox.ts` (NOVO — ~60 linhas)

```ts
import type { Result } from '#src/shared/index.ts';
import type { FinancialModuleEvent } from '../../public-api/events.ts';

// ─── Tagged errors (Padrão D) ───────────────────
export type OutboxAppendUnavailable = Readonly<{ tag: 'OutboxAppendUnavailable' }>;
export type OutboxAppendSerializationFailed = Readonly<{
  tag: 'OutboxAppendSerializationFailed';
  eventType: string;
  reason: string;
}>;
export type OutboxAppendDuplicateEventId = Readonly<{
  tag: 'OutboxAppendDuplicateEventId';
  eventId: string;
}>;
export type OutboxAppendError =
  | OutboxAppendUnavailable
  | OutboxAppendSerializationFailed
  | OutboxAppendDuplicateEventId;

// constructors (3)
export const outboxAppendUnavailable = (): OutboxAppendUnavailable => ({ tag: 'OutboxAppendUnavailable' });
export const outboxAppendSerializationFailed = (eventType: string, reason: string): OutboxAppendSerializationFailed =>
  ({ tag: 'OutboxAppendSerializationFailed', eventType, reason });
export const outboxAppendDuplicateEventId = (eventId: string): OutboxAppendDuplicateEventId =>
  ({ tag: 'OutboxAppendDuplicateEventId', eventId });

// Port
export type OutboxPort = Readonly<{
  append: (events: readonly FinancialModuleEvent[]) => Promise<Result<void, OutboxAppendError>>;
}>;
```

### 6.2. `public-api/events.ts` (NOVO — ~40 linhas)

```ts
import type { PayableEvent } from '../domain/payable/events.ts';

export const FINANCIAL_SCHEMA_VERSION = 1 as const;
export type FinancialModuleEvent = PayableEvent;

const KNOWN_EVENT_TYPES: ReadonlySet<string> = new Set([
  'PayableOpened',
  'PayableApproved',
  'PayableTransmitted',
  'PayableRejected',
  'PayableMarkedOverdue',
  'PayableResetToApproved',
  'PayablePaidManually',
  'PayableBankOutflowConfirmed',
  'PayableSettled',
]);

export const isFinancialModuleEvent = (u: unknown): u is FinancialModuleEvent => {
  if (typeof u !== 'object' || u === null) return false;
  const c = u as { type?: unknown };
  if (typeof c.type !== 'string') return false;
  return KNOWN_EVENT_TYPES.has(c.type);
};
```

### 6.3. `public-api/index.ts` (MODIFICADO)

Substituir `export {};` por:

```ts
export * from './events.ts';
```

### 6.4. `adapters/outbox/outbox.in-memory.ts` (NOVO — ~80 linhas)

```ts
import { ok, err } from '#src/shared/index.ts';
import type { Result } from '#src/shared/index.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import type { OutboxPort } from '../../application/ports/outbox.ts';
import { outboxAppendDuplicateEventId } from '../../application/ports/outbox.ts';
import type { FinancialModuleEvent } from '../../public-api/events.ts';

// Row interna — shape mínimo (mapper completo virá em FIN-ADAPTER-OUTBOX-DRIZZLE)
export type FinancialOutboxRow = Readonly<{
  eventId: string;
  eventType: string;
  processedAt: Date | null;
  attempts: number;
  occurredAt: Date;
}>;

export const InMemoryOutbox = (): {
  port: OutboxPort;
  all: () => readonly FinancialOutboxRow[];
  pending: () => readonly FinancialOutboxRow[];
  markProcessedSync: (eventId: string) => void;
  clear: () => void;
} => {
  const rows: FinancialOutboxRow[] = [];
  const seenIds = new Set<string>();

  const port: OutboxPort = {
    // eslint-disable-next-line @typescript-eslint/require-await
    append: async (events) => {
      if (events.length === 0) return ok(undefined);

      const inserts = events.map((e) => ({
        eventId: newUuid(),
        eventType: e.type,
        processedAt: null as Date | null,
        attempts: 0,
        occurredAt: e.occurredAt,
      }));

      for (const insert of inserts) {
        if (seenIds.has(insert.eventId)) {
          return err(outboxAppendDuplicateEventId(insert.eventId));
        }
      }

      for (const insert of inserts) {
        seenIds.add(insert.eventId);
        rows.push(insert);
      }

      return ok(undefined);
    },
  };

  const markProcessedSync = (eventId: string): void => {
    const row = rows.find((r) => r.eventId === eventId);
    if (row?.processedAt === null) {
      (row as { processedAt: Date | null }).processedAt = new Date();
    }
  };

  return {
    port,
    all: () => rows as readonly FinancialOutboxRow[],
    pending: () => rows.filter((r) => r.processedAt === null) as readonly FinancialOutboxRow[],
    markProcessedSync,
    clear: () => {
      rows.length = 0;
      seenIds.clear();
    },
  };
};
```

Esperar **`tests 1087 pass 1071 fail 0 skipped 16`** após W1 (+9 testes do ticket).

---

## 7. Lições preventivas aplicadas

| Lição | Status |
| :--- | :--- |
| Sem indexed access — só `rows[0]` direto com guard `assert.ok(... !== undefined)` | ✅ |
| Sem shadowing de built-ins | ✅ |
| Sem async sem await em ESLint — usar `// eslint-disable-next-line @typescript-eslint/require-await` no `make` (factory síncrona em Promise wrapper) | ✅ (mesma técnica do `FIN-PORT-PAYABLE-REPO`) |
| Imports `#src/*` subpath em src referenciado pelos tests | ✅ |
| `.contract.ts` exporta função (não roda standalone) | ✅ |
| Fixtures `new Date(literal)` em vez de `new Date()` | ✅ |
| Datas distintas para preservar ordem em `append([e1, e2])` | ✅ (15/16 jan 2026) |

---

## 8. Pronto para W1

Sequência sugerida para o implementer:

1. **Primeiro** — `public-api/events.ts` (sem dependências fora de `PayableEvent`).
2. **Depois** — `application/ports/outbox.ts` (depende de `FinancialModuleEvent`).
3. **Depois** — `adapters/outbox/outbox.in-memory.ts` (depende de port + public-api).
4. **Por último** — atualizar `public-api/index.ts` para re-exportar `./events.ts`.
5. Rodar `pnpm test` — esperar 1087/1071/0/16 (delta +9 em tests e pass).

Envelope S — implementação esperada em 1 round.
