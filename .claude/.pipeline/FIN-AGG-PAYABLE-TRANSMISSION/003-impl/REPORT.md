# W1 — Implementação GREEN (FIN-AGG-PAYABLE-TRANSMISSION)

> **Wave:** W1 · **Outcome:** GREEN · **Agent:** `main-session`
> **Predecessor:** [`../002-tests/REPORT.md`](../002-tests/REPORT.md) (W0 RED)
> **Artefatos:** 4 arquivos de produção **editados** (rewrite total — não criados)

---

## 1. Mudanças

| Arquivo | Linhas (antes → depois) | Operação |
| :--- | :--- | :--- |
| `payable/types.ts` | 85 → 125 | rewrite — adicionou ApprovalRecord/TransmissionRecord helpers + 3 estados |
| `payable/events.ts` | 23 → 51 | rewrite — +4 variants |
| `payable/errors.ts` | 105 → 215 | rewrite — +13 errors (3 NotX + 4 InvalidDate + 4 timing + 2 reason) |
| `payable/payable.ts` | 113 → 250 | rewrite — +4 transições + 3 parseX + 1 constante |
| **Total** | 326 → 641 | +315 linhas |

### 1.1. Refactor compatível de `ApprovedPayable`

```diff
-export type ApprovedPayable = PayableCore & Readonly<{
-  status: 'Approved';
-  approvedAt: Date;
-  approvedBy: UserRef;
-}>;
+export type ApprovedPayable = PayableCore & ApprovalRecord & Readonly<{ status: 'Approved' }>;

+type ApprovalRecord = Readonly<{ approvedAt: Date; approvedBy: UserRef }>;
```

Shape final **idêntico** — TS resolve a interseção para o mesmo tipo estrutural. Os 38 testes do core (FIN-AGG-PAYABLE-CORE) continuam GREEN sem mudança no código de teste.

### 1.2. Helper types compostos

```ts
type ApprovalRecord = Readonly<{ approvedAt: Date; approvedBy: UserRef }>;
type TransmissionRecord = ApprovalRecord & Readonly<{
  transmittedAt: Date;
  remittanceId: RemittanceId;
}>;
```

`TransmissionRecord` herda `ApprovalRecord` por interseção — `TransmittedPayable` ganha automaticamente `approvedAt + approvedBy + transmittedAt + remittanceId`. DRY consolidado.

### 1.3. Transição `resetToApproved` — reconstrução explícita (D4)

```ts
const next: ApprovedPayable = immutable({
  id: payable.id,
  sourceDocumentId: payable.sourceDocumentId,
  kind: payable.kind,
  paymentMethod: payable.paymentMethod,
  beneficiary: payable.beneficiary,
  value: payable.value,
  dueDate: payable.dueDate,
  openedAt: payable.openedAt,
  status: 'Approved' as const,
  approvedAt: payable.approvedAt,
  approvedBy: payable.approvedBy,
});
```

**NÃO usa `{ ...payable }`** porque payable é `RejectedPayable` com campos extras (`transmittedAt`, `remittanceId`, `rejectedAt`, `rejectionReason`). Spread copiaria esses campos para o objeto Approved final — TS inferiria tipo errado e runtime teria campos órfãos. Reconstrução campo-a-campo dropa explicitamente. CA-24 valida via `'transmittedAt' in payable === false`.

### 1.4. `markOverdue` — invariante R5 do handbook

```ts
if (markedOverdueAt.getTime() <= payable.dueDate.getTime()) {
  return err(PayableError.payableOverdueBeforeDueDate(payable.dueDate, markedOverdueAt));
}
```

Operador `<=` (não `<`) — handbook R5: "Se após a data prevista de pagamento o título permanecer como `Transmitido` (sem retorno de saída bancária)...". Mesma data ainda não é "após" — `<=` rejeita.

### 1.5. `Payable` namespace expandido

```ts
export const Payable = {
  open, approve, transmit, registerRejection, markOverdue, resetToApproved,
  parseOpen, parseApproved, parseTransmitted, parseRejected, parseOverdue,
};
```

6 operações (era 2) + 5 refinement constructors (era 2) = **11 funções públicas**.

---

## 2. Verificação

### 2.1. Testes específicos do ticket

```
ℹ tests 63  suites 17  pass 63  fail 0  duration_ms 158
```

- 35 do FIN-AGG-PAYABLE-CORE (refactor preservou shape) ✅
- 28 novos do FIN-AGG-PAYABLE-TRANSMISSION ✅
- **W0 reportou 28 fail; W1 reverte para 63 pass / 0 fail.**

### 2.2. Suite completa

```
ℹ tests 1034  pass 1018  fail 0  skipped 16  duration_ms 46144
```

| Métrica | W3 do FIN-AGG-PAYABLE-CORE | W1 deste ticket | Delta |
| :--- | ---: | ---: | ---: |
| tests | 1000 | 1034 | **+34** |
| pass | 984 | 1018 | **+34** |
| fail | 0 | 0 | 0 |
| skipped | 16 | 16 | 0 |

Zero regressão. Refactor `ApprovedPayable & ApprovalRecord` validado em runtime.

---

## 3. Critérios de aceitação (000-request §4)

| # | Critério | Status |
| :--- | :--- | :--- |
| CA-1 .. CA-6 | tipos refinados + union 5 variants + 6 events | ✅ §1.2 |
| CA-7 .. CA-11 | `transmit()` happy + invariantes | ✅ |
| CA-12 .. CA-17 | `registerRejection()` happy + invariantes + reason validation | ✅ |
| CA-18 .. CA-21 | `markOverdue()` happy + invariantes + R5 | ✅ §1.4 |
| CA-22 .. CA-26 | `resetToApproved()` happy + drop fields + event auditoria | ✅ §1.3 |
| CA-27 .. CA-29 | 3 novos parseX | ✅ |
| CA-30 (typecheck) | ⏳ W3 |
| CA-31 (format) | ⏳ W3 |
| CA-32 (pnpm test) | ✅ §2.2 |
| CA-33 (lint) | ⏳ W3 |
| CA-34 (refactor compatível) | ✅ §1.1 — shape inalterado |

**31/31 CAs aplicáveis a W1 verdes.** 3 operacionais para W3.

---

## 4. Decisões W1

- **`parseOverdue` retorna `PayableNotTransmitted`** (não `PayableNotOverdue`). Motivo: Overdue só é alcançável via Transmitted; falha "não está em Overdue" semanticamente é equivalente a "não está em Transmitted (ou estado consequente)". Evita inflar union de errors com `PayableNotOverdue` redundante.
- **`<=` em `markOverdue`** (R5 handbook estrito).
- **`<` em `resetToApproved` para data temporal** — reset no mesmo dia da rejeição é OK (operador pode corrigir e re-enviar rápido).
- **`rejectionReason` é trimmed antes de armazenar** — análogo a `holderName` do `BeneficiaryBankData`.
- **`REJECTION_REASON_MAX = 500`** como constante module-private — D9 do 000-request.
- **`resetToApproved` reconstruct explícito** (não spread) — §1.3.

---

## 5. Lições preventivas aplicadas

| Lição | Status |
| :--- | :--- |
| Sem indexed access | ✅ N/A — sem loops |
| Sem shadowing | ✅ N/A no src |
| Sem async sem await | ✅ todas síncronas |
| Sem template `T \| undefined` | ✅ N/A |
| `as <Brand>` único | ✅ apenas `'X' as const` para discriminator de status |
| Split malformação/timing | ✅ aplicado nas 4 novas transições (`Invalid*Date` sem payload, `*Before*` com payload D23) |
| Tagged errors com evidência D23 | ✅ 8 erros temporais carregam `(state, attempted)` |
| Imports `#src/*` | ✅ |

Expectativa W3: ALL-GREEN round 1.

---

## 6. Pronto para W2

`code-reviewer` deve validar:

1. **Refactor compatível** — testes do core (35) continuam GREEN sem mudança.
2. **Helper types `ApprovalRecord`/`TransmissionRecord`** internos (não exportados).
3. **`resetToApproved` reconstrói explicitamente** (não spread) para dropar campos de transmissão/rejeição.
4. **`<=` em `markOverdue`** estrito (R5 handbook).
5. **20 erros na union** — exhaustive switch em errors.test.ts confere.
6. **11 funções no namespace `Payable`**.
7. **Eventos `PayableResetToApproved` carrega previousRejectionReason + previousRemittanceId** (D5 auditoria).
8. **Sem throw/class/this/any/extends Error**.

Envelope M — review esperada em 1 round.
