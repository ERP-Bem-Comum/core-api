# W0 — Testes (RED)

`tests/scripts/only-allow-pnpm.test.ts` — 5 casos cobrindo CA1–CA3, via `spawnSync` do script sob `node`, sobrescrevendo `npm_config_user_agent`.

## Resultado RED

```
✖ CA3: ... cita ADR-0012
  expected /ADR-0012/, actual: "Cannot find module '.../scripts/only-allow-pnpm.ts'"
✖ CA2: permite (exit 0) quando o user agent é pnpm  (status 1 — arquivo ausente)
```

Falha por inexistência do script — fail-first satisfeito.

## Cobertura

| CA | Teste |
| --- | --- |
| CA1 | exit ≠ 0 para user agent `npm/`, `yarn/`, vazio |
| CA2 | exit 0 para `pnpm/` |
| CA3 | stderr em PT-BR cita `ADR-0012` |
