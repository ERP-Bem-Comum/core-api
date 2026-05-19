# W0 — RED — Ticket CTR-VO-PERIOD

**Skill:** ts-domain-modeler (modo teste)
**Data:** 2026-05-14
**Status:** ✅ RED confirmado

---

## Arquivos criados

- `tests/modules/contracts/domain/shared/period.test.ts` (172 linhas, 24 testes em 7 suítes)

---

## Inventário dos testes

### Suíte 1 — `Period — create (Fixed)` (5 testes)
1. accepts valid start and end (verifica `kind: 'Fixed'` + timestamps)
2. accepts `start === end` (single-instant period)
3. rejects end before start → `'period-end-before-start'`
4. rejects invalid start (`new Date('not-a-date')`) → `'period-invalid-start-date'`
5. rejects invalid end → `'period-invalid-end-date'`

### Suíte 2 — `Period — createIndefinite` (2 testes)
1. accepts valid start (verifica `kind: 'Indefinite'`)
2. rejects invalid start → `'period-invalid-start-date'`

### Suíte 3 — `Period — contains (Fixed)` (5 testes)
1. instant inside range → true
2. instant equal to start (inclusive) → true
3. instant equal to end (inclusive) → true
4. instant before start → false
5. instant after end → false

### Suíte 4 — `Period — contains (Indefinite)` (3 testes)
1. instant after start (ex.: `2099-12-31`) → true
2. instant equal to start (inclusive) → true
3. instant before start → false

### Suíte 5 — `Period — contains (invalid instant)` (2 testes)
1. NaN date — Fixed period → false
2. NaN date — Indefinite period → false

### Suíte 6 — `Period — equals` (6 testes)
1. Two Fixed with same start and end → true
2. Different starts → false
3. Different ends → false
4. Two Indefinite with same start → true
5. Indefinite with different starts → false
6. Fixed vs Indefinite → false

### Suíte 7 — `Period — isIndefinite` (2 testes)
1. Fixed → false
2. Indefinite → true

**Total: 25 testes** (5+2+5+3+2+6+2). Total acumulado esperado pós-W1: 44 + 25 = **69 testes**.

---

## Helpers de teste

```ts
const D = (iso: string): Date => new Date(iso);
const INVALID = new Date('not-a-date');

const fixed = (startISO: string, endISO: string) => { /* fixture builder */ };
const indefinite = (startISO: string) => { /* fixture builder */ };
```

Os builders `fixed` e `indefinite` constroem `Period` via smart constructor, fazendo `throw` se a fixture estiver quebrada (mesma convenção dos `c(n)` helpers do Money). Aceitável em testes.

---

## Confirmação de RED

```
pnpm typecheck
→ tests/modules/contracts/domain/shared/period.test.ts(5,24): error TS2307:
  Cannot find module '#src/modules/contracts/domain/shared/period.ts'

pnpm test
→ tests, pass 44 (Money + IDs), fail 1 (period.test.ts não carrega)
```

✅ **W0 RED confirmado.** Os 44 testes anteriores continuam verdes (sem regressão).

---

## Decisões pré-W1 (registradas)

| # | Decisão | Justificativa |
| :-- | :--- | :--- |
| D1 | Discriminated union `Fixed` \| `Indefinite` | Regra varia por variante (contains, equals). Espelha estruturalmente `contractPeriodIsIndefinite` do legado. |
| D2 | `Date` como representação; tratar como imutável (não chamar `set*`) | Idiomático TS. CLAUDE.md raiz estabelece a política. |
| D3 | 5 funções no namespace: `create`, `createIndefinite`, `contains`, `equals`, `isIndefinite` | API mínima. `extend`, `overlaps`, `duration` ficam para tickets futuros. |
| D4 | `contains` retorna `false` para instant NaN | Defensivo — Date corrompida não causa crash. |
| D5 | Erros separados para start/end inválido | UI sabe qual campo errou. |
| D6 | `start === end` é período válido | Caller decide significado. |
| D7 | `contains` usa `switch(p.kind)` exhaustive com `never` no default + `throw new Error('unreachable')` | Única exceção a "no throw" no domínio — branch inalcançável em código bem tipado. Padronizado em `ts-exhaustive-switch.md`. |

---

## Próximo passo

W1 — implementar `src/modules/contracts/domain/shared/period.ts` aplicando D1–D7. Todos os 25 testes novos devem passar; 44 anteriores continuam verdes.
