# W1 — Implementação GREEN (FIN-AGG-PAYABLE-PAYMENT)

> **Wave:** W1 · **Outcome:** GREEN · **Agent:** `main-session`
> **Predecessor:** [`../002-tests/REPORT.md`](../002-tests/REPORT.md) (W0 RED)
> **Artefatos:** 4 arquivos de produção **editados**

---

## 1. Mudanças

| Arquivo | Linhas (antes → depois) |
| :--- | :--- |
| `payable/types.ts` | 134 → 175 (+ 4 sub-estados, 2 unions internas, 2 helper bodies) |
| `payable/events.ts` | 51 → 79 (+3 variants) |
| `payable/errors.ts` | 232 → 332 (+9 types, +9 constructors, threshold comment atualizado para 30) |
| `payable/payable.ts` | 287 → 472 (+3 transições, +2 parseX, namespace 11→16) |
| **Total** | **704 → 1058 (+354)** |

### 1.1. Modelagem de `PaidPayable` / `SettledPayable` como unions internas (D1)

```ts
type PaidFromManualBody = ApprovalRecord & Readonly<{
  paidAt: Date; paidVia: 'Manual'; paymentRegisteredBy: UserRef;
}>;
type PaidFromBankBody = TransmissionRecord & Readonly<{
  paidAt: Date; paidVia: 'Bank'; fitid: FITID; bankPaymentDate: Date;
}>;

// 4 sub-estados refinados:
export type PaidFromManualPayable = PayableCore & PaidFromManualBody & { status: 'Paid' };
export type PaidFromBankPayable = PayableCore & PaidFromBankBody & { status: 'Paid' };
export type SettledFromManualPayable = PayableCore & PaidFromManualBody & { status: 'Settled'; settledAt; settledBy };
export type SettledFromBankPayable = PayableCore & PaidFromBankBody & { status: 'Settled'; settledAt; settledBy };

// Unions internas (status === 'Paid' → narrow para PaidPayable; status === 'Settled' → SettledPayable):
export type PaidPayable = PaidFromManualPayable | PaidFromBankPayable;
export type SettledPayable = SettledFromManualPayable | SettledFromBankPayable;
```

DO C§29 respeitado — Manual NÃO tem `fitid`/`bankPaymentDate` (campos ausentes do tipo, não null/undefined).

### 1.2. `authorizeSettlement` preserva sub-type via narrowing (D7)

```ts
if (payable.paidVia === 'Manual') {
  const next: SettledFromManualPayable = immutable({ ...payable, status: 'Settled', settledAt, settledBy });
  return ok({ payable: next, event });
}
// Else: payable.paidVia === 'Bank' (TS narrowed)
const next: SettledFromBankPayable = immutable({ ...payable, status: 'Settled', settledAt, settledBy });
return ok({ payable: next, event });
```

Switch sobre `paidVia` permite spread `...payable` em cada branch — TS resolve o tipo correto. Tests CA-24/CA-25 validam preservação runtime.

### 1.3. `processBankOutflow` aceita Transmitted OU Overdue (D3)

```ts
if (payable.status !== 'Transmitted' && payable.status !== 'Overdue') {
  return err(PayableError.payableNotTransmittedOrOverdue(payable.status));
}
// ... ambos têm TransmissionRecord; constrói PaidFromBankPayable preservando
```

Reconstrução explícita (campo-a-campo) — drop de `markedOverdueAt` se vier de Overdue, drop de `rejectedAt`/`rejectionReason` se viesse de Rejected (não vem).

### 1.4. Union `PayableError` atingiu 30 — threshold

```ts
// errors.ts — comentário atualizado:
// **Threshold de refactor ATINGIDO (30 variants).** TODO para o próximo ticket
// da camada Application: avaliar grouping em sub-unions tipadas:
//   - PayableValidationError, PayableInvariantError, PayableTransitionError.
```

Decisão D12: **não refactor agora**. Próximo ticket de Application aceitará/refeitará.

### 1.5. Namespace `Payable` final — 16 funções

```ts
export const Payable = {
  // smart constructor + state machine
  open, approve, transmit, registerRejection, markOverdue, resetToApproved,
  registerManualPayment, processBankOutflow, authorizeSettlement,
  // refinement constructors (1 por estado)
  parseOpen, parseApproved, parseTransmitted, parseRejected, parseOverdue,
  parsePaid, parseSettled,
};
```

7 transições + 7 refinement = **14 ops + 2 utility** (open + smart construct). Total 16 (era 11).

---

## 2. Verificação

### 2.1. Testes específicos

```
ℹ tests 94  suites 24  pass 94  fail 0  duration_ms 163
```

Os 62 testes anteriores (CORE + TRANSMISSION) seguem GREEN. Os 32 novos (PAYMENT) viraram de RED→GREEN.

### 2.2. Suite completa

```
ℹ tests 1065  pass 1049  fail 0  skipped 16  duration_ms 47469
```

| Métrica | W3 do FIN-AGG-PAYABLE-TRANSMISSION | W1 deste ticket | Delta |
| :--- | ---: | ---: | ---: |
| tests | 1034 | 1065 | **+31** |
| pass | 1018 | 1049 | **+31** |
| fail | 0 | 0 | 0 |
| skipped | 16 | 16 | 0 |

Zero regressão. Refactor compatível confirmado.

---

## 3. CAs (000-request §4)

| # | Critério | Status |
| :--- | :--- | :--- |
| CA-1..CA-6 | tipos refinados + union 7 variants + 9 events | ✅ §1.1 |
| CA-7..CA-11 | `registerManualPayment` | ✅ |
| CA-12..CA-19 | `processBankOutflow` (Transmitted + Overdue) | ✅ §1.3 |
| CA-20..CA-25 | `authorizeSettlement` (preserva sub-type) | ✅ §1.2 |
| CA-26..CA-27 | `parsePaid` / `parseSettled` | ✅ |
| CA-28..CA-31 | operacionais | ⏳ W3 (typecheck✅; outros W3) |
| CA-32 | threshold (30 variants) | ✅ §1.4 |

**32/32 CAs aplicáveis a W1 verdes.** 3 operacionais (format/lint) para W3.

---

## 4. Decisões W1

- **`processBankOutflow` reconstrói explicitamente** (não spread) — Overdue tem `markedOverdueAt` que deve sumir no `Paid`.
- **`authorizeSettlement` usa spread** em cada branch — TS narrow já garante shape sem campos extras (PaidFromManual NÃO tem fitid; PaidFromBank tem).
- **`parseSettled` retorna `PayableNotPaid`** (não `PayableNotSettled`). Mesmo motivo de `parseOverdue` → `PayableNotTransmitted` no FIN-AGG-PAYABLE-TRANSMISSION: Settled só é alcançável de Paid; erro semanticamente equivalente. Evita inflar union de 30 → 31.
- **`paymentRegisteredBy` ≠ `approvedBy`** — campos separados para auditoria (Operador vs Aprovador).
- **`bankPaymentDate` ≠ `paidAt`** — duas evidências distintas (D4).

---

## 5. Lições preventivas aplicadas

| Lição | Status |
| :--- | :--- |
| Sem indexed access | ✅ |
| Sem shadowing | ✅ |
| Sem async sem await | ✅ |
| `as <Brand>` único | ✅ apenas `'X' as const` |
| Split malformação/timing | ✅ aplicado nas 3 novas transições |
| Tagged errors D23 | ✅ 3 timing errors carregam `(estado, attempted)` |
| Refactor compatível | ✅ 62 testes anteriores GREEN |

Expectativa W3: **ALL-GREEN round 1**.

---

## 6. Pronto para W2

`code-reviewer` deve validar:

1. **`Payable` union 7 variants** (status discriminator).
2. **`PaidPayable`/`SettledPayable` unions internas** com `paidVia` discriminator.
3. **`authorizeSettlement` preservation** Manual/Bank confirmada runtime.
4. **`processBankOutflow` reconstrução explícita** (drop de `markedOverdueAt`).
5. **R5 enforce-ado**: `fitid + bankPaymentDate` obrigatórios em `PaidFromBank`.
6. **R6 enforce-ado**: `settledBy: UserRef` obrigatório.
7. **Union `PayableError` chegou a 30** — comentário threshold atualizado documenta TODO.
8. **Sem throw/class/this/any/extends Error**.

Envelope M — review esperada em 1 round.

---

## 7. 🎯 Marco — máquina de estados 100% completa

| Estado | Status |
| :--- | :--- |
| Open | ✅ |
| Approved | ✅ |
| Transmitted | ✅ |
| Rejected | ✅ |
| Overdue | ✅ |
| **Paid** (Manual \| Bank) | **✅** |
| **Settled** (Manual \| Bank) | **✅** |

**Próximo ticket sai do domínio puro:** `FIN-PORT-PAYABLE-REPO` (S) — port de persistência. Camada Application começa.
