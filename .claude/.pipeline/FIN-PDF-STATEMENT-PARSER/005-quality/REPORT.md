# W3 — gate de qualidade — FIN-PDF-STATEMENT-PARSER

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| typecheck | `pnpm run typecheck` | ✅ `tsc --noEmit` limpo |
| lint | `pnpm run lint` | ✅ `eslint .` sem erros |
| format | `pnpm run format:check` | ✅ All matched files use Prettier code style |
| test | `pnpm test` | ✅ 4403 tests · 4383 pass · **0 fail** · 20 skip |

- `parsePdf` (gabarito de texto): 6 CA verdes — 23 transações, saldo inicial/final, 1ª crédito, débito,
  continuidade de saldo, folha 2 excluída.
- Dispatcher PDF (base64 → `unpdf` → `parsePdf`) com o PDF real fictício: 2 casos verdes (extração + erro).
- Prova manual e2e adicional com o PDF binário original: 23 transações, saldos batendo.

Sem migration, sem #500-gate (o `unpdf` roda in-process; a extração é testada no `pnpm test` puro).
