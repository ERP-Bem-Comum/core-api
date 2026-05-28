# Code Review — Ticket FIN-VO-BENEFICIARY-BANK-DATA — Round 1

**Veredito:** **APPROVED**

**Reviewer:** `code-reviewer` (skill canônica W2)
**Data:** 2026-05-23T08:25Z
**Round:** 1 / 3
**Escopo revisado:** 2 arquivos

| # | Arquivo | Linhas |
| :--- | :--- | ---: |
| 1 | `src/modules/financial/domain/shared/beneficiary-bank-data.ts` | 108 |
| 2 | `tests/modules/financial/domain/shared/beneficiary-bank-data.test.ts` | ~315 |

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, mas registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

#### Sugestão 1 — `beneficiary-bank-data.ts:38-39` — dual import `TaxIdNs` + `type TaxId`

**Categoria:** F (TS moderno — convenção)
**Observação:** Import dual (`import * as TaxIdNs` + `import type { TaxId }`) é incomum no projeto. Alternativa idiomática: usar `TaxIdNs.TaxId` em annotations + `TaxIdNs.equals` em runtime. Mas:

```ts
readonly holderTaxId: TaxIdNs.TaxId;  // vs `TaxId`
```

Argumento contra a refatoração: legibilidade dos tipos é menos amigável com o sufixo `Ns`. Decisão da W1 mantida.

**Não bloqueia** — dual import funciona, é tecnicamente correto, e o `tax-id.ts` já tem padrão similar (`import * as TaxId` vs `import type { CPF, CNPJ }` em consumers diferentes).

#### Sugestão 2 — `beneficiary-bank-data.ts:91-94` — duplicação trivial no `immutable({...})`

**Categoria:** G (clareza)
**Observação:** O return do `fromRaw` reconstrói o objeto campo-a-campo:

```ts
immutable({
  bankCode: input.bankCode,
  agency: input.agency,
  account: input.account,
  holderTaxId: input.holderTaxId,
  holderName: trimmedName,
}) as BeneficiaryBankData,
```

Alternativa mais concisa via spread:

```ts
immutable({ ...input, holderName: trimmedName }) as BeneficiaryBankData,
```

Equivalente semanticamente (input já é `Readonly<{...}>`, spread copia campos validados). Custo: nome `trimmedName` aparece 2× em vez de inline na propriedade. Trade-off pequeno.

**Não bloqueia** — formato explícito ajuda auditoria (cada campo é visível no return). Reviewer pode preferir a forma compacta.

#### Sugestão 3 — `beneficiary-bank-data.ts:107` — `equals` é arrow + && em cadeia

**Categoria:** G (clareza)
**Observação:** Cadeia `a.X === b.X && ... && TaxIdNs.equals(...)` é compacta mas não tem return type explícito no corpo da arrow (apenas na assinatura da função). Estilo é consistente com `equals` de `Money`, `Period`, etc. — sem ação necessária.

---

## O que está bom

### Auditoria automática — verdes

```
$ grep -nE "throw |\bclass\b|new Error|extends Error|: any\b|as any" beneficiary-bank-data.ts
(nenhum encontrado)

$ grep -nE "as BeneficiaryBankData" beneficiary-bank-data.ts
32: * Consumir com `import * as BeneficiaryBankData from ...`  (comentário JSDoc)
96:    }) as BeneficiaryBankData,                             (código — único cast)

$ grep -nE "^\s*(const|let)\s+(describe|it|test|assert|...)\s*=" ...test.ts
(nenhum encontrado)
```

- ✅ **Zero `throw`/`class`/`new Error`/`extends Error`/`any`/`as any`.**
- ✅ **`as BeneficiaryBankData` aparece exatamente 1 vez no código** (linha 96, return final do `fromRaw` após 5 validações). CA-22 satisfeita.
- ✅ **Zero shadowing de built-ins** no teste — lição FIN-VO-FITID W3 absorvida.

### Regexes coincidem com 000-request §2.2

| Item | §2.2 do request | Código (linha) | Match |
| :--- | :--- | :--- | :--- |
| bankCode | `/^\d{3}$/` | 71 | ✅ |
| agency | `/^\d{1,5}(-[\dXx])?$/` | 72 | ✅ |
| account | `/^\d{1,12}-[\dXx]$/` | 73 | ✅ |
| holderName max | 255 chars | 74 (`HOLDER_NAME_MAX = 255`) | ✅ |

### `equals` semântico via `TaxIdNs.equals`

```ts
TaxIdNs.equals(a.holderTaxId, b.holderTaxId);  // linha 107
```

**Crucial** — comparação `===` falharia para 2 `TaxId` distintos (criados por chamadas separadas de `fromString` com mesmo input). `TaxIdNs.equals` faz comparação field-by-field via `kind + digits/chars`.

CA-19 (equals iguais) validou implicitamente o contrato — passou GREEN sem patch.

### Fail-fast bem ordenado (D1 do 000-request)

```ts
1. bankCode  → bank-code-invalid    (linha 81)
2. agency    → agency-invalid       (linha 82)
3. account   → account-invalid      (linha 83)
4. trim
5. name=='' → holder-name-empty     (linha 86)
6. name>255 → holder-name-too-long  (linha 87)
```

Sequência declarativa e testada (CA-18 — bankCode + agency ambos errados retorna `bank-code-invalid`).

### Encapsulamento

```
$ grep -nE "^export " beneficiary-bank-data.ts
43:export type BeneficiaryBankData
54:export type BeneficiaryBankDataError
61:export type BeneficiaryBankDataInput
78:export const fromRaw
102:export const equals
```

**3 tipos + 2 funções públicas.** Regexes e `HOLDER_NAME_MAX` permanecem module-private.

### Header doc

- ✅ Cita `handbook/domain/04-titulos-liquidacao-context.md:23` literalmente (linha 10-11).
- ✅ Tabela ASCII com 5 campos + suas regras (linhas 19-25) — auditor vê tudo de relance.
- ✅ Documenta D1 fail-fast (linhas 27-29).
- ✅ Refere ao 000-request §2.2 para decisões detalhadas (linha 14-15).

### `holderName` trimado é o valor armazenado

```ts
const trimmedName = input.holderName.trim();        // linha 85
// ...
holderName: trimmedName,                            // linha 95
```

CA-15 (`'  Foo  '` → `'Foo'`) validou — `r.value.holderName === 'Foo'`. **Importante:** o VO guarda forma canônica trimada, não o input com espaços.

### Test file

- ✅ **Fixtures via IIFE com check de result** — `VALID_TAX_ID_CPF` falha cedo se TaxId.fromCpf retornar err. Boa rede de segurança contra fixtures quebradas.
- ✅ **`VALID_INPUT` canônico** + spread `{ ...VALID_INPUT, X: alterado }` em cada teste — DRY.
- ✅ **`equals` quebrado em 5 testes individuais** (1 por campo) — debugging trivial quando assertion falha.
- ✅ **CPF vs CNPJ comparados via `holderTaxId` differ** — exercita o path `TaxIdNs.equals` com kinds diferentes.
- ✅ **AAA explícito**, `classify` para evitar shadowing, exhaustive switch sobre 5 erros.

---

## Checklist explícita aplicada

| Categoria | Resultado |
| :--- | :--- |
| A. Regras absolutas | ✅ zero throw/class/this/any/extends Error; readonly nos campos do Brand; return types explícitos |
| B. Smart constructors / Branded | ✅ `fromRaw → Result<Brand, Error>`; `as <Brand>` único após validação completa; sync, puro; erros são string literal union |
| C. Discriminated unions | N/A — VO simples (não union) |
| D. Ports & Adapters | N/A |
| E. Modular Monolith | ✅ importa apenas `#src/shared/primitives/*` e `./tax-id.ts` (mesmo módulo); zero cross-module |
| F. ESM / NodeNext / TS moderno | ✅ extensão `.ts`; `import type` para `Brand` e `TaxId`; `type` inline em `{ type Result, ok, err }`; dual import documented |
| G. Naming, PT/EN, clareza | ✅ identifiers EN; erros kebab-case EN (`bank-code-invalid`, etc.); `Ns` suffix discreto |
| H. Tests | ✅ AAA, IIFE fixtures, sem mocks, sem fake-IDs, equals em 5 testes específicos |

---

## Marco — primeiro VO composto do módulo Financial

| Ticket | Tipo | Complexidade |
| :--- | :--- | :--- |
| FIN-MODULE-SCAFFOLD | infra (XS) | 0 |
| FIN-CLI-WIRE | infra (XS) | 0 |
| FIN-VO-FITID | VO primitivo (XS) | regex |
| FIN-IDS-PAYABLE | VO primitivo (XS) | UUID v4 |
| FIN-VO-TAX-ID | VO discriminated union (S) | módulo 11 + tabela ASCII |
| **FIN-VO-BENEFICIARY-BANK-DATA** | **VO composto (S)** | **5 campos + delega TaxId** |

Composição de tipos: TaxId embutido como campo branded, `equals` delegado. Pattern recursivo — agregados futuros (`Payable`) terão o mesmo padrão (`BeneficiaryBankData` embedded).

---

## Próximo passo

- **APPROVED** → pipeline-maestro avança para **W3**.
- Expectativa W3: **ALL-GREEN round 1** (todas as armadilhas lint conhecidas evitadas — sem indexed access, sem async, sem shadowing).
- Após W3 ALL-GREEN, `pnpm run pipeline:state close FIN-VO-BENEFICIARY-BANK-DATA`.
- **Próximo ticket sugerido:** `FIN-AGG-PAYABLE-CORE` (M) — agregado `Payable` no estado `Open` e `Approved`, com operação `approve()`. Salto qualitativo de VO → agregado.
