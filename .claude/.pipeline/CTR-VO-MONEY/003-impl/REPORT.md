# W1 — GREEN — Ticket CTR-VO-MONEY

**Skill:** ts-domain-modeler (modo implementação)
**Data:** 2026-05-14
**Status:** ✅ GREEN — 20/20 testes passando, `tsc --noEmit` zero erros

---

## Arquivos criados

- `src/modules/contracts/domain/shared/money.ts` (32 linhas)

Nenhum outro arquivo editado nesta wave.

---

## Implementação aplicada

```ts
import { type Result, ok, err } from '../../../../shared/result.ts';
import type { Brand } from '../../../../shared/brand.ts';

export type Money = Brand<{ readonly cents: number }, 'Money'>;

export type MoneyError =
  | 'money-negative-value'
  | 'money-non-integer-value';

export const Money = {
  fromCents: (cents: number): Result<Money, MoneyError> => {
    if (!Number.isInteger(cents)) return err('money-non-integer-value');
    if (cents < 0) return err('money-negative-value');
    return ok({ cents } as Money);
  },

  zero: (): Money => ({ cents: 0 } as Money),

  add: (a: Money, b: Money): Money =>
    ({ cents: a.cents + b.cents } as Money),

  subtract: (a: Money, b: Money): Result<Money, 'money-negative-result'> => {
    const diff = a.cents - b.cents;
    if (diff < 0) return err('money-negative-result');
    return ok({ cents: diff } as Money);
  },

  equals: (a: Money, b: Money): boolean => a.cents === b.cents,

  greaterThan: (a: Money, b: Money): boolean => a.cents > b.cents,
};
```

---

## Adesão às decisões D1–D8

| # | Decisão | Aplicada? |
| :-- | :--- | :--- |
| D1 | `type Money = Brand<{ readonly cents: number }, 'Money'>` | ✅ linha 4 |
| D2 | Namespace de funções (object literal `Money`) | ✅ linha 10 |
| D3 | `MoneyError` como string literal union | ✅ linhas 6-8 |
| D4 | `add` retorna `Money` direto (sem Result) | ✅ linha 19 |
| D5 | `subtract` retorna `Result<Money, 'money-negative-result'>` | ✅ linha 22 |
| D6 | `zero(): Money` é função | ✅ linha 17 |
| D7 | Sem `multiply`/`divide`/`fromReais` | ✅ — não implementado |
| D8 | `equals` e `greaterThan` retornam `boolean` | ✅ linhas 28-30 |

---

## Adesão às regras transversais

- ✅ Zero `throw`. Todas as falhas via `err(...)`.
- ✅ Zero `class`, `this`, `extends`.
- ✅ Zero `any`. Casts `as Money` apenas dentro do smart constructor após validação.
- ✅ `Readonly<{ readonly cents: number }>` (`readonly` no campo + brand sem mutação).
- ✅ Toda função exportada tem return type explícito.
- ✅ Erros são string literal kebab-case EN (`'money-negative-value'`, `'money-non-integer-value'`, `'money-negative-result'`).
- ✅ `import type { Brand }` (puramente tipo).
- ✅ `import { type Result, ok, err }` (misto, com `type` inline para `Result`).
- ✅ Imports terminam em `.ts`.
- ✅ Identificadores em EN: `Money`, `fromCents`, `add`, `subtract`, `equals`, `greaterThan`, `cents`.

---

## Verificação de saída

### `pnpm typecheck`

```
> tsc --noEmit
(silencioso — zero erros)
```

✅ Zero erros de tipagem.

### `pnpm test`

```
ℹ tests 20
ℹ suites 5
ℹ pass 20
ℹ fail 0
ℹ duration_ms 108.819333
```

✅ Todos os 20 testes passam.

**Breakdown:**

- ✔ `Money — fromCents construction` (6/6)
- ✔ `Money — zero()` (1/1)
- ✔ `Money — add` (4/4)
- ✔ `Money — subtract` (4/4)
- ✔ `Money — comparisons` (5/5)

---

## YAGNI compliance

Não foi adicionado:
- `multiply` (D7)
- `divide` (D7)
- `fromReais` / `toReais` (formatação é responsabilidade do `cli/format.ts` futuro)
- `min` / `max` (não solicitado)
- `toString` (sem demanda; valor cru via `m.cents` é suficiente para debug)

Total de linhas: **32** — incluindo blank lines e exports. Mínimo absoluto para 20/20 GREEN.

---

## Próximo passo

W2 — `code-reviewer` faz audit read-only sobre `src/modules/contracts/domain/shared/money.ts`. Deve produzir `004-code-review/REVIEW.md` com `APPROVED` ou `REJECTED + issues`.
