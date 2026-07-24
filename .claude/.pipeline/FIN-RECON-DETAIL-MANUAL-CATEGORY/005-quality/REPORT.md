# W3 — gate de qualidade — FIN-RECON-DETAIL-MANUAL-CATEGORY (fatia 1)

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| typecheck | `pnpm run typecheck` | ✅ `tsc --noEmit` limpo |
| lint | `pnpm exec eslint <7 arquivos tocados>` | ✅ 0 erros |
| format | `pnpm run format:check` | ✅ All matched files use Prettier code style |
| test | `pnpm test` | ✅ 4382 tests · 4362 pass · **0 fail** · 20 skip |

CA1 (manual entry com categoryRef → `category` = nome resolvido) ✅ · CA2 (sem categoryRef → null) ✅ ·
CA3 (conciliação sem manual entry → null) ✅ · CA4 (regressão zero — fixture `strict-response` atualizado à
nova spec, sem enfraquecer) ✅.

Reidratação do `manualEntry` contra MySQL real é #500-gated; wiring + resolução provados por `fastify.inject`
(in-memory popula o manualEntry). Sem migration (colunas/refs já existem).
