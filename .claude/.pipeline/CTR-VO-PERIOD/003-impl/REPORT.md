# W1 — GREEN — Ticket CTR-VO-PERIOD

**Skill:** ts-domain-modeler (modo implementação)
**Data:** 2026-05-14
**Status:** ✅ GREEN — 69/69 testes passando (20 Money + 24 IDs + 25 Period), `tsc --noEmit` zero erros

---

## Arquivos criados

- `src/modules/contracts/domain/shared/period.ts` (59 linhas)

---

## Implementação aplicada

```ts
import { type Result, ok, err } from '../../../../shared/result.ts';
import type { Brand } from '../../../../shared/brand.ts';

type PeriodShape =
  | Readonly<{ kind: 'Fixed'; start: Date; end: Date }>
  | Readonly<{ kind: 'Indefinite'; start: Date }>;

export type Period = Brand<PeriodShape, 'Period'>;

export type PeriodError =
  | 'period-invalid-start-date'
  | 'period-invalid-end-date'
  | 'period-end-before-start';

const isValidDate = (d: Date): boolean => !Number.isNaN(d.getTime());

export const Period = {
  create: (start: Date, end: Date): Result<Period, PeriodError> => {
    if (!isValidDate(start)) return err('period-invalid-start-date');
    if (!isValidDate(end)) return err('period-invalid-end-date');
    if (end.getTime() < start.getTime()) return err('period-end-before-start');
    return ok({ kind: 'Fixed', start, end } as Period);
  },

  createIndefinite: (start: Date): Result<Period, PeriodError> => {
    if (!isValidDate(start)) return err('period-invalid-start-date');
    return ok({ kind: 'Indefinite', start } as Period);
  },

  contains: (p: Period, instant: Date): boolean => {
    if (!isValidDate(instant)) return false;
    const t = instant.getTime();
    switch (p.kind) {
      case 'Fixed':
        return t >= p.start.getTime() && t <= p.end.getTime();
      case 'Indefinite':
        return t >= p.start.getTime();
      default: {
        const _exhaustive: never = p;
        throw new Error(`unreachable: ${JSON.stringify(_exhaustive)}`);
      }
    }
  },

  equals: (a: Period, b: Period): boolean => {
    if (a.kind !== b.kind) return false;
    if (a.kind === 'Fixed' && b.kind === 'Fixed') {
      return (
        a.start.getTime() === b.start.getTime() &&
        a.end.getTime() === b.end.getTime()
      );
    }
    if (a.kind === 'Indefinite' && b.kind === 'Indefinite') {
      return a.start.getTime() === b.start.getTime();
    }
    return false;
  },

  isIndefinite: (p: Period): boolean => p.kind === 'Indefinite',
};
```

---

## Adesão às decisões D1–D7

| # | Decisão | Aplicada? |
| :-- | :--- | :--- |
| D1 | Discriminated union `Fixed` \| `Indefinite` | ✅ linhas 4-6 |
| D2 | `Date` como representação, imutável por política | ✅ — não há `set*` em parte alguma |
| D3 | 5 funções no namespace | ✅ `create`, `createIndefinite`, `contains`, `equals`, `isIndefinite` |
| D4 | `contains` defensivo para NaN instant | ✅ linha 30 |
| D5 | Erros separados para start/end inválido | ✅ linhas 19-20, 26 |
| D6 | `start === end` é válido | ✅ comparação `end < start` (não `<=`) |
| D7 | Exhaustive switch com `never` + `throw` (única exceção justificada) | ✅ linhas 32-41 |

---

## Adesão às regras transversais

- ✅ **`throw` única ocorrência no domínio**: branch `default` do switch exhaustive (linha 40) — caminho inalcançável em código bem tipado, conforme [`ts-exhaustive-switch.md`](../../skills/ts-domain-modeler/references/ts-exhaustive-switch.md).
- ✅ Zero `class`, `this`, `extends`.
- ✅ Zero `any`. Casts `as Period` apenas após validação em `create` e `createIndefinite`.
- ✅ `Readonly<>` em cada variante da union. `Brand` impede mutação adicional.
- ✅ Erros são string literal union kebab-case EN.
- ✅ Toda função exportada tem return type explícito.
- ✅ `import type { Brand }`, `import { type Result, ok, err }`.
- ✅ Imports terminam em `.ts`.
- ✅ Identificadores em EN: `Period`, `Fixed`, `Indefinite`, `kind`, `start`, `end`, `create`, `createIndefinite`, `contains`, `equals`, `isIndefinite`.

---

## Verificação de saída

### `pnpm typecheck`
```
> tsc --noEmit
(silencioso — zero erros)
```

### `pnpm test`
```
ℹ tests 69
ℹ suites 18
ℹ pass 69
ℹ fail 0
ℹ duration_ms 205.245916
```

✅ **69/69** — 44 testes anteriores continuam verdes, 25 novos do Period todos verdes.

**Breakdown das suítes de Period:**
- Period — create (Fixed) (5/5)
- Period — createIndefinite (2/2)
- Period — contains (Fixed) (5/5)
- Period — contains (Indefinite) (3/3)
- Period — contains (invalid instant) (2/2)
- Period — equals (6/6)
- Period — isIndefinite (2/2)

---

## YAGNI compliance

Não foi adicionado:
- `extend(p, newEnd)` — quando `Amendment.TermChange` precisar.
- `overlaps(a, b)` — não há regra ainda.
- `duration(p)` — só faz sentido para `Fixed`; YAGNI.
- `toISOString()` / `fromISOString()` — serialização é responsabilidade do adapter.
- `expand`/`shrink` — futuro.

Total: **59 linhas** — mais que Money (32) e IDs (30) por causa da union de 2 variantes e do helper `isValidDate`. Ainda mínimo.

---

## Próximo passo

W2 — `code-reviewer` audita `period.ts`. Atenção especial ao `throw` no default do exhaustive switch (justificado, mas vale confirmar).
