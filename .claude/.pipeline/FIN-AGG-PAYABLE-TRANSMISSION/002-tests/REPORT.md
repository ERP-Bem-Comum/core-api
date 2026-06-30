# W0 — Testes RED (FIN-AGG-PAYABLE-TRANSMISSION)

> **Wave:** W0 · **Outcome:** RED · **Agent:** `tdd-strategist` (via main-session)
> **Artefatos:** 4 arquivos de teste **editados** (não criados) — testes adicionados sobre os existentes de FIN-AGG-PAYABLE-CORE.

---

## 1. Estratégia de teste

Continuação dos arquivos existentes do agregado — sem novos arquivos. Cada um cresceu para cobrir os 3 novos estados + 4 transições:

| Arquivo | Testes antes | Testes agora | Δ |
| :--- | ---: | ---: | ---: |
| `types.test.ts` | 3 | 5 | +2 type-level (TransmittedPayable/RejectedPayable/OverduePayable shape) |
| `events.test.ts` | 4 | 8 | +4 shape de PayableTransmitted/Rejected/MarkedOverdue/ResetToApproved |
| `errors.test.ts` | 7 | 14 | +7 testes (constructors agrupados por categoria) |
| `payable.test.ts` | 14 | 35 | +21 (4 transições × ~5 + 3 parseX + happy paths) |
| **Total** | **28** | **62** | **+34** |

**Suite atual:** `pass 35 fail 28` (RED esperado — 35 testes do core continuam GREEN porque infra ainda funciona; 28 novos falham por `Payable.transmit is not a function`).

## 2. Cobertura de CAs (34 testes novos cobrindo CA-1..CA-29)

### `types.test.ts` (CA-1..CA-6) — 2 novos
- `TransmittedPayable has transmittedAt + remittanceId on top of ApprovalRecord`
- `RejectedPayable has rejectedAt + rejectionReason; OverduePayable has markedOverdueAt`
- (atualização do test "PayableStatus union" para 5 variants)

### `events.test.ts` (CA-6) — 4 novos
- `PayableTransmitted carries remittanceId`
- `PayableRejected carries rejectionReason`
- `PayableMarkedOverdue carries only payableId + occurredAt` (sem rejection/remittance)
- `PayableResetToApproved carries previousRejectionReason + previousRemittanceId` (D5 auditoria)

### `errors.test.ts` — 7 novos
- `payableNotApproved/Transmitted/Rejected carry currentStatus`
- `payableInvalidTransmissionDate/RejectionDate/OverdueDate/ResetDate` (sem payload)
- `payableTransmissionDateBeforeApprovedAt carries openedAt/attempted`
- `payableRejectionDateBeforeTransmittedAt carries transmittedAt/attempted`
- `payableOverdueBeforeDueDate carries dueDate/attempted` (R5 do handbook)
- `payableResetDateBeforeRejectedAt carries rejectedAt/attempted`
- `payableRejectionReasonRequired/TooLong`
- Exhaustive switch atualizado para **20 variants** (7 core + 13 novos)

### `payable.test.ts` — 21 novos (CA-7..CA-29)

| Transição | Testes |
| :--- | ---: |
| `transmit` (CA-7..CA-11) | 4 (happy + 3 invariantes) |
| `registerRejection` (CA-12..CA-17) | 6 (happy + 5 invariantes) |
| `markOverdue` (CA-18..CA-21) | 4 (happy + 3 invariantes) |
| `resetToApproved` (CA-22..CA-26) | 4 (happy + 3 invariantes) |
| `parseTransmitted/Rejected/Overdue` (CA-27..CA-29) | 3 (refinement constructors) |

## 3. Fixtures novas

```ts
const APPROVAL_DATE     = D('2026-05-25T00:00:00Z');
const TRANSMISSION_DATE = D('2026-05-26T00:00:00Z');
const REJECTION_DATE    = D('2026-05-27T00:00:00Z');
const OVERDUE_DATE      = D('2026-06-16T00:00:00Z'); // > dueDate (15/06)
const VALID_REJECTION_REASON = 'Agencia/conta invalida (motivo Bradesco AG)';

const approvedPayable = () => { /* IIFE pattern */ };
const transmittedPayable = () => { /* depende de Payable.transmit */ };
const rejectedPayable = () => { /* depende de Payable.registerRejection */ };
```

## 4. Saída RED

```
ℹ tests 63  pass 35  fail 28  duration_ms 133
```

### Causa raiz das 28 falhas

Todas com mesma forma: `TypeError: Payable.transmit is not a function`.

`Payable` é um objeto literal exportado de `payable.ts` (linha 107: `export const Payable = { open, approve, parseOpen, parseApproved }`). As 4 novas transições (`transmit`, `registerRejection`, `markOverdue`, `resetToApproved`) e 3 novos parses (`parseTransmitted`, `parseRejected`, `parseOverdue`) **ainda não existem** no objeto namespace.

Testes que usam fixtures de cascade (`transmittedPayable()` → `rejectedPayable()` → `parseOverdue`) falham em cascata na primeira chamada faltante.

Os **35 testes que passam** são os do FIN-AGG-PAYABLE-CORE (`open`, `approve`, `parseOpen`, `parseApproved`) — provam que a infra (Money, BeneficiaryBankData, TaxId, fixtures) continua funcional.

## 5. Diagnóstico RED — checklist

| Aspecto | OK? | Nota |
| :--- | :--- | :--- |
| Falhas por inexistência da API alvo | ✅ | `Payable.transmit is not a function` em todos |
| Testes do core continuam GREEN | ✅ | 35/35 pass — refactor `ApprovedPayable & ApprovalRecord` (W1) precisa preservar shape |
| Fixtures encadeadas via IIFE pattern | ✅ | `transmittedPayable() → rejectedPayable()` aproveitam transições reais |
| Boundary tests cobertos | ✅ | malformação date, timing < expected, reason vazia, reason >500, dueDate match |
| Tagged errors com payload validados | ✅ | `approvedAt/attempted`, `transmittedAt/attempted`, `dueDate/attempted`, `rejectedAt/attempted`, `currentStatus` em NotX |
| R5 do handbook (Atrasado só após dueDate) | ✅ | CA-21 testa `at === dueDate` (mesmo dia, ainda não venceu) → erro |
| Lições preventivas aplicadas | ✅ | sem shadowing, sem indexed access, sem async-sem-await |

## 6. Lista pronta para W1

Implementer (main-session) deve **editar** 4 arquivos existentes:

### 6.1. `types.ts` — adicionar 3 estados via helper composição

```ts
type ApprovalRecord = Readonly<{ approvedAt: Date; approvedBy: UserRef }>;
type TransmissionRecord = ApprovalRecord & Readonly<{
  transmittedAt: Date;
  remittanceId: RemittanceId;
}>;

export type ApprovedPayable = PayableCore & ApprovalRecord & Readonly<{ status: 'Approved' }>;
export type TransmittedPayable = PayableCore & TransmissionRecord & Readonly<{ status: 'Transmitted' }>;
export type RejectedPayable = PayableCore & TransmissionRecord & Readonly<{
  status: 'Rejected';
  rejectedAt: Date;
  rejectionReason: string;
}>;
export type OverduePayable = PayableCore & TransmissionRecord & Readonly<{
  status: 'Overdue';
  markedOverdueAt: Date;
}>;

export type Payable = OpenPayable | ApprovedPayable | TransmittedPayable | RejectedPayable | OverduePayable;
```

### 6.2. `events.ts` — adicionar 4 variants

```ts
export type PayableEvent = Readonly<
  | { type: 'PayableOpened'; payableId; occurredAt }
  | { type: 'PayableApproved'; payableId; occurredAt; approvedBy }
  | { type: 'PayableTransmitted'; payableId; occurredAt; remittanceId: RemittanceId }
  | { type: 'PayableRejected'; payableId; occurredAt; rejectionReason: string }
  | { type: 'PayableMarkedOverdue'; payableId; occurredAt }
  | {
      type: 'PayableResetToApproved';
      payableId;
      occurredAt;
      previousRejectionReason: string;
      previousRemittanceId: RemittanceId;
    }
>;
```

### 6.3. `errors.ts` — adicionar 13 erros + constructors

13 variants novos. Total union: 20. Tabela com tag/payload em `payable.test.ts:errors.test.ts`.

### 6.4. `payable.ts` — adicionar 4 transições + 3 parseX

```ts
const transmit = (payable, remittanceId, at) => { /* fail-fast */ };
const registerRejection = (payable, reason, at) => { /* fail-fast */ };
const markOverdue = (payable, at) => { /* require at > dueDate */ };
const resetToApproved = (payable, at) => { /* drop tx/rejection fields */ };

const parseTransmitted = (p) => ...;
const parseRejected = (p) => ...;
const parseOverdue = (p) => ...;

export const Payable = {
  open, approve, transmit, registerRejection, markOverdue, resetToApproved,
  parseOpen, parseApproved, parseTransmitted, parseRejected, parseOverdue,
};
```

**Esperar `tests 62 pass 62 fail 0`** após W1 (35 do core + 27 novos efetivos; tests count 62/63 dependendo se algum type-level smoke conta como duplicado).
