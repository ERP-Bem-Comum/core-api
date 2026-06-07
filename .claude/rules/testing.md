---
paths:
  - "tests/**/*.ts"
---

# Convenções de testes

Aplicáveis a tudo sob `tests/`. Runner: Node test runner nativo + `--experimental-strip-types`.

- **Discovery:** apenas `tests/**/*.test.ts` é descoberto pelo runner.
- **Suítes parametrizadas reutilizáveis:** sufixo `.contract.ts` ou `.suite.ts`. **Não são executadas direto** — exportam uma função `(makeImpl) => void` que adapters consomem dentro do próprio `describe()`. Exemplos: `tests/modules/contracts/adapters/persistence/contract-repository.suite.ts`, `tests/modules/contracts/application/ports/document-storage.contract.ts`.
- **Mirror do `src/`:** `tests/modules/contracts/domain/shared/money.test.ts` testa `src/modules/contracts/domain/shared/money.ts`.
- **Tests podem importar via `#src/*`** (subpath imports declarados no `package.json`).
- **Regras ESLint relaxadas em `tests/**`** (ver `eslint.config.js` final): `floating-promises`, `non-null-assertion`, `return-type`, `naming-convention` — todos `off` em testes.

## Comandos úteis

```bash
pnpm test                                                                       # todos os tests
pnpm run test:integration                                                       # sobe MySQL via Docker --wait + integration
node --test --experimental-strip-types --no-warnings <path>                     # arquivo específico
node --test --experimental-strip-types --no-warnings --test-name-pattern="..."  # filtro por nome
```

## Skills canônicas

- `tdd-strategist` — red-green-refactor aplicado, qual o **próximo** teste ([`SKILL.md`](../skills/tdd-strategist/SKILL.md)).
- `test-pyramid-engineer` — **arquitetura** da suíte: em que camada (unit/integration/contract/e2e) o teste vive, política de test doubles (fakes, não mocks), o que falta cobrir, duplicação entre camadas e gating por velocidade ([`SKILL.md`](../skills/test-pyramid-engineer/SKILL.md)).
