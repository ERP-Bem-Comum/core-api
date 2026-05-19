# Ticket CTR-AGG-CONTRACT: Agregado raiz `Contract` (Contrato Mãe)

> **Idioma:** documentação em PT. Identificadores em EN (regra invariante).

## Contexto

Primeira **entidade real** do módulo. Consome os 3 VOs já entregues (`ContractId`, `Money`, `Period`) + `AmendmentId` para rastreamento de aditivos aplicados.

Modela o **Contrato Mãe** conforme [`handbook/domain/contratos/03-gestao-contratos-context.md`](../../../../../handbook/domain/contratos/03-gestao-contratos-context.md) §3:

- Cadastro inicial com `originalValue`, `originalPeriod` (imutáveis após criação).
- Estado vigente (`currentValue`, `currentPeriod`) derivado por aplicação de aditivos homologados.
- Status: `Active` → `Expired` (vigência expirou) | `Terminated` (rescisão antecipada).

> **Tradução PT/EN das nomenclaturas do handbook:**
> - "Vigente" → `Active`
> - "Encerrado" (fim natural da vigência) → `Expired`
> - "Distratado" (rescisão antecipada) → `Terminated`
> - "Contrato Mãe Criado" → `ContractCreated`
> - "Estado Contratual Atualizado" → `ContractStateUpdated`
> - "Contrato Encerrado" → `ContractEnded`

## Escopo

- `src/modules/contracts/domain/contract/types.ts` — `Contract`, `ContractStatus`, `ContractAdjustment`.
- `src/modules/contracts/domain/contract/events.ts` — discriminated union `ContractEvent`.
- `src/modules/contracts/domain/contract/errors.ts` — string literal union `ContractError`.
- `src/modules/contracts/domain/contract/contract.ts` — funções de domínio (`create`, `expire`, `terminate`, `applyHomologatedAdjustment`).
- `src/modules/contracts/domain/contract/index.ts` — barrel.
- `tests/modules/contracts/domain/contract/contract.test.ts` — testes.

## Fora de escopo

- **Agregado `Amendment`** — ticket separado (`CTR-AGG-AMENDMENT`). Por enquanto, `Contract` recebe `ContractAdjustment` (linguagem interna do Contract) — o caller (use case) traduz `Amendment` → `ContractAdjustment`.
- **Repository port** — ticket separado (`CTR-PORT-CONTRACT-REPOSITORY`).
- **R4 (uniqueness de `sequentialNumber + year`)** — responsabilidade do repository (DB unique constraint), não do agregado.
- **Numeração automática `000/AAAA`** — gerada pelo use case (precisa consultar próximo número), não pelo domain. Aqui, `sequentialNumber` é input validado.
- **Distrato com multa / consequências fiscais** — fora do core domain MVP.

## Decisões de design

| # | Decisão | Justificativa |
| :-- | :--- | :--- |
| D1 | `Contract` é `Brand<Readonly<{...}>, 'Contract'>` | Padrão estabelecido nos VOs. |
| D2 | Status union: `'Active' \| 'Expired' \| 'Terminated'` | 3 estados terminais bem definidos. Sem estados intermediários por enquanto. |
| D3 | `currentValue`/`currentPeriod` são **snapshots stateful** (campo armazenado), não derived em runtime | Coerente com o handbook (que tem campo "Valor Vigente"). Performance + simplicidade — não precisa carregar todos os aditivos para reconstruir. Trade-off: histórico de mudanças vive no Event log + `homologatedAmendmentIds`. |
| D4 | `homologatedAmendmentIds: readonly AmendmentId[]` rastreia aditivos aplicados | Evita dupla aplicação; audit trail; futuramente permite "replay" para verificação. |
| D5 | Discriminated union local `ContractAdjustment` | Linguagem do Contract — desacopla do `Amendment` (ticket separado). Variantes: `ValueIncrease`, `ValueDecrease`, `PeriodExtension`, `Acknowledgment` (Misc). |
| D6 | Cada comando retorna `Result<{ contract, event }, ContractError>` | Comando produz **estado novo + evento**. Caller decide quando publicar. Padrão event-sourcing-friendly sem ser puro event-sourced. |
| D7 | `endedAt: Date \| null` (null se `Active`) | Single source of truth para "quando terminou". |
| D8 | `expire(contract, at)` valida que `at >= currentPeriod.end` e que period é `Fixed` | Indefinite period nunca expira automaticamente — só pode ser `terminate`-ado. |
| D9 | Comandos só funcionam em `Active`. `Expired`/`Terminated` rejeitam com `'contract-not-active'` | R3 do handbook ("status terminal não recebe aditivos"). |
| D10 | `ContractEvent` é discriminated union com 3 variantes: `Created`, `StateUpdated`, `Ended` | `Ended` tem `kind: 'Expired' \| 'Terminated'` para indicar motivo. |
| D11 | `originalValue` e `originalPeriod` jamais sobrescritos | R5 do handbook. Garantido por `readonly` no tipo. |

## Critérios de aceite

### `Contract.create(input): Result<{ contract, event }, ContractError>`

- [ ] Input válido → `Ok({ contract: { status: 'Active', current* === original*, endedAt: null, homologatedAmendmentIds: [] }, event: { type: 'ContractCreated', ... } })`.
- [ ] `sequentialNumber` vazio → `Err('contract-sequential-number-required')`.
- [ ] `title` vazio (após trim) → `Err('contract-title-required')`.
- [ ] `objective` vazio (após trim) → `Err('contract-objective-required')`.
- [ ] `signedAt` data inválida → `Err('contract-invalid-signed-at')`.

### `Contract.expire(contract, at): Result<{ contract, event }, ContractError>`

- [ ] Contract `Active` com `Fixed period` e `at >= period.end` → `Ok({ contract: { status: 'Expired', endedAt: at }, event: { type: 'ContractEnded', kind: 'Expired' } })`.
- [ ] Contract `Active` com `Fixed period` mas `at < period.end` → `Err('contract-cannot-expire-yet')`.
- [ ] Contract `Active` com `Indefinite period` → `Err('contract-cannot-expire-indefinite-period')`.
- [ ] Contract não-`Active` → `Err('contract-not-active')`.
- [ ] `at` inválido (NaN) → `Err('contract-invalid-event-date')`.

### `Contract.terminate(contract, at): Result<{ contract, event }, ContractError>`

- [ ] Contract `Active` → `Ok({ contract: { status: 'Terminated', endedAt: at }, event: { type: 'ContractEnded', kind: 'Terminated' } })`.
- [ ] Contract não-`Active` → `Err('contract-not-active')`.
- [ ] `at` inválido → `Err('contract-invalid-event-date')`.

### `Contract.applyHomologatedAdjustment(contract, adjustment, at)`

- [ ] Contract não-`Active` → `Err('contract-not-active')`.
- [ ] `amendmentId` já em `homologatedAmendmentIds` → `Err('contract-amendment-already-applied')`.
- [ ] **ValueIncrease**: `currentValue += amount`; lista atualizada; status segue `Active`; evento `ContractStateUpdated`.
- [ ] **ValueDecrease**: `currentValue -= amount`; se ficaria negativo → `Err('contract-value-would-go-negative')`.
- [ ] **PeriodExtension** sobre `Fixed` com `newEnd > currentPeriod.end` → novo `currentPeriod`; evento.
- [ ] **PeriodExtension** sobre `Indefinite` → `Err('contract-cannot-extend-indefinite-period')`.
- [ ] **PeriodExtension** com `newEnd <= currentPeriod.end` → `Err('contract-period-extension-not-after-current-end')`.
- [ ] **Acknowledgment** (Amendment tipo Misc): só adiciona `amendmentId` à lista; sem mudança em `currentValue`/`currentPeriod`; evento ainda emitido.
- [ ] `at` inválido → `Err('contract-invalid-event-date')`.

### Invariantes preservadas

- [ ] R2: `sequentialNumber` jamais muda após criação (garantido por `readonly`).
- [ ] R3: status terminal (`Expired`/`Terminated`) rejeita todos os adjustments.
- [ ] R5: `originalValue` e `originalPeriod` jamais sobrescritos (garantido por `readonly`).

### Tipagem (compile-time)

- [ ] `string as Contract` falha.
- [ ] `Contract` produzido apenas via `Contract.create(...).value.contract`.
- [ ] `ContractEvent` discriminated union — `switch` exhaustive testado em runtime via cobertura.

## Referências

- [`handbook/domain/contratos/03-gestao-contratos-context.md`](../../../../../handbook/domain/contratos/03-gestao-contratos-context.md) §3 (Agregado e Invariantes).
- [`handbook/domain/contratos/04-aditivos-context.md`](../../../../../handbook/domain/contratos/04-aditivos-context.md) §3-5 (impacto de aditivos no Contract).
- [`handbook/domain/contratos/06-event-line-context.md`](../../../../../handbook/domain/contratos/06-event-line-context.md) (matriz de eventos).
- [`.claude/skills/ts-domain-modeler/references/ts-discriminated-unions.md`](../../skills/ts-domain-modeler/references/ts-discriminated-unions.md).
- Tickets anteriores: [CTR-VO-MONEY](../CTR-VO-MONEY/STATE.md), [CTR-VO-IDS](../CTR-VO-IDS/STATE.md), [CTR-VO-PERIOD](../CTR-VO-PERIOD/STATE.md).
