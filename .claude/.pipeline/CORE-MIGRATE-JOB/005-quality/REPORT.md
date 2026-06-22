# W3 — Gate de qualidade (GREEN) — CORE-MIGRATE-JOB (Slice A)

Skill: `ts-quality-checker`. Todos os comandos do gate verdes (repo inteiro).

| Comando | Resultado |
| --- | --- |
| `pnpm run typecheck` (`tsc --noEmit`) | ✅ 0 erros |
| `pnpm run format:check` (`prettier --check .`) | ✅ All matched files use Prettier code style! |
| `pnpm run lint` (`eslint .`) | ✅ 0 erros |
| `pnpm test` | ✅ **3082 testes · 3064 pass · 0 fail · 18 skipped** (integração gated por env) |
| `docker compose config --quiet` | ✅ exit 0 |
| `docker compose config --services` (default) | ✅ só infra: `minio minio-bootstrap mysql` |
| `docker compose --profile jobs config --services` | ✅ `contracts-sweeper migrate supplier-view-backfill` + infra |
| `docker compose -f compose.yaml -f compose.ci.yaml config --quiet` | ✅ exit 0 |

Delta de testes: +24 (3058 → 3082) — os do migrate (orquestrador, config, contrato das portas,
compose meta, observabilidade) + o guard CA9.

**Política de regressão zero:** nenhum vermelho. Gate fechado de verdade.
