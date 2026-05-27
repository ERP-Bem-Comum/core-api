# W1 (GREEN) — CTR-DOMAIN-CONTRACT-PENDING-STATE

**Skill:** ts-domain-modeler
**Data:** 2026-05-27
**Resultado:** 🟢 GREEN — 8/8 do ticket; suíte completa 1200/0; typecheck/format/lint OK.

## Mudança de escopo (M → L, autorizada)

Incluir `PendingContract` na union `Contract` quebrou o `tsc` em 8 consumidores que assumiam
vigência efetiva. Decisão do usuário: **(A) ampliar — tratar todos os consumidores**, com a
sub-decisão **(A-lean)**: **persistência de `Pending` adiada** (exige migration de schema —
colunas `signedAt`/`current*` nuláveis), tratada num ticket próprio.

## Domínio

| Arquivo | Mudança |
| :--- | :--- |
| `contract/types.ts` | `ContractCore` refatorado em `ContractRegistration` (cadastro) + `EffectiveContractCore` (vigência). Novo `PendingContract` (só cadastro). Union `Contract` += Pending. Novo `EffectiveContract = Active\|Expired\|Terminated`. `ContractStatus` += `'Pending'`. Novo `CreatePendingContractInput` (sem `signedAt`, com `createdAt`). |
| `contract/contract.ts` | Helper `validateRegistration` (DRY entre create/createPending). Novo `Contract.createPending` → `PendingContract` + evento `ContractCreated` (`occurredAt = createdAt`). `create` (→ Active) preservado. |

## Consumidores tratados (A-lean)

| Arquivo | Tratamento |
| :--- | :--- |
| `cli/formatters/status.ts` | label `Pending → 'Pendente'` |
| `cli/formatters/contract.ts` | ramo Pending (sem vigência/assinatura); `formatContractSummary` usa `originalValue` |
| `adapters/.../contract.mapper.ts` | `contractToInsert` recebe `EffectiveContract`; `isStatus` narrowa para status persistidos (mantém `fromRow` switch exaustivo) |
| `domain/contract/repository.ts` | `save` recebe **`EffectiveContract`** — o tipo impede persistir Pending (sem erro novo) |
| `adapters/.../contract-repository.drizzle.ts` | `persistContractInTx`/`save` recebem `EffectiveContract` |
| `application/use-cases/create-amendment.ts` | `parseActive` antes de ler `current*` — rejeita Pending/terminais (RN-CV-01/R3); erro `ContractNotActive` no union |
| `application/use-cases/homologate-amendment.ts` | `parseActive` reordenado para antes do uso de `signedAt` |
| `application/use-cases/create-contract.ts` | `CreateContractOutput.contract` estreitado p/ `ActiveContract` |
| `cli/state.ts` | restauração ignora Pending (não persistível ainda) |

Bônus de correção: `create-amendment` agora rejeita aditivo em contrato não-vigente (R3 antes
era acessível só pelo acesso a `current*`; agora é explícito via `parseActive`).

## Gate (antecipado no W1)

```
node --test tests/.../contract-pending.test.ts → 8/8
pnpm run typecheck   → OK
pnpm run format:check → OK
pnpm run lint        → OK
pnpm test            → tests 1216 · pass 1200 · fail 0 · skipped 16
```

## Fora deste ticket (próximos da série)

- **Persistência de `Pending`** (migration: colunas nuláveis + mapper Pending + repo aceita `Contract`).
- **Transição `activate`** (`Pending → Active` por documento assinado + data) — RN-CV-02.
- **CLI** expondo `createPending` + realinhamento dos labels aos termos exatos da P.O.
  (`Em Andamento`/`Finalizado`/`Distrato`).
