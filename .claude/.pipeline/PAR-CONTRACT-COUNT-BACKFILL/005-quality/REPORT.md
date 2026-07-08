# Quality Check (W3) — PAR-CONTRACT-COUNT-BACKFILL (#110)

**Skill:** ts-quality-checker
**Veredito do gate unit:** ✅ ALL GREEN
**Validação e2e (integração):** ✅ VERDE (MySQL 8.4 real no x99, 2026-07-07)

| # | Check | Status | Detalhes |
| :- | :--- | :--- | :--- |
| 1 | Type check (`tsc --noEmit`) | ✅ | zero erros |
| 2 | Format (`prettier --check .`) | ✅ | "All matched files use Prettier code style!" |
| 2b | Lint (`eslint .`) | ✅ | zero warnings/erros |
| 3 | Testes (`pnpm test`) | ✅ | **tests 3439 · pass 3421 · fail 0 · skipped 18** |
| 4 | Build | ⏭️ SKIPPED | Fase 1 (strip-types, sem `dist/`) |

## Check 3 — resumo

```
ℹ tests 3439
ℹ pass 3421
ℹ fail 0
ℹ skipped 18
ℹ duration_ms 64392
```

Testes do ticket:
- `tests/jobs/partners/contract-count-backfill.test.ts` (unit) → `✔ backfillContractCounts` (CA1/CA2/drift).
- `tests/jobs/partners/contract-count-backfill.integration.test.ts` → **skip** correto (`MYSQL_INTEGRATION nao definido — pulando`), conforme política de gate por opt-in.

## Gate de integração consertado (I1 do W2 + política de regressão zero)

O runner `scripts/ci/test-integration.ts` usa listas **explícitas** de paths. O novo teste e2e foi **adicionado à suíte `partners`** — sem isso, `test:integration:partners` não o descobriria (o teste ficaria órfão, "escondido atrás do skip"). Agora ele roda no home dele.

**Pendente:** rodar `pnpm run test:integration:partners` (sobe MySQL via Docker `compose --wait`) para provar CA1 e2e (query GROUP BY + idempotência no banco) VERDE. Não executado aqui — subir Docker exige OK explícito do humano (RAM 8 GB).

## Achado fora de escopo (registrado, não corrigido — anti-padrão #15)

Os testes de integração de **jobs** (`tests/jobs/financial/*/backfill.integration.test.ts`) **não constam** em nenhuma suíte do runner → nunca são descobertos por `test:integration*`. É um gate mal-configurado **pré-existente** (fora do escopo #110). A registrar via `issue-report`.

## Validação e2e contra MySQL 8.4 real (2026-07-07)

Rodada no **x99** (servidor incus, via Tailscale) com `mysql:8.4` em docker direto no host, conexão loopback:

```
▶ contract-count-backfill — e2e ctr_contracts → par_contract_count_view
  ✔ CA1 — GROUP BY conta vivos (Pending+Active) e ignora Cancelled/Expired
  ✔ CA1+CA2 — backfill grava a contagem e é idempotente no banco
ℹ tests 2 · pass 2 · fail 0
```

Prova real: a query `GROUP BY contractorId WHERE status IN ('Pending','Active')` conta X=2 (Active+Pending), Y=1, Z=0 (Cancelled+Expired ignorados); o `setCount` (`ON DUPLICATE KEY UPDATE activeCount = <absoluto>`) grava e **re-execução mantém o valor** (idempotência no banco).

Notas de ambiente (x99 = **Ubuntu Core**, docker via snap):
- Bind-mounts de `$HOME` bloqueados por AppArmor → MySQL subido sem os volumes `conf.d`/`initdb.d` (env vars diretas).
- `caching_sha2_password` sobre TCP contornado com `root@%` → `mysql_native_password`.
- `docker stop/rm` de container exige sudo (permission denied sem privilégio) — container `bkf-mysql` a remover manualmente.

## Próximo passo

Gate unit ✅ + e2e ✅ → **`pipeline:state close`** + comentar #110 com evidência.
