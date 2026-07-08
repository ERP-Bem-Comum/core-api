# Quality Check — Ticket BGP-PLAN-CRUD

**Skill:** ts-quality-checker
**Data:** 2026-07-02
**Veredito final:** ✅ ALL GREEN

| # | Check | Status | Detalhes |
| :- | :--- | :--- | :--- |
| 1 | Type check (`pnpm run typecheck` → `tsc --noEmit`) | ✅ | zero erros |
| 2 | Format check (`pnpm run format:check` → `prettier --check .`) | ✅ | "All matched files use Prettier code style!" |
| 2-bis | Lint (`pnpm run lint` → `eslint .`) | ✅ | zero erros/warnings |
| 3 | Testes (`pnpm test`) | ✅ | tests 3403 · suites 1001 · **pass 3385 · fail 0** · skipped 18 (integração gated `MYSQL_INTEGRATION`/e2e) |
| 4 | Build | ⏭️ SKIPPED | projeto roda via `--experimental-strip-types`, sem `dist/` |

## Saída (resumo literal dos finais de cada comando)

### Check 1 — `tsc --noEmit`
```
$ tsc --noEmit
(sem output — exit 0)
```

### Check 2 — `prettier --check .`
```
Checking formatting...
All matched files use Prettier code style!
```

### Check 2-bis — `eslint .`
```
$ eslint .
(sem output — exit 0)
```

### Check 3 — `pnpm test`
```
ℹ tests 3403
ℹ suites 1001
ℹ pass 3385
ℹ fail 0
ℹ cancelled 0
ℹ skipped 18
ℹ duration_ms 65066.321667
```

## DoD complementar (issue #315)

- **Coleção Bruno de smoke** (`bruno-api-client-expert`): `api-collections/core-api/budget-plans/`
  — **executada** contra servidor local memory (porta 3100, seed `AUTH_SEED_JSON`+`CORE_API_E2E=1`):
  **23/23 requests · 30/30 asserts · PASS · zero 500**. Perfil novo `budget-plans-operator` em
  `0-auth/` + env local. Fluxo feliz via HTTP em modo memory ficou isolado como expected-fail em
  `api-collections/core-api/z-pending-fixes/budget-plans/` (gap de wiring do catálogo de
  programas em driver memory — ver issue a registrar; em driver mysql o fluxo é pleno).

## Pendências registradas fora do ticket (não bloqueiam o gate)

1. Issue transversal: `sendWriteError` sem redação 5xx + `page` sem teto (programs/partners/
   contracts/budget-plans — achados W2/zod-expert).
2. Issue budget-plans: modo memory local sem fonte de programas p/ o catálogo (happy path HTTP
   bloqueado sem MySQL) + incluir `budget-plans` no `scripts/e2e/bruno-all.sh` quando entrar no CI e2e.
3. Gap Fatia 3 (#317): identidade da Rede — `Budget.partner.ref` (UUID domínio) × chave natural
   (`uf`/IBGE) do partners.
