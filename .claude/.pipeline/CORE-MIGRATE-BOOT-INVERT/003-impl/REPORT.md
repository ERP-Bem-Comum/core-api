# W1 — Implementação (GREEN) — CORE-MIGRATE-BOOT-INVERT (Slice B)

**Resultado:** 21 testes verdes (migrate-boot-inversion 12 + migrate-compose 9), typecheck limpo,
compose config exit 0.

## Mudanças

| Arquivo | Mudança |
| --- | --- |
| `src/modules/{auth,contracts,financial,partners,programs}/adapters/http/composition.ts` | `applyMigrations: true → false` + comentário (boot não migra; schema vem do job) |
| `scripts/e2e-{auth,contracts,collaborators,bruno-all}.sh` | rodam `node src/jobs/migrate/run.ts` (via `MIGRATE_DATABASE_URL`) **antes** de `src/server.ts` |
| `compose.yaml` | `migrate` → profiles `[app, workers, jobs]`; `http` → `depends_on: migrate (service_completed_successfully)`; comentários do `x-worker-base` e `http` atualizados |

## Roteamento

- **docker-compose-expert** — `migrate` multi-profile + `http.depends_on.migrate`; validou config + testes.
- compositions, e2e scripts e comentários: edição direta.

## Notas

- `e2e-collaborators.sh` está marcado **DEPRECATED** (migrado p/ Bruno, ADR-0034), mas ainda existe e
  sobe o server real — ajustado para não quebrar com a inversão.
- Workers **não** receberam `depends_on: migrate` explícito — herdam por transitividade (`http` healthy,
  que depende do migrate completar).
- Guard CA9 do Slice A removido (invariante invertido). Ajuste do CA-B3: casa a invocação real
  `--no-warnings <script>` (o `pkill ... src/server.ts` do cleanup mencionava o server antes).
