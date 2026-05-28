# W1 — Implementação GREEN (FIN-VO-FITID)

> **Wave:** W1 · **Outcome:** GREEN · **Agent:** `main-session`
> **Predecessor:** [`../002-tests/REPORT.md`](../002-tests/REPORT.md) (W0 RED)
> **Artefato único:** `src/modules/financial/domain/shared/fitid.ts` (47 linhas)

---

## 1. Mudança

| Arquivo | Operação | Linhas | Conteúdo |
| :--- | :--- | :--- | :--- |
| `src/modules/financial/domain/shared/fitid.ts` | **created** | 47 | header doc (33 linhas) + 5 statements: `import Brand`, `import {Result,ok,err}`, `type FITID`, `type FITIDError`, `const MAX_LENGTH`, `fromString`, `equals` |

### 1.1. Header doc — fontes literais

Cita explicitamente:
- **OFX 2.x §11.4.2** (origem do `MAX_LENGTH = 255`) — linha 18.
- **`handbook/domain/04-titulos-liquidacao-context.md:57`** (R4 Anti-Duplicidade) — linha 11.
- **`handbook/domain/05-integracao-bancaria-context.md:49`** (R1 Proteção de Duplicidade) — linha 14.
- **D5 do 000-request** (charset permissivo, com exemplos de bancos BR) — linhas 21-27.

### 1.2. Estrutura idêntica ao esqueleto do 000-request §2.1

```ts
export type FITID = Brand<string, 'FITID'>;
export type FITIDError = 'fitid-empty' | 'fitid-too-long';
const MAX_LENGTH = 255;
export const fromString = (raw): Result<FITID, FITIDError> => { trim → ok/err };
export const equals = (a, b): boolean => a === b;
```

Sem invenção. Sem adições além do contrato declarado em 000-request.

### 1.3. `as FITID` aparece exatamente uma vez

Linha 45, dentro do smart constructor `fromString`, após validação. Conforme CA-18 e regra de domínio (`.claude/rules/domain.md`).

---

## 2. Correção da contagem de testes em relação ao REPORT W0

W0 REPORT indicou "14 testes". Contagem correta após implementação: **16 testes**. Diferença vem de revisão manual da seção `fromString construction` — eu listei 8 testes mas a tabela do W0 só destacou 6 colunas. Testes `D5 hex` e `D5 base64` estão presentes desde o início do arquivo (`tests/modules/financial/domain/shared/fitid.test.ts:110-128`).

Detalhamento real:

| Describe | Testes |
| :--- | ---: |
| `FITID — module-as-namespace (Padrão D)` | 2 |
| `FITID — fromString construction` | 8 (4, 7, 5, 6, 9, 8, D5 hex, D5 base64) |
| `FITID — equals` | 4 |
| `FITID — type-level smoke` | 2 |
| **Total** | **16** |

Erro tipográfico apenas — código de teste não foi alterado entre W0 e W1.

---

## 3. Verificação

### 3.1. Testes específicos do ticket

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/financial/domain/shared/fitid.test.ts
```

```
▶ FITID — module-as-namespace (Padrão D)
  ✔ module exposes fromString and equals at top-level (not nested)
  ✔ does NOT expose a nested `FITID` namespace-object (DON'T B§7)
▶ FITID — fromString construction
  ✔ CA-4: accepts valid alphanumeric string
  ✔ CA-7: trims surrounding whitespace and keeps inner content
  ✔ CA-5: rejects empty string with `fitid-empty`
  ✔ CA-6: rejects whitespace-only string with `fitid-empty` (post-trim)
  ✔ CA-9: accepts exactly 255 chars (boundary inclusive — OFX 2.x §11.4.2)
  ✔ CA-8: rejects 256 chars with `fitid-too-long`
  ✔ D5: accepts hex-like (Itaú style) string
  ✔ D5: accepts base64-like string with + and /
▶ FITID — equals
  ✔ CA-10: returns true for two values built from the same input
  ✔ CA-10: equals collapses whitespace differences via trim
  ✔ CA-11: returns false for distinct values
  ✔ CA-12: equals is case-sensitive (D6)
▶ FITID — type-level smoke (CA-2, CA-3)
  ✔ CA-2: BrandOf<FITID> resolves to literal "FITID"
  ✔ CA-3: FITIDError union has exactly 2 variants — exhaustive switch
ℹ tests 16  pass 16  fail 0  duration_ms 107
```

Todos os 16 GREEN.

### 3.2. Suite completa

```
ℹ tests 868  pass 852  fail 0  skipped 16  duration_ms 45255
```

| Métrica | W3 do FIN-CLI-WIRE | W1 deste ticket | Delta |
| :--- | ---: | ---: | ---: |
| tests | 852 | 868 | **+16** |
| pass | 836 | 852 | **+16** |
| fail | 0 | 0 | 0 |
| skipped | 16 | 16 | 0 |

Delta corresponde exatamente aos 16 testes adicionados. Zero regressão.

---

## 4. Critérios de aceitação (000-request §4)

| # | Critério | Status | Evidência |
| :--- | :--- | :--- | :--- |
| CA-1 | Arquivo existe | ✅ | filesystem |
| CA-2 | Type `FITID` = `Brand<string, 'FITID'>` | ✅ | type-level smoke: `BrandOf<FITID> === 'FITID'` |
| CA-3 | Type `FITIDError` = `'fitid-empty' \| 'fitid-too-long'` | ✅ | exhaustive switch test |
| CA-4 | `fromString('abc123')` ok | ✅ | test §3.1 |
| CA-5 | `fromString('')` err | ✅ | test §3.1 |
| CA-6 | `fromString('   ')` err (trim) | ✅ | test §3.1 |
| CA-7 | `fromString('  abc  ')` ok com `'abc'` | ✅ | test §3.1 |
| CA-8 | `fromString('x'.repeat(256))` err | ✅ | test §3.1 |
| CA-9 | `fromString('x'.repeat(255))` ok | ✅ | test §3.1 |
| CA-10 | `equals` identical → true | ✅ | test §3.1 |
| CA-11 | `equals` distinct → false | ✅ | test §3.1 |
| CA-12 | `equals` case-sensitive | ✅ | test §3.1 |
| CA-13 | Header doc cita OFX 2.x §11.4.2 + handbook R4/R1 | ✅ | §1.1 |
| CA-14 | `pnpm run typecheck` verde | ⏳ | W3 |
| CA-15 | `pnpm run format:check` verde | ⏳ | W3 |
| CA-16 | `pnpm test` verde | ✅ | §3.2 |
| CA-17 | `pnpm run lint` verde | ⏳ | W3 |
| CA-18 | `as` só dentro de `fromString` | ✅ | §1.3 — uma única ocorrência na linha 45 |

CAs operacionais (14, 15, 17) postergados para W3.

---

## 5. Decisões tomadas em W1

- **Imports em ordem `import type ... ; import { type Result, ok, err }`** — `Brand` é tipo puro, `Result` é tipo + valores. Casa com padrão de `money.ts:1-3`.
- **`as FITID` sem comment de justificativa** — única ocorrência, dentro do smart constructor, padrão idêntico a `money.ts:31` (`ok(immutable({ cents }) as Money)`). Reviewer pode flagear como 🔵 se discordar.
- **Sem `immutable()` no `fromString`** — `string` é primitiva imutável por design da linguagem (diferente de `{ cents: number }` que precisa `Object.freeze`). Aplicar `immutable()` em string seria no-op.
- **`equals` com `===`** — comparação literal direta. `string === string` em ES é case-sensitive e value-based; sem necessidade de helper externo (D6).
- **`MAX_LENGTH` não exportada** (D7) — quem precisa do limite usa o discriminator `'fitid-too-long'` no Result.

---

## 6. Lição aprendida

Confirmado: arquivos de domínio puro **não disparam** `require-await` (sem `async`) nem `restrict-template-expressions` (sem template literals com indexação). A lição registrada no FIN-CLI-WIRE 005-quality/REPORT.md aplica especificamente a CLI/handlers — VOs ficam imunes.

---

## 7. Pronto para W2

`code-reviewer` deve validar:

1. Header doc cita OFX 2.x §11.4.2 + handbook R4/R1 explicitamente (CA-13).
2. `as FITID` aparece exatamente 1 vez, dentro do `fromString` após validação (CA-18).
3. Sem `throw`, `class`, `this`, `any`, `extends Error`.
4. `FITIDError` é union de literais string, não classe.
5. Smart constructor retorna `Result<FITID, FITIDError>` — sem exception path.
6. `MAX_LENGTH` documentada com fonte normativa (OFX 2.x §11.4.2).
7. Imports usam subpath `#src/*` e extensão `.ts` literal.
8. Cobertura proporcional ao risco — boundaries 255/256, charset variants, case-sensitivity.

Envelope XS — review esperada em 1 round.
