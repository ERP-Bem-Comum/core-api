# W1 — Implementação (GREEN) — CORE-HTTP-SHELL-RELOCATE

**Wave:** W1 · **Outcome:** GREEN · **Data:** 2026-05-28

## Movimentações realizadas

| De | Para |
| :-- | :-- |
| `src/http/app.ts` | `src/shared/http/app.ts` |
| `src/http/config.ts` | `src/shared/http/config.ts` |
| `src/http/errors.ts` | `src/shared/http/errors.ts` |
| `src/http/reply.ts` | `src/shared/http/reply.ts` |
| `src/http/server.ts` | **`src/server.ts`** (raiz — ADR-0006:63) |
| `tests/http/bootstrap.test.ts` | `tests/shared/http/bootstrap.test.ts` |

Diretórios `src/http/` e `tests/http/` removidos (vazios após o move).

## Reescrita de imports (`#src/http/*` → `#src/shared/http/*`)

- `src/shared/http/app.ts` — `errors.ts`, `config.ts`.
- `src/shared/http/reply.ts` — `errors.ts`.
- `src/server.ts` — `app.ts`, `config.ts`.
- Imports `#src/shared/*` pré-existentes (correlation, primitives/result, runtime/last-resort) **inalterados**.

## ESLint

`eslint.config.js` — bloco de borda HTTP: glob `src/http/**/*.ts` → `['src/shared/http/**/*.ts',
'src/modules/*/adapters/http/**/*.ts']`; comentário atualizado citando ADR-0028. As folgas de adapter
(`prefer-readonly-parameter-types`, `promise-function-async`, `require-await` off) permanecem.

## Evidência GREEN

```
# CA2 — sem import órfão
grep -rn "#src/http/" src/ tests/   →  OK vazio

# CA1 — comportamento preservado (7 asserções idênticas ao H0)
node --test tests/shared/http/bootstrap.test.ts
ℹ tests 7 · ℹ pass 7 · ℹ fail 0

# CA3 implícito — referências resolvem
pnpm run typecheck  →  tsc --noEmit, zero erros
```

## Nota

Nenhuma lógica alterada — apenas localização e path de import. O cabeçalho do teste foi reescrito para
descrever a nova home (removendo a menção transitória a `#src/http/` que existia no W0 RED). Gate completo
(`format:check` + `lint` + suite full) no W3.
