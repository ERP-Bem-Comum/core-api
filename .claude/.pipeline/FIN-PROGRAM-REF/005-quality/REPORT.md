# W3 — Gate de Qualidade · FIN-PROGRAM-REF (US3 Programa, passthrough)

**Wave**: W3 · **Agente**: ts-quality-checker · **Data**: 2026-06-20

## Gate canônico (CLAUDE.md §W3) — **VERDE**

| Comando | Resultado |
| --- | --- |
| `pnpm run typecheck` | ✅ `tsc --noEmit` — 0 erros (cross-módulo financial↔programs) |
| `pnpm run format:check` | ✅ `All matched files use Prettier code style!` (sem migration nova no US3) |
| `pnpm run lint` | ✅ `eslint .` — 0 problemas |
| `pnpm test` | ✅ **3037 pass / 0 fail** (3055 tests; +4 do US3; 18 skipped — integração opt-in) |

## Integração (`test:integration:financial`, MySQL real) — **VERDE**

**36 pass / 0 fail** (14 suites). Sem regressão na cadeia financial; o `composition` mysql passou a abrir/fechar `buildProgramsReadPort` (cross-módulo `programs`) sem quebrar os repos drizzle.

## Follow-up de cobertura (🟡)

- Os read stores Drizzle de referência (`category-read`, `cost-center-read`) e a listagem real `programs.listAll()` (`program-list-read.drizzle`) **não têm teste de integração dedicado** (cobertos por `typecheck` + paridade + regressão da migration). Registrar um único follow-up para adicionar `*-read.drizzle-mysql.test.ts` dos três + entradas no script `test:integration:financial`.

## Veredito

Gate W3 **VERDE em todos os comandos** (incl. integração 36/36). Feature 020 **completa** (US1 + US2 + US3). Zero vermelho.
