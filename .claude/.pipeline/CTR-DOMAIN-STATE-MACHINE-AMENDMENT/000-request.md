# 000 — Request CTR-DOMAIN-STATE-MACHINE-AMENDMENT

> **Frente A — Refactor radical do domínio (entrevista 0001).**
> **Bloco D — State Machine em Tipos.** Top-3 leverage **#1** (PhD L2) — par de [`CTR-DOMAIN-STATE-MACHINE-CONTRACT`](../CTR-DOMAIN-STATE-MACHINE-CONTRACT/000-request.md) ✅.
> Depende de `CTR-DOMAIN-TAGGED-ERRORS` ✅.
> Resolve **C1 + C2** (aninhamento status × kind sem cross-product; `signedDocumentRef: DocumentId | null` → tipos refinados).
> Continuação do teste do protocolo **Opção B** — 7º ticket consecutivo.

---

## Origem

- **Entrevista canônica:** [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md), **Bloco C + Bloco D**.
- **Decisões aplicáveis** (master doc):
  - **DO D§20** (L872): "**Um tipo refinado por estado de agregado**. Transições são funções totais."
  - **DO D§21** (L873): "Refinement via `parseActive`/`parsePending`. **Não** `assertPending` (imperativo)."
  - **DO C§28** (L880): "Modelar 2 eixos discriminantes como **aninhamento** (union por status, com kind interno) — **não cross-product**."
  - **DO C§29** (L881): "Estados **ELIMINAM `null`** — campos optional-as-state viram propriedade obrigatória do tipo refinado."
  - **DO C§32** (L884): "Exhaustive switch: **omitir `default`** ou `default: { const _: never = x; return _; }`. Nunca `throw`."
  - **DON'T C§26** (L919): "**Cross-product** de 2 eixos discriminantes (`4 kinds × 3 status = 12 tipos`) — duplica máquina de estado."
  - **DON'T C§27** (L920): "Transição de estado retornando tipo direto sem `Result` — não há como sinalizar falha sem `throw`."
  - **DON'T D§19** (L912): "`assertPending` que devolve `Amendment` cru — fere refinement."
  - **DON'T D§20** (L913): "`if (amendment.status !== 'Pending')` espalhado em código de negócio — shotgun parsing."
  - **DON'T D§23** (L916): "Naming imperativo (`assertPending`, `validatePending`) — remete a exceções."
- **Tabela canônica** (L967):
  > `CTR-DOMAIN-STATE-MACHINE-AMENDMENT` — Bloco D — Refactor `Amendment` em union `PendingWithoutDocument | PendingWithDocument | Homologated`. Resolve D2 + C1 + C2. **Dep: TAGGED-ERRORS.**

---

## Estado atual (snapshot 2026-05-20)

### `src/modules/contracts/domain/amendment/types.ts`

```ts
type AmendmentStatus = 'Pending' | 'Homologated';
type AmendmentKind = 'Addition' | 'Suppression' | 'TermChange' | 'Misc';

type AmendmentBase = Readonly<{
  id, contractId, amendmentNumber, description, createdAt,
  status: AmendmentStatus,                       // discriminator string genérico
  signedDocumentRef: DocumentId | null,          // ← C2: null-as-state
  homologatedAt: Date | null,                    // ← null em Pending, Date em Homologated
  homologatedBy: UserRef | null,                 // ← idem
}>;

type AmendmentVariant = Readonly<
  | { kind: 'Addition'; impactValue: Money }
  | { kind: 'Suppression'; impactValue: Money }
  | { kind: 'TermChange'; newEndDate: Date }
  | { kind: 'Misc' }
>;

type Amendment = AmendmentBase & AmendmentVariant;   // único record com 3 campos null
```

Problemas:

- **C1:** `Amendment` é intersection `Base & Variant`. `signedDocumentRef` está em `Base` mas é **dependente do estado** (Pending → null ou Date; Homologated → sempre Date), não do kind. Estado e variante misturados.
- **C2:** `signedDocumentRef: DocumentId | null` é optional-as-state clássico. A regra "só homologa se tem documento" virou runtime check (`if (amendment.signedDocumentRef === null) return err(...)`), mas o tipo já sabia.
- **D§19 + §23:** `assertPending` em `amendment.ts:19-24` devolve `AmendmentEntity` cru — não refina, viola "Parse, don't validate".
- **D§20:** `homologatedAt: null` em Pending e `Date` em Homologated — campo optional-as-state. Idem `homologatedBy`.
- **Cast em `create`:** literal de 4 branches `as AmendmentEntity` — sintoma de tipo insuficientemente refinado (mesmo padrão do Contract pré-refactor).

### `src/modules/contracts/domain/amendment/amendment.ts`

```ts
const assertPending = (amendment): Result<AmendmentEntity, AmendmentNotPending> =>
  amendment.status === 'Pending' ? ok(amendment) : err(...);
// ↑ DON'T D§19 + D§23: refinement falso + naming imperativo

const attachSignedDocument = (amendment: AmendmentEntity, signedDocumentRef): Result<...> => {
  const pendingCheck = assertPending(amendment);           // ← runtime check
  if (!pendingCheck.ok) return pendingCheck;
  if (amendment.signedDocumentRef !== null) {              // ← outro runtime check
    return err(amendmentDocumentAlreadyAttached());
  }
  ...
};

const homologate = (amendment: AmendmentEntity, by, at): Result<...> => {
  const pendingCheck = assertPending(amendment);           // ← runtime
  if (!pendingCheck.ok) return pendingCheck;
  if (amendment.signedDocumentRef === null) {              // ← runtime
    return err(amendmentWithoutSignedDocument());
  }
  ...
};
```

### Consumidores diretos (a refletir)

| Arquivo | Mudança esperada |
| :--- | :--- |
| `application/use-cases/create-amendment.ts` | Output tipa `PendingWithoutDocumentAmendment`. |
| `application/use-cases/attach-signed-document.ts` | Chama `Amendment.parsePending(...)` antes de `attachSignedDocument`. |
| `application/use-cases/homologate-amendment.ts` | Chama `Amendment.parsePendingWithDocument(...)` antes de `homologate`. |
| `adapters/persistence/mappers/amendment.mapper.ts` | `toDomain` decide subtipo via switch em `status` × `signedDocumentRef`. |
| Repos InMemory + Drizzle | Aceitam `Amendment` (union); FindById retorna `Promise<Result<Amendment, …>>`. |
| `cli/formatters/amendment.ts`, `status.ts` | Já narram pelo `status` — só ajustar imports. |

---

## Estado-alvo (Padrão D — State Machine em Tipos com aninhamento C§28)

### `domain/amendment/types.ts`

```ts
import type { AmendmentId, ContractId, DocumentId, UserRef } from '../shared/ids.ts';
import type { Money } from '../shared/money.ts';

/** Tipo do kind do aditivo — eixo INDEPENDENTE do status (DO C§28: aninhamento, NÃO cross-product). */
export type AmendmentVariant = Readonly<
  | { kind: 'Addition'; impactValue: Money }
  | { kind: 'Suppression'; impactValue: Money }
  | { kind: 'TermChange'; newEndDate: Date }
  | { kind: 'Misc' }
>;

/** Campos comuns a todos os estados do agregado. */
type AmendmentCore = Readonly<{
  id: AmendmentId;
  contractId: ContractId;
  amendmentNumber: string;
  description: string;
  createdAt: Date;
}> & AmendmentVariant;

/**
 * Estado 1: Pending sem documento anexado (estado inicial).
 *
 * `signedDocumentRef` é tipado como `null` (não union) — discrimina deste estado
 * para `PendingWithDocumentAmendment`. `homologatedAt`/`homologatedBy` também
 * `null` obrigatório.
 */
export type PendingWithoutDocumentAmendment = AmendmentCore & Readonly<{
  status: 'Pending';
  signedDocumentRef: null;
  homologatedAt: null;
  homologatedBy: null;
}>;

/**
 * Estado 2: Pending com documento anexado — única configuração que aceita homologar.
 *
 * `signedDocumentRef` é `DocumentId` (não union). Garantia estática:
 * `homologate(p: PendingWithDocumentAmendment)` não precisa runtime check.
 */
export type PendingWithDocumentAmendment = AmendmentCore & Readonly<{
  status: 'Pending';
  signedDocumentRef: DocumentId;
  homologatedAt: null;
  homologatedBy: null;
}>;

/**
 * Estado 3: Homologated (terminal). `signedDocumentRef`, `homologatedAt` e
 * `homologatedBy` são todos obrigatórios — homologação exigiu cada um.
 */
export type HomologatedAmendment = AmendmentCore & Readonly<{
  status: 'Homologated';
  signedDocumentRef: DocumentId;
  homologatedAt: Date;
  homologatedBy: UserRef;
}>;

/**
 * Union discriminada do agregado `Amendment` (o tipo público).
 *
 * Discriminador composto: `status` ('Pending' vs 'Homologated') + presença de
 * `signedDocumentRef` dentro de Pending. TS narrowa naturalmente via
 * `signedDocumentRef === null` em Pending.
 */
export type Amendment =
  | PendingWithoutDocumentAmendment
  | PendingWithDocumentAmendment
  | HomologatedAmendment;

/** Status público — derivado da union. */
export type AmendmentStatus = Amendment['status'];

/** Kind público — derivado do variant. */
export type AmendmentKind = Amendment['kind'];
```

### `domain/amendment/amendment.ts`

```ts
// Refinement constructors — substituem assertPending (DON'T D§19 + D§23)

const parsePending = (a: Amendment): Result<PendingAmendment, AmendmentError.AmendmentNotPending> =>
  a.status === 'Pending'
    ? ok(a)                                                  // narrow para qualquer Pending*
    : err(AmendmentError.amendmentNotPending(a.status));

// Para attach precisamos especificamente PendingWithoutDocument
const parsePendingWithoutDocument = (
  a: Amendment,
): Result<
  PendingWithoutDocumentAmendment,
  AmendmentError.AmendmentNotPending | AmendmentError.AmendmentDocumentAlreadyAttached
> => {
  if (a.status !== 'Pending') return err(AmendmentError.amendmentNotPending(a.status));
  if (a.signedDocumentRef !== null) return err(AmendmentError.amendmentDocumentAlreadyAttached());
  return ok(a);
};

// Para homologate precisamos PendingWithDocument
const parsePendingWithDocument = (
  a: Amendment,
): Result<
  PendingWithDocumentAmendment,
  AmendmentError.AmendmentNotPending | AmendmentError.AmendmentWithoutSignedDocument
> => {
  if (a.status !== 'Pending') return err(AmendmentError.amendmentNotPending(a.status));
  if (a.signedDocumentRef === null) return err(AmendmentError.amendmentWithoutSignedDocument());
  return ok(a);
};

// Transições — funções totais sobre tipos refinados (DO D§20)

const create = (
  input: CreateAmendmentInput,
): Result<{ amendment: PendingWithoutDocumentAmendment; event }, AmendmentError.AmendmentError> => {
  // ... validações ...
  // Constrói diretamente PendingWithoutDocument (todo aditivo nasce nesse estado).
};

const attachSignedDocument = (
  amendment: PendingWithoutDocumentAmendment,
  signedDocumentRef: DocumentId,
): Result<{ amendment: PendingWithDocumentAmendment; event }, AmendmentError.AmendmentError> => {
  // Sem runtime check de status ou signedDocumentRef — garantia estática.
  // Apenas constrói o próximo subtipo.
};

const homologate = (
  amendment: PendingWithDocumentAmendment,
  by: UserRef,
  at: Date,
): Result<{ amendment: HomologatedAmendment; event }, AmendmentError.AmendmentError> => {
  // Sem runtime check — garantia estática: PendingWithDocument sempre tem signedDocumentRef.
  // Apenas valida `at` (assertValidEventDate).
};

export const Amendment = {
  create,
  parsePending,
  parsePendingWithoutDocument,
  parsePendingWithDocument,
  attachSignedDocument,
  homologate,
};
```

### Use cases — refinamento na borda

```ts
// attach-signed-document.ts
const pending = Amendment.parsePendingWithoutDocument(amendment);
if (!pending.ok) return pending;
const attached = Amendment.attachSignedDocument(pending.value, documentId);
// attached.value.amendment é PendingWithDocumentAmendment

// homologate-amendment.ts
const pendingWithDoc = Amendment.parsePendingWithDocument(amendment);
if (!pendingWithDoc.ok) return pendingWithDoc;
const homologated = Amendment.homologate(pendingWithDoc.value, by, at);
// homologated.value.amendment é HomologatedAmendment
```

### Mappers (rehidratação)

```ts
// amendment.mapper.ts
const toDomain = (row): Result<Amendment, AmendmentMapperError> => {
  // ... reconstruir VOs ...
  switch (row.status) {
    case 'Pending':
      if (row.homologatedAt !== null || row.homologatedBy !== null) return err(...);
      if (row.signedDocumentRef === null) {
        return ok({ ...core, status: 'Pending', signedDocumentRef: null,
                    homologatedAt: null, homologatedBy: null });
      }
      return ok({ ...core, status: 'Pending', signedDocumentRef: row.signedDocumentRef,
                  homologatedAt: null, homologatedBy: null });
    case 'Homologated':
      if (row.signedDocumentRef === null || row.homologatedAt === null
          || row.homologatedBy === null) return err(... shape impossível);
      return ok({ ...core, status: 'Homologated', ... });
  }
};
```

---

## Critérios de aceitação

### CA1 — Tipos refinados emitidos

- `types.ts` exporta `PendingWithoutDocumentAmendment`, `PendingWithDocumentAmendment`, `HomologatedAmendment`.
- `Amendment` é union discriminada das três.
- `signedDocumentRef`, `homologatedAt`, `homologatedBy` **NUNCA** aparecem como `T | null` no tipo final — cada subtipo carrega o shape exato.

### CA2 — Refinement constructors substituem `assertPending`

- `Amendment.parsePending`, `parsePendingWithoutDocument`, `parsePendingWithDocument` existem.
- `assertPending` é **removido** do arquivo. `grep assertPending src/` retorna **zero**.

### CA3 — Transições têm assinatura refinada

- `attachSignedDocument(a: PendingWithoutDocumentAmendment, ref): Result<{ amendment: PendingWithDocumentAmendment; ... }, ...>`.
- `homologate(a: PendingWithDocumentAmendment, by, at): Result<{ amendment: HomologatedAmendment; ... }, ...>`.
- `create(input): Result<{ amendment: PendingWithoutDocumentAmendment; ... }, ...>`.
- **TS rejeita** chamar `homologate(pendingWithoutDocAmendment)` em compile time — verificado por `@ts-expect-error`.
- **TS rejeita** chamar `attachSignedDocument(homologatedAmendment)` em compile time — idem.

### CA4 — Aninhamento status × kind preservado (DO C§28; DON'T C§26)

- O eixo `kind` (Addition/Suppression/TermChange/Misc) está em `AmendmentCore` via `AmendmentVariant`.
- Os 3 tipos refinados de estado **NÃO duplicam** os 4 kinds (não há `PendingWithoutDocumentAddition | PendingWithoutDocumentSuppression | ...` = 12 tipos).
- `grep -E "PendingWithoutDocument(Addition|Suppression|TermChange|Misc)"` retorna zero.

### CA5 — Use cases consomem refinement na borda

- `attach-signed-document.ts` chama `Amendment.parsePendingWithoutDocument` antes de `attachSignedDocument`.
- `homologate-amendment.ts` chama `Amendment.parsePendingWithDocument` antes de `homologate`.

### CA6 — Mappers retornam union; preservam subtipo no round-trip

- `amendment.mapper.ts toDomain` decide subtipo por `row.status` + `row.signedDocumentRef`.
- Shape impossível (Pending + homologatedAt definido, Homologated + signedDocumentRef null, etc.) retorna erro tagged.
- Round-trip preserva o subtipo correto em InMemory e Drizzle.

### CA7 — Cobertura preserva regressões

- `pnpm test` verde com **≥** 607 (baseline pós-Contract SM).
- Pelo menos 5 testes novos:
  - `parsePending` retorna ok para Pending, err para Homologated.
  - `parsePendingWithoutDocument` happy + 2 err paths (NotPending, AlreadyAttached).
  - `parsePendingWithDocument` happy + 2 err paths (NotPending, WithoutDocument).
  - `@ts-expect-error` em `homologate(pendingWithoutDoc)` (CA3 estática).
  - Mapper rejeita shape impossível (Homologated sem doc, Pending com homologatedAt).

### CA8 — Gates W3 verdes em round 1 (ideal) ou ≤ 2

- `pnpm run typecheck` ✅
- `pnpm run format:check` ✅ (ou ⚠️ só `README.md`)
- `pnpm test` ✅
- `pnpm run lint` ✅

---

## Arquivos previstos

### `src/` (produção)

```
src/modules/contracts/domain/amendment/types.ts                          (refactor — 3 tipos refinados + union)
src/modules/contracts/domain/amendment/amendment.ts                      (refactor — parsePending* + transições refinadas)
src/modules/contracts/domain/amendment/errors.ts                         (zero mudança esperada — AmendmentNotPending e companions já existem)
src/modules/contracts/adapters/persistence/mappers/amendment.mapper.ts   (refactor toDomain — switch + shape impossível tagged)
src/modules/contracts/application/use-cases/attach-signed-document.ts    (parsePendingWithoutDocument)
src/modules/contracts/application/use-cases/homologate-amendment.ts      (parsePendingWithDocument; remove o check signedDocumentRef === null)
src/modules/contracts/application/use-cases/create-amendment.ts          (tipagem do output)
src/modules/contracts/cli/state.ts                                       (isValidAmendment: validar shape por status)
```

### `tests/` (RED → GREEN)

```
tests/modules/contracts/domain/amendment/amendment.test.ts                       (+ parsePending* + CA3 estática)
tests/modules/contracts/application/use-cases/attach-signed-document.test.ts     (+ caminho parsePendingWithoutDocument falha)
tests/modules/contracts/application/use-cases/homologate-amendment.test.ts       (já tem; ajustar para parsePendingWithDocument)
tests/modules/contracts/adapters/persistence/amendment.mapper.test.ts            (criar se não existir — CA6 round-trip)
tests/modules/contracts/adapters/persistence/fixtures.ts                         (builders refinados — buildPendingAmendmentWithoutDoc, buildPendingAmendmentWithDoc, buildHomologatedAmendment)
```

---

## Não-objetivos (fora do escopo)

- **`NonZeroMoney` brandado** em Addition/Suppression — ticket separado `CTR-DOMAIN-INVARIANT-CONTEXTUAL`.
- **`Amendment.toAdjustments` retornando array (C§31)** — já existe; não tocar.
- **Codemod de imports** — `CTR-DOMAIN-IMPORT-CODEMOD`.
- **Mover `Repository` para `domain/<agg>/`** — `CTR-DOMAIN-RESTRUCTURE`.

---

## Risco / pontos de atenção

1. **Discriminador composto (`status` + `signedDocumentRef === null`).** TypeScript narrowa bem, mas pode confundir o leitor. Comentários explícitos no `types.ts` ajudam.
2. **Cast em `create`** (atual) some — a construção direta de `PendingWithoutDocument` resolve o que antes precisava `as AmendmentEntity` no resultado da if-chain de 4 branches.
3. **Mapper:** o variant kind continua sendo lido do row separadamente. O mapper precisa preservar tanto o estado (via switch em status × signedDocumentRef) quanto o kind (via switch em kind). Duas dimensões — atenção pra não criar cross-product no código do mapper também.
4. **CLI `state.ts:isValidAmendment`:** validação atual é shape genérico. Após refactor, validar consistência (Pending → homologatedAt null; Homologated → todos os campos terminais presentes).
5. **`AmendmentUpdate`/`updateAmendment` em `types.ts`:** análogo ao Contract — virar genérico `<T extends Amendment>` preservando subtipo, sem `status`/`signedDocumentRef`/`homologatedAt`/`homologatedBy` no patch (esses só mudam via transições).
6. **Mitigação Bug #47936:** o orchestrator está em Opus + checklist + hook SubagentStop. Refactor é tão grande quanto o Contract — provavelmente W1 será mid-task interrupção também. Aceitar fallback admin como padrão. Plano: [`.claude/.planning/SUBAGENT-INTERRUPTION-FIX.md`](../../../.planning/SUBAGENT-INTERRUPTION-FIX.md).

---

## Próximos tickets (cadeia)

```
[FECHADO] STATE-MACHINE-CONTRACT → [ESTE] STATE-MACHINE-AMENDMENT
                                                            ↘ [LATER] INVARIANT-CONTEXTUAL (NonZeroMoney brandado)
                                                            ↘ [LATER] SKILL-REFRESH-D (atualiza SKILL §3.D)
```

Após este ticket, **top-3 leverage #1 ENTREGUE em 2/2** (Contract + Amendment state machines completas).
