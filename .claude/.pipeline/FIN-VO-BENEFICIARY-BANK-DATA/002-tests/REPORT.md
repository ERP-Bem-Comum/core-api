# W0 — Testes RED (FIN-VO-BENEFICIARY-BANK-DATA)

> **Wave:** W0 · **Outcome:** RED · **Agent:** `tdd-strategist` (via main-session)
> **Artefato único:** `tests/modules/financial/domain/shared/beneficiary-bank-data.test.ts` (~290 linhas)

---

## 1. Estratégia de teste

`BeneficiaryBankData` é VO **composto** — diferente dos VOs primitivos anteriores (`FITID`, `TaxId`, IDs). Fixtures usam **`TaxId` já validado** (predecessor FIN-VO-TAX-ID, closed-green) via IIFE com check de result:

```ts
const VALID_TAX_ID_CPF = ((): TaxId.CPF => {
  const r = TaxId.fromCpf('11144477735');
  if (!r.ok) throw new Error(`fixture VALID_TAX_ID_CPF broken: ${r.error}`);
  return r.value;
})();
```

`throw` em fixture de teste é OK — regra "zero throw" do domínio se aplica a `src/`, não a `tests/`. Se a fixture quebrar (TaxId.fromCpf retornar err), o teste falha cedo e ruidoso — exatamente o que queremos.

`VALID_INPUT` é o objeto canônico válido; cada teste faz spread com 1 campo alterado.

## 2. Cobertura de CAs (28 testes em 10 `describe`s)

| Describe | Testes | CAs |
| :--- | ---: | :--- |
| Module-as-namespace | 2 | smoke + sem namespace aninhado |
| `fromRaw` happy path | 1 | CA-5 (valida campos preservados) |
| bankCode validation | 4 | CA-6, CA-7, + 2 boundary (`'001'` ok, `'0341'` 4-digit rejeitado) |
| agency validation | 5 | CA-8 (×3: sem DV, num DV, X DV), CA-9 (×2: letras, empty) |
| account validation | 4 | CA-10 (×2: num DV, long+X DV), CA-11 (×2: sem DV, com letra) |
| holderName validation | 5 | CA-15 (trim), CA-16 (×2: empty, whitespace), CA-17 (×2: 255 ok, 256 too-long) |
| fail-fast order | 1 | CA-18 (bankCode validado antes de agency) |
| equals | 6 | CA-19 (iguais), CA-20 (×5: bankCode/agency/account/taxId(CPF vs CNPJ)/holderName) |
| type-level smoke | 1 | CA-3 — exhaustive switch sobre `BeneficiaryBankDataError` (5 variantes) |
| **Total** | **28** | |

### 2.1. CA-12/13/14 deliberadamente ausentes

CAs movidas para `FIN-VO-TAX-ID` (já validadas lá — closed-green). Este VO **consome** `TaxId` brandado, não valida CPF/CNPJ.

## 3. Lições preventivas aplicadas

| Lição | Origem | Status |
| :--- | :--- | :--- |
| Sem shadowing de built-ins | FIN-VO-FITID W3 | ✅ função `classify` (linha 269) |
| Sem indexed access em arrays | FIN-VO-TAX-ID W3 | ✅ N/A — testes não fazem loop sobre arrays |
| Sem async sem await | FIN-CLI-WIRE W3 | ✅ todos os `it` são síncronos |
| `as <Brand>` só em produção | FIN-VO-FITID W2 | ✅ N/A em testes — testes verificam, não constroem |
| Imports `#src/*` | FIN-IDS-PAYABLE | ✅ aplicado |
| Fixtures literais distintas | FIN-IDS-PAYABLE | ✅ `'341'`, `'1234-5'`, etc. |

## 4. Comando rodado

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/financial/domain/shared/beneficiary-bank-data.test.ts
```

## 5. Saída (esperada RED)

```
Error [ERR_MODULE_NOT_FOUND]:
  Cannot find module '.../src/modules/financial/domain/shared/beneficiary-bank-data.ts'

✖ tests/modules/financial/domain/shared/beneficiary-bank-data.test.ts (107ms)
ℹ tests 1  pass 0  fail 1
```

Falha sintética única no top-level import — quando W1 criar `beneficiary-bank-data.ts`, contagem vira `tests 28 pass 28 fail 0`.

## 6. Diagnóstico RED

| Aspecto | OK? | Nota |
| :--- | :--- | :--- |
| Causa única | ✅ | `ERR_MODULE_NOT_FOUND` no único import do VO |
| Fixtures usam `TaxId` validado (não strings raw) | ✅ | predecessor FIN-VO-TAX-ID consumido como pretendido |
| Boundaries cobertos | ✅ | bankCode 3 dígitos, agency com/sem DV/X, account com DV obrigatório, holderName 255/256 |
| Fail-fast testado explicitamente | ✅ | CA-18 — 2 campos errados → 1º erro (bankCode) retornado |
| Equals testa 5 campos individualmente | ✅ | CA-20 quebrado em 5 testes (1 por campo) |
| Sem shadowing/throw/indexed access | ✅ | inspeção visual + lições aplicadas |

## 7. Lista pronta para W1

Implementer (main-session) deve criar `src/modules/financial/domain/shared/beneficiary-bank-data.ts` (~80 linhas):

### 7.1. Imports + types

```ts
import type { Brand } from '#src/shared/primitives/brand.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { TaxId } from './tax-id.ts';

export type BeneficiaryBankData = Brand<
  {
    readonly bankCode: string;
    readonly agency: string;
    readonly account: string;
    readonly holderTaxId: TaxId;
    readonly holderName: string;
  },
  'BeneficiaryBankData'
>;

export type BeneficiaryBankDataError =
  | 'bank-code-invalid'
  | 'agency-invalid'
  | 'account-invalid'
  | 'holder-name-empty'
  | 'holder-name-too-long';

export type BeneficiaryBankDataInput = Readonly<{
  bankCode: string;
  agency: string;
  account: string;
  holderTaxId: TaxId;
  holderName: string;
}>;
```

### 7.2. Regex internas (não exportadas)

```ts
const BANK_CODE_REGEX = /^\d{3}$/;
const AGENCY_REGEX = /^\d{1,5}(-[\dXx])?$/;
const ACCOUNT_REGEX = /^\d{1,12}-[\dXx]$/;
const HOLDER_NAME_MAX = 255;
```

### 7.3. `fromRaw` (fail-fast)

```ts
export const fromRaw = (
  input: BeneficiaryBankDataInput,
): Result<BeneficiaryBankData, BeneficiaryBankDataError> => {
  if (!BANK_CODE_REGEX.test(input.bankCode)) return err('bank-code-invalid');
  if (!AGENCY_REGEX.test(input.agency)) return err('agency-invalid');
  if (!ACCOUNT_REGEX.test(input.account)) return err('account-invalid');
  const trimmedName = input.holderName.trim();
  if (trimmedName.length === 0) return err('holder-name-empty');
  if (trimmedName.length > HOLDER_NAME_MAX) return err('holder-name-too-long');

  return ok(
    immutable({
      bankCode: input.bankCode,
      agency: input.agency,
      account: input.account,
      holderTaxId: input.holderTaxId,
      holderName: trimmedName,
    }) as BeneficiaryBankData,
  );
};
```

### 7.4. `equals` field-by-field (uses TaxId.equals para holderTaxId)

```ts
import * as TaxId from './tax-id.ts';

export const equals = (a: BeneficiaryBankData, b: BeneficiaryBankData): boolean =>
  a.bankCode === b.bankCode &&
  a.agency === b.agency &&
  a.account === b.account &&
  a.holderName === b.holderName &&
  TaxId.equals(a.holderTaxId, b.holderTaxId);
```

Esperar **`tests 28 pass 28 fail 0`** após W1.
