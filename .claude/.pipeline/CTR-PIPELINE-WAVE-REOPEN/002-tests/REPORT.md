# W0 — Testes RED

**Agente:** tdd-strategist
**Arquivo:** `tests/pipeline/state-cli.test.ts` (novo `describe` block `wave-reopen`)
**Resultado:** **RED — 5 testes, 0 pass, 5 fail** ✅

## Decisão de design (refinamento da proposta)

O request ofereceu duas opções: (a) novo subcomando `wave-reopen`; (b) sobrecarregar
`wave-start` para reabrir wave `done`+`REJECTED`. **Escolhido (a) — novo subcomando.**

- `wave-start` tem semântica "iniciar wave nova a partir de `pending`"; reabrir é uma transição
  distinta (`done`→`in-progress` com regras próprias: só REJECTED, checa posterior, incrementa
  rounds). Misturar as duas sobrecarregaria a guarda de `wave-start:144` e tornaria a mensagem
  de erro ambígua.
- Subcomando explícito é mais testável e auto-documentável no `--help`/uso.

## Contrato do `wave-reopen <ticket> <Wn> [--agent <a>]` (ordem das guardas)

1. wave existe e está `status: 'done'` → senão exit 2.
2. `outcome === 'REJECTED'` → senão exit 2 (CA-3). Único outcome que justifica re-trabalho.
3. `rounds < MAX_ROUNDS (3)` → senão exit 2 (CA-5). Mesma regra de `wave-round`.
4. toda wave **posterior** está `pending` → senão exit 2 (CA-4).
5. transiciona: `status='in-progress'`, `rounds++`, `outcome=null`, `finishedAt=null`,
   `startedAt=now`, `agent` atualizado se `--agent` veio (senão mantém), `currentWave=<Wn>`,
   ticket `status='in-progress'`. Re-renderiza STATE.md.

## Testes (mapa → CA)

| Teste | CA | Cenário |
| --- | --- | --- |
| CA-1 | CA-1 | W2 done+REJECTED → reopen → in-progress, rounds 1→2, outcome null, currentWave=W2 |
| CA-2 | CA-2 | após reopen, `wave-finish W2 APPROVED` → done/APPROVED, currentWave=W3, STATE.md tem APPROVED |
| CA-3 | CA-3 | W0 done+RED → reopen recusa **exit 2** + stderr `/REJECTED/i` |
| CA-4 | CA-4 | W1 done+REJECTED com W2 in-progress → reopen recusa **exit 2** + stderr cita posterior |
| CA-5 | CA-5 | W2 done+REJECTED com rounds=3 → reopen recusa **exit 2** (escala humano) |

## Nota anti-falso-positivo

Primeira rodada: CA-3/CA-4 passaram **pela razão errada** — o subcomando inexistente cai no
`default` do switch (`state-cli.ts:312`, exit 1 "subcomando desconhecido"), satisfazendo um
`assert.notEqual(code, 0)` frouxo. Endurecidos para exigir **`exit 2`** + mensagem específica
(`/REJECTED/i`, `/posterior|W2/i`), que só a lógica real produz. Após o ajuste: 5/5 RED.

```
ℹ tests 5
ℹ pass 0
ℹ fail 5
```
