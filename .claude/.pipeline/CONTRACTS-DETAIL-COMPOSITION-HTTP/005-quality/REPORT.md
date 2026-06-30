# W3 (GREEN) — Gate final — CONTRACTS-DETAIL-COMPOSITION-HTTP

**Wave**: W3 · **Agente**: ts-quality-checker · **Size**: M
**Feature**: `specs/002-contracts-http-gaps/` (ticket #4) · **Data**: 2026-06-06

## Gate

- `pnpm run typecheck` → **VERDE**.
- `pnpm run format:check` → **VERDE** (`All matched files use Prettier code style!`).
- `pnpm run lint` → **VERDE**.
- `pnpm test` → **VERDE**: `tests 2241 · pass 2224 · fail 0 · skipped 17`.
- `pnpm run test:integration` (W1) → **88/0** (wiring mysql da composição, sem regressão).

## Veredito

**GATE VERDE.** `GET /api/v2/contracts/:id` agora compõe o bloco `contractor { type, id, snapshot|null }`
via `ContractorReadPort` (4/4 tipos), com `Deprecation`/`Sunset` (ADR-0032) e degradação graciosa (FR-006).
Núcleo intocado; cross-BC só via public-api. Sem schema novo → sem migration.
