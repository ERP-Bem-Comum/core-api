# W3 — QUALITY — COLLABORATORS-HTTP-E2E-SMOKE (P4-SMOKE)

> Skill: `ts-quality-checker` (gate final). **ALL GREEN.**

## Gates

```
$ tsc --noEmit            (zero erros — inclui o .e2e.ts)
$ prettier --check .      All matched files use Prettier code style!
$ eslint .                (zero erros/warnings)
$ pnpm test (puro)        2044 tests / 2027 pass / 0 fail / 17 skipped
```

## Prova E2E (fora do gate, manual/CI — exige Docker)

```
MYSQL_PORT=3307 pnpm run test:e2e:collaborators → 4/4 pass (server real + partners MySQL RW split)
```

## Resultado

typecheck ✅ · format ✅ · lint ✅ · test puro ✅ · smoke E2E real ✅.

**Ticket pronto para fechar.** `pnpm run test:e2e:collaborators` valida a borda /api/v1 ponta-a-ponta.
