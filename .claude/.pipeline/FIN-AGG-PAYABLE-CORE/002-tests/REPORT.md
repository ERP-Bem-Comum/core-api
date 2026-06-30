# W0 — Testes RED (FIN-AGG-PAYABLE-CORE)

> **Wave:** W0 · **Outcome:** RED · **Agent:** `tdd-strategist` (via main-session)
> **Artefatos criados (5):**
>
> - `tests/modules/financial/domain/shared/source-document-ref.test.ts` (~75 linhas, 9 testes)
> - `tests/modules/financial/domain/payable/types.test.ts` (~50 linhas, 3 testes type-level)
> - `tests/modules/financial/domain/payable/events.test.ts` (~25 linhas, 1 teste)
> - `tests/modules/financial/domain/payable/errors.test.ts` (~75 linhas, 7 testes)
> - `tests/modules/financial/domain/payable/payable.test.ts` (~260 linhas, 14 testes)

---

## 1. Estratégia de teste

Padrão consolidado de **agregado** espelhando `tests/modules/contracts/domain/contract/contract.test.ts`:

- **Fixtures IIFE com throw** — `VALID_TAX_ID`, `VALID_BENEFICIARY`, `VALID_MONEY`, `APPROVER` construídos uma vez no topo. Throw em fixture de teste é aceitável (regra "zero throw" aplica ao `src/`, não `tests/`).
- **Helper `validInput(overrides?)`** — função fábrica com spread para variações por teste (DRY).
- **Helper `openPayable()`** — cria fixture de estado Open para testes que precisam transicionar.
- **`D(iso)` shorthand + `INVALID_DATE`** — utilitários de data idênticos a `contract.test.ts`.

## 2. Cobertura de CAs (34 testes em 5 arquivos)

| Arquivo | Testes | CAs |
| :--- | ---: | :--- |
| `source-document-ref.test.ts` | 9 | espelho do `payable-id.test.ts` (módulo namespace + generate + rehydrate) |
| `payable/types.test.ts` | 3 | CA-1, CA-2, CA-4 (PayableStatus union + narrowing) |
| `payable/events.test.ts` | 1 | CA-6 (PayableEvent union exhaustive) |
| `payable/errors.test.ts` | 7 | CA-29 + tagged errors com payload (D23) |
| `payable/payable.test.ts` | 14 | CA-7..CA-22 (open + approve + parseOpen + parseApproved) |
| **Total** | **34** | |

## 3. Lições preventivas aplicadas

| Lição | Status |
| :--- | :--- |
| Sem indexed access em arrays | ✅ N/A — sem loops sobre arrays |
| Sem shadowing de built-ins | ✅ helper `classify` em vez de `describe` |
| Sem async sem await | ✅ tudo síncrono |
| `as <Brand>` só em smart constructor | ✅ N/A em tests |
| Imports `#src/*` | ✅ aplicado |
| Tagged errors com payload (D23) | ✅ `payableInvalidApprovalDate(opened, attempted)`, `payableNotOpen(currentStatus)` |

## 4. Saída esperada do RED

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/financial/domain/shared/source-document-ref.test.ts \
  tests/modules/financial/domain/payable/*.test.ts
```

Resultado real obtido:

```
ℹ tests 7  pass 4  fail 3
```

### 4.1. Análise do "pass 4" curioso

`types.test.ts` (3 testes) e `events.test.ts` (1 teste) **passaram** em RED — não falharam por `ERR_MODULE_NOT_FOUND`. Por que?

Esses 2 arquivos usam **exclusivamente `import type`**:

```ts
import type { OpenPayable, ApprovedPayable, Payable, PayableStatus } from '...';
import type { PayableEvent } from '...';
```

Sob `verbatimModuleSyntax` + `--experimental-strip-types` do Node 24, `import type` é **inteiramente apagado em runtime**. O teste só executa `assert.equal(typeof probe, 'function')` em compile-time check materializado — runtime não precisa do módulo.

**Consequência:** esses 4 testes só falham se:
- **typecheck** falhar (W3 vai pegar — `OpenPayable` não existe em `types.ts` se W1 não criar).
- Refactor remove um campo (ex.: `approvedAt`) — o `extends { approvedAt: Date }` falha compile.

São **type-level guards**, não runtime tests. Validados em W3 (typecheck).

### 4.2. RED real: 3 arquivos com runtime imports

```
✖ tests/modules/financial/domain/shared/source-document-ref.test.ts
   ERR_MODULE_NOT_FOUND: source-document-ref.ts
✖ tests/modules/financial/domain/payable/errors.test.ts
   ERR_MODULE_NOT_FOUND: payable/errors.ts
✖ tests/modules/financial/domain/payable/payable.test.ts
   ERR_MODULE_NOT_FOUND: source-document-ref.ts (via cascade)
```

Causa única, idêntica: arquivos de produção ausentes. W1 trivialmente reverte para GREEN.

## 5. Diagnóstico RED

| Aspecto | OK? | Nota |
| :--- | :--- | :--- |
| Causa única | ✅ | `ERR_MODULE_NOT_FOUND` em todos os runtime imports |
| Fixtures IIFE bem estruturadas | ✅ | TaxId/BeneficiaryBankData/Money/UserRef construídos com check de result |
| Helper `validInput(overrides)` | ✅ | espelha `contract.test.ts:43-51` |
| Boundary cases cobertos | ✅ | value=0, dueDate inválida, openedAt inválida, approvalDate < openedAt, approve em Approved |
| Tagged errors com evidência | ✅ | `payableInvalidApprovalDate.openedAt + attemptedAt`, `payableNotOpen.currentStatus` |
| Type-level smoke materializado | ✅ | extends check em `types.test.ts`, exhaustive switch sobre `PayableEvent` e `PayableError` |

## 6. Lista pronta para W1

Implementer (main-session) deve criar **5 arquivos de produção** na seguinte ordem:

### 6.1. `src/modules/financial/domain/shared/source-document-ref.ts` (~16 linhas)

Espelho exato de `payable-id.ts` (Padrão D):

```ts
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '#src/shared/utils/id.ts';
import type { Brand } from '#src/shared/primitives/brand.ts';

export type SourceDocumentRef = Brand<string, 'SourceDocumentRef'>;
export type SourceDocumentRefError = 'source-document-ref-invalid';

export const generate = (): SourceDocumentRef => newUuid() as SourceDocumentRef;
export const rehydrate = (raw: string): Result<SourceDocumentRef, SourceDocumentRefError> =>
  isUuidV4(raw) ? ok(raw as SourceDocumentRef) : err('source-document-ref-invalid');
```

### 6.2. `src/modules/financial/domain/payable/types.ts` (~70 linhas)

Tipos refinados por estado (DO D§20), espelho de `contract/types.ts`:

```ts
import type { PayableId } from '../shared/payable-id.ts';
import type { SourceDocumentRef } from '../shared/source-document-ref.ts';
import type { BeneficiaryBankData } from '../shared/beneficiary-bank-data.ts';
import type { Money } from '#src/shared/kernel/money.ts';
import type { UserRef } from '#src/shared/kernel/user-ref.ts';

type PayableCore = Readonly<{
  id: PayableId;
  sourceDocumentId: SourceDocumentRef;
  kind: 'Principal' | 'Tax';
  paymentMethod: 'BankRemittance' | 'ManualExternal';
  beneficiary: BeneficiaryBankData;
  value: Money;
  dueDate: Date;
  openedAt: Date;
}>;

export type OpenPayable = PayableCore & Readonly<{ status: 'Open' }>;
export type ApprovedPayable = PayableCore & Readonly<{
  status: 'Approved';
  approvedAt: Date;
  approvedBy: UserRef;
}>;
export type Payable = OpenPayable | ApprovedPayable;
export type PayableStatus = Payable['status'];

export type OpenPayableInput = Readonly<{
  id: PayableId;
  sourceDocumentId: SourceDocumentRef;
  kind: 'Principal' | 'Tax';
  paymentMethod: 'BankRemittance' | 'ManualExternal';
  beneficiary: BeneficiaryBankData;
  value: Money;
  dueDate: Date;
  openedAt: Date;
}>;
```

### 6.3. `src/modules/financial/domain/payable/events.ts` (~25 linhas)

```ts
import type { PayableId } from '../shared/payable-id.ts';
import type { UserRef } from '#src/shared/kernel/user-ref.ts';

export type PayableEvent = Readonly<
  | { type: 'PayableOpened'; payableId: PayableId; occurredAt: Date }
  | {
      type: 'PayableApproved';
      payableId: PayableId;
      occurredAt: Date;
      approvedBy: UserRef;
    }
>;
```

### 6.4. `src/modules/financial/domain/payable/errors.ts` (~85 linhas)

Tagged errors (DO D§22-D§24), espelho de `contract/errors.ts`:

```ts
import type { PayableStatus } from './types.ts';

export type PayableSourceDocumentRequired = Readonly<{ tag: 'PayableSourceDocumentRequired' }>;
export type PayableValueZero = Readonly<{ tag: 'PayableValueZero' }>;
export type PayableInvalidDueDate = Readonly<{ tag: 'PayableInvalidDueDate' }>;
export type PayableInvalidOpenedAt = Readonly<{ tag: 'PayableInvalidOpenedAt' }>;
export type PayableInvalidApprovalDate = Readonly<{
  tag: 'PayableInvalidApprovalDate';
  openedAt: Date;
  attemptedAt: Date;
}>;
export type PayableNotOpen = Readonly<{
  tag: 'PayableNotOpen';
  currentStatus: PayableStatus;
}>;

export type PayableError =
  | PayableSourceDocumentRequired
  | PayableValueZero
  | PayableInvalidDueDate
  | PayableInvalidOpenedAt
  | PayableInvalidApprovalDate
  | PayableNotOpen;

// Constructor functions (camelCase, espelho de contract/errors.ts)
export const payableSourceDocumentRequired = (): PayableSourceDocumentRequired => ({ tag: 'PayableSourceDocumentRequired' });
export const payableValueZero = (): PayableValueZero => ({ tag: 'PayableValueZero' });
export const payableInvalidDueDate = (): PayableInvalidDueDate => ({ tag: 'PayableInvalidDueDate' });
export const payableInvalidOpenedAt = (): PayableInvalidOpenedAt => ({ tag: 'PayableInvalidOpenedAt' });
export const payableInvalidApprovalDate = (openedAt: Date, attemptedAt: Date): PayableInvalidApprovalDate => ({
  tag: 'PayableInvalidApprovalDate',
  openedAt,
  attemptedAt,
});
export const payableNotOpen = (currentStatus: PayableStatus): PayableNotOpen => ({
  tag: 'PayableNotOpen',
  currentStatus,
});
```

### 6.5. `src/modules/financial/domain/payable/payable.ts` (~120 linhas)

Operações `open`, `approve`, `parseOpen`, `parseApproved` — exportadas via objeto namespace `Payable`:

```ts
export const Payable = {
  open,
  approve,
  parseOpen,
  parseApproved,
};
```

Esperar **`tests 34 pass 34 fail 0`** após W1 (incluindo typecheck verde para os 4 type-level tests que passam em runtime mas dependem de tipos existirem).
