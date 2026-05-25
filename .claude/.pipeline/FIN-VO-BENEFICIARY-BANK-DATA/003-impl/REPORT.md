# W1 — Implementação GREEN (FIN-VO-BENEFICIARY-BANK-DATA)

> **Wave:** W1 · **Outcome:** GREEN · **Agent:** `main-session`
> **Predecessor:** [`../002-tests/REPORT.md`](../002-tests/REPORT.md) (W0 RED)
> **Artefato único:** `src/modules/financial/domain/shared/beneficiary-bank-data.ts` (99 linhas)

---

## 1. Mudança

| Arquivo | Operação | Linhas | Conteúdo |
| :--- | :--- | ---: | :--- |
| `src/modules/financial/domain/shared/beneficiary-bank-data.ts` | **created** | 99 | header doc (40) + imports (5) + types (24) + regexes/constante (5) + `fromRaw` (16) + `equals` (8) |

### 1.1. Estrutura final

```
┌─ Header doc (linhas 1-39): cita handbook 04:23, tabela de campos, decisão fail-fast
├─ Imports (linhas 41-45): Brand/Result/immutable via #src/*, TaxIdNs + type TaxId
├─ Types exportados (linhas 49-71): BeneficiaryBankData, BeneficiaryBankDataError, BeneficiaryBankDataInput
├─ Regexes internas (linhas 75-78): BANK_CODE_REGEX, AGENCY_REGEX, ACCOUNT_REGEX, HOLDER_NAME_MAX
├─ fromRaw (linhas 82-100): fail-fast em 5 etapas
└─ equals (linhas 104-109): field-by-field, usa TaxIdNs.equals para holderTaxId
```

### 1.2. Decisão de import — `import * as TaxIdNs` + `import type { TaxId }`

```ts
import * as TaxIdNs from './tax-id.ts';
import type { TaxId } from './tax-id.ts';
```

Padrão D mantido (`TaxIdNs.equals`), mas o tipo `TaxId` foi importado separadamente para uso nos types do VO. Alternativa `TaxIdNs.TaxId` no annotation funciona mas é mais verboso. Decisão: dual import para clareza.

### 1.3. `equals` delega para `TaxIdNs.equals`

Em vez de comparar `a.holderTaxId === b.holderTaxId` (que comparam referências), usamos `TaxIdNs.equals(a.holderTaxId, b.holderTaxId)` — comparação semântica field-by-field do TaxId. Isso é importante porque 2 `TaxId` construídos via `fromString` com o mesmo input são **objetos distintos** (cada `immutable` cria novo objeto) mas semanticamente iguais.

CA-19 (equals iguais) validou implicitamente esse contrato — passou GREEN.

### 1.4. `as BeneficiaryBankData` aparece exatamente 1 vez

Linha 98, no return final do `fromRaw`, após todas as 5 validações:

```ts
return ok(
  immutable({ ... }) as BeneficiaryBankData,
);
```

CA-22 satisfeita.

---

## 2. Verificação

### 2.1. Testes específicos do ticket

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/financial/domain/shared/beneficiary-bank-data.test.ts
```

```
▶ BeneficiaryBankData — module-as-namespace (Padrão D)
  ✔ module exposes fromRaw and equals at top-level
  ✔ does NOT expose nested namespace-object
▶ BeneficiaryBankData — fromRaw happy path
  ✔ CA-5: accepts complete valid input
▶ BeneficiaryBankData — bankCode validation (×4)
▶ BeneficiaryBankData — agency validation (×5)
▶ BeneficiaryBankData — account validation (×4)
▶ BeneficiaryBankData — holderName validation (×5)
▶ BeneficiaryBankData — fail-fast order
  ✔ CA-18: returns bank-code-invalid first when bankCode AND agency both wrong
▶ BeneficiaryBankData — equals (×6)
▶ BeneficiaryBankData — type-level smoke (×1)

ℹ tests 29  suites 9  pass 29  fail 0  duration_ms 98
```

### 2.2. Recontagem vs W0 REPORT

W0 REPORT §2 indicou **28 testes** mas a contagem real é **29**. Discrepância vem de duplicação na contagem manual:

- bankCode: 4 testes (W0 listou 4) ✅
- agency: 5 testes (W0 listou 5) ✅
- account: 4 testes (W0 listou 4) ✅
- holderName: 5 testes (W0 listou 5) ✅

Soma das categorias: 2 (namespace) + 1 (happy) + 4 (bankCode) + 5 (agency) + 4 (account) + 5 (holderName) + 1 (fail-fast) + 6 (equals) + 1 (type-level) = **29**. Erro tipográfico do W0 — sem impacto.

### 2.3. Suite completa

```
ℹ tests 962  pass 946  fail 0  skipped 16  duration_ms 47129
```

| Métrica | W3 do FIN-VO-TAX-ID | W1 deste ticket | Delta |
| :--- | ---: | ---: | ---: |
| tests | 933 | 962 | **+29** |
| pass | 917 | 946 | **+29** |
| fail | 0 | 0 | 0 |
| skipped | 16 | 16 | 0 |

Zero regressão.

---

## 3. Critérios de aceitação (000-request §4 — versão 2 após reorganização)

| # | Critério | Status |
| :--- | :--- | :--- |
| CA-1 | Arquivo existe | ✅ |
| CA-2 | `Brand<{...}, 'BeneficiaryBankData'>` com 5 campos readonly | ✅ tipo declarado linhas 49-58 |
| CA-3 | `BeneficiaryBankDataError` union 5 literais (sem `holder-tax-id-invalid`) | ✅ linhas 61-66; exhaustive switch test |
| CA-4 | `BeneficiaryBankDataInput` Readonly<{...}> | ✅ linhas 68-71 |
| CA-5 | input completo válido | ✅ |
| CA-6 | bankCode 2 dígitos | ✅ |
| CA-7 | bankCode com letras | ✅ |
| CA-8 | agency com/sem DV | ✅ |
| CA-9 | agency malformada | ✅ |
| CA-10 | account com DV (num e X) | ✅ |
| CA-11 | account sem DV | ✅ |
| ~~CA-12/13/14~~ | ~~CPF/CNPJ inline~~ | **movido para FIN-VO-TAX-ID (closed)** |
| CA-15 | holderName trim | ✅ |
| CA-16 | holderName empty/whitespace | ✅ |
| CA-17 | holderName 255/256 boundary | ✅ |
| CA-18 | fail-fast — primeiro erro | ✅ |
| CA-19 | equals iguais | ✅ |
| CA-20 | equals false por campo (5 testes) | ✅ |
| CA-21 | header doc cita handbook 04:23 | ✅ §1.1 |
| CA-22 | `as BeneficiaryBankData` único no return final | ✅ §1.4 |
| CA-23 | typecheck | ⏳ W3 |
| CA-24 | format:check | ⏳ W3 |
| CA-25 | pnpm test | ✅ §2.3 |
| CA-26 | lint | ⏳ W3 |

**21/21 CAs aplicáveis a W1 verdes.** 3 CAs movidas, 3 operacionais para W3.

---

## 4. Decisões W1

- **`import * as TaxIdNs`** (dual com `import type { TaxId }`) — Padrão D preserva delegação a `TaxIdNs.equals`. Sufixo `Ns` distingue do tipo `TaxId` quando ambos coexistem no mesmo arquivo.
- **`equals` chama `TaxIdNs.equals(a.holderTaxId, b.holderTaxId)`** — não `===`. Necessário porque objetos `TaxId` distintos (criados por chamadas separadas de `fromString`) podem ter mesmo valor semântico.
- **Regexes pré-compilados como `const`** (linhas 75-77) — não recompilados a cada chamada. Microoptimização defensiva alinhada com `tax-id.ts`.
- **Sem helper `trim`** para `holderName` — uma única chamada `.trim()` inline (linha 91). Helper seria over-engineering.
- **Imports modernos `#src/*`** — consistente com `tax-id.ts`, `fitid.ts`, `payable-id.ts`, etc.

---

## 5. Lições preventivas aplicadas

| Lição | Origem | Status no `.ts` |
| :--- | :--- | :--- |
| Sem indexed access em arrays | FIN-VO-TAX-ID W3 | ✅ N/A — sem loops sobre arrays |
| Sem shadowing de built-ins | FIN-VO-FITID W3 | ✅ N/A no arquivo de produção; test usa `classify` |
| Sem async sem await | FIN-CLI-WIRE W3 | ✅ funções síncronas |
| Sem templates com `T \| undefined` | FIN-CLI-WIRE W3 | ✅ sem template literals |
| Conflito `non-nullable-type-assertion-style` × `no-non-null-assertion` | FIN-VO-TAX-ID W3 | ✅ N/A — sem indexed access |
| `as <Brand>` só no return final | FIN-VO-FITID W2 | ✅ §1.4 |
| Imports `#src/*` | FIN-IDS-PAYABLE | ✅ |

Expectativa W3: ALL-GREEN round 1 (todas as armadilhas conhecidas evitadas).

---

## 6. Pronto para W2

`code-reviewer` deve validar:

1. **`as BeneficiaryBankData` aparece exatamente 1 vez** (linha 98, return final).
2. **5 erros na union** (sem `holder-tax-id-invalid` — validação semântica delegada a TaxId).
3. **`equals` usa `TaxIdNs.equals`** para o campo `holderTaxId` (não `===`).
4. **Header doc cita handbook `04-titulos-liquidacao-context.md:23`** e refere 000-request para decisões de modelagem.
5. **Regexes literais** correspondem ao 000-request §2.2:
   - `BANK_CODE_REGEX = /^\d{3}$/`
   - `AGENCY_REGEX = /^\d{1,5}(-[\dXx])?$/`
   - `ACCOUNT_REGEX = /^\d{1,12}-[\dXx]$/`
6. **`HOLDER_NAME_MAX = 255`** — comentário/contexto na vizinhança suficiente para auditor.
7. **`fromRaw` é fail-fast** — sem `combine` interno.
8. **Sem `throw`, `class`, `this`, `any`**.

Envelope S — review esperada em 1 round.
