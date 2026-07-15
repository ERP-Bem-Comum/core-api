# W3 — Gate de Qualidade · BGP-MONTH-VO (#413)

**Agente/Skill:** `ts-quality-checker` · **Outcome:** **GREEN** · **Data:** 2026-07-15

## Os 4 comandos — saída integral

### 1/4 — `pnpm run typecheck`

```
$ tsc --noEmit
```

✅ **Sem erros.** É também a prova do **CA4**: `month` obrigatório no agregado seria erro de tipo — como o agregado desceu para `BGP-MONTH-PERSIST`, esta fatia compila isolada, que era exatamente a questão em aberto no W1.

### 2/4 — `pnpm run format:check`

```
Checking formatting...
All matched files use Prettier code style!
```

✅ **Sem divergência.**

### 3/4 — `pnpm run lint`

```
$ eslint .
```

✅ **Sem erro nem warning.**

### 4/4 — `pnpm test`

```
ℹ tests 4062
ℹ suites 1155
ℹ pass 4039
ℹ fail 0
ℹ skipped 18
```

✅ **0 falhas.**

## Regressão zero (constituição §II)

| Métrica | Antes | Depois | Veredito |
| :--- | ---: | ---: | :--- |
| Testes | 4056 | **4062** | **+6** — os 6 do VO. Nenhum teste perdido |
| Falhas | 0 | **0** | ✅ |

Nada foi silenciado: os 18 `skipped` são os pré-existentes (integração atrás de opt-in — `*_INTEGRATION=1`), não desta fatia.

## Critérios de aceite

| CA | Estado | Evidência |
| :-- | :--- | :--- |
| **CA1** — 1..12 válido | ✅ | `parse` aceita os 12 meses |
| **CA2** — fora da faixa → `exercise-month-invalid`, sem throw | ✅ | `0`, `13`, `-1`, `99`, `3.5`, `NaN`, `±Infinity` |
| **CA6** — `rehydrate` rejeita row corrompida | ✅ | `0`, `13`, `-5`, `2.5` |
| ~~CA3 · CA4 · CA5~~ | → `BGP-MONTH-PERSIST` | agregado é inseparável do schema/mapper (ver `003-impl/REPORT.md`) |

## Entregue

**1 arquivo de produção** (`domain/shared/exercise-month.ts`, 21 linhas) + **1 de teste** (6 casos).
Nenhuma migration, nenhum evento, nenhuma dependência nova, nenhum arquivo fora de `budget-plans/domain/shared/`.

## Validação com MySQL real

**N/A nesta fatia** — domínio puro, sem I/O. A validação em MySQL entra em `BGP-MONTH-PERSIST` (schema + migration + upsert). Nota operacional: **x99 offline** hoje → usar OrbStack ou QA; ⚠️ `pnpm test:integration:*` **destrói a infra dev** (`down -v`).

## Veredito

**GREEN** — ticket pronto para `pipeline:state close`.

## Herança para `BGP-MONTH-PERSIST`

1. `month` no agregado `BudgetResult` (`create` **e** `clone`) + **CA3/CA4/CA5** — arrasta **7 call sites** (mapper, `add-budget-result`, 5 testes). Esperado, é o CA4 em ação.
2. O teste do agregado já foi desenhado no W0 desta fatia (incluindo a prova da P.O.: 12 × R$ 3.670,92 = R$ 44.051,04) e está registrado no `tasks.md` como **T012a/T014a**.
