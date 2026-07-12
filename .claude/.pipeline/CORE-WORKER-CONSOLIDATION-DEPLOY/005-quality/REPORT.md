# W3 — Gate de Qualidade (GREEN) · CORE-WORKER-CONSOLIDATION-DEPLOY

**Skill:** ts-quality-checker.

## Comandos

| Gate | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `pnpm run typecheck` (`tsc --noEmit`) | ✓ limpo |
| Format | `pnpm run format:check` (`prettier --check .`) | ✓ "All matched files use Prettier code style!" |
| Lint | `pnpm run lint` (`eslint .`) | ✓ limpo (sem output) |
| Test | `pnpm test` | ✓ **pass 3854 · fail 0** · skipped 18 · todo 5 · dur 78.8s |

## Notas sobre o resultado dos testes

- **Teste de infra deste ticket** (`tests/infra/worker-runner-compose.test.ts`): **skip** — Docker CLI ausente neste Mac (skip-guard `FIN-TEST-INFRA-SKIP-GUARD`). Roda de verdade no CI/x99 (com `docker compose`). Prova estrutural do RED→GREEN via parse do compose (W0/W1 REPORTs).
- **`native-pdf-real.local.test.ts` (5 `todo`, #388)**: aparecem sob "✖ failing tests" no output do runner, mas são `{ todo }` — não incrementam `fail` nem afetam o exit code (confirmado: `node --test <arquivo>` → **exit 0**). Documentam o gap conhecido do reader PDF (#388, hex Identity-H sem /ToUnicode); LOCAIS-only (fixtures reais gitignored por LGPD). **Alheios a este ticket, e corretamente gateados** — não há regressão (política de regressão zero satisfeita: gate mede o certo).

## Pendências fora do gate local (rastreadas)

- **Validação x99 do compose consolidado**: subir os 3 grupos via `docker compose --profile workers up` no x99 e provar isolamento (1 loop falha → irmãos seguem) + shutdown (SIGTERM drena). A validação x99 do **runner** já foi feita (2026-07-10, runbook ERP-INFRA); falta a do **compose** especificamente. Exige Docker (x99, nunca Docker local no Mac).
- **Cutover em prod** (ops): registrar os 3 taskdefs + drenar os 5 serviços antigos — runbook `ERP-INFRA/docs/runbooks/worker-consolidation-407.md` §5.

## Veredito

**GREEN.** Gate local completo verde. Ticket pronto para commit; validação x99 do compose + cutover prod são passos de deploy (fora do gate de código).
