# W3 — gate de qualidade — FIN-RECON-DETAIL-TITLE-CATEGORY (fatia 2)

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| typecheck | `pnpm run typecheck` | ✅ `tsc --noEmit` limpo |
| lint | `pnpm exec eslint <composition+plugin+test>` | ✅ 0 erros |
| format | `pnpm run format:check` | ✅ All matched files use Prettier code style |
| test | `pnpm test` | ✅ 4384 tests · 4364 pass · **0 fail** · 20 skip |

CA1 (título com categoryRef → nome resolvido) ✅ · CA2 (título sem categoryRef → null) ✅ · CA3 (lançamento
manual segue resolvendo — não-regressão da fatia 1) ✅ · CA4 (regressão zero) ✅.

Empilha sobre a fatia 1. Sem migration. Resolução real via `payableDocView` Drizzle é #500-gated; wiring
provado por `fastify.inject` (payableDocView in-memory semeado).
