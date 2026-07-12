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

## Validação x99 do compose consolidado (FEITA — 2026-07-12)

Rodada no x99 (`docker compose v5.1.4`, Ubuntu Core) contra o `compose.yaml` da branch (extraído via `git show` para `/tmp`, sem tocar o `~/core-api` do Gabriel). As 6 CAs reproduzidas contra o config real:

```
CA-1  (workers+app) − (app) = worker-email, worker-outbox, worker-projections  ✓
CA-6  sem profile → nenhum worker ativo (opt-in)                                ✓
CA-1b sem serviços legados                                                       ✓
CA-2  os 3 rodam src/workers/runner/run.ts (não standalone/server)              ✓
CA-3  WORKER_GROUP = outbox/projections/email                                    ✓
CA-4  secrets por grupo (outbox=2, projections=3, email=3)                       ✓
CA-5  hardening (cap_drop ALL, read_only, no-new-privileges, depends_on mysql)   ✓
```

**Defeito encontrado e corrigido:** o teste original usava só `--profile workers`, que faz `docker compose config` falhar com *"worker-email depends on undefined service http"* — os workers herdam `depends_on: http` (profile `app`) do `x-worker-base`. Corrigido: o teste ativa `--profile workers --profile app` e isola os workers pela diferença `(workers+app) − (app)`. Sem essa correção o teste quebraria no CI. Runtime dos grupos (boot/isolamento/shutdown) já validado no runbook ERP-INFRA (2026-07-10).

## Pendências fora do gate (rastreadas)

- **Cutover em prod** (ops): registrar os 3 taskdefs + drenar os 5 serviços antigos — runbook `ERP-INFRA/docs/runbooks/worker-consolidation-407.md` §5.
- **Backfill do `fin_payable_view`** antes de ativar `projections` (payable entra em prod pela 1ª vez).

## Veredito

**GREEN.** Gate local completo verde. Ticket pronto para commit; validação x99 do compose + cutover prod são passos de deploy (fora do gate de código).
