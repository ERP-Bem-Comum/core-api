# Code Review — CTR-CLI-CRIAR-CONTRATO-PENDING — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer · **Data:** 2026-05-27
**Escopo:** `cli/commands/criar-contrato.ts`, `cli/state.ts` (`isValidContract`), `tests/cli/contracts.cli.create-pending.test.ts` (novo).

---

## Conformidade

- ✅ **Comando dual** sem `throw`/`class`/`any`: `--assinado-em` presente → `createContract`;
  ausente → `createPendingContract`. Persist + `formatContract` comuns (formatter já trata Pending).
  `assinado-em` movido de `REQUIRED` para opcional em `ALLOWED`; `help`/`descricao` atualizados.
- ✅ **`isValidContract` (state.ts) bifurcado corretamente:** `Pending` valida cadastro e exige
  `signedAt`/`currentValue`/`currentPeriod`/`endedAt` **ausentes** (`=== undefined`); efetivos validam
  como antes. `CONTRACT_STATUSES += 'Pending'`.
- ✅ **Segurança REGR #1 preservada:** um `Pending` com `signedAt`/`currentValue` injetado é rejeitado
  (`state-entity-invalid`) — o shape corrompido não passa. Round-trip do Pending (escrita omite campos
  → leitura aceita ausência) validado por CA1b.

## Observação (não é defeito)

- O suporte a `Pending` no **state file da CLI** (`state.ts`, driver memory) foi descoberto **aqui**,
  não no ticket de persistência Drizzle (`CTR-DOMAIN-CONTRACT-PENDING-PERSISTENCE`, que cobriu só o
  mapper/schema MySQL). São duas persistências distintas; agora ambas suportam Pending. Achado legítimo
  do W1 (CA1b — releitura do state).

## Gate verificado (read-only)

```
pnpm run typecheck / format:check / lint → OK
node --test contracts.cli.create-pending.test.ts → 2/2 (determinístico)
node --test contracts.cli.test.ts (regressão)     → 16/16
pnpm test → 1254 · pass 1238 · fail 0 · skipped 16
```

## Próximo passo

**APPROVED → W3.** Sem issues. Tocar `state.ts` foi necessário (não escopo-creep) para o comando
funcionar end-to-end no driver memory.
