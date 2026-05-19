# W1 — GREEN — Ticket CTR-VO-IDS

**Skill:** ts-domain-modeler (modo implementação)
**Data:** 2026-05-14
**Status:** ✅ GREEN — 44/44 testes passando (20 Money + 24 IDs), `tsc --noEmit` zero erros

---

## Arquivos criados

- `src/modules/contracts/domain/shared/ids.ts` (30 linhas)

Nenhum outro arquivo editado nesta wave.

---

## Implementação aplicada

```ts
import { type Result, ok, err } from '../../../../shared/result.ts';
import { isUuidV4, newUuid } from '../../../../shared/id.ts';
import type { Brand } from '../../../../shared/brand.ts';

export type ContractId = Brand<string, 'ContractId'>;
export type AmendmentId = Brand<string, 'AmendmentId'>;
export type DocumentId = Brand<string, 'DocumentId'>;

export type ContractIdError = 'contract-id-invalid';
export type AmendmentIdError = 'amendment-id-invalid';
export type DocumentIdError = 'document-id-invalid';

export const ContractId = {
  generate: (): ContractId => newUuid() as ContractId,
  rehydrate: (raw: string): Result<ContractId, ContractIdError> =>
    isUuidV4(raw) ? ok(raw as ContractId) : err('contract-id-invalid'),
};

export const AmendmentId = { /* idem */ };
export const DocumentId = { /* idem */ };
```

---

## Adesão às decisões D1–D5

| # | Decisão | Aplicada? |
| :-- | :--- | :--- |
| D1 | Cada ID é `Brand<string, '<Name>'>` | ✅ linhas 5-7 |
| D2 | API uniforme `<Id> = { generate, rehydrate }` | ✅ linhas 13-29 |
| D3 | `generate` usa `newUuid()` + cast direto | ✅ linhas 14, 20, 26 |
| D4 | `rehydrate` valida via `isUuidV4` antes do cast | ✅ linhas 15-16, 21-22, 27-28 |
| D5 | Sem factory genérica — 3 namespaces literais | ✅ |

---

## Adesão às regras transversais

- ✅ Zero `throw`. Falhas via `err(...)`.
- ✅ Zero `class`, `this`, `extends`.
- ✅ Zero `any`. Casts `as <IdType>` apenas após:
  - `newUuid()` retornar valor válido por construção (garantido pelo `node:crypto.randomUUID`).
  - `isUuidV4(raw)` retornar `true`.
- ✅ Toda função exportada tem return type explícito.
- ✅ Erros string literal kebab-case EN.
- ✅ `import type { Brand }`, `import { type Result, ok, err }`, `import { isUuidV4, newUuid }`.
- ✅ Imports terminam em `.ts`.
- ✅ Identificadores em EN.

---

## Verificação de saída

### `pnpm typecheck`

```
> tsc --noEmit
(silencioso — zero erros)
```

### `pnpm test`

```
ℹ tests 44
ℹ suites 11
ℹ pass 44
ℹ fail 0
ℹ duration_ms 125.115
```

✅ **44/44** — sem regressão dos 20 do Money, e os 24 novos do IDs todos verdes.

**Breakdown da suíte de IDs:**

- ContractId — generate (2/2)
- ContractId — rehydrate (6/6)
- AmendmentId — generate (2/2)
- AmendmentId — rehydrate (6/6)
- DocumentId — generate (2/2)
- DocumentId — rehydrate (6/6)

---

## YAGNI compliance

Não foi adicionado:
- `XxxId.equals(a, b)` — comparação de string igual é trivial; quem precisar usa `a === b`.
- `XxxId.toString()` — branded string já é string em runtime; debug funciona.
- Factory genérica `createIdNamespace` — abstração desnecessária para 3 casos quase idênticos.

Total: **30 linhas** — 3 namespaces × ~6 linhas cada + imports + tipos.

---

## Próximo passo

W2 — `code-reviewer` audita `ids.ts` read-only e produz `004-code-review/REVIEW.md`.
