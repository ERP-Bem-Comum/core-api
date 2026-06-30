# CTR-OUTBOX-SKIPLOCKED-DUP — workers paralelos duplicam delivery (`SKIP LOCKED` não isola)

## Origem

Descoberto em 2026-05-26 ao fechar `CTR-PERIOD-PLAIN-DATE-SCHEMA` (Docker reativado).
Pré-existente — `git stash` da migração de datas reproduziu a falha idêntica. Sem relação
com `datetime → date` (outbox não toca colunas de data-calendário).

## Sintoma

`tests/modules/contracts/worker/outbox-worker.integration.test.ts:136` —
`CA-I2: 2 workers paralelos não duplicam delivery (FOR UPDATE SKIP LOCKED)` falha:

```
total de entregas deve ser 6 (sem duplicações)
12 !== 6
```

`12 = 2 × 6` — ambos os workers processaram **todas** as 6 mensagens, ou seja, o claim
com `FOR UPDATE SKIP LOCKED` não está isolando lotes entre workers concorrentes.

## Hipóteses a investigar

1. Os dois workers não estão de fato concorrendo (serialização acidental no teste) e o
   lock nunca é disputado — falha de **setup do teste** (timing/await).
2. O `claim` não está dentro de uma transação que segura o lock até o `UPDATE`/`DELETE`
   de marcação — janela onde o segundo worker relê a mesma linha.
3. Isolation level / autocommit do pool permitindo releitura.

Revisar o SQL de claim (`SELECT … FOR UPDATE SKIP LOCKED` + marcação) e a fronteira
transacional no worker (ADR-0015 — outbox pattern).

## Critérios de aceitação

- CA1: `pnpm run test:integration` → `CA-I2` verde de forma estável (rodar ≥3×).
- CA2: 2 workers concorrentes entregam cada mensagem **exatamente uma vez** (6 total).
- CA3: a causa raiz é identificada (teste vs. claim transacional) e documentada no REPORT.

## Fora de escopo

- Reprocessamento/retry de mensagens falhas (coberto por `markFailed`/attempts).
