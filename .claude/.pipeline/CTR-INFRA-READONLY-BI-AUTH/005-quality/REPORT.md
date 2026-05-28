# Quality Check — Ticket CTR-INFRA-READONLY-BI-AUTH

**Skill:** ts-quality-checker
**Data:** 2026-05-26T18:54Z
**Veredito final:** ✅ ALL GREEN

| #     | Check                       | Status     | Detalhes                                  |
| :---- | :-------------------------- | :--------- | :---------------------------------------- |
| 1     | Type check (`tsc --noEmit`) | ✅          | zero erros                                |
| 2     | Format check (`prettier`)   | ✅          | `All matched files use Prettier code style!` |
| 2-bis | Lint (`eslint .`)           | ✅          | zero erros/warnings                       |
| 3     | Testes (`node --test`)      | ✅          | `# pass 1188 · # fail 0 · # skipped 16`   |
| 4     | Build                       | ⏭️ SKIPPED | Fase 1 roda via `--experimental-strip-types` |

A falha que originou o ticket (`mysql-compose` CA-5 + o falso-positivo de CA-6) está resolvida:
`pnpm test` agora sai **0** de ponta a ponta. Contagem de pass subiu de 1187 (com 1 fail) para
**1188 (0 fail)** — o delta são exatamente CA-5 e CA-6 agora verdes.

---

## Saída integral

### Check 1 — `pnpm run typecheck` (`tsc --noEmit`)

```
> core-api@0.1.0 typecheck
> tsc --noEmit

(zero erros)
```

### Check 2 — `pnpm run format:check` (`prettier --check .`)

```
> core-api@0.1.0 format:check
> prettier --check .

Checking formatting...
All matched files use Prettier code style!
```

### Check 2-bis — `pnpm run lint` (`eslint .`)

```
> core-api@0.1.0 lint
> eslint .

(zero erros/warnings)
```

### Check 3 — `pnpm test` (`node --test`)

```
ℹ tests 1204
ℹ suites 407
ℹ pass 1188
ℹ fail 0
ℹ skipped 16
ℹ todo 0
EXIT=0
```

Critérios do ticket no run:

```
✔ CA-5: readonly_bi consegue SELECT (148.304008ms)
✔ CA-6: readonly_bi recebe privilege-denied (não auth-denied) ao CREATE TABLE (150.108083ms)
```

### Check 4 — Build

```
SKIPPED na Fase 1 — projeto roda via --experimental-strip-types sem build.
```

---

## Critérios de aceite do ticket — status final

- **CA-1** (diagnóstico documentado): ✅ — 003-impl/REPORT.md (entrypoint root vs seed mysql 999).
- **CA-2** (CA-5 passa): ✅
- **CA-3** (CA-6 anti-falso-positivo, 1142): ✅
- **CA-4** (ADR-0014 GRANT + ADR-0011 secrets): ✅ — inalterados; CA-16/17 verdes.
- **CA-5** (`pnpm test` verde de ponta a ponta): ✅ — exit 0, fail 0.

---

## Próximo passo

ALL GREEN → ticket fecha (`pipeline:state close`). Todas as 4 waves done.
