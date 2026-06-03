# W2 — REVIEW — COLLABORATORS-HTTP-E2E-SMOKE (P4-SMOKE)

> Skill: `code-reviewer` (audit read-only). **Round 1 — APPROVED.**

## Veredito: ✅ APPROVED

## Conformidade

| Aspecto | Status | Evidência |
| :--- | :--- | :--- |
| Espelha o padrão E2E existente | ✅ | mesma estrutura de `scripts/e2e-contracts.sh` + `tests/e2e/contracts-smoke.e2e.ts` (`waitReady`, `trap` cleanup, `.e2e.ts` fora do `pnpm test`). |
| Fora do gate `pnpm test` | ✅ | sufixo `.e2e.ts`; suite pura inalterada (2027 pass). |
| RW split exercitado de verdade | ✅ | POST writer → GET reader no mesmo `core`; prova real 4/4. |
| Robustez de ambiente | ✅ | `MYSQL_PORT` parametrizado — não conflita com `bemcomum-mysql` (3306); convenção do projeto. |
| Teardown seguro | ✅ | `trap cleanup EXIT` (kill server, `compose down -v`, rm secrets); verificado sem órfãos. |
| Não toca produção | ✅ | só script + `.e2e.ts` + 1 linha no `package.json`; código `src/` intocado. |

## Observações não-bloqueantes

1. auth/contracts em memory no smoke (escopo: partners MySQL) — diferente do e2e-contracts (que usa contracts mysql + dual-pool). Intencional e documentado.
2. CPFs fixos válidos (MySQL limpo a cada `down -v`) — sem colisão dentro da run.

## Gate (audit log)

```
$ pnpm run lint / typecheck / format:check → todos verdes
$ pnpm test (puro)  → 2044 tests / 2027 pass / 0 fail (e2e fora do glob)
prova E2E real      → 4/4 pass
```

## Próximo passo

W3 (QUALITY).
