# FIN-PORT-OUTBOX — Port `OutboxPort` + adapter InMemory + `FinancialModuleEvent` v1

> **Size:** S · **Tipo:** Port + Adapter InMemory + Public-API event union
> **Sucessor de:** [`FIN-PORT-PAYABLE-REPO`](../FIN-PORT-PAYABLE-REPO/) (primeiro port do módulo Financial)
> **Bloqueia:** `FIN-USECASE-APPROVE-PAYABLE` (primeiro use case precisa de `OutboxPort` + `EventBus` + `Clock`)
> **Referência:** [`src/modules/contracts/application/ports/outbox.ts`](../../../src/modules/contracts/application/ports/outbox.ts) e [`src/modules/contracts/public-api/events.ts`](../../../src/modules/contracts/public-api/events.ts) — pattern canônico do contracts a replicar para o financial.

---

## 1. Motivação

O módulo Financial entrou na **camada Application** com `FIN-PORT-PAYABLE-REPO`. Para o primeiro use case real (`FIN-USECASE-APPROVE-PAYABLE`) precisamos publicar `PayableApproved` cross-module via outbox (ADR-0015 — Outbox MySQL).

Este ticket entrega o **port + adapter InMemory + public-api event union v1**, replicando o pattern já consolidado em `contracts/`. Schema MySQL, mapper Drizzle e worker ficam para tickets dedicados (`FIN-ADAPTER-OUTBOX-DRIZZLE`, `FIN-WORKER-OUTBOX`).

**Escopo é S** — apenas a fundação. O port define a superfície técnica de transporte de eventos; quem cria o **decoder versionado v1** público é o ticket Drizzle (que traz `OutboxRow`).

---

## 2. Decisões arquiteturais

### 2.1. Posicionamento — `application/ports/` vs `domain/`

`OutboxPort` vai em **`src/modules/financial/application/ports/outbox.ts`** (não em `domain/`), diferente de `PayableRepository` que ficou em `domain/payable/repository.ts`.

**Por quê:** o `PayableRepository` enforce a invariante R2 (Anti-Duplicidade FITID), que é regra de domínio — o port carrega `payable-fitid-duplicate` no error union. Já o `OutboxPort` é puramente técnico (transporte de eventos para publicação async), sem invariante de domínio do agregado. Isso casa com a divisão do contracts: `ContractRepository` em `domain/`, `OutboxPort` em `application/ports/`.

### 2.2. `FinancialModuleEvent` v1 — union estável

Em `src/modules/financial/public-api/events.ts`:

```ts
export const FINANCIAL_SCHEMA_VERSION = 1 as const;
export type FinancialModuleEvent = PayableEvent;  // single agregado por enquanto
export const isFinancialModuleEvent = (u: unknown): u is FinancialModuleEvent => ...
```

Sem decoder v1 neste ticket — ele depende de `OutboxRow` (schema MySQL), que vem em `FIN-ADAPTER-OUTBOX-DRIZZLE`. O `isFinancialModuleEvent` type guard, sim, é entregue agora (borda externa: webhook, HTTP handler futuros).

### 2.3. Adapter InMemory enxuto

Escopo do `InMemoryOutbox` deste ticket: apenas `port.append` + helpers de inspeção/teste (`all`, `pending`, `markProcessedSync`, `clear`). **Sem worker helpers** (`findPendingForUpdate`, `markFailed`, `moveToDeadLetter`) — esses vêm com `FIN-WORKER-OUTBOX` junto do schema e do mapper.

### 2.4. Suite reusável `.contract.ts`

`tests/modules/financial/application/ports/outbox.contract.ts` exporta `runOutboxContract(label, factory)` para ser reutilizada pelo adapter Drizzle futuro. **NÃO descoberta pelo runner** (sufixo `.contract.ts` — convenção do projeto, ver `.claude/rules/testing.md`).

---

## 3. Critérios de Aceitação (CAs)

### 3.1. Port (`application/ports/outbox.ts`)

- **CA-1:** Export `OutboxAppendError` é union de **3 tagged errors** (Padrão D do handbook):
  - `OutboxAppendUnavailable` — sem payload
  - `OutboxAppendSerializationFailed` — `{ eventType: string; reason: string }`
  - `OutboxAppendDuplicateEventId` — `{ eventId: string }`
- **CA-2:** Exports os 3 case constructors correspondentes (`outboxAppendUnavailable`, `outboxAppendSerializationFailed`, `outboxAppendDuplicateEventId`).
- **CA-3:** `OutboxPort` é `Readonly<{ append: (events: readonly FinancialModuleEvent[]) => Promise<Result<void, OutboxAppendError>> }>`.
- **CA-4:** Header doc cita ADR-0015 (Outbox MySQL) + intenção de adapter Drizzle futuro.

### 3.2. Public-API (`public-api/events.ts`)

- **CA-5:** Export `FINANCIAL_SCHEMA_VERSION = 1 as const`.
- **CA-6:** Export `FinancialModuleEvent = PayableEvent` (re-export do union do domínio).
- **CA-7:** Export `isFinancialModuleEvent(u: unknown): u is FinancialModuleEvent` — type guard valida `typeof === 'object'`, `type` string e dentro do `KNOWN_EVENT_TYPES` (Set com os 9 nomes do `PayableEvent`).
- **CA-8:** `public-api/index.ts` re-exporta tudo de `./events.ts`.

### 3.3. Adapter InMemory (`adapters/outbox/outbox.in-memory.ts`)

- **CA-9:** Factory `InMemoryOutbox()` retorna `{ port, all, pending, markProcessedSync, clear }`.
- **CA-10:** `port.append([])` é no-op — retorna `ok(undefined)` e não altera o estado interno.
- **CA-11:** `port.append([event])` registra **1 row** com `processedAt: null` e `attempts: 0`.
- **CA-12:** `port.append([e1, e2])` registra **2 rows** preservando ordem de chegada.
- **CA-13:** `pending()` retorna apenas rows com `processedAt === null`.
- **CA-14:** `markProcessedSync(eventId)` move a row de `pending` para `processed` (setando `processedAt: new Date()`).
- **CA-15:** `clear()` esvazia rows e o set de `seenIds`.
- **CA-16:** Detecção de eventId duplicado via `Set<string>` — branch lógico coberto (mesmo que via `append` direto o caso real seja raro, o teste valida o ramo de erro).

### 3.4. Suite reusável (`tests/.../application/ports/outbox.contract.ts`)

- **CA-17:** Arquivo exporta `runOutboxContract(label: string, factory: OutboxFactory): void` que recebe um `factory.make() => Promise<{ port, helpers }>` e roda os cenários CA-10..14 dentro de `describe('OutboxPort contract — ${label}')`.
- **CA-18:** Suite **não é descoberta** pelo runner (sufixo `.contract.ts`, runner só pega `*.test.ts`).
- **CA-19:** Test do InMemory (`outbox.in-memory.test.ts`) consome a suite + shape test (`exporta append` no port, `exporta 4 helpers de inspeção`).

### 3.5. Quality Gate (W3)

- **CA-20:** `pnpm run typecheck` exit 0.
- **CA-21:** `pnpm run format:check` exit 0.
- **CA-22:** `pnpm run lint` exit 0.
- **CA-23:** `pnpm test` exit 0, baseline +N testes novos (esperado **+9 a +12**), zero regressão.

---

## 4. Estrutura de arquivos esperada

```
src/modules/financial/
├── application/                        ← NOVO (primeira pasta da camada)
│   └── ports/
│       └── outbox.ts                   ← NOVO (~60 linhas)
├── adapters/
│   └── outbox/                         ← NOVO
│       └── outbox.in-memory.ts         ← NOVO (~80 linhas)
└── public-api/
    ├── events.ts                       ← NOVO (~40 linhas)
    └── index.ts                        ← MODIFICADO (export * from './events.ts')

tests/modules/financial/
├── application/                        ← NOVO
│   └── ports/
│       └── outbox.contract.ts          ← NOVO suite reusável (~120 linhas, NÃO descoberta)
└── adapters/
    └── outbox/                         ← NOVO
        └── outbox.in-memory.test.ts    ← NOVO (~50 linhas, consome suite)
```

**Total estimado:** ~350 linhas (200 src + 150 test). Envelope S.

---

## 5. Fora do escopo (próximos tickets)

| Item | Ticket sugerido |
| :--- | :--- |
| Schema MySQL `fin_outbox` + `fin_outbox_dead_letter` (ADR-0014/0015) | `FIN-ADAPTER-OUTBOX-SCHEMA` |
| Mapper `eventToOutboxInsert` / `outboxRowToEvent` + decoder v1 público | `FIN-ADAPTER-OUTBOX-DRIZZLE` |
| `findPendingForUpdate` / `markFailed` / `moveToDeadLetter` no InMemory + Drizzle | junto de `FIN-WORKER-OUTBOX` |
| Worker (`outbox-worker.ts`) com retry + backoff + DLQ + EventBus dispatch | `FIN-WORKER-OUTBOX` |
| CLI `pnpm run cli:financial -- run-outbox-worker` | `FIN-CLI-RUN-OUTBOX-WORKER` |

---

## 6. Regras invariantes aplicáveis

- `.claude/rules/application.md` — ports são `type`, factory functions, sequência canônica.
- `.claude/rules/adapters.md` — InMemory primeiro, `try/catch → Result` na borda.
- `.claude/rules/testing.md` — `.contract.ts` exporta função `(factory) => void`.
- ADR-0006 — public-api é o único entry point cross-module.
- ADR-0015 — Outbox pattern para eventos.

---

## 7. Riscos / pontos de atenção (para W2)

1. **`isFinancialModuleEvent` precisa listar os 9 nomes do `PayableEvent` no `KNOWN_EVENT_TYPES`.** Se um novo agregado entrar (ex.: `FiscalDocument`), o set precisa ser atualizado — adicionar comentário marcador no arquivo.
2. **Diferença de posicionamento do port** vs `PayableRepository` precisa ser explicada no header doc para o reviewer não estranhar (`application/ports/` aqui, `domain/` lá).
3. **CA-16 (duplicate via append direto)** é um branch raro — vale documentar no teste por que o teste passa via `seenIds.has()` mesmo quando o `eventId` é gerado pelo adapter (vai vir da row interna do InMemory).
