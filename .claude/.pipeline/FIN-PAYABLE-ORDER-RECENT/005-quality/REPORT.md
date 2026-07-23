# W3 — gate de qualidade — FIN-PAYABLE-ORDER-RECENT (#263)

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| typecheck | `pnpm run typecheck` | ✅ `tsc --noEmit` limpo |
| lint | `pnpm exec eslint <drizzle+in-memory+test>` | ✅ 0 erros |
| format | `pnpm run format:check` | ✅ All matched files use Prettier code style |
| test | `pnpm test` | ✅ 4330 tests · 4311 pass · **0 fail** · 19 skip |

CA1 (lançamento mais recente no topo da pág. 1) ✅ · CA2 (ordem `createdAt desc`, paridade in-memory↔Drizzle)
✅ · CA3 (regressão zero — nenhum teste de ordem antiga a atualizar) ✅. A ordenação real contra MySQL
(`ORDER BY created_at DESC`) é #500-gated; o proxy in-memory prova a semântica no `pnpm test`.
