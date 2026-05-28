# W1 — Implementação GREEN (FIN-AGG-PAYABLE-CORE)

> **Wave:** W1 · **Outcome:** GREEN · **Agent:** `main-session`
> **Predecessor:** [`../002-tests/REPORT.md`](../002-tests/REPORT.md) (W0 RED)
> **Artefatos:** 5 arquivos de produção

---

## 1. Mudanças

| Arquivo | Linhas | Conteúdo |
| :--- | ---: | :--- |
| `src/modules/financial/domain/shared/source-document-ref.ts` | 22 | Branded UUID `SourceDocumentRef` (FK opaca para BC Documentos) |
| `src/modules/financial/domain/payable/types.ts` | 85 | Tipos refinados (Open/Approved) + Payable union + OpenPayableInput |
| `src/modules/financial/domain/payable/events.ts` | 23 | `PayableEvent` union (PayableOpened + PayableApproved) |
| `src/modules/financial/domain/payable/errors.ts` | 105 | Tagged errors com payload (D23) + constructors |
| `src/modules/financial/domain/payable/payable.ts` | 113 | Operações `open`/`approve`/`parseOpen`/`parseApproved` |
| **Total** | **348** | |

### 1.1. Pattern do agregado

```ts
// payable.ts:107-112
export const Payable = {
  open,
  approve,
  parseOpen,
  parseApproved,
};
```

**Padrão D NÃO aplicado a agregados** (Bloco A DON'T §1 do master doc). Agregado é objeto literal com operações. Consumers fazem `import { Payable }` e chamam `Payable.open(...)`. Padrão idêntico a `contract.ts:223-228`.

### 1.2. `as <Type>` aparece restrito

```
src/modules/financial/domain/shared/source-document-ref.ts:18  newUuid() as SourceDocumentRef
src/modules/financial/domain/shared/source-document-ref.ts:21  ok(raw as SourceDocumentRef)
src/modules/financial/domain/payable/payable.ts:48              status: 'Open' as const
src/modules/financial/domain/payable/payable.ts:80              status: 'Approved' as const
```

- 2× `as SourceDocumentRef` — smart constructor (CA-28 satisfeita).
- 2× `as const` — preserva literal type do discriminator `status` para narrowing automático (DO D§20).
- **Zero `as OpenPayable` / `as ApprovedPayable`** — não necessário porque `immutable({...status: 'Open' as const})` infere o tipo refinado.

### 1.3. Tagged errors implementados (DO D§22-D§24)

Todos os 6 erros são `Readonly<{ tag: 'PayableXxx'; ...payload }>`:

| Variante | Payload (D23) |
| :--- | :--- |
| `PayableSourceDocumentRequired` | — |
| `PayableValueZero` | — |
| `PayableInvalidDueDate` | — |
| `PayableInvalidOpenedAt` | — |
| `PayableInvalidApprovalDate` | `openedAt: Date`, `attemptedAt: Date` (D23 — duas peças que colidiram) |
| `PayableNotOpen` | `currentStatus: PayableStatus` (D23) |

### 1.4. Operação `approve` — invariantes

```ts
// payable.ts:69-75
if (payable.status !== 'Open') {
  return err(PayableError.payableNotOpen(payable.status));
}
if (!isValidDate(approvedAt) || approvedAt.getTime() < payable.openedAt.getTime()) {
  return err(PayableError.payableInvalidApprovalDate(payable.openedAt, approvedAt));
}
```

- **R1 do handbook (Soberania da Aprovação)** — só `Open` pode aprovar. `PayableNotOpen` carrega `currentStatus` para diagnóstico.
- **Invariante temporal** — `approvedAt >= openedAt`. `Date.getTime()` comparison é a forma idiomática (Date objects diretos comparam por referência).
- `isValidDate(approvedAt)` também coberto na mesma branch — mesma família de erro.

### 1.5. `'approvedAt' in payable === false` (CA-13)

O `OpenPayable` é construído via `immutable({ ...input, status: 'Open' as const })` SEM `approvedAt`/`approvedBy`. TS reflete: dentro de narrow Open, esses campos não existem. Runtime confirma — `Object.keys(openPayable)` não inclui `approvedAt`.

---

## 2. Verificação

### 2.1. Testes específicos do ticket

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/financial/domain/shared/source-document-ref.test.ts \
  tests/modules/financial/domain/payable/*.test.ts
```

```
ℹ tests 35  suites 11  pass 35  fail 0  duration_ms 146
```

W0 estimou 34 testes — recontagem correta após criar arquivos: **35**. Discrepância de 1 vem de teste extra no `payable.test.ts` (CA-18 split em 2 — "approvalDate < openedAt" e "invalid approvalDate"). Sem impacto.

### 2.2. Typecheck (importante — confirma type-level)

```
> pnpm run typecheck
> tsc --noEmit
```

Zero erros. Tipos refinados `OpenPayable`/`ApprovedPayable` resolvem corretamente; `BrandOf` checks compilam; exhaustive switches em `PayableEvent` e `PayableError` validados.

### 2.3. Suite completa

```
ℹ tests 997  pass 981  fail 0  skipped 16  duration_ms 45402
```

| Métrica | W3 do FIN-VO-BENEFICIARY-BANK-DATA | W1 deste ticket | Delta |
| :--- | ---: | ---: | ---: |
| tests | 962 | 997 | **+35** |
| pass | 946 | 981 | **+35** |
| fail | 0 | 0 | 0 |
| skipped | 16 | 16 | 0 |

Zero regressão.

---

## 3. Critérios de aceitação (000-request §4)

| # | Critério | Status |
| :--- | :--- | :--- |
| CA-1 | `OpenPayable` tem 8 Core + `status: 'Open'`, sem approvedAt/By | ✅ §1.5 |
| CA-2 | `ApprovedPayable` adiciona approvedAt + approvedBy | ✅ |
| CA-3 | `Payable = OpenPayable \| ApprovedPayable` | ✅ |
| CA-4 | `PayableStatus = 'Open' \| 'Approved'` | ✅ |
| CA-5 | `SourceDocumentRef` Brand string | ✅ |
| CA-6 | `PayableEvent` union 2 variantes | ✅ |
| CA-7..CA-13 | `open()` happy + validations | ✅ |
| CA-14..CA-19 | `approve()` happy + invariants | ✅ |
| CA-20..CA-22 | `parseOpen`/`parseApproved` | ✅ |
| CA-23 (typecheck) | ✅ §2.2 |
| CA-24 (format) | ⏳ W3 (prettier hook reformatou no Write) |
| CA-25 (pnpm test) | ✅ §2.3 |
| CA-26 (lint) | ⏳ W3 |
| CA-27 (header doc cita handbook) | ✅ todos os 5 arquivos citam |
| CA-28 (`as` só em smart constructor) | ✅ §1.2 |
| CA-29 (`occurredAt` injetado) | ✅ `event.occurredAt === input.openedAt` (linha 56) e `=== approvedAt` (linha 90) |

**24/24 CAs aplicáveis a W1 verdes.** 2 operacionais (format, lint) para W3.

---

## 4. Decisões W1

- **`approvedAt`/`approvedBy` recebidos como argumentos separados** em `approve(payable, by, at)` — espelha `Contract.expire(c, at)` e similares. Alternativa `approve(payable, { approvedBy, approvedAt })` seria mais verboso.
- **`isValidDate` + `getTime() comparison`** em vez de `<` direto entre Dates — `Date < Date` em JS funciona (compare como timestamps), mas `getTime()` deixa explícito e auditor não precisa lembrar da semântica implícita.
- **`PayableNotOpen` reutilizado em `approve`/`parseOpen`/`parseApproved`** quando o estado não é o esperado — mesmo erro com `currentStatus` payload. Evita inflar union desnecessariamente (`PayableNotApproved` redundante).
- **Sem helper `assertOpen`** — `parseOpen` é o refinement constructor canônico (DO D§21 — parse, don't validate). Use cases puxam Payable do repo, fazem `parseOpen`, operam sobre tipo refinado.
- **Eventos têm `occurredAt` igual a `input.openedAt` (open) ou `approvedAt` (approve)** — DO B§14 cumprido. Adapter/use case injeta o timestamp.

---

## 5. Lições preventivas aplicadas

| Lição | Status |
| :--- | :--- |
| Sem indexed access em arrays | ✅ N/A — sem loops |
| Sem shadowing | ✅ N/A no `src/`; teste usa `classify` |
| Sem async sem await | ✅ todas síncronas |
| Sem templates com `T \| undefined` | ✅ N/A |
| `as <Brand>` só no return final | ✅ §1.2 |
| Imports `#src/*` | ✅ |
| `Date.getTime()` em vez de `<` direto | preferência consciente (auditor friendly) |

Expectativa W3: ALL-GREEN round 1 (sem armadilhas conhecidas).

---

## 6. Pronto para W2

`code-reviewer` deve validar:

1. **Tagged errors corretos** — 6 variantes em union pública; constructors em camelCase; payload (D23) em `PayableInvalidApprovalDate` e `PayableNotOpen`.
2. **`as <Type>` restrito** — 2× `as SourceDocumentRef` (smart constructor) + 2× `as const` (discriminator). Zero `as OpenPayable`/`as ApprovedPayable` (não necessário por inferência).
3. **`'approvedAt' in OpenPayable === false`** — campo literalmente ausente, não null/undefined.
4. **Headers citam handbook** — `source-document-ref.ts:10` (DocumentoID), `types.ts:16-17` (campos), `payable.ts:14-17` (R1).
5. **`Payable` objeto namespace** — não Padrão D (Bloco A DON'T §1).
6. **Operações puras + síncronas** — sem `async`, sem I/O, sem `throw`.
7. **Eventos com `occurredAt` injetado** — não `new Date()`.
8. **Sem `class`, `this`, `any`, `extends Error`**.

Envelope M — review esperada em 1 round.
