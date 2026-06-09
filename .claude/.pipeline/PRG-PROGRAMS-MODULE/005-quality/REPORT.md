# 005 — W3 Gate de Qualidade — PRG-PROGRAMS-MODULE

> Gate final. Todos os comandos verdes. Política de regressão zero respeitada.

| Comando | Resultado |
| --- | --- |
| `pnpm run typecheck` (`tsc --noEmit`) | ✅ verde |
| `pnpm run format:check` (`prettier --check .`) | ✅ "All matched files use Prettier code style!" |
| `pnpm run lint` (`eslint .`) | ✅ verde (0 problemas) |
| `pnpm test` | ✅ **2650 tests · 2631 pass · 0 fail · 19 skip · 814 suites** |
| `pnpm run test:integration:programs` | ✅ **8 pass / 0 fail** |

## Regressão consertada no gate (não fechada com vermelho)

- `eslint` acusava `drizzle.config.programs.ts` "not found by the project service". **Causa-raiz**: o arquivo (criado na fatia 2b) ficou fora de `tsconfig.json#include`, ao contrário dos irmãos `drizzle.config.{auth,partners}.ts`. **Fix**: adicionado ao `include`. Reexecutado `typecheck` + `lint` → verdes.

## Itens corrigidos durante o gate (do próprio diff)

- `plugin.ts`: removido import `err` não usado.
- `programs-writes.routes.test.ts`: removido helper `idOf` não usado (também eliminou `no-base-to-string`).

## Conclusão

W3 GREEN. MVP end-to-end de `programs` completo (domínio → persistência → use cases → logo → HTTP).
