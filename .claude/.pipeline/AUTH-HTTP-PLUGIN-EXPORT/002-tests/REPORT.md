# W0 — Testes RED — AUTH-HTTP-PLUGIN-EXPORT

**Wave:** W0 (fail-first) · **Skill:** tdd-strategist · **Outcome:** RED · **Data:** 2026-05-28

## O que foi escrito

- `tests/modules/auth/adapters/http/plugin.test.ts` — cobre os 5 CAs da SPEC via `app.inject` (black-box).
  Importa `buildApp` de `#src/shared/http/app.ts` (já existe) e `authHttpPlugin` de
  `#src/modules/auth/public-api/http.ts` (**ainda não existe** → causa o RED).

## Cobertura dos CAs

| CA | Asserção |
| :-- | :-- |
| CA1 (wiring) | `buildApp({ routes: [authHttpPlugin] })` → `GET /api/v2/auth/__ping` = 200 `{ pong: true }` |
| CA2 (é o plugin que monta) | `buildApp({ routes: [] })` → `GET /api/v2/auth/__ping` = 404 + envelope `{error:{code:'not-found',…}}` |
| CA3 (contract-first) | `GET /docs/json` contém a chave de path `/api/v2/auth/__ping` |
| CA4 (encapsulamento) | `GET /__ping` na raiz = 404; `GET /health` = 200 `{status:'ok'}` |
| CA5 (ADR-0006) | `typeof authHttpPlugin === 'function'` (importável de `public-api/http.ts`) |

## Evidência do RED

```
node --test tests/modules/auth/adapters/http/plugin.test.ts
✖ tests/modules/auth/adapters/http/plugin.test.ts  (test failed)
```
Falha por **inexistência do ponto público** (`#src/modules/auth/public-api/http.ts`). GREEN quando o W1
entregar `adapters/http/plugin.ts` (rota sentinela `__ping` com response schema Zod, sub-prefixo `/auth`),
`public-api/http.ts` (re-export) e o wiring em `src/server.ts` (`routes: [authHttpPlugin]`).
