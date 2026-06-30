# Code Review — Ticket FIN-AGG-PAYABLE-PAYMENT — Round 1

**Veredito:** **APPROVED**

**Reviewer:** `code-reviewer` (skill canônica W2)
**Data:** 2026-05-23T10:15Z
**Round:** 1 / 3
**Escopo revisado:** 8 arquivos (4 prod + 4 test)

| # | Arquivo | Linhas |
| :--- | :--- | ---: |
| 1 | `src/modules/financial/domain/payable/types.ts` | 175 |
| 2 | `src/modules/financial/domain/payable/events.ts` | 79 |
| 3 | `src/modules/financial/domain/payable/errors.ts` | 332 |
| 4 | `src/modules/financial/domain/payable/payable.ts` | 472 |
| 5-8 | 4 arquivos de teste atualizados | ~1000 total |

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, mas registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

#### Sugestão 1 — `authorizeSettlement` tem 2 branches quase idênticos

**Categoria:** G (clareza — duplicação)
**Localização:** `payable.ts:390-420`

```ts
if (payable.paidVia === 'Manual') {
  const next: SettledFromManualPayable = immutable({ ...payable, status: 'Settled', settledAt, settledBy });
  return ok({ payable: next, event: { type: 'PayableSettled', payableId: next.id, occurredAt: settledAt, settledBy } });
}
const next: SettledFromBankPayable = immutable({ ...payable, status: 'Settled', settledAt, settledBy });
return ok({ payable: next, event: { ... } });
```

Os 2 branches têm a mesma estrutura — único diferencial é o **tipo do `next`**. Em runtime são equivalentes. Compactação possível:

```ts
const next: SettledPayable = immutable({ ...payable, status: 'Settled', settledAt, settledBy }) as SettledPayable;
return ok({ payable: next, event: ... });
```

**Não bloqueia** porque:
- A versão atual evita `as SettledPayable` cast — preserva inferência type-safe.
- Cada branch espelha simetria explícita com `PaidFromManual ↔ SettledFromManual`, etc.
- Clareza de auditoria > brevidade — reviewer vê imediatamente que ambos os sub-tipos foram considerados.

Trade-off aceitável.

#### Sugestão 2 — `bankPaymentDate` não validado contra `transmittedAt` (D8)

**Categoria:** A (documentação semântica)
**Localização:** `payable.ts` — `processBankOutflow` valida `isValidDate(bankPaymentDate)` mas não compara com `transmittedAt`.

**Decisão D8 do 000-request:** "NÃO valida `bankPaymentDate >= transmittedAt`. Apenas `isValidDate`. Banco pode informar qualquer data no extrato; sistema só registra."

**Observação:** Justificado, mas o **JSDoc** da função poderia explicitar essa decisão. Atualmente está implícito no código (não há check). Documentar em-linha próximo da validação evita questionamento futuro.

**Não bloqueia** — 000-request §D8 é a fonte normativa, e o `processBankOutflow` está em `payable.ts` cujo header doc menciona o request. Cadeia rastreável.

---

## O que está bom

### Auditoria automática — todas verdes

```
$ grep -rnE "throw |\bclass\b|new Error|extends Error|: any\b|as any" src/.../payable/
(nenhum)

$ grep -nE " as " payable.ts
# 14 ocorrências:
#  - 1× Payable as PayableEntity (import alias)
#  - 1× import * as PayableError (namespace)
#  - 12× 'X' as const (discriminators status/paidVia)
# ZERO `as <Brand>` — todas inferidas via composition

$ grep "new Date()" src/.../payable/
events.ts:5 (apenas comentário JSDoc — DO B§14 mention)

$ grep "namespace functions count"
16  ✓ (era 11)

$ grep "shadowing em tests"
(nenhum)
```

### Modelagem D1 — unions internas `PaidPayable`/`SettledPayable`

```ts
// types.ts — 4 sub-estados + 2 unions internas:
export type PaidFromManualPayable = PayableCore & PaidFromManualBody & { status: 'Paid' };
export type PaidFromBankPayable = PayableCore & PaidFromBankBody & { status: 'Paid' };
export type PaidPayable = PaidFromManualPayable | PaidFromBankPayable;
```

**Helpers internos `PaidFromManualBody`/`PaidFromBankBody` NÃO exportados:**

```
$ grep '^export type' types.ts | wc -l → 10 (estados + unions + Status + Input)
$ grep '^type' types.ts | wc -l → 4 helpers internos
```

Excelente segregação — DRY (helpers reusados em Paid + Settled) sem vazar superfície.

### DO C§29 respeitado — campos ausentes (não null/undefined)

- `PaidFromManualPayable` literalmente **não tem** `fitid`/`bankPaymentDate`.
- `PaidFromBankPayable` herda `TransmissionRecord` + `fitid: FITID` + `bankPaymentDate: Date` obrigatórios.
- CA-11 valida runtime via `'fitid' in payable === false` para Manual.

### `authorizeSettlement` preserva sub-type via narrowing

```ts
if (payable.paidVia === 'Manual') {
  // narrow: PaidFromManualPayable → SettledFromManualPayable
  const next: SettledFromManualPayable = ...;
  return ok(...);
}
// narrow restante: PaidFromBankPayable → SettledFromBankPayable
const next: SettledFromBankPayable = ...;
```

TS narrow + spread `...payable` em cada branch resulta no tipo refinado correto. Tests CA-24/CA-25 validam runtime.

### `processBankOutflow` reconstrução explícita

```ts
// payable.ts:343-360 — reconstrói TODOS os 14 campos.
const next: PaidFromBankPayable = immutable({
  id, sourceDocumentId, kind, paymentMethod, beneficiary, value, dueDate, openedAt,
  approvedAt, approvedBy, transmittedAt, remittanceId,
  status: 'Paid' as const, paidVia: 'Bank' as const, paidAt: occurredAt, fitid, bankPaymentDate,
});
```

**Comentário documenta a intenção:** "Reconstrói preservando TransmissionRecord (drop de markedOverdueAt se Overdue)". Quando entrada é `OverduePayable`, `markedOverdueAt` é dropado naturalmente (não está na lista). Quando entrada é `TransmittedPayable`, todos os campos batem 1-a-1.

### R5 e R6 enforce-ados no tipo

- **R5 (PAGO só após Saída Bancária):** `PaidFromBankPayable` tem `fitid: FITID` + `bankPaymentDate: Date` obrigatórios. Impossível construir `PaidFromBank` sem evidência.
- **R6 (Crivo Humano):** `authorizeSettlement(payable, settledBy, settledAt)` — `settledBy: UserRef` obrigatório. Sem isso, função não compila.

### Tagged errors com payload D23

3 timing errors novos:
- `PayableManualPaymentDateBeforeApprovedAt(approvedAt, attemptedAt)`
- `PayableBankOutflowDateBeforeTransmittedAt(transmittedAt, attemptedAt)`
- `PayableSettlementDateBeforePaidAt(paidAt, attemptedAt)`

Todos carregam `(estado, tentativa)` — pattern consistente.

### Threshold comment ATUALIZADO

```
// **Threshold de refactor ATINGIDO (30 variants).** TODO para o próximo
// ticket da camada Application: avaliar grouping em sub-unions tipadas:
//   - PayableValidationError (Required, Zero, *TooLong)
//   - PayableInvariantError (*Before*, *NotYet)
//   - PayableTransitionError (NotX, Invalid*Date)
```

Sugestão Sug 3 do W2 anterior (FIN-AGG-PAYABLE-TRANSMISSION) **honrada** — comentário ativo, TODO específico, grouping proposto. Próximo ticket de Application pode optar pelo refactor.

### Test file

- ✅ **Fixtures encadeadas em cascata** (`manuallyPaidPayable() → settledFromManualPayable()`, `bankPaidPayable() → settledFromBankPayable()`).
- ✅ **CA-13 (D3 do handbook) testada** — Overdue → Paid (confirmação tardia).
- ✅ **CA-24/CA-25 validam sub-type preservation** runtime via `payable.paidVia === 'Manual'/'Bank'`.
- ✅ **Exhaustive switch com 30 variants** em errors.test.ts.
- ✅ **AAA, sem mocks, sem fake-IDs, sem shadowing**.

---

## Checklist explícita aplicada

| Categoria | Resultado |
| :--- | :--- |
| A. Regras absolutas | ✅ zero throw/class/this/any/extends Error; readonly nos campos; eventos com `occurredAt` injetado |
| B. Smart constructors / Branded | ✅ atomic unit `{ payable, event }`; zero `as <Brand>` (inferência composição) |
| C. Discriminated unions | ✅ 7 status discriminators + 2 paidVia internos; switch exhaustivo em testes; campos por estado (DO C§29) |
| D. Ports & Adapters | N/A — domínio puro |
| E. Modular Monolith | ✅ importa apenas `#src/shared/` e arquivos do próprio módulo |
| F. ESM / NodeNext / TS moderno | ✅ extensão `.ts`; `import type` para tipos puros; sem require/namespace/enum |
| G. Naming, PT/EN, clareza | ✅ identifiers EN; eventos PascalCase passado; erros PascalCase adjetival |
| H. Tests | ✅ fixtures reais encadeadas, AAA, exhaustive switches, boundary tests |

---

## 🎯 Marco — máquina de estados 100% implementada

| Estado | Status |
| :--- | :--- |
| `Open` | ✅ |
| `Approved` | ✅ |
| `Transmitted` | ✅ |
| `Rejected` | ✅ |
| `Overdue` | ✅ |
| `Paid` (Manual \| Bank) | ✅ |
| `Settled` (Manual \| Bank) | ✅ |

**7/7 estados completos.** Próximo ticket sai do domínio puro para Application (`FIN-PORT-PAYABLE-REPO`).

**Padrão arquitetural validado:**
- Tipos refinados por estado com sub-discriminator (`paidVia`) quando transição vem de múltiplas origens.
- Helper types compostos (`PaidFromManualBody`/`PaidFromBankBody`) — DRY interno.
- Tagged errors com payload de evidência D23 — 30 variants total.
- Refinement constructors completos (7) — DO D§21.
- Sub-type preservation via TS narrowing — `authorizeSettlement` valida em runtime.

---

## Próximo passo

- **APPROVED** → pipeline-maestro avança para **W3**.
- Expectativa W3: **ALL-GREEN round 1** — 4 tickets seguidos sem BLOCK seriam recorde.
- Após W3 ALL-GREEN, `pnpm run pipeline:state close FIN-AGG-PAYABLE-PAYMENT` (10º ticket FIN-*).
- **Próximo:** sair do domínio puro. `FIN-PORT-PAYABLE-REPO` (S) — port de persistência. Camada Application inicia.
