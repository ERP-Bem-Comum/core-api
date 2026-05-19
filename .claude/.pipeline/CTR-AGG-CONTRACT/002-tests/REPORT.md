# W0 — RED — Ticket CTR-AGG-CONTRACT

**Skill:** ts-domain-modeler (modo teste)
**Data:** 2026-05-14
**Status:** ✅ RED confirmado

---

## Arquivos criados

- `tests/modules/contracts/domain/contract/contract.test.ts` (361 linhas, 30 testes em 11 suítes)

---

## Inventário dos testes

### `Contract.create`
1. **happy path** (1) — Active com `current === original`, `endedAt: null`, lista vazia
2. **validation** (6) — empty/whitespace `sequentialNumber`, empty/whitespace `title`, empty `objective`, invalid `signedAt`

### `Contract.expire`
3. **happy path** (2) — transição Active→Expired, preservação de `originalValue`/`originalPeriod`
4. **rejections** (5) — `at < end`, Indefinite period, already Expired, already Terminated, invalid `at`

### `Contract.terminate`
5. **happy path** (2) — transição Active→Terminated, funciona com Indefinite
6. **rejections** (3) — already Expired, already Terminated, invalid `at`

### `Contract.applyHomologatedAdjustment` (4 variantes do `ContractAdjustment`)
7. **ValueIncrease** (2) — incrementa `currentValue`, preserva `originalValue` (R5)
8. **ValueDecrease** (2) — decrementa, rejeita se ficaria negativo
9. **PeriodExtension** (3) — estende Fixed period, rejeita `newEnd <= current.end`, rejeita Indefinite
10. **Acknowledgment** (1) — registra `amendmentId` sem mudar `currentValue`/`currentPeriod`
11. **common rejections** (3) — não-Active, `amendmentId` duplicado, invalid `at`

**Total: 30 testes em 11 suítes.** Acumulado pós-W1: 69 + 30 = **99 testes**.

---

## Helpers de teste

```ts
const money = (cents) => ...;
const fixedPeriod = (startISO, endISO) => ...;
const indefinitePeriod = (startISO) => ...;
const validInput = (overrides) => ...;
const createActive = () => ...;
```

Builders compõem fixtures consistentes. `validInput({ overrides })` permite mudar 1 campo por vez sem repetir os outros 7. `createActive()` produz contrato em estado inicial canônico para testes downstream.

---

## Confirmação de RED

```
pnpm typecheck
→ contract.test.ts(11,26): Cannot find module '#src/.../contract.ts'
→ contract.test.ts(15,8): Cannot find module '#src/.../types.ts'

pnpm test → 1 fail (contract.test.ts não carrega)
```

✅ **W0 RED confirmado.** Os 69 testes anteriores (Money, IDs, Period) continuam verdes — sem regressão.

---

## Decisões pré-W1 (registradas)

### Estrutura de arquivos esperada

```
src/modules/contracts/domain/contract/
├── types.ts            Contract, ContractStatus, ContractAdjustment, CreateContractInput
├── events.ts           ContractEvent (discriminated union)
├── errors.ts           ContractError (string literal union)
├── contract.ts         Funções: create, expire, terminate, applyHomologatedAdjustment
└── index.ts            barrel
```

### Tipos chave

```ts
// types.ts
export type ContractStatus = 'Active' | 'Expired' | 'Terminated';

export type Contract = Brand<Readonly<{
  id: ContractId;
  sequentialNumber: string;
  title: string;
  objective: string;
  signedAt: Date;
  originalValue: Money;
  originalPeriod: Period;
  currentValue: Money;
  currentPeriod: Period;
  status: ContractStatus;
  homologatedAmendmentIds: readonly AmendmentId[];
  endedAt: Date | null;
}>, 'Contract'>;

export type ContractAdjustment = Readonly<
  | { kind: 'ValueIncrease';   amount: Money; amendmentId: AmendmentId }
  | { kind: 'ValueDecrease';   amount: Money; amendmentId: AmendmentId }
  | { kind: 'PeriodExtension'; newEnd: Date;  amendmentId: AmendmentId }
  | { kind: 'Acknowledgment';  amendmentId: AmendmentId }
>;

export type CreateContractInput = Readonly<{
  id: ContractId;
  sequentialNumber: string;
  title: string;
  objective: string;
  signedAt: Date;
  originalValue: Money;
  originalPeriod: Period;
}>;
```

### Eventos

```ts
// events.ts
export type ContractEvent = Readonly<
  | { type: 'ContractCreated';      contractId: ContractId; occurredAt: Date }
  | { type: 'ContractStateUpdated'; contractId: ContractId; occurredAt: Date; amendmentId: AmendmentId }
  | { type: 'ContractEnded';        contractId: ContractId; occurredAt: Date; kind: 'Expired' | 'Terminated' }
>;
```

### Erros (a partir dos critérios)

```ts
export type ContractError =
  | 'contract-sequential-number-required'
  | 'contract-title-required'
  | 'contract-objective-required'
  | 'contract-invalid-signed-at'
  | 'contract-invalid-event-date'
  | 'contract-not-active'
  | 'contract-cannot-expire-yet'
  | 'contract-cannot-expire-indefinite-period'
  | 'contract-cannot-extend-indefinite-period'
  | 'contract-value-would-go-negative'
  | 'contract-period-extension-not-after-current-end'
  | 'contract-amendment-already-applied';
```

---

## Próximo passo

W1 — implementar os 5 arquivos. Estimativa: ~150-200 linhas de produção.
