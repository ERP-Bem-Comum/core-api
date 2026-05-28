# W1 — Implementação mínima

**Agente:** typescript-language-expert
**Resultado:** **GREEN — 5 testes, 5 pass, 0 fail** ✅

## Mudanças

### `scripts/pipeline/state-cli.ts`

- **Nova função `cmdWaveReopen(cwd, ticket, wave, flags)`** com as 5 guardas na ordem do W0:
  1. wave existe → senão exit 1.
  2. `status === 'done'` → senão exit 2.
  3. `outcome === 'REJECTED'` → senão exit 2 (CA-3).
  4. `rounds < MAX_ROUNDS` → senão exit 2 (CA-5) — reusa a constante `MAX_ROUNDS = 3`.
  5. toda wave posterior `pending` (`waves.slice(idx+1).find(w => w.status !== 'pending')`)
     → senão exit 2 (CA-4).
  Transição: `status='in-progress'`, `outcome=null`, `finishedAt=null`, `startedAt=now`,
  `rounds++`, `agent` atualizado só se `--agent` veio (senão mantém), `currentWave=<Wn>`,
  ticket `status='in-progress'`, `lastEvent='<Wn> reopened (round N)'`. Persiste via
  `writeStateAndMd` (re-renderiza STATE.md).
- **`case 'wave-reopen'`** no switch do `main()`.
- **String de uso** atualizada para incluir `wave-reopen`.

### `CLAUDE.md` (raiz) §"Pipeline state" (CA-7)

Linha de exemplo do `wave-reopen` adicionada entre `wave-round` e `close`.

## Por que novo subcomando e não overload de `wave-start`

Decisão do W0: reabrir é transição `done→in-progress` com regras próprias (só REJECTED, checa
posterior, incrementa rounds), semanticamente distinta de "iniciar wave nova a partir de
pending". Subcomando dedicado mantém as guardas e mensagens de erro claras.

## Verificação

```
ℹ tests 5
ℹ pass 5
ℹ fail 0
```

Suíte completa de `state-cli` + gate global ficam no W3.
