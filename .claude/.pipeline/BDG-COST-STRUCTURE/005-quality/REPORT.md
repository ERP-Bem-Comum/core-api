# Quality Check — Ticket BDG-COST-STRUCTURE (#316)

**Skill:** ts-quality-checker (gate formal) + validação de integração x99 (fiscal)
**Data:** 2026-07-08
**Veredito final:** ✅ ALL GREEN (gate formal + integração MySQL real)

| # | Check | Status | Detalhes |
| :- | :--- | :--- | :--- |
| 1 | Type check (`pnpm run typecheck`) | ✅ | `tsc --noEmit` → 0 erros (exit 0) |
| 2 | Format check (`pnpm run format:check`) | ✅ | `prettier --check .` → All matched files use Prettier code style |
| 3 | Lint (`pnpm run lint`) | ✅ | `eslint .` → 0 problemas (exit 0) |
| 4 | Testes (`pnpm test`) | ✅ | 3579 tests / 3561 pass / 0 fail / 18 skipped (gated) |
| 5 | Integração MySQL real (x99) | ✅ | `cost-structure.drizzle-mysql.test.ts` com `MYSQL_INTEGRATION=1` → 8/8 pass |

Gates 1–4 rodados FRESH após as edições do W2 (3 fixes zod + teste de fronteira). Nada driftou.

---

## Gates — saída literal (formal)

### Check 1 — `pnpm run typecheck`
```
$ tsc --noEmit
EXIT=0
```

### Check 2 — `pnpm run format:check`
```
$ prettier --check .
Checking formatting...
All matched files use Prettier code style!
EXIT=0
```

### Check 3 — `pnpm run lint`
```
$ eslint .
EXIT=0
```

### Check 4 — `pnpm test`
```
ℹ tests 3579
ℹ suites 1040
ℹ pass 3561
ℹ fail 0
ℹ cancelled 0
ℹ skipped 18
ℹ todo 0
```

---

## Check 5 — Integração MySQL real (x99), executada sob autorização de máquina

Ambiente: MySQL **8.4.10** em container efêmero no host x99 (`docker run` avulso, `--mysql-native-password=ON`,
volume fresco), acessado do Mac por túnel SSH `-L 3306:127.0.0.1:3306` (receita comprovada — testes têm
`127.0.0.1:3306` hardcoded). O `before` do teste roda `openBudgetPlansMysql({ applyMigrations: true })` →
**aplica a migration real 0000 + 0001** (prova o DDL: FKs `ON DELETE cascade`, CHECK de `direction`/`launch_type`,
`utf8mb4_bin` nas UUID) antes da suíte.

```
$ MYSQL_INTEGRATION=1 node --experimental-strip-types --no-warnings --test --test-concurrency=1 \
    tests/modules/budget-plans/adapters/persistence/cost-structure.drizzle-mysql.test.ts

▶ createDrizzleCostStructureRepository — shape
  ✔ é uma função
▶ CostStructureRepository contract — Drizzle/MySQL (truncated)
  ✔ save + findByBudgetPlanId faz round-trip de uma árvore de 3 níveis
  ✔ findByBudgetPlanId de plano sem nós retorna árvore vazia (não erro, não null)
  ✔ preserva agrupamento com múltiplos cost-centers/categories/subcategories
  ✔ save substitui a árvore inteira (replace-all)
  ✔ mutate aplica a op de domínio e persiste (plano editável)
  ✔ mutate NÃO persiste quando a op de domínio falha (erro devolvido, sem escrita)
  ✔ mutate em plano ausente -> budget-plan-not-found
ℹ tests 8
ℹ pass 8
ℹ fail 0
```

**Validado contra engine real:** reconstrução por 3 SELECTs + `ORDER BY`, replace-all com CASCADE, e os 3
caminhos do `mutate` com `SELECT status ... FOR UPDATE` (persiste / não-escreve-em-erro / plano-ausente) — fecha
a atomicidade/TOCTOU (Q4) no MySQL, não só no in-memory.

---

## Achados registrados (não bloqueiam #316)

- **Issue #367** — `[budget-plans] não vazar código interno de erro no body de respostas 5xx` (`sendWriteError`,
  módulo-wide, pré-existente). Out-of-scope (ADR-0040/anti-padrão #15).
- **Fatia W1-C** — edit/rename/remove de nó (o domínio hoje só tem `add*`; exige W0 RED próprio) — ticket futuro.

---

## Veredito

✅ **ALL GREEN.** W0→W3 completos, gate formal verde, integração MySQL real verde (x99). DoD do #316 satisfeita.
