# W0 — Testes RED (FIN-VO-TAX-ID)

> **Wave:** W0 · **Outcome:** RED · **Agent:** `tdd-strategist` (via main-session)
> **Artefato único:** `tests/modules/financial/domain/shared/tax-id.test.ts` (~290 linhas)

---

## 1. Estratégia de teste

**Golden tests** ancorados nas fixtures literais do 000-request §3:

| Fixture | Origem | Uso |
| :--- | :--- | :--- |
| `VALID_CPF = '111.444.777-35'` | §3.1 (exemplo do usuário) | CA-6, CA-24 |
| `VALID_CPF_DIGITS = '11144477735'` | derivado §3.1 | CA-7 |
| `VALID_CNPJ = '12.ABC.345/01DE-35'` | §3.2 (Serpro) | CA-8 |
| `VALID_CNPJ_CHARS = '12ABC34501DE35'` | derivado §3.2 | CA-8, CA-25 |
| `INVALID_CPF_DV = '11144477700'` | mesmo CPF base, DVs errados | CA-14 |
| `INVALID_CNPJ_DV = '12ABC34501DE99'` | mesmo CNPJ base, DVs errados | CA-16 |
| `ALL_ZEROS_CPF = '00000000000'` | passa módulo 11 mas é RFB-reservado | CA-15 (D9) |
| `CPF_WITH_LETTER = '11A44477735'` | 11 chars com letra inválida em CPF | CA-17 |

**Se o algoritmo módulo 11 ou a tabela ASCII (A=17, B=18, ..., Z=42) divergir, `VALID_CPF` ou `VALID_CNPJ` rejeitam imediatamente.** Isso é a rede de segurança principal — qualquer off-by-one em peso ou erro de tabela ASCII vira test fail óbvio.

## 2. Cobertura de CAs (32 testes em 10 `describe`s)

| Describe | Testes | CAs |
| :--- | ---: | :--- |
| Module-as-namespace (Padrão D) | 2 | smoke + encapsulation (helpers internos não vazam) |
| `fromString` CPF happy path | 3 | CA-6 (com máscara), CA-7 (sem máscara), CA-24 (golden §3.1) |
| `fromString` CNPJ alfanumérico happy path | 4 | CA-8 (×2: com/sem máscara), CA-9 (lowercase→UPPERCASE), CA-25 (golden §3.2 Serpro) |
| `fromString` length errors | 5 | CA-10, CA-11, CA-12, CA-13, 12 chars (between CPF/CNPJ) |
| `fromString` check-digit mismatch | 4 | CA-14 (CPF DV errado), CA-15 (×2: zeros, ones — D9), CA-16 (CNPJ DV errado) |
| `fromString` charset errors | 2 | CA-17 (CPF com letra), CA-18 (CNPJ com `@`) |
| `fromCpf` / `fromCnpj` específicos | 3 | CA-19 (×2: CPF e CNPJ narrowed), 1 falha cruzada (fromCpf recebe CNPJ) |
| `format` | 3 | CA-20 (CPF), CA-21 (CNPJ), roundtrip `fromString(format(x))` |
| `equals` | 4 | CA-22 (kind difere), CA-23 (CPF==CPF), CNPJ==CNPJ, case-insensitive |
| type-level smoke | 2 | DU narrowing por `kind`, exhaustive switch sobre 5 erros |
| **Total** | **32** | |

## 3. Lições preventivas aplicadas

| Lição | Status |
| :--- | :--- |
| Sem shadowing de built-ins (FIN-VO-FITID W3) | ✅ função `classify` (linha 271) usa nome não-conflitante |
| Sem `async` sem `await` (FIN-CLI-WIRE W3) | ✅ todos `it` são síncronos |
| Sem templates com `T \| undefined` (FIN-CLI-WIRE W3) | ✅ N/A — sem templates |
| `as TaxId` só dentro de smart constructors (regra de domínio) | ✅ N/A em testes — testes verificam, não constroem |
| Imports `#src/*` | ✅ aplicado |

## 4. Comando rodado

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/financial/domain/shared/tax-id.test.ts
```

## 5. Saída (esperada RED)

```
Error [ERR_MODULE_NOT_FOUND]:
  Cannot find module '.../src/modules/financial/domain/shared/tax-id.ts'

✖ tests/modules/financial/domain/shared/tax-id.test.ts (75ms)
ℹ tests 1  pass 0  fail 1
```

Falha sintética no top-level import — quando W1 criar `tax-id.ts`, o runner descobrirá os 32 `it`s e contagem vira `tests 32 pass 32 fail 0`.

## 6. Diagnóstico RED

| Aspecto | OK? | Nota |
| :--- | :--- | :--- |
| Causa única | ✅ | `ERR_MODULE_NOT_FOUND` no único import |
| Sem shadowing de built-ins | ✅ | `classify` (não `describe`/`it`) |
| Fixtures golden (não fake-IDs) | ✅ | `'111.444.777-35'` e `'12.ABC.345/01DE-35'` são exemplos literais da fonte normativa |
| Boundaries cobertos | ✅ | comprimento 0/3/11/12/14/15; DV correto/errado; case lowercase/UPPERCASE |
| Type-level smoke materializado | ✅ | exhaustive switch sobre `kind` (CPF/CNPJ) + 5 erros |
| `as` em produção restrito | N/A | testes não fazem `as` em valores construídos |

## 7. Lista pronta para W1

Implementer (main-session) deve criar `src/modules/financial/domain/shared/tax-id.ts` (~120-150 linhas):

### 7.1. Imports + header doc
- Header cita §3.1 (CPF) e §3.2 (CNPJ Serpro) literalmente.
- Imports `#src/shared/primitives/{result,brand,immutable}.ts`.

### 7.2. Discriminated union (`type CPF`, `type CNPJ`, `type TaxId`)
Brand interno preserva `kind` no payload — exhaustive switch verifica via `r.value.kind`.

### 7.3. `TaxIdError` union de 5 literais

### 7.4. Helpers internos (NÃO exportados)
```ts
const VALUE_OFFSET = 48; // ord('0') = 48 → '0'=0, 'A'=17, etc.
const CPF_BODY_REGEX = /^\d{11}$/;
const CNPJ_BODY_REGEX = /^[0-9A-Z]{14}$/;

const charToValue = (ch: string): number => ch.charCodeAt(0) - VALUE_OFFSET;

// Pesos: CPF DV1 = [10,9,8,7,6,5,4,3,2]; CPF DV2 = [11,10,9,8,7,6,5,4,3,2]
// CNPJ DV1 = [5,4,3,2,9,8,7,6,5,4,3,2]; CNPJ DV2 = [6,5,4,3,2,9,8,7,6,5,4,3,2]

const calculateCpfDV1 = (digits: string): number => { /* soma×peso mod 11 */ };
const calculateCpfDV2 = (digits: string): number => { /* idem com 10 chars */ };
const calculateCnpjDV1 = (chars: string): number => { /* idem com tabela ASCII */ };
const calculateCnpjDV2 = (chars: string): number => { /* idem com 13 chars */ };

const allSameDigits = (s: string): boolean => /^(.)\1+$/.test(s);
```

### 7.5. Smart constructors

```ts
// Normaliza: tira tudo que não é alfanumérico, UPPERCASE.
const normalize = (raw: string): string =>
  raw.replace(/[^0-9A-Za-z]/g, '').toUpperCase();

export const fromString = (raw: string): Result<TaxId, TaxIdError> => {
  const normalized = normalize(raw);
  if (normalized.length === 0) return err('tax-id-empty');
  if (normalized.length === 11) return fromCpf(normalized);
  if (normalized.length === 14) return fromCnpj(normalized);
  return err('tax-id-invalid-length');
};

export const fromCpf = (raw: string): Result<CPF, TaxIdError> => {
  const normalized = normalize(raw);
  if (normalized.length === 0) return err('tax-id-empty');
  if (normalized.length !== 11) return err('tax-id-invalid-length');
  if (!CPF_BODY_REGEX.test(normalized)) return err('tax-id-invalid-charset');
  if (allSameDigits(normalized)) return err('cpf-check-digit-mismatch');
  // valida DVs aritmeticamente
  // ...
  return ok(immutable({ kind: 'CPF', digits: normalized }) as CPF);
};

export const fromCnpj = (raw: string): Result<CNPJ, TaxIdError> => {
  const normalized = normalize(raw);
  if (normalized.length === 0) return err('tax-id-empty');
  if (normalized.length !== 14) return err('tax-id-invalid-length');
  if (!CNPJ_BODY_REGEX.test(normalized)) return err('tax-id-invalid-charset');
  // valida DVs aritmeticamente
  // ...
  return ok(immutable({ kind: 'CNPJ', chars: normalized }) as CNPJ);
};
```

### 7.6. `format` e `equals`

```ts
export const format = (id: TaxId): string => {
  switch (id.kind) {
    case 'CPF': {
      const d = id.digits;
      return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
    }
    case 'CNPJ': {
      const c = id.chars;
      return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12, 14)}`;
    }
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
};

export const equals = (a: TaxId, b: TaxId): boolean => {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'CPF' && b.kind === 'CPF') return a.digits === b.digits;
  if (a.kind === 'CNPJ' && b.kind === 'CNPJ') return a.chars === b.chars;
  return false; // inalcançável após check de kind, mas necessário p/ exhaustive
};
```

Esperar **`tests 32 pass 32 fail 0`** após W1.
