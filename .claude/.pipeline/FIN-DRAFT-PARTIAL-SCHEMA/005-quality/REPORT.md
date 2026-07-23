# W3 — gate de qualidade — FIN-DRAFT-PARTIAL-SCHEMA (#534)

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| typecheck | `pnpm run typecheck` | ✅ `tsc --noEmit` limpo |
| lint | `pnpm exec eslint <schemas> <plugin> <test>` | ✅ 0 erros |
| format | `pnpm run format:check` | ✅ All matched files use Prettier code style |
| test | `pnpm test` | ✅ 4331 tests · 4312 pass · **0 fail** · 19 skip |

CA1 (draft parcial só `type` → 201) ✅ · CA2 (draft parcial só `documentNumber` → 201) ✅ · CA3
(`asDraft:false` parcial → 400 inalterado) ✅ · CA4 (Open completo sem regressão) ✅ · CA5 (regressão zero)
✅. Fix na borda HTTP — provado por `fastify.inject` (memory), **não depende do #500**.
