# W1 — Implementação GREEN · CTR-LIST-AUTHORIZE (#202)

**Wave**: W1 · **Outcome**: **GREEN** · **Data**: 2026-06-22

## Mudança de produção (1 linha)

`src/modules/contracts/adapters/http/plugin.ts` (rota `GET /contracts`, L180):

```ts
// antes
preHandler: hooks.requireAuth,
// depois
preHandler: [hooks.requireAuth, hooks.authorize(CONTRACT_PERMISSION.read)],
```

Alinha a listagem às rotas-irmãs (`/contracts/:id`, `/:id/history`, `/export.csv`). `CONTRACT_PERMISSION` já importado (L36).

## Raio do fix — testes pré-existentes que codificavam o comportamento bugado (regressão zero)

A política de regressão zero pegou **2 testes** que afirmavam o vazamento (decisão antiga "listagem enxuta", comentário `plugin.ts:246`). Não são "erro alheio" — são asserções do contrato inseguro que o #202 reverte; corrigidas para o contrato seguro:

1. `tests/modules/contracts/adapters/http/contracts-list.routes.test.ts` — CA2 ("token válido → 200 + paged") registrava um usuário **sem** permissão. Corrigido: o `makeApp` agora **semeia `contract:read`** para o usuário do caminho feliz (preserva a intenção: validar o shape paginado `{items, meta}`), e o `login` apenas loga o usuário semeado.
2. `tests/modules/contracts/adapters/http/contracts-reads.routes.test.ts` — CA5 era *"GET /contracts (list) segue 200 com qualquer token válido"* (guard que **codificava o bug**). **Invertido** para *"exige contract:read — 403 sem, 200 com"*, refletindo o invariante correto pós-#202.

## Resultado dos testes

| Suite | tests | pass | fail |
|---|---|---|---|
| `contracts-list-authorize.routes.test.ts` (alvo) | 3 | 3 | 0 |
| Suíte HTTP completa do contracts (`adapters/http/*.test.ts`) | 193 | 193 | 0 |

Falha RED do W0 (US1/CA2: 403 sem `contract:read`) → GREEN. Guards (401, 200 com permissão) mantidos. **Zero regressão** (os 2 testes que quebraram foram corrigidos para o contrato seguro, com prova de verde na suíte inteira).

## Verificação adicional (sem ação)

`tests/e2e/contracts-smoke.e2e.ts` chama a listagem (L130) com o **operador seedado** (tem `contract:read`) → 200 segue correto; o caso 403 do e2e é sobre `/:id`. Consistente com #202. (Arquivo `.e2e.ts` não entra em `pnpm test` — só no caminho E2E opt-in.)

## Próximo (W2)

Code review read-only: paridade com rotas-irmãs, ADR-0006, ausência de mudança de contrato de resposta, e a justificativa da correção dos 2 testes (encoded-bug → secure-contract).
