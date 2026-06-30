# Code Review — Ticket FIN-AGG-PAYABLE-TRANSMISSION — Round 1

**Veredito:** **APPROVED**

**Reviewer:** `code-reviewer` (skill canônica W2)
**Data:** 2026-05-23T09:43Z
**Round:** 1 / 3
**Escopo revisado:** 8 arquivos (4 prod + 4 test)

| # | Arquivo | Linhas |
| :--- | :--- | ---: |
| 1 | `src/modules/financial/domain/payable/types.ts` | 134 |
| 2 | `src/modules/financial/domain/payable/events.ts` | 51 |
| 3 | `src/modules/financial/domain/payable/errors.ts` | 226 |
| 4 | `src/modules/financial/domain/payable/payable.ts` | 314 |
| 5-8 | 4 arquivos de teste atualizados | ~720 total |

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, mas registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

#### Sugestão 1 — `parseOverdue` retorna `PayableNotTransmitted`, não `PayableNotOverdue`

**Categoria:** G (clareza de tipo de retorno)
**Localização:** `payable.ts:283-288`

```ts
const parseOverdue = (
  payable: PayableEntity,
): Result<OverduePayable, PayableError.PayableNotTransmitted> =>
  payable.status === 'Overdue'
    ? ok(payable)
    : err(PayableError.payableNotTransmitted(payable.status));
```

**Observação:** `parseOverdue` retorna o erro `PayableNotTransmitted` (não `PayableNotOverdue`). REPORT W1 §4 explica a decisão: "Overdue só é alcançável via Transmitted; falha semanticamente equivalente". Trade-off válido (evita inflar union de 20 → 21 erros), mas a assinatura do tipo de retorno pode confundir alguém lendo apenas o cabeçalho — `parseOverdue` falhando com `PayableNotTransmitted` é semanticamente surpreendente.

**Não bloqueia** — decisão documentada em REPORT W1 §4, payload `currentStatus` carrega o estado real (incluindo `'Overdue'` quando aplicável). Reviewer/maintainer futuro pode questionar; documentação atual é suficiente.

#### Sugestão 2 — `REJECTION_REASON_MAX = 500` sem citação de fonte

**Categoria:** G (rastreabilidade de constantes mágicas)
**Localização:** `payable.ts:46`

```ts
const REJECTION_REASON_MAX = 500;
```

**Observação:** O 000-request §2.2 D9 diz "Codes Bradesco CNAB 240 são descritivos. 500 é margem." Mas isso não está no código. Sugestão: comentário acima da constante citando "CNAB 240 segmento Z/T retorno bancário, campo descritivo de motivo de erro" ou similar.

**Não bloqueia** — constante interna, não exportada; quem mexer precisa ler o 000-request para entender. Padrão de outros módulos é semelhante (`MAX_LENGTH = 255` em `fitid.ts` cita OFX 2.x §11.4.2 — exemplo bom de seguir).

#### Sugestão 3 — Union `PayableError` com 20 variants cresce rápido

**Categoria:** A (escalabilidade da API de erros)
**Localização:** `errors.ts:118-138`

**Observação:** A union foi de 7 → 20 com este ticket. Próximos tickets (`FIN-AGG-PAYABLE-PAYMENT` — Paid/Settled) podem adicionar +5-7 erros. Em algum ponto vale considerar uma estratégia de **grouping** (ex.: `PayableError = ValidationError | InvariantError | TransitionError` com sub-unions tipadas).

**Não bloqueia** — 20 é manejável, exhaustive switch ainda compacto. Avaliar refactor preventivo no próximo ticket se a union passar de 30.

---

## O que está bom

### Auditoria automática — todas verdes

```
$ grep -rnE "throw |\bclass\b|new Error|extends Error|: any\b|as any" src/.../payable/
(nenhum)

$ grep -rnE "new Date\(\)" src/.../payable/
events.ts:5  (apenas em comentário JSDoc — DO B§14 mention)

$ grep -nE " as " src/.../payable.ts
# 6× `'X' as const` (discriminator) + 1× import alias + 1× namespace import
# ZERO `as <Brand>` — inferência via immutable() é suficiente

$ grep -rnE "^\s*(const|let)\s+(describe|it|...)" tests/.../payable/
(nenhum — lição FIN-VO-FITID W3 mantida)
```

### Composição de tipos via helpers (D1 do request)

```ts
type ApprovalRecord = Readonly<{ approvedAt: Date; approvedBy: UserRef }>;
type TransmissionRecord = ApprovalRecord & Readonly<{
  transmittedAt: Date;
  remittanceId: RemittanceId;
}>;
```

**Helpers internos (não exportados)** — apenas `OpenPayable`, `ApprovedPayable`, `TransmittedPayable`, `RejectedPayable`, `OverduePayable`, `Payable`, `PayableStatus`, `OpenPayableInput` são públicos (8 exports). DRY excelente: 3 estados (`Transmitted`, `Rejected`, `Overdue`) herdam `TransmissionRecord` por interseção sem repetir 4 campos cada.

### Refactor compatível (CA-34) validado runtime

```diff
-export type ApprovedPayable = PayableCore & Readonly<{
-  status: 'Approved';
-  approvedAt: Date;
-  approvedBy: UserRef;
-}>;
+export type ApprovedPayable = PayableCore & ApprovalRecord & Readonly<{ status: 'Approved' }>;
```

Shape final idêntico — os 35 testes do FIN-AGG-PAYABLE-CORE continuam GREEN sem mudança no código de teste. Excelente decomposição.

### `resetToApproved` reconstrução explícita (D4)

```ts
// payable.ts:252-265
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

**NÃO usa `{ ...payable }`** intencionalmente — payable é `RejectedPayable` com `transmittedAt`, `remittanceId`, `rejectedAt`, `rejectionReason`. Spread copiaria esses campos para o objeto Approved final (campos órfãos). Reconstrução explícita dropa cleanly. CA-24 valida via `'transmittedAt' in payable === false`. Excelente atenção ao detalhe.

### Invariante R5 estrita (`<=` em `markOverdue`)

```ts
// payable.ts:206
if (markedOverdueAt.getTime() <= payable.dueDate.getTime()) {
  return err(PayableError.payableOverdueBeforeDueDate(payable.dueDate, markedOverdueAt));
}
```

**Operador `<=` (não `<`)** — handbook R5: "Se **após** a data prevista de pagamento o título permanecer como Transmitido..." Mesmo dia (`==`) ainda não é "após". Test CA-21 valida com `sameDay === dueDate` rejeitando.

### Tagged errors com evidência (D23) — 5 erros temporais carregam ambas as peças

```
PayableApprovalDateBeforeOpenedAt(openedAt, attemptedAt)
PayableTransmissionDateBeforeApprovedAt(approvedAt, attemptedAt)
PayableRejectionDateBeforeTransmittedAt(transmittedAt, attemptedAt)
PayableOverdueBeforeDueDate(dueDate, attemptedAt)
PayableResetDateBeforeRejectedAt(rejectedAt, attemptedAt)
```

Padrão consistente — todos os 5 carregam `(estado, tentativa)`. UI/CLI pode renderizar diagnóstico claro: "Aprovação tentada em X mas título aberto em Y".

### Evento `PayableResetToApproved` carrega auditoria (D5)

```ts
// payable.ts:271-277
const event: PayableEvent = {
  type: 'PayableResetToApproved',
  payableId: next.id,
  occurredAt: resetAt,
  previousRejectionReason: payable.rejectionReason,
  previousRemittanceId: payable.remittanceId,
};
```

Trilha de auditoria preservada — quando consumir o evento em projeções, é possível reconstruir o caminho `Approved → Transmitted → Rejected → Approved` completo sem fazer join com snapshot histórico.

### Namespace `Payable` com 11 funções

```ts
export const Payable = {
  open, approve, transmit, registerRejection, markOverdue, resetToApproved,
  parseOpen, parseApproved, parseTransmitted, parseRejected, parseOverdue,
};
```

- 6 transições (open + 5 state machine)
- 5 refinement constructors (1 por estado)

API simétrica e previsível.

### Test file

- ✅ **Fixtures encadeadas reais** (`approvedPayable() → transmittedPayable() → rejectedPayable()`) — exercitam as transições verdadeiras, não mocks.
- ✅ **IIFE com throw em fixtures** — fail-fast quando algum predecessor quebra.
- ✅ **CA-24 valida shape drop pós-reset** — `'transmittedAt' in payable === false`.
- ✅ **R5 testado boundary `at === dueDate`** (CA-21) — mesma data ainda não venceu.
- ✅ **Exhaustive switch com 20 variants** em errors.test.ts.
- ✅ **Sem shadowing, sem mocks mágicos**.

---

## Checklist explícita aplicada

| Categoria | Resultado |
| :--- | :--- |
| A. Regras absolutas | ✅ zero throw/class/this/any/extends Error; readonly nos campos; return types explícitos; eventos com `occurredAt` injetado |
| B. Smart constructors / Branded | ✅ `open` retorna `Result<{payable,event},error>`; zero `as <Brand>` (inferência); erro union de strings tagged |
| C. Discriminated unions | ✅ `Payable` union 5 variants com `status`; `PayableEvent` 6 variants com `type`; switch exhaustivo nos testes |
| D. Ports & Adapters | N/A — domínio puro |
| E. Modular Monolith | ✅ importa apenas `#src/shared/` e arquivos do próprio módulo |
| F. ESM / NodeNext / TS moderno | ✅ extensão `.ts`; `import type`; sem require/namespace/enum |
| G. Naming, PT/EN, clareza | ✅ identifiers EN; eventos PascalCase passado; erros PascalCase adjetival |
| H. Tests | ✅ fixtures reais, AAA, exhaustive switches, sem fake-IDs, boundary tests |

---

## Marco — máquina de estados quase completa

| Estado | Status |
| :--- | :--- |
| `Open` | ✅ |
| `Approved` | ✅ |
| `Transmitted` | ✅ |
| `Rejected` | ✅ |
| `Overdue` | ✅ |
| `Paid` | ⏳ FIN-AGG-PAYABLE-PAYMENT |
| `Settled` | ⏳ FIN-AGG-PAYABLE-PAYMENT |

**5 de 7 estados implementados.** Restam apenas os 2 estados finais (`Paid`, `Settled`) cobertos pelo próximo ticket M.

---

## Próximo passo

- **APPROVED** → pipeline-maestro avança para **W3**.
- Expectativa W3: **ALL-GREEN round 1** — lições aplicadas preventivamente.
- Após W3 ALL-GREEN, `pnpm run pipeline:state close FIN-AGG-PAYABLE-TRANSMISSION` (9º ticket FIN-*).
- **Próximo ticket sugerido:** `FIN-AGG-PAYABLE-PAYMENT` (M) — `Paid` + `Settled` + 5 transições finais (`registerManualPayment` Approved→Paid, `processBankOutflow` Transmitted→Paid e Overdue→Paid, `authorizeSettlement` Paid→Settled). Completará a máquina de estados.
