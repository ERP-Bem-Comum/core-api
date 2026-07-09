# W3 — GREEN (mecânico) — FIN-DOC-SOURCE-FILE-REF

Gate final (skill `ts-quality-checker`). 4 gates no **projeto inteiro** (regressão zero), após W2 APPROVED round 2.

## Gates (saída literal)

```
1/4 pnpm run typecheck    → exit 0
2/4 pnpm run format:check → All matched files use Prettier code style!
3/4 pnpm run lint         → 0 errors, 0 warnings
4/4 pnpm test             → tests 3630 · pass 3612 · fail 0 · skipped 18 (integração MySQL gateada)
```

Nota format: os 3 `meta/*.json` do drizzle-kit (gerados, fora do hook prettier) foram formatados com `prettier --write`.

Delta vs base: **+11 testes** (source-file-ref: VO + saveDraft + mapper round-trip + regressão de corrupção parcial + length-cap).

## ⚠️ CA4 pendente (não bloqueia o gate mecânico)

O **CA4 (validar `0031`+`0032` no MySQL 8.4 real)** foi **adiado** (decisão da P.O.: subir Docker exige autorização). O DoD do ticket exige essa validação antes do `close`. Estado: **W0–W3 done + verde; `close` aguardando CA4.**

Riscos residuais que só o CA4 fecha:
- `0031` ADD COLUMN nullable aplica como INSTANT (esperado; precedente `0026`).
- `0032` ADD CONSTRAINT CHECK (all-or-none + size_bytes > 0) aplica e barra insert inconsistente.
- Round-trip insert/select com `source_file_*` no engine real.

## Próximo passo
CA4 (MySQL real, sob autorização) → `pnpm run pipeline:state close FIN-DOC-SOURCE-FILE-REF`. Depois tickets #2 (`FIN-DOC-INGEST-USECASE`) e #3 (`FIN-DOC-INGEST-HTTP`).
