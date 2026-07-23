# W3 — gate de qualidade — FIN-PAYABLE-COUNTS (#536)

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| typecheck | `pnpm run typecheck` | ✅ `tsc --noEmit` limpo |
| lint | `pnpm exec eslint <port+2 adapters+schemas+plugin+composition+test>` | ✅ 0 erros |
| format | `pnpm run format:check` | ✅ All matched files use Prettier code style |
| test | `pnpm test` | ✅ 4332 tests · 4313 pass · **0 fail** · 19 skip |

CA1 (total/byStatus soma) ✅ · CA2 (draft à parte) ✅ · CA3 (filtro recorta títulos e draft) ✅ · CA4 (gate
401/403) ✅ · CA5 (regressão zero) ✅. Wiring + agregação provados por `fastify.inject` (in-memory). A query
real `GROUP BY status` contra MySQL é #500-gated (mesma fila de integração).
