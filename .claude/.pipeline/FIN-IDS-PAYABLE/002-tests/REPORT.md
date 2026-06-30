# W0 — Testes RED (FIN-IDS-PAYABLE)

> **Wave:** W0 · **Outcome:** RED · **Agent:** `tdd-strategist` (via main-session)
> **Artefatos criados (4):**
>
> - `tests/modules/financial/domain/shared/payable-id.test.ts` (95 linhas)
> - `tests/modules/financial/domain/shared/remittance-id.test.ts` (95 linhas)
> - `tests/modules/financial/domain/shared/bank-transaction-id.test.ts` (95 linhas)
> - `tests/modules/financial/domain/shared/ids.test.ts` (45 linhas, barrel)

---

## 1. Estratégia de teste

Espelho fiel de `tests/modules/contracts/domain/shared/contract-id.test.ts` (e barrel `ids.test.ts`). Cada arquivo de ID individual segue o **mesmo template** com 4 `describe`s:

1. **Module-as-namespace** (2 testes): `import * as <ID>` smoke + ausência de namespace-objeto aninhado.
2. **`generate`** (2 testes): retorna v4 (regex match) + valores distintos.
3. **`rehydrate`** (6 testes): valid v4 lowercase, valid v4 UPPERCASE, empty, non-UUID, UUID v1 (versão errada), UUID com trailing whitespace.

**Total por ID:** 10 testes × 3 IDs = **30 testes**.

**Barrel test:** 3 testes — type-level smoke dos 3 IDs + reexports de funções prefixadas + ausência de namespace-objetos aninhados.

**Grande total: 33 testes em 4 arquivos.**

## 2. Fixtures literais

Cada arquivo tem 3 fixtures no topo, com **UUIDs distintos por ID** (evita confusão durante debug):

| Arquivo | `VALID_V4` |
| :--- | :--- |
| `payable-id.test.ts` | `'7f3a1234-5678-4abc-9def-fedcba987654'` (mesmo do contracts — facilita comparação visual) |
| `remittance-id.test.ts` | `'a1b2c3d4-5678-4abc-9def-fedcba987654'` |
| `bank-transaction-id.test.ts` | `'deadbeef-1234-4abc-9def-fedcba987654'` |

`UUID_V4_REGEX` e `V1_UUID` idênticos em todos os 3.

## 3. Lição do FIN-VO-FITID W3 aplicada preventivamente

**Sem shadowing de built-ins.** Os testes não declaram `const describe = ...`, `const it = ...`, etc. — funções helper internas (none neste ticket) usariam nomes não-conflitantes (`classify`, `labelOf`). Verificado por inspeção visual antes do RED run.

## 4. Comando rodado

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/financial/domain/shared/payable-id.test.ts \
  tests/modules/financial/domain/shared/remittance-id.test.ts \
  tests/modules/financial/domain/shared/bank-transaction-id.test.ts \
  tests/modules/financial/domain/shared/ids.test.ts
```

## 5. Saída (esperada RED)

```
Error [ERR_MODULE_NOT_FOUND]:
  Cannot find module '.../src/modules/financial/domain/shared/bank-transaction-id.ts'
✖ tests/modules/financial/domain/shared/bank-transaction-id.test.ts (106ms)

Error [ERR_MODULE_NOT_FOUND]:
  Cannot find module '.../src/modules/financial/domain/shared/ids.ts'
✖ tests/modules/financial/domain/shared/ids.test.ts (100ms)

Error [ERR_MODULE_NOT_FOUND]:
  Cannot find module '.../src/modules/financial/domain/shared/payable-id.ts'
✖ tests/modules/financial/domain/shared/payable-id.test.ts (109ms)

Error [ERR_MODULE_NOT_FOUND]:
  Cannot find module '.../src/modules/financial/domain/shared/remittance-id.ts'
✖ tests/modules/financial/domain/shared/remittance-id.test.ts (109ms)

ℹ tests 4  pass 0  fail 4
```

Note que `tests 4` reflete **falhas sintéticas no nível de arquivo** — cada `ERR_MODULE_NOT_FOUND` no top-level import impede o runner de descobrir os 30+3 `it`s individuais. Quando W1 criar os arquivos, contagem vira `tests 33 pass 33 fail 0`.

## 6. Diagnóstico RED

| Aspecto | OK? | Nota |
| :--- | :--- | :--- |
| Causa única | ✅ | `ERR_MODULE_NOT_FOUND` em todos os 4 |
| Causa raiz é ausência de target | ✅ | `package.json#imports` cobre `#src/*` |
| Sem shadowing de built-ins | ✅ | inspeção visual confirma — lição do FIN-VO-FITID aplicada |
| Fixtures literais (não fake-ids) | ✅ | UUIDs válidos com prefixos distintos por ID |
| Boundaries cobertos | ✅ | empty, non-UUID, v1, trailing whitespace, lowercase, uppercase |
| Espelhos textuais entre os 3 IDs | ✅ | mesmo template, apenas naming e fixture variam |

## 7. Lista pronta para W1

Implementer (main-session) deve criar **4 arquivos** em `src/modules/financial/domain/shared/`:

### `payable-id.ts` (~14 linhas)

```ts
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '#src/shared/utils/id.ts';
import type { Brand } from '#src/shared/primitives/brand.ts';

// Padrão D: module-as-namespace.
export type PayableId = Brand<string, 'PayableId'>;
export type PayableIdError = 'payable-id-invalid';

export const generate = (): PayableId => newUuid() as PayableId;

export const rehydrate = (raw: string): Result<PayableId, PayableIdError> =>
  isUuidV4(raw) ? ok(raw as PayableId) : err('payable-id-invalid');
```

### `remittance-id.ts` e `bank-transaction-id.ts`

Idênticos textualmente ao `payable-id.ts`, trocando:

| `payable-id.ts` | `remittance-id.ts` | `bank-transaction-id.ts` |
| :--- | :--- | :--- |
| `PayableId` | `RemittanceId` | `BankTransactionId` |
| `PayableIdError` | `RemittanceIdError` | `BankTransactionIdError` |
| `'payable-id-invalid'` | `'remittance-id-invalid'` | `'bank-transaction-id-invalid'` |

### `ids.ts` (barrel, ~25 linhas)

```ts
// Barrel — agrupa os 3 branded UUIDs do módulo financial.
// Reexporta tipos com nome original e funções com prefixo do VO.

export type { PayableId, PayableIdError } from './payable-id.ts';
export type { RemittanceId, RemittanceIdError } from './remittance-id.ts';
export type { BankTransactionId, BankTransactionIdError } from './bank-transaction-id.ts';

export { generate as payableIdGenerate, rehydrate as payableIdRehydrate } from './payable-id.ts';
export {
  generate as remittanceIdGenerate,
  rehydrate as remittanceIdRehydrate,
} from './remittance-id.ts';
export {
  generate as bankTransactionIdGenerate,
  rehydrate as bankTransactionIdRehydrate,
} from './bank-transaction-id.ts';
```

Esperar `pass 33 fail 0` quando W1 criar os 4 arquivos.
