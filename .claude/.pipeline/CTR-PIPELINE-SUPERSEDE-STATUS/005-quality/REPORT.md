# W3 (ALL-GREEN) — CTR-PIPELINE-SUPERSEDE-STATUS

**Skill:** ts-quality-checker
**Data:** 2026-05-27
**Resultado:** 🟢 ALL-GREEN — 4/4 comandos do gate passaram (exit 0).

## Gate

| # | Comando | Exit | Saída |
| :-- | :--- | :--: | :--- |
| 1 | `pnpm run typecheck` (`tsc --noEmit`) | 0 | sem erros |
| 2 | `pnpm run format:check` (`prettier --check .`) | 0 | `All matched files use Prettier code style!` |
| 3 | `pnpm run lint` (`eslint .`) | 0 | sem warnings/errors |
| 4 | `pnpm test` (`node:test` + strip-types) | 0 | `tests 1203 · pass 1187 · fail 0 · skipped 16` |

> Sem etapa de `build`: o módulo afetado é tooling de pipeline (`scripts/pipeline/`), executado
> via `--experimental-strip-types`, sem artefato compilado.

## Observações

- A suíte completa (1203 testes) inclui as 4 suites de `tests/pipeline/` (43 testes, todos verdes),
  cobrindo os 9 casos de aceite do W0 mais os pré-existentes.
- 16 skipped são as suites gateadas por Docker daemon (infra MySQL) — esperado neste ambiente.
- A falha pré-existente de `cli-state.json` stale (REGR #10), diagnosticada no W1, permanece
  resolvida: suíte com 0 falhas.

## Veredito

ALL-GREEN. Ticket pronto para `close`.
