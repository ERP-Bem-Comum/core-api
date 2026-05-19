# W0 — RED — Ticket CTR-AGG-AMENDMENT

**Skill:** ts-domain-modeler (modo teste)
**Data:** 2026-05-14
**Status:** ✅ RED confirmado

---

## Arquivos criados / editados

- `tests/modules/contracts/domain/amendment/amendment.test.ts` (308 linhas, 24 testes em 9 suítes) — NOVO
- `tests/modules/contracts/domain/shared/ids.test.ts` — **estendido** com 4 testes de `UserRef`

---

## Inventário dos testes

### Amendment

| Suíte | Testes | Cobertura |
| :--- | :---: | :--- |
| `Amendment.create — Addition` | 2 | happy path com `impactValue`, rejeição de zero |
| `Amendment.create — Suppression` | 2 | happy path, rejeição de zero |
| `Amendment.create — TermChange` | 2 | happy path com `newEndDate`, rejeição de NaN |
| `Amendment.create — Misc` | 1 | happy path sem `impactValue` nem `newEndDate` |
| `Amendment.create — common validations` | 4 | empty/whitespace `amendmentNumber`, empty `description`, invalid `createdAt` |
| `Amendment.attachSignedDocument` | 3 | happy path, doc já anexado, Homologated rejeita |
| `Amendment.homologate` | 4 | happy path, sem doc (R2), already Homologated, invalid date |
| `Amendment.toContractAdjustment` | 4 | tradução das 4 kinds para ContractAdjustment |
| `Amendment — invariants` | 2 | R2 verificada, transição completa Pending → Pending+Doc → Homologated |

**Total Amendment: 24 testes em 9 suítes.**

### UserRef (em `ids.test.ts`)

| Suíte | Testes |
| :--- | :---: |
| `UserRef — rehydrate` | 4 — valid UUID, empty, non-UUID, v1 UUID |

**Total novos testes: 28.** Acumulado pós-W1 esperado: 99 + 28 = **127**.

---

## Helpers de teste

```ts
const money = (cents) => ...;
const userRef = () => ...;  // sempre o mesmo UUID; suficiente para testar reachability
const baseInput = (overrides) => ...;
const createAddition = (impactCents = 500000) => ...;
const createPendingWithDoc = () => ...;
const createHomologated = () => ...;
```

Builders compõem fixtures em camadas — cada builder usa o anterior. `createHomologated()` exercita transição completa e devolve o Amendment final.

---

## Confirmação de RED

```
pnpm typecheck
→ tests/.../amendment/amendment.test.ts(12): Cannot find module
  '#src/.../amendment/amendment.ts'
→ tests/.../amendment/amendment.test.ts(14): Cannot find module
  '#src/.../amendment/types.ts'
→ tests/.../amendment/amendment.test.ts(10): Module ids has no exported member 'UserRef'
→ tests/.../shared/ids.test.ts(9): Module ids has no exported member 'UserRef'

pnpm test
→ 2 fails (amendment.test.ts e ids.test.ts não carregam — UserRef não existe ainda)
→ 99 testes anteriores continuam OK (sem regressão)
```

✅ **W0 RED confirmado.** Os 99 testes pré-existentes continuam verdes.

---

## Decisões pré-W1 (registradas)

### Estrutura de arquivos esperada

```
src/modules/contracts/domain/shared/
└── ids.ts            (EDITAR — adicionar UserRef)

src/modules/contracts/domain/amendment/
├── types.ts          Amendment, AmendmentStatus, AmendmentKind, CreateAmendmentInput
├── events.ts         AmendmentEvent (DU 3 variantes)
├── errors.ts         AmendmentError (string literal union)
└── amendment.ts      Funções: create, attachSignedDocument, homologate, toContractAdjustment
```

### Tipos chave

```ts
// types.ts
export type AmendmentStatus = 'Pending' | 'Homologated';
export type AmendmentKind = 'Addition' | 'Suppression' | 'TermChange' | 'Misc';

type AmendmentBase = Readonly<{
  id: AmendmentId;
  contractId: ContractId;
  amendmentNumber: string;
  description: string;
  createdAt: Date;
  status: AmendmentStatus;
  signedDocumentRef: DocumentId | null;
  homologatedAt: Date | null;
  homologatedBy: UserRef | null;
}>;

type AmendmentVariant = Readonly<
  | { kind: 'Addition';    impactValue: Money }
  | { kind: 'Suppression'; impactValue: Money }
  | { kind: 'TermChange';  newEndDate: Date }
  | { kind: 'Misc' }
>;

export type Amendment = Brand<AmendmentBase & AmendmentVariant, 'Amendment'>;

// CreateAmendmentInput é flat — base sem state-fields + variant
export type CreateAmendmentInput = Readonly<
  & {
    id: AmendmentId;
    contractId: ContractId;
    amendmentNumber: string;
    description: string;
    createdAt: Date;
  }
  & (
    | { kind: 'Addition';    impactValue: Money }
    | { kind: 'Suppression'; impactValue: Money }
    | { kind: 'TermChange';  newEndDate: Date }
    | { kind: 'Misc' }
  )
>;
```

### Eventos e erros

```ts
// events.ts
export type AmendmentEvent = Readonly<
  | { type: 'AmendmentCreated';          amendmentId; contractId; occurredAt: Date }
  | { type: 'AmendmentDocumentAttached'; amendmentId; signedDocumentRef: DocumentId; occurredAt: Date }
  | { type: 'AmendmentHomologated';      amendmentId; homologatedBy: UserRef; occurredAt: Date }
>;

// errors.ts
export type AmendmentError =
  | 'amendment-number-required'
  | 'amendment-description-required'
  | 'amendment-invalid-created-at'
  | 'amendment-invalid-new-end-date'
  | 'amendment-impact-value-zero'
  | 'amendment-invalid-event-date'
  | 'amendment-not-pending'
  | 'amendment-document-already-attached'
  | 'amendment-without-signed-document';

// UserRef em ids.ts
export type UserRef = Brand<string, 'UserRef'>;
export type UserRefError = 'user-ref-invalid';
export const UserRef = {
  rehydrate: (raw: string): Result<UserRef, UserRefError> => ...,
  // NÃO tem generate — identidade é externa
};
```

---

## Próximo passo

W1 — implementar `UserRef` em `ids.ts` + 4 arquivos em `domain/amendment/`. Estimativa: ~150 linhas de produção.
