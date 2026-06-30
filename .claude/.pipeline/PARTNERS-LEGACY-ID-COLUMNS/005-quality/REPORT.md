# W3 — QUALITY — PARTNERS-LEGACY-ID-COLUMNS

**Skill:** ts-quality-checker · **Outcome:** ALL-GREEN

## Gate

| Comando | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | **exit 0** — zero erros |
| `pnpm run format:check` | **exit 0** — "All matched files use Prettier code style!" |
| `pnpm run lint` | **exit 0** |
| `pnpm test` | **exit 0** — `tests 1856 · pass 1840 · fail 0` (16 skipped = suites de integração opt-in) |

## Regressões corrigidas durante o W3 (política de regressão zero)

A adição da coluna `legacyId` (nullable) ao `$inferSelect` quebrou os fixtures `...Row` dos 4 mapper tests (TS2741 — `legacyId` ausente) e deixou 2 `meta/*.json` gerados pelo drizzle-kit sem formatação. Ambos **causados pelo diff** e corrigidos:

- `+ legacyId: null` nos 4 base fixtures (`financier`/`supplier`/`collaborator`/`user-profile` mapper tests). Os fixtures secundários herdam via spread.
- `prettier --write` nos `meta/_journal.json` e `meta/0004_snapshot.json`.

## Conclusão

ALL-GREEN. P2 entregue: coluna `legacy_id` + UNIQUE index nas 4 tabelas `par_*`, migration `0004` gerada. Destrava a idempotência da ETL.
