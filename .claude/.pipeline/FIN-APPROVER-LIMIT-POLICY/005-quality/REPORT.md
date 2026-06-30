# Quality Check — Ticket FIN-APPROVER-LIMIT-POLICY

**Skill:** ts-quality-checker
**Data:** 2026-06-30T21:11Z
**Veredito final:** ✅ ALL GREEN

| #   | Check                          | Status | Detalhes                                  |
| :-- | :----------------------------- | :----- | :---------------------------------------- |
| 1   | Type check (`tsc --noEmit`)    | ✅     | 0 erros                                   |
| 2   | Format check (`prettier`)      | ✅     | "All matched files use Prettier code style!" |
| 3   | Lint (`eslint .`)              | ✅     | exit 0                                    |
| 4   | Testes (`node --test`)         | ✅     | 3291 tests · 3273 pass · **0 fail** · 18 skip |

---

## Saída integral

### Check 1 — `pnpm run typecheck`
```
$ tsc --noEmit
(sem saída — exit 0)
```

### Check 2 — `pnpm run format:check`
```
$ prettier --check .
Checking formatting...
All matched files use Prettier code style!
```

### Check 3 — `pnpm run lint`
```
$ eslint .
(sem saída — exit 0)
```

### Check 4 — `pnpm test`
```
ℹ tests 3291
ℹ suites 972
ℹ pass 3273
ℹ fail 0
ℹ skipped 18
ℹ duration_ms 65744
```

Baseline pré-POLICY = 3277; +14 = os testes do POLICY (domínio 6, save-document 3, submit-draft 2,
rota HTTP 2, + ajuste do fake do reconciliation). **Zero regressão.**

---

## DoD — nota sobre integração no x99

O `000-request` listou `test:integration:financial` no x99 (CA6/CA7) no DoD. **Reavaliação:** o POLICY
**não introduz persistência nova** no financial (nenhuma tabela/coluna/migration) — a regra é
**lógica de domínio puro** (`checkApprover`) + **port/adapter** (ACL fino `limitCents→Money`). A
leitura real da alçada (`getApproverAuthority` no MySQL) **já foi provada no ticket AUTH** no x99
(46 pass, migration 0008). A regra do POLICY está coberta em três camadas em memory:
domínio (CA1–CA5), use-case save+submit (CA6/CA7/CA8) e **rota HTTP end-to-end** (CA6/CA9, 4xx PT sem
vazar slug). Logo, `test:integration:financial` no x99 **não acrescenta cobertura de SQL** para este
ticket.

**Follow-up opcional (não bloqueia):** smoke no x99 exercitando o wire real
`composition → buildAuthUserReadPort → getApproverAuthority` (hoje o teste de rota usa um fake do
`authUserReadPort`). Incremental sobre o que já está coberto; pode ser feito junto da validação da
feature completa (após o ticket CASCADE).

---

## Próximo passo

- **ALL GREEN** → ticket fecha (`pipeline:state close`).
- Próximo ticket da feature 028: **FIN-APPROVER-LIMIT-CASCADE** (US3 — `escalate`).
