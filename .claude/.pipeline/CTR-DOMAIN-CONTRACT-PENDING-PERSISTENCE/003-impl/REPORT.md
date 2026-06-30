# W1 (GREEN) — CTR-DOMAIN-CONTRACT-PENDING-PERSISTENCE

**Skill:** drizzle-schema-author
**Data:** 2026-05-27
**Resultado:** 🟢 GREEN — mapper CA-M1/M2 + round-trip in-memory verdes; gate completo OK.

## Schema + migration

| Arquivo | Mudança |
| :--- | :--- |
| `schemas/mysql.ts` | `signedAt`/`currentValueCents`/`currentPeriodKind`/`currentPeriodStart` agora **nuláveis** (`originalValue/Period` seguem `notNull` — Pending os tem). CHECK `status` += `'Pending'`. Novo CHECK `ctr_contracts_pending_consistency_chk`: `(status='Pending') = (signed_at IS NULL AND current_* IS NULL)`. |
| `migrations/mysql/0006_typical_alex_wilder.sql` | `pnpm run db:generate`. DROP+ADD do status CHECK; `MODIFY` das 4 colunas para nuláveis; ADD do consistency CHECK. **Backward-compatible** — só relaxa NOT NULL + amplia CHECK; nenhum dado existente viola. |

## Mapper

| Arquivo | Mudança |
| :--- | :--- |
| `mappers/contract.mapper.ts` | `contractToInsert` aceita `Contract` + ramo `Pending` (vigência/assinatura NULL). `isStatus` reconhece `'Pending'`. `contractFromRow` reestruturado: valida cadastro, **bifurca `Pending`** (integridade: vigência NULL) antes de exigir vigência; ramo efetivo com guard de null + narrowing. |

## Port / adapters / CLI

| Arquivo | Mudança |
| :--- | :--- |
| `domain/contract/repository.ts` | `save` volta a aceitar **`Contract`** (reverte a restrição `EffectiveContract` do ticket anterior). |
| `adapters/.../contract-repository.drizzle.ts` | `persistContractInTx`/`save` aceitam `Contract`. |
| `cli/state.ts` | restauração de Pending reativada (remove o filtro temporário). |

## Gate

```
pnpm run typecheck   → OK
pnpm run format:check → OK
pnpm run lint        → OK
pnpm test            → tests 1219 · pass 1203 · fail 0 · skipped 16
node --test contract.mapper.test.ts (CA-M1/M2) → GREEN
node --test inmemory.test.ts (CA6)             → GREEN
```

## ⚠️ Validação MySQL pendente (Docker offline)

O round-trip **CA6 no adapter drizzle/MySQL** (`pnpm run test:integration`) **não foi executado** —
Docker daemon offline nesta máquina. Validado por:
- **typecheck** (tipos do `ContractInsert`/`ContractRow` com colunas nuláveis batem com o mapper);
- **unit do mapper** (CA-M1 `toRow` Pending → NULLs; CA-M2 `fromRow` row Pending → `PendingContract`);
- **round-trip in-memory** (CA6).

A migration `0006` + o CHECK só serão exercidos contra o MySQL real quando o `test:integration`
rodar com Docker. Recomenda-se rodá-lo antes do merge da branch.

## Fora deste ticket (próximo da série)

- Transição `activate` (`Pending → Active`) — RN-CV-02.
- CLI expondo `createPending`/`activate` + realinhamento de labels (termos da P.O.).
