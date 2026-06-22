# W3 — Gate de qualidade · FIN-OUTBOX-ATOMIC (#127)

**Wave:** W3 · **Status:** done · **Outcome:** ALL-GREEN · **Data:** 2026-06-22

Gate final do ticket (outbox transacional — atomicidade estado+evento nos 4 agregados). Reexecução formal
dos comandos de qualidade sobre o commit `3ff421c6`, mais validação no CI da PR.

## Resultado (todos verdes)

| Gate | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `pnpm run typecheck` (`tsc --noEmit`) | ✅ |
| Format | `pnpm run format:check` (`prettier --check .`) | ✅ |
| Lint | `pnpm run lint` (`eslint .`) | ✅ |
| Testes (unit/contrato) | `pnpm test` | ✅ **3127 / 0 fail** (18 skip de integração — opt-in `MYSQL_INTEGRATION`) |
| Integração (Docker) | `pnpm run test:integration:financial` | ✅ **50 / 0 fail** (CA2/CA3 para os 4 agregados) |

## CI (PR #215 → dev)

- Check `typecheck + format + lint + test`: **pass** (4m10s).
- Run: https://github.com/ERP-Bem-Comum/core-api/actions/runs/27984409575

> Observação: o gate de integração Docker (`test:integration:financial`) é executado **localmente** (exige
> MySQL via compose `--wait`); a prova de atomicidade CA2/CA3 dos 4 agregados foi obtida nesta máquina (50/50).
> O CI da PR cobre typecheck+format+lint+test (unit/contrato).

## Conclusão

Política de regressão zero atendida — nenhum vermelho. Todas as 4 waves done:
W0 RED · W1 GREEN · W2 APPROVED · W3 ALL-GREEN. Ticket pronto para fechar.
