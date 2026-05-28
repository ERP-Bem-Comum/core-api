# W0 — Testes RED — CORE-HTTP-SHELL-RELOCATE

**Wave:** W0 (fail-first) · **Skill:** tdd-strategist · **Outcome:** RED · **Data:** 2026-05-28

## O que foi escrito

- `tests/shared/http/bootstrap.test.ts` — espelho de `tests/http/bootstrap.test.ts` (H0) com os imports
  apontando para a **nova home** do shell (ADR-0028): `#src/shared/http/app.ts` e `#src/shared/http/reply.ts`.
  As **7 asserções do H0 são idênticas** (refactor sem mudança de comportamento — CA1 da SPEC).

## Cobertura dos CAs da SPEC

| CA | Como é coberto no W0 |
| :-- | :-- |
| CA1 (comportamento preservado) | As 7 asserções (`/health`, 500-envelope-sem-stack, 400-Zod, helmet nosniff, 404, `/docs/json` 3.1.1, `sendResult`) migram intactas, importando de `#src/shared/http/*` |
| CA2 (sem import órfão) | Verificável no W2/W3 via `grep -r "#src/http/"` — o teste novo já não usa o path antigo |
| CA3 (composition root) | `src/server.ts` é validado no W1/W3 (entrypoint não é exercitado por `inject`; coberto por typecheck) |
| CA4 (lint) / CA5 (gate) | W3 (`ts-quality-checker`) |

## Evidência do RED

```
node --test --experimental-strip-types --no-warnings tests/shared/http/bootstrap.test.ts

code: 'ERR_MODULE_NOT_FOUND',
url: '.../src/shared/http/app.ts'

ℹ tests 1 · ℹ pass 0 · ℹ fail 1
```

Falha por **inexistência da API na nova home** — exatamente o esperado. GREEN quando o W1 mover
`src/http/{app,config,errors,reply}.ts` → `src/shared/http/`, `src/http/server.ts` → `src/server.ts`,
reescrever imports `#src/http/*` → `#src/shared/http/*`, remover `tests/http/bootstrap.test.ts` e
`src/http/`, e estender o glob do ESLint.

## Nota

O teste legado `tests/http/bootstrap.test.ts` segue verde (importa `#src/http/*`, que ainda existe) — será
**removido** pelo W1 junto da pasta antiga. Não há divergência de asserção entre os dois (mesmo conteúdo).
