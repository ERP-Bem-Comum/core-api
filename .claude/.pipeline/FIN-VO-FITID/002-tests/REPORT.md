# W0 — Testes RED (FIN-VO-FITID)

> **Wave:** W0 · **Outcome:** RED · **Agent:** `tdd-strategist` (via main-session, ticket XS)
> **Artefato único:** `tests/modules/financial/domain/shared/fitid.test.ts` (174 linhas)

---

## 1. Estratégia de teste

Espelha `tests/modules/contracts/domain/shared/money.test.ts`:

- **Module-as-namespace** (Padrão D, entrevista 0001 §B DO§8): `import * as FITID`.
- **Result narrow via discriminator** `r.ok`/`!r.ok` em vez de cast: `if (r.ok) assert.equal(r.value, …)`.
- **Helpers globais** `isOk`/`isErr` de `#src/shared/index.ts`.
- **AAA explícito** em comentário (// Arrange / Act / Assert).
- **Type-level smoke** materializado em runtime: declarar `type Tag = BrandOf<FITID.FITID>` + atribuir `'FITID'` força a compilação a validar; falha de tipo = falha de build.

## 2. Cobertura de CAs (14 testes em 4 `describe`s)

### `describe('FITID — module-as-namespace (Padrão D)')` — 2 testes

| Teste | Asserção |
| :--- | :--- |
| `module exposes fromString and equals at top-level` | `typeof FITID.fromString === 'function'`, `typeof FITID.equals === 'function'` |
| `does NOT expose a nested FITID namespace-object` | `FITID.FITID === undefined` (DON'T B§7) |

### `describe('FITID — fromString construction')` — 8 testes

| Teste | CA | Input | Esperado |
| :--- | :--- | :--- | :--- |
| accepts valid alphanumeric | CA-4 | `'abc123'` | ok, value `'abc123'` |
| trims surrounding whitespace | CA-7 | `'  abc  '` | ok, value `'abc'` |
| rejects empty | CA-5 | `''` | err `'fitid-empty'` |
| rejects whitespace-only | CA-6 | `'   '` | err `'fitid-empty'` |
| accepts exactly 255 chars | CA-9 | `'x'.repeat(255)` | ok, length 255 |
| rejects 256 chars | CA-8 | `'x'.repeat(256)` | err `'fitid-too-long'` |
| accepts hex-like (Itaú style) | D5 | `'a3f9c0e8b4d7e2f1'` | ok |
| accepts base64-like with + and / | D5 | `'AB+/cd=='` | ok |

### `describe('FITID — equals')` — 4 testes

| Teste | CA | Asserção |
| :--- | :--- | :--- |
| equals identical values | CA-10 | true |
| equals collapses whitespace via trim | CA-10 (extensão) | true após trim |
| equals different values | CA-11 | false |
| equals is case-sensitive (D6) | CA-12 | `'AB'` ≠ `'ab'` → false |

### `describe('FITID — type-level smoke (CA-2, CA-3)')` — 2 testes

| Teste | CA | O que valida |
| :--- | :--- | :--- |
| `BrandOf<FITID> resolves to "FITID"` | CA-2 | tag literal igual ao parâmetro do Brand |
| `FITIDError exhaustive switch` | CA-3 | union tem exatamente 2 variantes; `_exhaustive: never` quebra compilação se uma 3ª for adicionada sem atualizar o switch |

**Total: 14 `it`s em 4 `describe`s.**

## 3. Comando rodado

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/financial/domain/shared/fitid.test.ts
```

## 4. Saída (esperada RED)

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '.../src/modules/financial/domain/shared/fitid.ts'
  imported from .../tests/modules/financial/domain/shared/fitid.test.ts
    at finalizeResolution (node:internal/modules/esm/resolve:271:11)
    ...

✖ tests/modules/financial/domain/shared/fitid.test.ts (66.853042ms)
ℹ tests 1  pass 0  fail 1
```

### 4.1. Nota sobre a contagem `tests 1`

Apenas 1 falha sintética é reportada porque o **top-level import falha antes do runner conseguir descobrir os 14 `it`s**. Em runtime W1, esse 1 vira 14 pass (cada `it` individualmente reportado).

Esse formato de RED ("module-level") é coerente com o RED de `FIN-MODULE-SCAFFOLD` (mesmo tipo de falha). Diferente do RED "granular" do `FIN-CLI-WIRE` que conseguia carregar o test file e falhar em cada `it` separado (porque o spawn é runtime, não import-time).

## 5. Diagnóstico RED — checklist

| Aspecto | OK? | Nota |
| :--- | :--- | :--- |
| Causa única, comprovada | ✅ | `ERR_MODULE_NOT_FOUND` no subpath `#src/modules/financial/domain/shared/fitid.ts` |
| Causa raiz é ausência do alvo (não bug no teste) | ✅ | `package.json#imports` cobre `#src/*` — falha é só pela ausência do arquivo |
| Sem mocks, sem fakes mágicos | ✅ | Tudo via construção direta dos VOs |
| Boundary values testados (CA-8/CA-9) | ✅ | 255 vs 256 chars |
| Variações de charset cobertas (D5) | ✅ | alfanumérico, hex, base64 |
| Exhaustive sobre union de erros (CA-3) | ✅ | `_exhaustive: never` no default |
| Type-level check materializado em runtime | ✅ | `BrandOf<FITID>` via assignment |

## 6. Lista pronta para W1

Implementer (main-session) deve:

1. Criar `src/modules/financial/domain/shared/fitid.ts` seguindo o esqueleto do 000-request §2.1:
   - `import { type Result, ok, err } from '#src/shared/primitives/result.ts';`
   - `import type { Brand } from '#src/shared/primitives/brand.ts';`
   - `export type FITID = Brand<string, 'FITID'>;`
   - `export type FITIDError = 'fitid-empty' | 'fitid-too-long';`
   - `const MAX_LENGTH = 255;` (comentário cita OFX 2.x §11.4.2)
   - `export const fromString = (raw: string): Result<FITID, FITIDError> => { … }`
   - `export const equals = (a: FITID, b: FITID): boolean => a === b;`
2. Header doc cita OFX 2.x §11.4.2 e handbook R4/R1 (CA-13).
3. Lição do `FIN-CLI-WIRE`: este arquivo **não tem `async`** nem destructuring de array indexado — sem risco de `require-await` ou `restrict-template-expressions`.
4. Rodar `node --test ... tests/modules/financial/domain/shared/fitid.test.ts` — esperar `pass 14 fail 0`.
5. Rodar `pnpm test` completo — confirmar +14 testes / zero regressão.
