# W0 (RED) — CTR-PIPELINE-SUMMARIZE-EXHAUSTIVE

**Skill:** tdd-strategist
**Data:** 2026-05-27
**Resultado:** 🔴 RED — CA-E2 falha hoje; CA-E1 (caracterização) já verde.

## Natureza do ticket

Refactor **comportamento-preservado** (`if`-chain → `switch` exaustivo). Para os 6 status atuais,
`summarize` já contabiliza corretamente — logo o RED não é sobre os status existentes, e sim sobre
o **catch-all `else blocked++`**: ele classifica qualquer valor fora dos baldes conhecidos como
`blocked`. Disciplina aplicada (Feathers): teste de **caracterização** (verde) trava o comportamento
a preservar + 1 teste **RED** que dirige a mudança estrutural.

## Comando

```bash
node --test --experimental-strip-types --no-warnings \
  --test-name-pattern="CA-E[12]" tests/pipeline/dashboard.test.ts
# tests 2 · pass 1 · fail 1
```

## Testes adicionados — `tests/pipeline/dashboard.test.ts`

| Teste | Papel | Estado W0 |
| :--- | :--- | :--- |
| CA-E1 | Caracterização: os 6 status reais (open, in-progress, closed-green, closed-rejected, superseded, blocked) caem nos baldes certos (open=2, closed=2, superseded=1, blocked=1) | 🟢 verde (rede de segurança) |
| CA-E2 | RED: status fora do enum (cast deliberado `'mystery-future'`) **não** pode ser contado como `blocked` | 🔴 falha (`blocked===1` hoje pelo `else`) |

## Por que CA-E1 entra verde (e não foi descartado)

Diferente do CA-D3 descartado no ticket anterior (que testava algo que o ticket não mudava), CA-E1
é caracterização **do comportamento que o refactor deve preservar** — é a rede que garante que a
troca if→switch não altera a contagem dos status reais. É a prática correta para refactor.

## Mapa W1

- `scripts/pipeline/dashboard.ts` — `summarize`: trocar `if/else if/else` por `switch
  (s.state.status)` exaustivo, **sem `default`**, contando open(+in-progress), closed(-green/
  -rejected), superseded, blocked. Sem catch-all.
- Efeito: status fora do enum deixa de virar `blocked` (CA-E2 GREEN); adicionar membro ao enum sem
  atualizar a função passa a quebrar o `lint` (`switch-exhaustiveness-check`).
