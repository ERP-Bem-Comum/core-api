# CTR-USECASE-CREATE-PENDING-CONTRACT — use case de cadastro de contrato `Pendente`

## Origem

Série [ADR-0023](../../../handbook/architecture/adr/0023-contract-lifecycle-pending-state.md), frente
"criar Pending". O domínio tem `Contract.createPending`, mas **nenhum use case o chama** — um contrato
`Pending` não tem porta de entrada via application/CLI. Este ticket fecha o gap (o ticket de CLI
seguinte consome este use case).

## Estado atual

- `Contract.createPending(input)` → `PendingContract` + evento `ContractCreated` (`occurredAt = input.createdAt`).
- `create-contract.ts` (use case) chama `Contract.create` (→ Active, exige `signedAt`); tem
  `buildContract` (validação + parse de money/period) e checagem de unicidade de `sequentialNumber`
  (`contractRepo.findBySequentialNumber`).
- `Clock` port disponível.

## Critérios de aceitação

- **CA1 (happy path):** `createPendingContract({ sequentialNumber, title, objective, originalValueCents,
  periodStart, periodEnd? })` (**sem `signedAt`**) → `Contract.createPending` (com `createdAt = clock.now()`),
  persiste via `contractRepo.save(pending, [event])`, retorna `PendingContract`.
- **CA2 (unicidade):** `sequentialNumber` já existente → `'contract-sequential-number-duplicated'`
  (mesma regra R4 do `create-contract`).
- **CA3 (validação):** formato `NNN/AAAA`, título/objetivo não-branco, `originalValue` ≠ 0, período
  válido (start/end) — erros propagados do domínio/parse (reusar a lógica de `buildContract`).
- **CA4 (sequência):** evento `ContractCreated` (`occurredAt = createdAt` injetado) publicado **após**
  o `save` (2º argumento), padrão CTR-OUTBOX-INTEGRATION-IN-REPOS.

## Contrato (esboço — refina no W0/W1)

```
type CreatePendingContractCommand = Readonly<{
  sequentialNumber: string; title: string; objective: string;
  originalValueCents: number; periodStart: string; periodEnd: string | null;
}>;
type Deps = Readonly<{ contractRepo: ContractRepository; clock: Clock }>;
type CreatePendingContractOutput = Readonly<{ contract: PendingContract; event: ContractEvent }>;
```

## Fora de escopo

- **CLI** (`criar-contrato` caminho Pending / comando dedicado) — próximo ticket.
- Realinhamento de labels de status.
- HTTP/ACL.

## Notas

- Skill: `ports-and-adapters`. Pipeline W0→W3. Application puro.
- Reaproveitar parse/validação de `create-contract.ts` (money, period, sequentialNumber) sem
  duplicar — extrair helper se necessário, preservando o `create-contract` (caminho Active) intacto.
- Decisão de modelagem (use case separado vs `create-contract` dual) fica para o W0/W1; preferência:
  **use case separado** (`createPendingContract`), espelhando `Contract.createPending` vs `create`.
