# W0 — Testes RED (FIN-AGG-PAYABLE-PAYMENT)

> **Wave:** W0 · **Outcome:** RED · **Agent:** `tdd-strategist` (via main-session)
> **Artefatos:** 4 arquivos de teste **editados** (continuação dos arquivos do agregado Payable).

---

## 1. Estratégia de teste

Continuação dos arquivos existentes — cresceram para cobrir os 2 estados terminais (`Paid`, `Settled`) com sub-tipos (Manual / Bank) e 3 transições novas.

| Arquivo | Antes | Agora | Δ |
| :--- | ---: | ---: | ---: |
| `types.test.ts` | 5 | 8 | +3 (PaidPayable narrowing, PaidFromManual/Bank shape, SettledPayable preservation) |
| `events.test.ts` | 8 | 11 | +3 (PayablePaidManually, PayableBankOutflowConfirmed, PayableSettled) |
| `errors.test.ts` | 14 | 20 | +6 (5 constructor tests + exhaustive switch 21→30) |
| `payable.test.ts` | 35 | 55 | +20 (3 transições × ~5 + 2 parses + boundary CA-14 split) |
| **Total** | **62** | **94** | **+32** |

**Suite atual:** `pass 70 fail 24` (RED esperado — 70 são CORE + TRANSMISSION que continuam GREEN; 24 novos falham por `Payable.registerManualPayment is not a function`).

## 2. Cobertura de CAs

### `types.test.ts` (CA-1..CA-5)
- `PayableStatus` union de **7 variants** (atualizado de 5)
- `PaidFromManualPayable` shape: `paidVia: 'Manual'`, sem `fitid`
- `PaidFromBankPayable` shape: `paidVia: 'Bank'` + `fitid` + `bankPaymentDate`
- `PaidPayable` discriminated union narrows via `paidVia`
- `SettledPayable` preserva sub-tipo

### `events.test.ts` (CA-6) — 3 novos + exhaustive 9 variants
- `PayablePaidManually` carrega `paidAt` + `paymentRegisteredBy`
- `PayableBankOutflowConfirmed` carrega `fitid` + `bankPaymentDate` (R5 evidência)
- `PayableSettled` carrega `settledBy` (R6 Crivo Humano)

### `errors.test.ts` — 5 constructors + exhaustive switch 30 variants
- `payableNotPaid` / `payableNotTransmittedOrOverdue` carry `currentStatus`
- 4 `payableInvalid*Date` (malformação, sem payload)
- 3 timing errors com payload D23
- Exhaustive switch 30 cases

### `payable.test.ts` (CA-7..CA-27) — 20 novos
- `registerManualPayment`: 4 (happy + 3 invariants)
- `processBankOutflow` from Transmitted: 6 (happy + 5 invariants)
- `processBankOutflow` from Overdue (D3): 1 (happy)
- `authorizeSettlement`: 5 (2 happy preservando sub-type + 3 invariants)
- `parsePaid` / `parseSettled`: 3

## 3. Fixtures novas

```ts
const MANUAL_PAY_DATE     = D('2026-05-26T00:00:00Z'); // > APPROVAL_DATE
const BANK_OUTFLOW_DATE   = D('2026-05-27T00:00:00Z'); // > TRANSMISSION_DATE
const BANK_PAYMENT_DATE   = D('2026-05-27T00:00:00Z');
const SETTLEMENT_DATE     = D('2026-05-28T00:00:00Z');

const OPERATOR = APPROVER; // reuso UserRef
const GESTOR = APPROVER;
const VALID_FITID = FITID.fromString('FITID-BRADESCO-12345')...

const manuallyPaidPayable = () => Payable.registerManualPayment(approvedPayable(), OPERATOR, MANUAL_PAY_DATE);
const bankPaidPayable = () => Payable.processBankOutflow(transmittedPayable(), VALID_FITID, BANK_PAYMENT_DATE, BANK_OUTFLOW_DATE);
```

## 4. Saída RED

```
ℹ tests 94  pass 70  fail 24  skipped 0  duration_ms 150
```

### 4.1. Causa raiz dos 24 fails

Todos com a mesma forma: `TypeError: Payable.registerManualPayment is not a function`. As 3 novas transições + 2 novos parses ainda não existem no objeto `Payable` exportado.

**70 testes continuam GREEN** — provam que CORE (35) + TRANSMISSION (28 — alguns reorganizados, +1 do PayableNotOverdue) seguem intactos. Refactor "compatível" obrigatório em W1.

## 5. Diagnóstico RED — checklist

| Aspecto | OK? | Nota |
| :--- | :--- | :--- |
| Falhas por inexistência da API alvo | ✅ | `Payable.X is not a function` |
| Testes anteriores continuam GREEN | ✅ | 70/70 dos predecessores |
| Fixtures encadeadas (manuallyPaid/bankPaid) | ✅ | usam transições reais — RED em cascata |
| Boundary tests | ✅ | malformação date, timing < expected, sub-type preservation |
| Tagged errors com payload D23 | ✅ | 3 timing errors carregam `(state, attempted)` |
| Sub-type preservation testada | ✅ | CA-24 (Manual) + CA-25 (Bank) explícitos |
| R3 do handbook (Atrasado → Pago tardio) | ✅ | CA-13 |
| R5 (Saída Bancária = PAGO) | ✅ | fitid + bankPaymentDate em PaidFromBank |
| R6 (Crivo Humano) | ✅ | settledBy obrigatório em authorizeSettlement |

## 6. Lista pronta para W1

Implementer (main-session) deve **editar** 4 arquivos:

### 6.1. `types.ts` — adicionar 4 sub-estados + 2 unions internas

```ts
type PaidFromManualBody = ApprovalRecord & Readonly<{
  paidAt: Date;
  paidVia: 'Manual';
  paymentRegisteredBy: UserRef;
}>;
type PaidFromBankBody = TransmissionRecord & Readonly<{
  paidAt: Date;
  paidVia: 'Bank';
  fitid: FITID;
  bankPaymentDate: Date;
}>;

export type PaidFromManualPayable = PayableCore & PaidFromManualBody & Readonly<{ status: 'Paid' }>;
export type PaidFromBankPayable = PayableCore & PaidFromBankBody & Readonly<{ status: 'Paid' }>;
export type SettledFromManualPayable = PayableCore & PaidFromManualBody & Readonly<{
  status: 'Settled'; settledAt: Date; settledBy: UserRef;
}>;
export type SettledFromBankPayable = PayableCore & PaidFromBankBody & Readonly<{
  status: 'Settled'; settledAt: Date; settledBy: UserRef;
}>;

export type PaidPayable = PaidFromManualPayable | PaidFromBankPayable;
export type SettledPayable = SettledFromManualPayable | SettledFromBankPayable;

export type Payable = OpenPayable | ApprovedPayable | TransmittedPayable | RejectedPayable | OverduePayable | PaidPayable | SettledPayable;
```

### 6.2. `events.ts` — adicionar 3 variants

### 6.3. `errors.ts` — adicionar 9 errors (union 21→30) + comentário threshold atualizado

### 6.4. `payable.ts` — adicionar 3 transições + 2 parseX + update namespace

```ts
const registerManualPayment = (payable, by, paidAt) => {...};
const processBankOutflow = (payable, fitid, bankPaymentDate, occurredAt) => {...};
const authorizeSettlement = (payable, by, settledAt) => {...};
const parsePaid = (p): Result<PaidPayable, PayableNotPaid> => ...;
const parseSettled = (p): Result<SettledPayable, PayableNotPaid> => ...;

export const Payable = {
  open, approve, transmit, registerRejection, markOverdue, resetToApproved,
  registerManualPayment, processBankOutflow, authorizeSettlement,
  parseOpen, parseApproved, parseTransmitted, parseRejected, parseOverdue,
  parsePaid, parseSettled,
};
```

Total funções no namespace: **16** (era 11).

Esperar **`tests 94 pass 94 fail 0`** após W1.
