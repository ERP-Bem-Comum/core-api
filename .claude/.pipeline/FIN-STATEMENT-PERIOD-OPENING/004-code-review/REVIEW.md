# Code Review — FIN-STATEMENT-PERIOD-OPENING (#205) — Round 1

**Veredito:** APPROVED
**Reviewer:** code-reviewer · **Data:** 2026-06-22

**Escopo:** `application/use-cases/get-account-statement.ts` + teste `get-account-statement-period-opening.test.ts`.

## Análise

A correção move o cálculo da abertura para o **saldo corrido até `from`** (abertura da conta + Σ assinado
das transações anteriores), reusando `buildStatementView` (função pura do domínio, #139) — sem novo port,
sem mudança de domínio. Mantém a sequência da application (fetch → domínio puro → resultado).

- **Uma única query** ao repo (`[HISTORY_START, to]` + partição em JS). Correto e necessário: duas queries
  com o port atual seriam redundantes, e a partição por data não existe no port. Evita N+1.
- `HISTORY_START = new Date('1970-01-01...')` é **constante determinística** (piso do range), não `new Date()`
  "agora" — não fere a regra de Clock da application. 🔵 Nota: se um dia houver transações pré-1970
  (impossível em extrato bancário), o piso precisaria revisão — irrelevante na prática.
- Back-compat: para período sem movimentação anterior (`before=[]`), a abertura = abertura da conta — os 3
  testes do #139 seguem verdes.
- Opção 2 da issue (expor `balanceAfterCents`) corretamente descartada (OFX grava 0; inconsistente).

## Issues

Nenhuma 🔴/🟡. 🔵 **Nota de perf** (já registrada como não-objetivo): soma O(histórico) por chamada —
consistente com o F1 `listCedenteAccountsWithBalance`. `SUM` SQL dedicado fica como follow-up se pesar.

## Próximo passo

APPROVED → W3 (gate já verde).
