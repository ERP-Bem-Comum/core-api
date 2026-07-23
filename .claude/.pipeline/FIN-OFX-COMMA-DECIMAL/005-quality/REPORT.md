# W3 — gate de qualidade — FIN-OFX-COMMA-DECIMAL (#531)

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| typecheck | `pnpm run typecheck` | ✅ `tsc --noEmit` limpo |
| lint | `pnpm exec eslint <amount> <test>` | ✅ 0 problems |
| format | `pnpm run format:check` | ✅ All matched files use Prettier code style |
| test | `pnpm test` | ✅ 4333 tests · 4314 pass · **0 fail** · 19 skip |

CA1 (`'123,45'→12345`) ✅ · CA2 (`'-845,00'→-84500`) ✅ · CA3 (ponto sem regressão) ✅ · CA4 (não-numérico→null)
✅ · CA5 (OFX Bradesco parseia, não `malformed-statement`) ✅ · CA6 (regressão zero) ✅. Fix pura em memória —
não depende de #500.
