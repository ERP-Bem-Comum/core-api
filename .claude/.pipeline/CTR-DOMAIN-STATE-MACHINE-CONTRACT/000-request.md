# 000 — Request CTR-DOMAIN-STATE-MACHINE-CONTRACT

> **Frente A — Refactor radical do domínio (entrevista 0001).**
> **Bloco D — State Machine em Tipos.** Top-3 leverage **#1** (PhD L2).
> Depende de `CTR-DOMAIN-DEBRAND-AGG` ✅ + `CTR-DOMAIN-TAGGED-ERRORS` ✅.
> Habilita `CTR-DOMAIN-STATE-MACHINE-AMENDMENT` (próximo ticket da mesma frente).
> Continuação do teste do protocolo **Opção B** — 6º ticket consecutivo.

---

## Origem

- **Entrevista canônica:** [`handbook/interviews/0001-functional-ddd-domain-refresh.md`](../../../handbook/interviews/0001-functional-ddd-domain-refresh.md), **Bloco D** (Tagged Errors & Invariantes em Tipos).
- **Decisões aplicáveis** (master doc):
  - **DO D§20** (L872): "**Um tipo refinado por estado de agregado** (`ActiveContract`, `ExpiredContract`, `TerminatedContract`). Transições são funções totais: `expire(c: ActiveContract): Result<ExpiredContract, …>`."
  - **DO D§21** (L873): "Refinement via `parseActive`, `parsePending`, etc — alinhado com 'Parse, don't validate'. **Não** `assertActive` (imperativo)."
  - **DO C§29** (L881): "Estados **ELIMINAM `null`** — campos `optional-as-state` viram propriedade obrigatória do tipo refinado."
  - **DO C§32** (L884): "Exhaustive switch: **omitir `default`** (preferível) ou `default: { const _: never = x; return _; }`. Nunca `throw`."
  - **DON'T D§19** (L912): "`assertActive` que devolve `Contract` cru — fere refinement."
  - **DON'T D§20** (L913): "`if (contract.status !== 'Active')` espalhado em código de negócio — shotgun parsing."
  - **DON'T D§23** (L916): "Naming imperativo (`assertActive`, `validateActive`) — remete a exceções."
  - **DON'T C§27** (L920): "Transição de estado retornando tipo direto sem `Result` — não há como sinalizar falha sem `throw`."
- **Tabela canônica de tickets** (L966):
  > `CTR-DOMAIN-STATE-MACHINE-CONTRACT` — Bloco D — Refactor `Contract` em union `Active | Expired | Terminated`. `parseActive`, `expire(active)`, `terminate(active)` viram transições tipadas. **Deps: DEBRAND-AGG, TAGGED-ERRORS.**
- **Top-3 leverage** (L1014): "**State Machine em Tipos** — `CTR-DOMAIN-STATE-MACHINE-CONTRACT` + `CTR-DOMAIN-STATE-MACHINE-AMENDMENT`."

---

## Estado atual (snapshot 2026-05-20)

### `src/modules/contracts/domain/contract/types.ts`

```ts
export type ContractStatus = 'Active' | 'Expired' | 'Terminated';

export type Contract = Readonly<{
  id: ContractId;
  // ... campos imutáveis ...
  status: ContractStatus;          // ← discriminator string, sem refinement
  homologatedAmendmentIds: readonly AmendmentId[];
  endedAt: Date | null;            // ← null em Active, Date em Expired/Terminated
}>;
```

- **Status é discriminator string** mas o tipo é um **único** record — não há refinement.
- **`endedAt: Date | null`** é um `optional-as-state` clássico (DON'T C§29).
- **Transições recebem `Contract` cru** e fazem `assertActive(contract)` em runtime.

### `src/modules/contracts/domain/contract/contract.ts`

```ts
const assertActive = (contract: ContractEntity): Result<ContractEntity, ContractError.ContractNotActive> =>
  contract.status === 'Active' ? ok(contract) : err(ContractError.contractNotActive(contract.status));
// ↑ DON'T D§19 + DON'T D§23: refinement falso + naming imperativo

const expire = (contract: ContractEntity, at: Date): Result<CommandOutput, ContractError.ContractError> => {
  const activeCheck = assertActive(contract);                  // ← runtime check espalhado
  if (!activeCheck.ok) return activeCheck;
  // ...
};

const terminate = (contract: ContractEntity, at: Date): Result<CommandOutput, ContractError.ContractError> => {
  const activeCheck = assertActive(contract);                  // ← idem
  if (!activeCheck.ok) return activeCheck;
  // ...
};

const applyHomologatedAdjustment = (contract: ContractEntity, ...) => {
  const activeCheck = assertActive(contract);                  // ← idem
  // ...
};
```

### Consumidores diretos (a refletir)

| Arquivo | Mudança esperada |
| :--- | :--- |
| `application/use-cases/create-contract.ts` | Output tipa `ActiveContract` (todo contrato novo é Active). |
| `application/use-cases/homologate-amendment.ts` | Precisa `parseActive(contract)` antes de chamar `applyHomologatedAdjustment`. |
| `application/use-cases/get-contract.ts`, `list-contracts.ts`, `attach-signed-document.ts` | Aceitam `Contract` (a união) — sem mudança lógica, apenas tipagem. |
| `adapters/persistence/mappers/contract.mapper.ts` | Rehidratação retorna `Contract` (union); decide o subtipo conforme `status` lido do DB. |
| Repos InMemory + Drizzle | Armazenam `Contract` (a união); FindById retorna `Promise<Result<Contract, …>>`. |
| `cli/formatters/contract.ts`, `status.ts` | Já narram pelo `status` — só ajustar imports se nome do tipo mudar. |

### Testes a atualizar / criar

- `tests/modules/contracts/domain/contract/contract.test.ts` — adiciona casos de `parseActive` em Expired/Terminated.
- `tests/modules/contracts/application/use-cases/homologate-amendment.test.ts` — caminho `parseActive` falha quando contrato não está Active.
- `tests/modules/contracts/adapters/persistence/fixtures.ts` — fixtures separadas por estado refinado, se hoje compartilham.
- `tests/modules/contracts/adapters/persistence/drizzle-mysql.test.ts` — round-trip preserva o subtipo correto.
- `tests/modules/contracts/cli/format.test.ts` — provável zero mudança (formatter consome `status` cru).

---

## Estado-alvo (Padrão D — State Machine em Tipos)

### `domain/contract/types.ts`

```ts
import type { AmendmentId, ContractId } from '../shared/ids.ts';
import type { Money } from '../shared/money.ts';
import type { Period } from '../shared/period.ts';

/** Campos comuns a todos os estados do agregado. */
type ContractCore = Readonly<{
  id: ContractId;
  sequentialNumber: string;
  title: string;
  objective: string;
  signedAt: Date;
  originalValue: Money;
  originalPeriod: Period;
  currentValue: Money;
  currentPeriod: Period;
  homologatedAmendmentIds: readonly AmendmentId[];
}>;

/** Tipo refinado: contrato em vigor. Tem garantias estáticas: `endedAt` ausente. */
export type ActiveContract = ContractCore & Readonly<{ status: 'Active' }>;

/** Tipo refinado: contrato expirado (terminal). `endedAt` obrigatório (DO C§29). */
export type ExpiredContract = ContractCore & Readonly<{ status: 'Expired'; endedAt: Date }>;

/** Tipo refinado: contrato terminado por motivo de negócio (terminal). */
export type TerminatedContract = ContractCore & Readonly<{ status: 'Terminated'; endedAt: Date }>;

/** Union discriminada — o "Contract" público continua sendo este tipo. */
export type Contract = ActiveContract | ExpiredContract | TerminatedContract;
```

> **Observação D§29:** `endedAt: Date | null` morre. `ActiveContract` **não tem** o campo; `Expired/Terminated` têm `endedAt: Date` obrigatório.

### `domain/contract/contract.ts`

```ts
// Refinement constructor — substitui assertActive (DON'T D§19 + DON'T D§23)
const parseActive = (contract: Contract): Result<ActiveContract, ContractError.ContractNotActive> =>
  contract.status === 'Active'
    ? ok(contract)                                              // narrowing automático
    : err(ContractError.contractNotActive(contract.status));

// Transições são FUNÇÕES TOTAIS sobre o tipo refinado (DO D§20)
const expire = (
  contract: ActiveContract,                                     // ← entrada já refinada
  at: Date,
): Result<{ contract: ExpiredContract; event: ContractEvent }, ContractError.ContractError> => {
  // Sem assertActive: o tipo já garante. Demais invariantes (currentPeriod.kind, etc) seguem.
  ...
};

const terminate = (
  contract: ActiveContract,
  at: Date,
): Result<{ contract: TerminatedContract; event: ContractEvent }, ContractError.ContractError> => { ... };

const applyHomologatedAdjustment = (
  contract: ActiveContract,                                     // ← só Active aceita aditivo
  adjustment: ContractAdjustment,
  at: Date,
): Result<{ contract: ActiveContract; event: ContractEvent }, ContractError.ContractError> => { ... };

// create() já produz Active (todo contrato novo é Active)
const create = (input: CreateContractInput): Result<{ contract: ActiveContract; event: ContractEvent }, ContractError.ContractError> => { ... };

export const Contract = { create, parseActive, expire, terminate, applyHomologatedAdjustment };
```

> **Observação D§24:** `assertActive` é **removido** (DON'T D§19 + D§23). `parseActive` é o único refinement constructor.

### `application/use-cases/homologate-amendment.ts`

```ts
const active = Contract.parseActive(contract);                  // ← refinement na borda
if (!active.ok) return err(homologateError.contractNotActive(active.error.currentStatus));

const adjustments = Amendment.toAdjustments(homologated);
let next = active.value;                                        // tipo: ActiveContract
for (const adjustment of adjustments) {
  const step = Contract.applyHomologatedAdjustment(next, adjustment, at);
  if (!step.ok) return step;
  next = step.value.contract;                                   // tipo preservado: ActiveContract
}
```

### Mappers (rehidratação)

```ts
// contract.mapper.ts
const toDomain = (row: ContractRow): Result<Contract, ContractMapperError> => {
  // ... reconstruir VOs ...
  switch (row.status) {
    case 'Active':
      return ok({ ...core, status: 'Active' });
    case 'Expired':
      if (row.endedAt === null) return err(/* shape inválido */);
      return ok({ ...core, status: 'Expired', endedAt: row.endedAt });
    case 'Terminated':
      if (row.endedAt === null) return err(/* shape inválido */);
      return ok({ ...core, status: 'Terminated', endedAt: row.endedAt });
  }
};
```

> Mapper passa a **decidir o subtipo** lendo o status do row. `endedAt: null` em row com status Expired/Terminated vira erro de rehidratação (estado corrupto). Linha com `endedAt != null` e status Active também vira erro (estado corrupto). Os erros existentes em `ContractMapperError` cobrem isso (`unexpected-shape` ou similar) — confirmar; se não, adicionar variant tagged.

---

## Critérios de aceitação

### CA1 — Tipos refinados emitidos (compile-time)

- `types.ts` exporta `ActiveContract`, `ExpiredContract`, `TerminatedContract`.
- `Contract` é union discriminada das três.
- `endedAt` é **propriedade obrigatória** em Expired/Terminated; **ausente** em Active.
- `ContractStatus` permanece exportado (consumido por errors + CLI formatter) — pode ser derivado: `type ContractStatus = Contract['status']`.

### CA2 — `parseActive` substitui `assertActive`

- `Contract.parseActive(c: Contract): Result<ActiveContract, ContractNotActive>` existe.
- `assertActive` é **removido** do arquivo (não apenas marcado deprecated).
- Grep `assertActive` em `src/` retorna **zero** ocorrências.

### CA3 — Transições têm assinatura refinada

- `expire(c: ActiveContract, at: Date): Result<{ contract: ExpiredContract; ... }, ...>`.
- `terminate(c: ActiveContract, at: Date): Result<{ contract: TerminatedContract; ... }, ...>`.
- `applyHomologatedAdjustment(c: ActiveContract, ...): Result<{ contract: ActiveContract; ... }, ...>`.
- `create(input): Result<{ contract: ActiveContract; ... }, ...>`.
- **TS rejeita** chamar `expire(expiredContract, ...)` em compile time — verificado por test de tipo (`@ts-expect-error`).

### CA4 — Use cases consomem refinement na borda

- `homologate-amendment.ts` chama `Contract.parseActive` **uma única vez** e passa o `ActiveContract` adiante.
- Outros use cases (`create-contract`, `get-contract`, `list-contracts`, `attach-signed-document`) compilam sem mudança lógica.

### CA5 — Mappers retornam union; preservam subtipo no round-trip

- `contract.mapper.ts toDomain` decide subtipo por `row.status` com `switch` exaustivo.
- Round-trip Active → save → load preserva o subtipo Active (`status === 'Active'`).
- Idem Expired e Terminated.
- Estado corrupto (`endedAt: null` em Expired, ou `endedAt != null` em Active) retorna erro tagged.

### CA6 — Cobertura de testes preserva regressões

- `pnpm test` verde com **≥** o número de testes atuais (595 antes deste ticket).
- Pelo menos 3 testes novos:
  - `parseActive` retorna `ok` para Active, `err(ContractNotActive)` para Expired e Terminated.
  - Mapper rejeita row com shape impossível (Active + endedAt definido).
  - Use case `homologate-amendment` falha com `ContractNotActive` ao receber contrato Expired.

### CA7 — Gates W3 verdes em round 1 (ideal) ou ≤ 2

- `pnpm run typecheck` ✅
- `pnpm run format:check` ✅
- `pnpm test` ✅
- `pnpm run lint` ✅

---

## Arquivos previstos

### `src/` (produção)

```
src/modules/contracts/domain/contract/types.ts                        (refactor)
src/modules/contracts/domain/contract/contract.ts                     (refactor)
src/modules/contracts/domain/contract/errors.ts                       (zero mudança esperada — ContractNotActive já existe)
src/modules/contracts/application/use-cases/create-contract.ts        (apenas tipagem do output)
src/modules/contracts/application/use-cases/homologate-amendment.ts   (adicionar parseActive)
src/modules/contracts/application/use-cases/get-contract.ts           (apenas tipagem)
src/modules/contracts/application/use-cases/attach-signed-document.ts (apenas tipagem)
src/modules/contracts/adapters/persistence/mappers/contract.mapper.ts (refactor toDomain)
```

### `tests/` (RED → GREEN)

```
tests/modules/contracts/domain/contract/contract.test.ts                              (+ testes parseActive, transições rejeitam não-Active)
tests/modules/contracts/application/use-cases/homologate-amendment.test.ts            (+ caminho contractNotActive)
tests/modules/contracts/adapters/persistence/contract-repository.suite.ts             (+ round-trip por subtipo)
tests/modules/contracts/adapters/persistence/fixtures.ts                              (fixtures expiredContract / terminatedContract)
tests/modules/contracts/adapters/persistence/drizzle-mysql.test.ts                    (re-cobertura)
tests/modules/contracts/adapters/persistence/contract.mapper.test.ts                  (se existir — adicionar; caso contrário, criar)
```

---

## Não-objetivos (fora do escopo)

- **Amendment state machine** — fica em `CTR-DOMAIN-STATE-MACHINE-AMENDMENT` (próximo ticket).
- **Codemod de imports** — segue separado em `CTR-DOMAIN-IMPORT-CODEMOD`.
- **`NonZeroMoney` brandado** — `CTR-DOMAIN-INVARIANT-CONTEXTUAL`.
- **Mover `Repository` para `domain/<agg>/`** — `CTR-DOMAIN-RESTRUCTURE`.

---

## Risco / pontos de atenção (para W0 e W1 considerarem)

1. **`ContractStatus` export.** Hoje é exportado e consumido por `errors.ts` (payload de `ContractNotActive`) e formatters CLI. Manter o nome — pode virar `type ContractStatus = Contract['status']` para evitar duplicação.
2. **`endedAt: null` em rows existentes.** Migration não muda o schema; o mapper passa a interpretar. Confirmar com [`mysql-database-expert`] se já tem fixtures em MySQL com `endedAt = NULL` para Expired (não deveria, mas validar via teste E2E).
3. **Erros de mapper.** `ContractMapperError` (criado em `CTR-DB-MAPPER-NO-THROW`) precisa expressar o novo erro de shape impossível (`endedAt-mismatch-with-status` ou similar). Se ainda não existir essa variant, **adicionar** no escopo deste ticket (Padrão D — tagged).
4. **CLI no driver `mysql`.** Validar via smoke test que `listar-contratos` consegue exibir um contrato Expired após o refactor (não previsto adicionar caso novo, só re-rodar).
5. **Auto Mode da pipeline.** Como `CTR-DOMAIN-TAGGED-ERRORS` mostrou (round 1 W3 detectou 4 erros adjacentes), a chance de W2 ou W3 demandar 2 rounds aqui é real. **Aceitar até 3 rounds** em cada antes de escalar.

---

## Próximos tickets (cadeia)

```
[FECHADO] DEBRAND-AGG → [FECHADO] TAGGED-ERRORS → [ESTE] STATE-MACHINE-CONTRACT
                                              ↘ [PRÓXIMO] STATE-MACHINE-AMENDMENT
                                              ↘ [LATER]   INVARIANT-CONTEXTUAL (depende de SHARED-VO-CANONICAL ✓)
```
