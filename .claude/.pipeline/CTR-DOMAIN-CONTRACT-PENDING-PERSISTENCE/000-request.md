# CTR-DOMAIN-CONTRACT-PENDING-PERSISTENCE — persistir o estado `Pendente`

## Origem

2º ticket da série [ADR-0023](../../../handbook/architecture/adr/0023-contract-lifecycle-pending-state.md).
O 1º (`CTR-DOMAIN-CONTRACT-PENDING-STATE`) introduziu o estado `PendingContract` no domínio, mas
**adiou a persistência** (decisão A-lean): hoje `ContractRepository.save` aceita só `EffectiveContract`
— o tipo impede salvar Pending porque as colunas de vigência são `NOT NULL`.

## Estado atual

`src/modules/contracts/adapters/persistence/schemas/mysql.ts` (`ctr_contracts`):
- `signedAt`, `currentValueCents`, `currentPeriodKind`, `currentPeriodStart` são **`.notNull()`** —
  incompatível com `PendingContract` (que não tem esses campos).
- CHECK `ctr_contracts_status_chk`: `status IN ('Active','Expired','Terminated')` — sem `'Pending'`.
- `save` no port/adapters aceita `EffectiveContract`; `contractToInsert` idem; `isStatus` (mapper)
  narrowa para os 3 efetivos; `cli/state.ts` ignora Pending na restauração.

## Critérios de aceitação

- **CA1 (schema):** `signedAt`, `currentValueCents`, `currentPeriodKind`, `currentPeriodStart`
  passam a ser **nuláveis**. CHECK de status inclui `'Pending'`.
- **CA2 (integridade):** novo CHECK garante a bicondicional **`(status='Pending') ⟺ (signed_at IS NULL)`**
  (e idem para `current_value_cents`/`current_period_*`) — Pendente tem vigência nula; efetivos têm
  vigência preenchida. Espelha o CHECK F-L1 já existente para `ended_at`.
- **CA3 (migration):** migration gerada via `pnpm run db:generate` (drizzle-kit) em
  `migrations/mysql/`. DDL revisado conforme ADR-0020 (sem ENUM nativo — CHECK via varchar;
  CHARSET/COLLATE manual se a coluna for nova).
- **CA4 (mapper):** `contractToInsert` volta a aceitar `Contract` e trata `Pending` (vigência/assinatura
  `null`, `homologatedAmendmentIds` vazio). `contractFromRow`: `isStatus` reconhece `'Pending'` →
  `PendingContract`, validando que as colunas de vigência vêm `null` (estado corrompido → erro de mapper).
- **CA5 (port/adapters):** `ContractRepository.save` volta a aceitar **`Contract`** (reverte a restrição
  `EffectiveContract` do ticket anterior); os 2 adapters (in-memory + drizzle) idem.
- **CA6 (round-trip):** `contract-repository.suite.ts` ganha caso: `save(PendingContract)` → `findById`
  → devolve `PendingContract` com os campos de cadastro intactos e sem vigência. Roda no in-memory e,
  via `test:integration`, no MySQL.
- **CA7:** `cli/state.ts` volta a restaurar contratos `Pending` (remove o filtro temporário).

## Fora de escopo

- **Transição `activate`** (`Pending → Active`) — próximo ticket (RN-CV-02).
- **CLI** expondo `createPending`/`activate` + realinhamento de labels (ticket de CLI).

## Notas

- Skills: `drizzle-schema-author` (schema + DDL), apoio de `database-engineer` (CHECK/migration);
  `tdd-strategist` no W0. Pipeline W0→W3.
- `EffectiveContract` (tipo) permanece útil para operações que exigem vigência; só o `save` deixa de
  restringi-lo.
- Migration NÃO altera dados existentes (todos os contratos atuais são efetivos); só relaxa NOT NULL
  + amplia CHECK. Backward-compatible.
