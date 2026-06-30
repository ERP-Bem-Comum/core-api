# Code Review — Ticket FIN-AGG-PAYABLE-CORE — Round 1

**Veredito:** **APPROVED**

**Reviewer:** `code-reviewer` (skill canônica W2)
**Data:** 2026-05-23T08:48Z
**Round:** 1 / 3
**Escopo revisado:** 10 arquivos (5 prod + 5 test)

| # | Arquivo | Linhas |
| :--- | :--- | ---: |
| 1 | `src/modules/financial/domain/shared/source-document-ref.ts` | 22 |
| 2 | `src/modules/financial/domain/payable/types.ts` | 85 |
| 3 | `src/modules/financial/domain/payable/events.ts` | 23 |
| 4 | `src/modules/financial/domain/payable/errors.ts` | 105 |
| 5 | `src/modules/financial/domain/payable/payable.ts` | 113 |
| 6-10 | 5 arquivos de teste | ~485 total |

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, mas registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

#### Sugestão 1 — `errors.ts` JSDoc cita DO da entrevista mas não R1 do handbook

**Categoria:** G (clareza — proveniência)
**Observação:** O header doc de `errors.ts` cita literalmente DO D§22-D§24 da entrevista 0001 (correto), mas não menciona R1 do handbook (`handbook/domain/04-titulos-liquidacao-context.md:54` — Soberania da Aprovação) que é o motivo de **negócio** para `PayableNotOpen` existir. O `payable.ts` já cita R1; reviewer pode acompanhar a cadeia.

**Não bloqueia** — o errors.ts cita corretamente o **mecanismo** (tagged errors). O **motivo de negócio** está no payable.ts que importa esse arquivo. Cadeia rastreável.

#### Sugestão 2 — `approve` combina `isValidDate` + `< openedAt` no mesmo erro

**Categoria:** A (clareza de erro)
**Observação:** Linha 71 de `payable.ts`:

```ts
if (!isValidDate(approvedAt) || approvedAt.getTime() < payable.openedAt.getTime()) {
  return err(PayableError.payableInvalidApprovalDate(payable.openedAt, approvedAt));
}
```

Um `approvedAt` inválido (NaN) e um `approvedAt < openedAt` retornam o **mesmo erro** `PayableInvalidApprovalDate` com `attemptedAt: INVALID_DATE`. Tecnicamente funciona — `NaN < anything === false`, então short-circuit OR cobre.

Alternativa: erro próprio `PayableInvalidApprovalDateValue` para "data malformada". Pode ser overkill para distinção semântica menor.

**Não bloqueia** — CA-18 split em 2 testes valida ambas as variantes; payload `attemptedAt` revela qual caso ocorreu (NaN-date vs date-anterior). Trade-off aceitável.

#### Sugestão 3 — `events.test.ts` tem só 1 teste

**Categoria:** H (cobertura de teste)
**Observação:** `events.test.ts` cobre apenas exhaustive switch sobre os 2 variants. Poderia ser estendido para checar que cada variant tem o payload esperado (`PayableOpened` tem `payableId`+`occurredAt`; `PayableApproved` tem ambos + `approvedBy`). Mas isso já é validado indiretamente em `payable.test.ts` (testes de open/approve verificam o evento emitido).

**Não bloqueia** — cobertura efetiva pelo `payable.test.ts`.

---

## O que está bom

### Auditoria automática — verdes

```
$ grep -rnE "throw |\bclass\b|new Error|extends Error|: any\b|as any" \
    src/modules/financial/domain/payable/ \
    src/modules/financial/domain/shared/source-document-ref.ts
(nenhum encontrado)

$ grep -rnE "new Date\(\)" src/modules/financial/domain/payable/
(nenhum — eventos têm occurredAt injetado, DO B§14)

$ grep -rnE "^\s*(const|let)\s+(describe|it|test|assert|...)" tests/.../payable/
(nenhum shadowing — lição FIN-VO-FITID W3 absorvida)
```

### `as` aparece apenas em locais canônicos

```
src/.../source-document-ref.ts:18  newUuid() as SourceDocumentRef       (smart constructor)
src/.../source-document-ref.ts:21  ok(raw as SourceDocumentRef)         (smart constructor)
src/.../payable/payable.ts:49      status: 'Open' as const              (discriminator)
src/.../payable/payable.ts:77      status: 'Approved' as const          (discriminator)
src/.../payable/payable.ts:23      Payable as PayableEntity             (import alias — não cast)
```

**Zero `as OpenPayable` / `as ApprovedPayable`** — inferência via `immutable({ ...status: 'Open' as const })` é suficiente. CA-28 satisfeita.

### Tipos refinados sem null/undefined (DO D§20, DO C§29)

```ts
// types.ts
export type OpenPayable = PayableCore & Readonly<{ status: 'Open' }>;
export type ApprovedPayable = PayableCore & Readonly<{
  status: 'Approved';
  approvedAt: Date;        // obrigatório, não optional
  approvedBy: UserRef;     // obrigatório, não optional
}>;
```

`'approvedAt' in openPayable === false` confirmado por test runtime (CA-13). TS narrow via `if (p.status === 'Open')` esconde os campos. DO D§20 perfeitamente aplicado.

### Tagged errors com payload de evidência (D23)

```ts
// errors.ts
export type PayableInvalidApprovalDate = Readonly<{
  tag: 'PayableInvalidApprovalDate';
  openedAt: Date;        // estado atual
  attemptedAt: Date;     // tentativa
}>;
export type PayableNotOpen = Readonly<{
  tag: 'PayableNotOpen';
  currentStatus: PayableStatus;
}>;
```

DO D§23 ("duas peças que colidiram") satisfeito nos 2 erros de invariante. Demais erros (validação simples) sem payload — consistente com `contract/errors.ts`.

### Operações puras + síncronas + atomic unit

```ts
const open = (input): Result<{ payable: OpenPayable; event: PayableEvent }, PayableError>
const approve = (payable, by, at): Result<{ payable: ApprovedPayable; event: PayableEvent }, PayableError>
```

Cada operação retorna **`{ payable, event }` juntos** — atomic unit pattern de `Contract.create`. Use cases publicam o evento APÓS persistir o agregado (`EventBus.publish` em application).

### Refinement constructors (DO D§21 — parse, don't validate)

```ts
const parseOpen = (payable): Result<OpenPayable, PayableNotOpen> =>
  payable.status === 'Open' ? ok(payable) : err(PayableError.payableNotOpen(payable.status));
```

Tipo de retorno **estreito** (`Result<OpenPayable, PayableNotOpen>`, não `Result<OpenPayable, PayableError>`) — consumers sabem exatamente o erro possível.

### `Payable as PayableEntity` (import alias)

Conflito resolvido elegantemente: `type Payable` importado como `PayableEntity` (linha 23), permitindo `export const Payable` (linha 107) na mesma arquivo. Idêntico ao pattern de `contract.ts:7-12`.

### Headers citam handbook

| Arquivo | Citação |
| :--- | :--- |
| `source-document-ref.ts:12` | `handbook/domain/04-titulos-liquidacao-context.md:17` (DocumentoID) |
| `types.ts:16-17` | `handbook/domain/04-titulos-liquidacao-context.md:15-36` (estrutura) |
| `events.ts` | Refere DO B§14 (mecanismo de eventos) |
| `errors.ts` | Refere DO D§22-D§24 (mecanismo de tagged errors) |
| `payable.ts:13-15` | `handbook/domain/04-titulos-liquidacao-context.md:54` — **R1 (Soberania da Aprovação)** literal |

CA-27 satisfeita.

### Test file

- ✅ **Fixtures IIFE com check de result** (`VALID_TAX_ID`, `VALID_BENEFICIARY`, `VALID_MONEY`, `APPROVER`) — fail-fast se predecessor quebrar.
- ✅ **Helper `validInput(overrides)`** + `openPayable()` — DRY ao estilo contract.test.ts.
- ✅ **`D(iso)` shorthand + `INVALID_DATE`** — utilitários canônicos.
- ✅ **AAA implícito**, sem mocks, type-level guards materializados.
- ✅ **Tagged errors verificados com payload** — `r.error.openedAt`, `r.error.attemptedAt`, `r.error.currentStatus`.

---

## Checklist explícita aplicada

| Categoria | Resultado |
| :--- | :--- |
| A. Regras absolutas | ✅ zero throw/class/this/any/extends Error/let em entidades; readonly campos; return types explícitos; eventos com `occurredAt` injetado |
| B. Smart constructors / Branded | ✅ `open` retorna `Result<{payable, event}, error>`; `as <Brand>` só em `source-document-ref.ts` smart constructor; `as const` no discriminator de status |
| C. Discriminated unions | ✅ `Payable` union com discriminator `status` EN PascalCase; `PayableEvent` union com `type`; exhaustive switches em testes |
| D. Ports & Adapters | N/A — domínio puro |
| E. Modular Monolith | ✅ importa apenas de `#src/shared/` (kernel, primitives, utils) e arquivos do próprio módulo |
| F. ESM / NodeNext / TS moderno | ✅ extensão `.ts`; `import type` para tipos puros; `type` inline em imports mistos; sem require/namespace/enum |
| G. Naming, PT/EN, clareza | ✅ identifiers EN; eventos PascalCase passado (`PayableOpened`); erros PascalCase adjetival (`PayableNotOpen`); siglas técnicas mantidas |
| H. Tests | ✅ AAA, IIFE fixtures, `validInput`/`openPayable` helpers, sem mocks, sem fake-IDs, exhaustive switches, type-level smoke |

---

## Marco — primeiro agregado do módulo Financial

Pattern arquitetural validado:

| Item | Pattern aplicado |
| :--- | :--- |
| Tipos refinados por estado | DO D§20 — `OpenPayable`/`ApprovedPayable` materializam campos do estado |
| Tagged errors com evidência | DO D§22-D§24 — `PayableInvalidApprovalDate(opened, attempted)`, `PayableNotOpen(currentStatus)` |
| Refinement constructors | DO D§21 — `parseOpen`/`parseApproved` retornam `Result<RefinedType, NarrowError>` |
| Atomic unit `{ payable, event }` | espelho de `Contract.create` |
| Aggregate namespace export | `export const Payable = { open, approve, ... }` — não Padrão D (Bloco A DON'T §1) |
| `Payable as PayableEntity` import alias | resolve conflito tipo vs valor no mesmo arquivo |

Próximos tickets (`FIN-AGG-PAYABLE-TRANSMISSION`, `FIN-AGG-PAYABLE-PAYMENT`) **expandirão a union `Payable`**. TS forçará atualização de switches exhaustivos em consumers — boa propriedade de design.

---

## Próximo passo

- **APPROVED** → pipeline-maestro avança para **W3** (`ts-quality-checker`).
- Expectativa W3: **ALL-GREEN round 1** — lições aplicadas preventivamente (sem indexed access, sem shadowing, sem async sem await, sem template `T|undefined`).
- Após W3 ALL-GREEN, `pnpm run pipeline:state close FIN-AGG-PAYABLE-CORE` (8º ticket FIN-*).
- **Próximo ticket sugerido:** `FIN-AGG-PAYABLE-TRANSMISSION` (M) — estados `Transmitted`/`Rejected`/`Overdue` + transições `transmit()`/`registerRejection()`/`markOverdue()`/`resetToApproved()`. Expande union `Payable` com 3 variantes.
