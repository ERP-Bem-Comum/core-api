# W3 — gate de qualidade — FIN-MANUAL-ENTRY-DOC-FIELDS (#370)

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| typecheck | `pnpm run typecheck` | ✅ `tsc --noEmit` limpo (pegou o 2º construtor de ManualEntry) |
| lint | `pnpm exec eslint <9 arquivos tocados>` | ✅ 0 erros |
| format | `pnpm run format:check` | ✅ All matched files use Prettier code style |
| test | `pnpm test` | ✅ 4385 tests · 4365 pass · **0 fail** · 20 skip |

CA1 (4 campos ecoados, valor divergente) ✅ · CA2 (default = valor da transação) ✅ · CA3 (nulls + default,
back-compat) ✅ · CA4 (borda: documentType/issueDate → 400) ✅ · CA5 (regressão zero) ✅.

Migration `0040_foamy_hydra.sql` (ADD 4 colunas em `fin_manual_entries`). Aplicação real contra MySQL é
#500-gated; wiring + default provados por `fastify.inject` (in-memory).
