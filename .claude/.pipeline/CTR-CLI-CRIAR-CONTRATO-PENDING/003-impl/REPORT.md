# W1 (GREEN) — CTR-CLI-CRIAR-CONTRATO-PENDING

**Skill:** application-cli-builder
**Data:** 2026-05-27
**Resultado:** 🟢 GREEN — 2/2 do ticket; suíte 1238/0; typecheck/format/lint OK.

## Implementação

`cli/commands/criar-contrato.ts`:
- `assinado-em` sai de `REQUIRED` (entra em `ALLOWED` como opcional). `help`/`descricao` atualizados.
- **Dual:** `--assinado-em` presente → `createContract` (Active, inalterado); ausente →
  `createPendingContract` (Pending). Persist + `formatContract` comuns (o formatter já trata Pending).

## Bug descoberto e corrigido — `cli/state.ts` (state file da CLI)

CA1b falhou ao **reler** o state com um contrato Pending: `isValidContract` rejeitava
(`state-entity-invalid`) porque o validador exigia `signedAt`/`currentValue` e o set
`CONTRACT_STATUSES` não tinha `'Pending'`. A persistência do **driver memory** (cli-state.json) é
distinta do Drizzle (tratado em CTR-DOMAIN-CONTRACT-PENDING-PERSISTENCE) e também precisava do estado.

Correção:
- `CONTRACT_STATUSES` += `'Pending'`.
- `isValidContract` **bifurca**: `Pending` valida só cadastro (id/seq/title/objective/originalValue/
  originalPeriod) e exige `signedAt`/`currentValue`/`currentPeriod`/`endedAt` **ausentes**; estados
  efetivos validam como antes.

## Gate

```
node --test contracts.cli.create-pending.test.ts → 2/2 (determinístico, 2 runs)
node --test contracts.cli.test.ts (regressão)     → 16/16
pnpm run typecheck / format:check / lint          → OK
pnpm test                                          → tests 1254 · pass 1238 · fail 0 · skipped 16
```

## Fora deste ticket (próximo)

- Comando `activar-contrato` (chama `activateContract`).
- Realinhamento de labels de status (`Em Andamento`/`Finalizado`/`Distrato`).
