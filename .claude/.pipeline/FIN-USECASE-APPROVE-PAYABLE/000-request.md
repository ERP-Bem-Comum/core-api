# FIN-USECASE-APPROVE-PAYABLE — Primeiro use case real do módulo Financial

> **Size:** M · **Tipo:** Use case (Application) + refactor do `PayableRepository.save` para integração outbox-in-repo
> **Sucessor de:** [`FIN-PORT-OUTBOX`](../FIN-PORT-OUTBOX/) (entregou `OutboxPort` + InMemory + `FinancialModuleEvent` v1)
> **Bloqueia:** `FIN-CLI-APROVAR-TITULO` (primeiro comando real em `pnpm run cli:financial`)
> **Referência canônica:** [`src/modules/contracts/application/use-cases/create-contract.ts`](../../../src/modules/contracts/application/use-cases/create-contract.ts) + [`src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts`](../../../src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts) (pattern outbox-in-repo) + ticket histórico [`CTR-OUTBOX-INTEGRATION-IN-REPOS`](../CTR-OUTBOX-INTEGRATION-IN-REPOS/) (precedente do refactor).

---

## 1. Motivação

O módulo Financial tem agora os 3 ports necessários para o primeiro use case real:
- ✅ `PayableRepository` (FIN-PORT-PAYABLE-REPO)
- ✅ `OutboxPort` (FIN-PORT-OUTBOX)
- ✅ `Clock` — reutiliza `src/shared/ports/clock.ts` (compartilhado, ADR-0006 §"Kernel compartilhado")

`approvePayable` é a transição `Open → Approved` (R1 Soberania da Aprovação — `handbook/domain/04-titulos-liquidacao-context.md`). É invocada pelo aprovador autorizado para mover um título da fila de pendências para a fila de remessa bancária.

Este ticket também faz o **refactor de signature** do `PayableRepository.save(payable, events)` para receber eventos e persistir state+outbox atomicamente (ADR-0015) — replica CTR-OUTBOX-INTEGRATION-IN-REPOS. Fazer agora evita um futuro round de migração e mantém o pattern alinhado com `contracts/` desde o primeiro use case.

---

## 2. Decisões arquiteturais

### 2.1. `Clock` — reusar port compartilhado, NÃO criar `application/ports/clock.ts`

`src/shared/ports/clock.ts` já existe e é consumido por `contracts/application/use-cases/create-contract.ts`. Criar um port duplicado no `financial/` viola DRY e ADR-0006 §"Kernel compartilhado é compartilhado". Use case importa via `import type { Clock } from '#src/shared/ports/clock.ts'`. Testes usam `src/shared/adapters/clock-fixed.ts`.

### 2.2. Refactor `PayableRepository.save(payable, events)` — bundle, não split

O use case **deve** persistir state + outbox atomicamente (ADR-0015 D2). Isso exige que `repo.save` receba `readonly FinancialModuleEvent[]` como 2º argumento. Opções:

| Opção | Prós | Contras |
| :--- | :--- | :--- |
| **A — Bundle (escolhida):** refactor + use case juntos | Atomicidade ADR-0015 desde o primeiro use case; pattern alinhado com contracts | Ticket M em vez de S |
| B — Split: use case primeiro chamando `outbox.append` separado; refactor depois | Tickets menores | Violar ADR-0015 temporariamente; débito técnico imediato |

Escolhemos **A** pelo precedente CTR-OUTBOX-INTEGRATION-IN-REPOS e por evitar débito.

### 2.3. `InMemoryPayableRepository(outbox?: OutboxPort)` — outbox opcional com default isolado

Replica o factory de `InMemoryContractRepository` (`contract-repository.in-memory.ts:24-25`):

```ts
export const InMemoryPayableRepository = (
  outbox: OutboxPort = InMemoryOutbox().port,
): InMemoryPayableRepositoryHandle => { ... };
```

- **Default** = outbox novo isolado por instância — suite de persistência não precisa inspecionar eventos.
- **Caller** pode injetar o mesmo outbox usado pelo use case para inspecionar eventos via `all()`/`pending()` nos testes do use case.

### 2.4. `PayableRepositoryError` ganha `| OutboxAppendError`

Pattern de `ContractRepositoryError` (contract repository.ts:13-16): quando o adapter persiste state + outbox na mesma transação, uma falha de `outbox.append` é indistinguível de falha de `save` do ponto de vista do use case. Union expandido para acomodar.

### 2.5. Use case puro — sem EventBus dep

Replica `createContract` (CA-5+CA-6 do CTR-OUTBOX-INTEGRATION-IN-REPOS):
- Deps: `{ payableRepo: PayableRepository; clock: Clock }` — **SEM** `eventBus`.
- Sequência canônica: validar input → fetch payable → `Payable.approve` → `repo.save(payable, [event])`.
- Output: `{ payable: ApprovedPayable; event: PayableEvent }`.

---

## 3. Critérios de Aceitação (CAs)

### 3.1. Refactor de port (`domain/payable/repository.ts`)

- **CA-1:** `PayableRepository.save` aceita 2º parâmetro `events: readonly FinancialModuleEvent[]`.
- **CA-2:** `PayableRepositoryError` é union `'payable-repo-unavailable' | 'payable-repo-conflict' | 'payable-fitid-duplicate' | OutboxAppendError`.
- **CA-3:** JSDoc do `save` cita ADR-0015 + atomicidade state+outbox.
- **CA-4:** Import de `OutboxAppendError` em `repository.ts` via `import type { OutboxAppendError } from '../../application/ports/outbox.ts'` — domain pode importar tipo de application? **SIM**, replicando o mesmo padrão de `contracts/domain/contract/repository.ts:4` (precedente aceito).

### 3.2. Refactor do adapter (`adapters/persistence/repos/payable-repository.in-memory.ts`)

- **CA-5:** Factory aceita `outbox: OutboxPort = InMemoryOutbox().port` como parâmetro opcional.
- **CA-6:** `save(payable, events)` persiste payable e, se `events.length > 0`, chama `outbox.append(events)`.
- **CA-7:** Se `outbox.append` retornar `err`, o erro é propagado como `PayableRepositoryError` (cast direto — `OutboxAppendError` agora está no union).
- **CA-8:** Refactor preserva R2 (Anti-Duplicidade FITID) — guard `payable-fitid-duplicate` continua antes do `outbox.append`.

### 3.3. Refactor da suite reusável (`tests/.../adapters/persistence/payable-repository.suite.ts`)

- **CA-9:** Chamadas `repo.save(payable)` viram `repo.save(payable, [])`. Testes da suite NÃO inspecionam outbox (passam `[]`).
- **CA-10:** Pelo menos 1 novo teste na suite valida que `save(payable, [event])` propaga eventos para o outbox injetado (via factory que passa um `outbox` explícito e inspeciona via `helpers.outboxAll()`).

### 3.4. Use case (`application/use-cases/approve-payable.ts`)

- **CA-11:** Use case é factory function: `(deps: Deps) => (input: ApprovePayableCommand) => Promise<Result<ApprovePayableOutput, ApprovePayableError>>`.
- **CA-12:** `Deps = Readonly<{ payableRepo: PayableRepository; clock: Clock }>` — sem EventBus.
- **CA-13:** `ApprovePayableCommand = Readonly<{ payableId: string; approvedByRaw: string }>` (strings cruas — use case faz `rehydrate`).
- **CA-14:** `ApprovePayableError` é union de:
  - `'approve-payable-invalid-id'` (payableId não-UUID)
  - `'approve-payable-not-found'` (repo retornou null)
  - `UserRefError` (rehydrate de approvedBy)
  - `PayableError` (transição rejeitou)
  - `PayableRepositoryError` (repo falhou; inclui OutboxAppendError)
- **CA-15:** `ApprovePayableOutput = Readonly<{ payable: ApprovedPayable; event: PayableEvent }>` (mesma shape do retorno de `Payable.approve`).
- **CA-16:** Sequência canônica: validar payableId → rehydrate approvedBy → `clock.now()` para `approvedAt` → `repo.findById` → guard not-found → `Payable.approve` → `repo.save(payable, [event])` → retornar output.
- **CA-17:** Use case **NÃO** chama `outbox.append` diretamente — vai via `repo.save`. (Atomicidade ADR-0015.)
- **CA-18:** Header doc cita R1 Soberania da Aprovação + ADR-0015.

### 3.5. Testes do use case (`tests/modules/financial/application/use-cases/approve-payable.test.ts`)

- **CA-19:** Teste happy path: Open → Approved, output contém `{ payable.status === 'Approved', event.type === 'PayableApproved' }`.
- **CA-20:** Teste evento foi enfileirado: factory injeta outbox compartilhado; após use case, `outbox.pending()` tem 1 row de tipo `PayableApproved`.
- **CA-21:** Teste invalid payableId retorna `'approve-payable-invalid-id'`.
- **CA-22:** Teste not-found retorna `'approve-payable-not-found'`.
- **CA-23:** Teste UserRef inválido propaga erro do `rehydrate`.
- **CA-24:** Teste payable não-Open (já Approved) propaga `payableNotOpen` do domínio.
- **CA-25:** Teste data inválida (improvável com Clock mas vamos cobrir injeção de clock que retorna data anterior a `openedAt`) propaga `payableApprovalDateBeforeOpenedAt`.
- **CA-26:** Helper `buildOpenPayable()` reusado de `payable-repository.suite.ts` ou de helpers já existentes — não duplicar fixture do agregado.

### 3.6. Quality Gate (W3)

- **CA-27:** `pnpm run typecheck` exit 0.
- **CA-28:** `pnpm run format:check` exit 0.
- **CA-29:** `pnpm run lint` exit 0 (zero warnings — eslint-disable órfãos remover na hora).
- **CA-30:** `pnpm test` exit 0, baseline +N testes novos (esperado **+8 a +12**), zero regressão.

---

## 4. Estrutura de arquivos esperada

```
src/modules/financial/
├── application/
│   ├── ports/                                       ← (já existe)
│   │   └── outbox.ts                                ← (já existe)
│   └── use-cases/                                   ← NOVO
│       └── approve-payable.ts                       ← NOVO (~80 linhas)
├── domain/payable/
│   └── repository.ts                                ← MODIFICADO (save aceita events; error union ganha OutboxAppendError)
└── adapters/persistence/repos/
    └── payable-repository.in-memory.ts              ← MODIFICADO (factory aceita outbox; save propaga events)

tests/modules/financial/
├── application/
│   └── use-cases/                                   ← NOVO
│       └── approve-payable.test.ts                  ← NOVO (~180 linhas, 7 it's)
└── adapters/persistence/
    └── payable-repository.suite.ts                  ← MODIFICADO (save(p) → save(p, []); +1 teste outbox propagação)
```

**Total estimado:** ~400 linhas tocadas (200 novas + 200 modificadas). Envelope **M**.

---

## 5. Fora do escopo (próximos tickets)

| Item | Ticket sugerido |
| :--- | :--- |
| CLI `aprovar-titulo` consumindo este use case | `FIN-CLI-APROVAR-TITULO` |
| Use case `transmitPayable` (Approved → Transmitted) | `FIN-USECASE-TRANSMIT-PAYABLE` |
| Use case `processBankOutflow` (Transmitted/Overdue → Paid Bank) | `FIN-USECASE-PROCESS-BANK-OUTFLOW` |
| Adapter Drizzle do `PayableRepository` com tx real | `FIN-ADAPTER-DRIZZLE-PAYABLE` |
| Schema MySQL `fin_outbox` + adapter Drizzle do `OutboxPort` | `FIN-ADAPTER-OUTBOX-SCHEMA` + `FIN-ADAPTER-OUTBOX-DRIZZLE` |
| Worker outbox com retry + DLQ | `FIN-WORKER-OUTBOX` |

---

## 6. Regras invariantes aplicáveis

- `.claude/rules/application.md` — use case é factory function; ports são `type`; sequência validar→fetch→domain→persist→publish (publish via repo neste pattern).
- `.claude/rules/adapters.md` — InMemory primeiro; `try/catch → Result` na borda.
- `.claude/rules/testing.md` — `tests/` espelha `src/`; `.test.ts` único descoberto.
- ADR-0006 — kernel compartilhado (`src/shared/ports/clock.ts`) é compartilhado entre módulos.
- ADR-0015 — outbox state+payload atomicamente (state e events na mesma operação).

---

## 7. Riscos / pontos de atenção (para W2)

1. **Refactor da suite reusável** quebra todos os tests do `FIN-PORT-PAYABLE-REPO` se a migração `save(p) → save(p, [])` não for feita corretamente. W0 RED deve cobrir.
2. **`PayableRepositoryError` agora inclui `OutboxAppendError` (tagged)** — código que faz `switch` sobre o error precisa lidar com 3 tags novas (`OutboxAppendUnavailable`, `OutboxAppendSerializationFailed`, `OutboxAppendDuplicateEventId`). Vale grep `PayableRepositoryError` em todo o repo antes do W1 — provavelmente só o adapter e a suite tocam.
3. **`Clock` injetado em `Payable.approve` — não pode ser `clock.now()` na assinatura do domínio.** O domínio é puro; quem injeta a data é o use case (chama `clock.now()` e passa para `Payable.approve(payable, approvedBy, approvedAt)`). Cuidado no W1 para não passar `clock` para o domínio.
4. **`approvedBy: UserRef` — rehydrate retorna `Result<UserRef, UserRefError>`.** O union de erro do use case (`ApprovePayableError`) precisa incluir `UserRefError`. Não passar string crua para `Payable.approve`.
5. **Fixture `buildOpenPayable`** — verificar se já existe um helper em `tests/modules/financial/...` que possa ser reusado. Se não, criar local ao test do use case (não vale criar arquivo `helpers/` ainda — YAGNI).
