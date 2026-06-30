# W0 (RED) — CTR-DOMAIN-CONTRACT-PENDING-PERSISTENCE

**Skill:** tdd-strategist
**Data:** 2026-05-27
**Resultado:** 🔴 RED — 2 testes de mapper falham (sem Docker); round-trip E2E adicionado.

## Estratégia de RED (sem Docker)

O caminho de persistência de `Pending` só falha de verdade no **mapper/schema** (drizzle). Mas o
adapter **in-memory** suporta Pending trivialmente (guarda o agregado na map, não usa schema) e o
**drizzle** exige Docker (offline nesta máquina). Logo, o RED **determinístico sem Docker** é nos
**testes unitários do mapper**:

```bash
node --test ... --test-name-pattern="CA-M[12]" contract.mapper.test.ts
# tests 2 · pass 0 · fail 2
```

## Testes adicionados

### `contract.mapper.test.ts` (REDs determinísticos)

| Teste | Exige no W1 | W0 |
| :--- | :--- | :--- |
| CA-M1 | `contractToInsert(Pending)` → row `status='Pending'`, `signedAt`/`current*` **NULL**, `endedAt` NULL, `homologatedAmendmentIds` `[]` | 🔴 (hoje exige `EffectiveContract` + lê `currentPeriod`) |
| CA-M2 | `contractFromRow(row Pending)` → `PendingContract` (sem `signedAt`/`currentValue`) | 🔴 (hoje `isStatus` rejeita `'Pending'` → `invalidStatus`) |

### `contract-repository.suite.ts` + `fixtures.ts` (E2E — CA6)

- `buildPendingContract` (fixtures) via `Contract.createPending`.
- `it('CA6: save + findById preserva PendingContract …')` — roda no **in-memory** (✔ hoje, pois o
  in-memory nunca usou schema) e, via `pnpm run test:integration`, no **MySQL/drizzle** (RED até o
  W1; exige Docker para observar). É o teste de regressão E2E do caminho completo.

## Mapa W1

- `schemas/mysql.ts`: `signedAt`/`currentValueCents`/`currentPeriodKind`/`currentPeriodStart`
  nuláveis; CHECK `status` += `'Pending'`; CHECK bicondicional `(status='Pending') ⟺ vigência NULL`.
- `pnpm run db:generate` → migration backward-compatible.
- `mappers/contract.mapper.ts`: `contractToInsert` aceita `Contract` e ramo Pending (NULLs);
  `isStatus`/`fromRow` reconhecem `'Pending'` → `PendingContract`.
- `repository.ts` + adapters: `save` volta a aceitar `Contract`.
- `cli/state.ts`: remove o filtro de Pending na restauração.

## Nota

Docker daemon offline nesta máquina → o RED/GREEN do round-trip MySQL (CA6 no drizzle) só é
observável com `test:integration`. Os REDs de mapper (CA-M1/M2) cobrem a lógica de mapeamento
determinística sem Docker.
