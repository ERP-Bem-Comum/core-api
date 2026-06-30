# W0 — Testes RED (FIN-USECASE-APPROVE-PAYABLE)

> **Wave:** W0 · **Outcome:** RED · **Agent:** `tdd-strategist` (skill)
> **Predecessor:** [`../000-request.md`](../000-request.md)
> **Artefatos:** 1 arquivo novo + 2 modificados

| # | Arquivo | Linhas | Status |
| :--- | :--- | ---: | :--- |
| 1 | `tests/modules/financial/application/use-cases/approve-payable.test.ts` | 233 | NOVO |
| 2 | `tests/modules/financial/adapters/persistence/payable-repository.suite.ts` | 319 | MODIFICADO (+1 import, +1 type, +13 chamadas `.save(p,[])`, +1 it CA-14) |
| 3 | `tests/modules/financial/adapters/persistence/payable-repository.in-memory.test.ts` | 47 | MODIFICADO (factory injeta `InMemoryOutbox`) |

---

## 1. Estratégia de teste

### 1.1. Migração defensiva da suite

A mudança de assinatura `repo.save(payable, events)` afeta **13 chamadas** na suite reusável. Todas migradas para `repo.save(payable, [])` (eventos vazios — testes da suite não inspecionam outbox, exceto o novo CA-14).

A factory `PayableRepoFactory` foi expandida para devolver `outboxHelpers: { all, pending }` — adapter Drizzle futuro também precisará expor isso na sua factory (consumindo a mesma suite).

### 1.2. Novo teste de outbox propagation na suite (CA-14)

Adicionado ao final do `describe('PayableRepository contract — ${label}')`. Valida o **contrato D2 do ADR-0015**: `save(p, [event])` enfileira no outbox de forma observável via `outboxHelpers.all()`. Ataques que o adapter Drizzle real terá:

- Persiste row em `fin_payables` AND insere row em `fin_outbox` na MESMA transação.
- Suite InMemory simula com `outbox.append(events)` chamado dentro do `save`.

### 1.3. Test runner do InMemory ajustado

Factory cria `outbox = InMemoryOutbox()`, passa `outbox.port` ao `InMemoryPayableRepository(outbox.port)` (que ainda não aceita parâmetro — daí o TS error em RED), e devolve `outboxHelpers: { all: outbox.all, pending: outbox.pending }`.

### 1.4. Test file do use case com 7 it's

Cada `it` tem seu próprio `describe` (uma seção por CA) — facilita filtragem via `--test-name-pattern="CA-21"`. Fixtures inline reusam `Payable.open` (agregado real) e `ClockFixed` — sem mocks, sem objetos literais inventados.

---

## 2. Cobertura de CAs

### 2.1. Suite reusável (`payable-repository.suite.ts`)

| CA | Cenário | Cobertura |
| :--- | :--- | :--- |
| CA-9 (migração) | Todas as chamadas `.save(p)` viraram `.save(p, [])` (13 ocorrências) | ✅ |
| CA-10 (novo teste) | `save(p, [event])` propaga para outbox injetado — row tem `eventType='PayableOpened'`, `processedAt=null`, `attempts=0` | ✅ |

### 2.2. Test do use case (`approve-payable.test.ts`)

| CA | Cenário | Asserts principais |
| :--- | :--- | :--- |
| CA-19 (happy) | Open → Approved | `payable.status === 'Approved'`, `event.type === 'PayableApproved'`, `payable.id === open.id` |
| CA-20 (outbox) | Evento enfileirado via `repo.save` | `outbox.all().length === 1`, `row.eventType === 'PayableApproved'`, `row.processedAt === null` |
| CA-21 (invalid id) | `payableId: 'not-a-uuid'` | `err('approve-payable-invalid-id')` |
| CA-22 (not-found) | UUID válido sem payable persistido | `err('approve-payable-not-found')` + `outbox.all().length === 0` |
| CA-23 (invalid userRef) | `approvedByRaw: 'not-a-uuid'` | propaga `'user-ref-invalid'` |
| CA-24 (não-Open) | seed Approved + try approve | `err.tag === 'PayableNotOpen'`, `err.currentStatus === 'Approved'` |
| CA-25 (data anterior) | clock retorna 1 dia ANTES de openedAt | `err.tag === 'PayableApprovalDateBeforeOpenedAt'` |

CAs não cobertos por testes runtime do W0 (validados em outras waves):

| CA | Onde valida |
| :--- | :--- |
| CA-1..4 (refactor port — assinatura, error union, JSDoc) | type-level via `pnpm run typecheck` em W3; review em W2 |
| CA-5..8 (refactor adapter InMemory) | runtime via CA-14 da suite + CA-20 do use case |
| CA-11..18 (estrutura do use case, sequência canônica, header doc) | type-level + review em W2 |
| CA-26 (fixture reusada) | aplicado — `buildOpenPayable` inline reusa `Payable.open` real |
| CA-27..30 (typecheck/format/lint/test) | W3 |

---

## 3. Fixtures

### 3.1. Builders inline (não compartilhados)

- `buildBeneficiary()` — `BeneficiaryBankData.fromRaw` com CPF `11144477735` (DV válido).
- `buildMoney(cents = 15050)` — `Money.fromCents`.
- `buildOpenPayable(overrides?)` — `Payable.open` com defaults determinísticos; aceita `{ openedAt }` para CA-25.
- `buildApprovedPayable()` — chain `Payable.open → Payable.approve` para CA-24.

### 3.2. Helper `makeWorld(clockAt)`

Centraliza setup do mundo de teste:

```ts
const makeWorld = (clockAt: Date) => {
  const outbox = InMemoryOutbox();
  const handle = InMemoryPayableRepository(outbox.port);
  const clock = ClockFixed(clockAt);
  const useCase = approvePayable({ payableRepo: handle.repo, clock });
  return { outbox, handle, clock, useCase };
};
```

Cada `it` chama `makeWorld(date)` no início — isolamento total entre testes.

### 3.3. Datas determinísticas

- `openedAt`: `2026-05-20T00:00:00Z` (default) ou customizado via overrides.
- `clockAt` no happy path: `2026-05-25T10:00:00Z` (5 dias após openedAt — invariante temporal OK).
- `clockAt` no CA-25: `2026-05-24T10:00:00Z` com `openedAt = 2026-05-25T10:00Z` (1 dia ANTES — viola D23 `payableApprovalDateBeforeOpenedAt`).

---

## 4. Saída RED

### 4.1. TypeScript (`pnpm run typecheck`) — **20 erros**

```
tests/modules/financial/adapters/persistence/payable-repository.in-memory.test.ts(30,46):
  error TS2554: Expected 0 arguments, but got 1.
    → InMemoryPayableRepository(outbox.port) ainda não aceita parâmetro

tests/modules/financial/adapters/persistence/payable-repository.suite.ts(179,42):
  error TS2554: Expected 1 arguments, but got 2.
    → repo.save(p, []) — port ainda só aceita 1 arg
    (+11 erros idênticos em outras chamadas)

tests/modules/financial/application/use-cases/approve-payable.test.ts(37,32):
  error TS2307: Cannot find module '#src/modules/financial/application/use-cases/approve-payable.ts'
    → use case ainda não existe

tests/modules/financial/application/use-cases/approve-payable.test.ts(95,44):
  error TS2554: Expected 0 arguments, but got 1.
    → InMemoryPayableRepository(outbox.port) idem
    (+5 erros para repo.save(p, []) no test do use case)
```

### 4.2. Runtime (`pnpm test`)

| Métrica | Baseline (W3 FIN-PORT-OUTBOX) | W0 deste ticket | Delta |
| :--- | ---: | ---: | ---: |
| tests | 1087 | 1089 | **+2** (1 it CA-14 novo + 1 file-load fail sintético) |
| pass | 1071 | 1071 | 0 |
| fail | 0 | **2** | **+2** |
| skipped | 16 | 16 | 0 |

Falhas runtime:

1. **`CA-14: save(p, [event]) propaga evento para o outbox injetado`** — `AssertionError 0 !== 1` (adapter atual ignora 2º arg silenciosamente em runtime, mesmo com TS error).
2. **`tests/modules/financial/application/use-cases/approve-payable.test.ts`** — `ERR_MODULE_NOT_FOUND` resolvendo `src/modules/financial/application/use-cases/approve-payable.ts`.

**Zero regressão** nos 1071 testes pré-existentes.

---

## 5. Diagnóstico RED — checklist

| Aspecto | OK? | Nota |
| :--- | :--- | :--- |
| Causa primária por inexistência (não por assert) | ✅ | TS2307 (use case ausente) + TS2554 (assinaturas antigas) |
| Suite reusável independente de adapter | ✅ | `runPayableRepositoryContract(label, factory)` agora aceita `outboxHelpers` na factory |
| Novo teste CA-14 valida contrato D2 ADR-0015 | ✅ | qualquer adapter (InMemory ou Drizzle futuro) é validado pelo MESMO teste |
| Fixtures usam agregado real | ✅ | `Payable.open` + `Payable.approve` — bugs em transições quebram fixture cedo |
| Datas determinísticas (sem `new Date()` global) | ✅ | `D(iso)` helper + `ClockFixed` |
| Sem `class`, `throw`, `as any`, `default: throw` | ✅ | |
| Imports `#src/*` subpath | ✅ | 100% nos imports de produção |
| `import type` separado de runtime | ✅ | `OpenPayable`/`ApprovedPayable` via `import type` |

---

## 6. Lista pronta para W1

Implementer deve fazer **3 mudanças em src/** (1 modificação no port, 1 modificação no adapter, 1 arquivo novo):

### 6.1. `src/modules/financial/domain/payable/repository.ts` (MODIFICADO)

Mudanças:
1. Importar `OutboxAppendError` do port outbox + `FinancialModuleEvent` do public-api.
2. Expandir `PayableRepositoryError` union: `'payable-repo-unavailable' | 'payable-repo-conflict' | 'payable-fitid-duplicate' | OutboxAppendError`.
3. Mudar assinatura: `save: (payable: Payable, events: readonly FinancialModuleEvent[]) => Promise<Result<void, PayableRepositoryError>>`.
4. JSDoc do `save` cita ADR-0015 + atomicidade state+outbox.

### 6.2. `src/modules/financial/adapters/persistence/repos/payable-repository.in-memory.ts` (MODIFICADO)

Mudanças:
1. Importar `OutboxPort` + `InMemoryOutbox` + `FinancialModuleEvent`.
2. Factory aceita `outbox: OutboxPort = InMemoryOutbox().port` como parâmetro opcional.
3. `save(payable, events)`: após a lógica atual de upsert + R2 guard, se `events.length > 0`, chama `await outbox.append(events)` e propaga erro se ocorrer (`if (!r.ok) return err(r.error)`).
4. Preservar guard `payable-fitid-duplicate` ANTES do `outbox.append` (R2 vence outbox).

### 6.3. `src/modules/financial/application/use-cases/approve-payable.ts` (NOVO — ~85 linhas)

```ts
import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import { Payable } from '#src/modules/financial/domain/payable/payable.ts';
import type { ApprovedPayable } from '#src/modules/financial/domain/payable/types.ts';
import type { PayableEvent } from '#src/modules/financial/domain/payable/events.ts';
import type * as PayableError from '#src/modules/financial/domain/payable/errors.ts';
import type {
  PayableRepository,
  PayableRepositoryError,
} from '#src/modules/financial/domain/payable/repository.ts';

export type ApprovePayableCommand = Readonly<{
  payableId: string;
  approvedByRaw: string;
}>;

export type ApprovePayableError =
  | 'approve-payable-invalid-id'
  | 'approve-payable-not-found'
  | UserRef.UserRefError
  | PayableError.PayableError
  | PayableRepositoryError;

export type ApprovePayableOutput = Readonly<{
  payable: ApprovedPayable;
  event: PayableEvent;
}>;

type Deps = Readonly<{
  payableRepo: PayableRepository;
  clock: Clock;
}>;

export const approvePayable =
  (deps: Deps) =>
  async (
    cmd: ApprovePayableCommand,
  ): Promise<Result<ApprovePayableOutput, ApprovePayableError>> => {
    const idResult = PayableId.rehydrate(cmd.payableId);
    if (!idResult.ok) return err('approve-payable-invalid-id');

    const approverResult = UserRef.rehydrate(cmd.approvedByRaw);
    if (!approverResult.ok) return approverResult;

    const fetched = await deps.payableRepo.findById(idResult.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('approve-payable-not-found');

    const approvedAt = deps.clock.now();
    const transition = Payable.approve(fetched.value, approverResult.value, approvedAt);
    if (!transition.ok) return transition;

    const saveResult = await deps.payableRepo.save(transition.value.payable, [transition.value.event]);
    if (!saveResult.ok) return saveResult;

    return ok({
      payable: transition.value.payable,
      event: transition.value.event,
    });
  };
```

Esperar **`tests 1089 pass 1080 fail 0 skipped 16`** após W1 (+9 pass vs hoje, +0 vs +2 fail eliminados).

> Conta de 1089: 1087 (baseline) + 1 do CA-14 da suite + 7 do approve-payable.test.ts = 1095. Mas o ERR_MODULE_NOT_FOUND atual conta como 1 teste sintético (não os 7 it's), então a suite reporta 1089 até o file load funcionar. Após W1: o file load passa, os 7 it's são descobertos → 1095/1080/0/16 (delta real +8 vs baseline).

> Correção W1 esperada: **`tests ~1095 pass ~1080 fail 0 skipped 16`** (delta +8 vs baseline FIN-PORT-OUTBOX).

---

## 7. Lições preventivas aplicadas

| Lição | Status |
| :--- | :--- |
| Sem indexed access — `rows[0]` com guard `assert.ok(row !== undefined)` | ✅ |
| Sem shadowing de built-ins | ✅ |
| Sem async sem await — testes usam `await` real | ✅ |
| Imports `#src/*` subpath em todos os imports de produção | ✅ |
| `import type` separado de runtime | ✅ |
| Fixtures sem `new Date()` global, datas literais ISO | ✅ |
| `eslint-disable-next-line require-await` somente em factory async de adapter síncrono (mantido no runner do InMemory) | ✅ |
| Reuso de agregado real (`Payable.open`, `Payable.approve`) em vez de mocks | ✅ |

---

## 8. Pronto para W1

Sequência sugerida para o implementer:

1. **Primeiro** — `domain/payable/repository.ts` (refactor assinatura `save` + expansão de `PayableRepositoryError`).
2. **Depois** — `adapters/persistence/repos/payable-repository.in-memory.ts` (factory aceita outbox; save propaga events).
3. **Depois** — `application/use-cases/approve-payable.ts` (use case puro).
4. Rodar `pnpm test` — esperar ~1095/1080/0/16 (delta +8 vs baseline).
5. Rodar `pnpm run typecheck` — esperar zero erros.

Envelope **M** — implementação esperada em 1 round. Sem rejection W2 esperado dado que pattern espelha `contracts/` linha-por-linha.
