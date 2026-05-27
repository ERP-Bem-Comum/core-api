# CTR-DOMAIN-CONTRACT-ACTIVATE — transição `Pending → Active` (ativação por assinatura)

## Origem

3º ticket da série [ADR-0023](../../../handbook/architecture/adr/0023-contract-lifecycle-pending-state.md).
Os anteriores entregaram o estado `PendingContract` (domínio) e sua persistência. Falta a **transição
de ativação**: `Pending → Active` quando o contrato é assinado (RN-CV-02).

## Estado atual

`src/modules/contracts/domain/contract/`:
- `contract.ts` — `Contract.createPending` (nasce Pending), `create` (nasce Active), `expire`,
  `terminate`, `applyHomologatedAdjustment`, `parseActive`. **Não há `activate`.**
- `events.ts` — `ContractEvent = ContractCreated | ContractStateUpdated | ContractEnded`. Sem
  `ContractActivated`.
- Padrão a espelhar: `expire`/`terminate` (transições totais sobre tipo refinado — `(ActiveContract, at) → {contract, event}`).

## Critérios de aceitação

- **CA1:** `Contract.activate(pending: PendingContract, signedAt: Date): Result<{ contract: ActiveContract; event: ContractEvent }, ContractError>`.
  Produz `ActiveContract` com `signedAt` setado, **`currentValue = originalValue`**,
  **`currentPeriod = originalPeriod`**, `homologatedAmendmentIds: []`, `status: 'Active'`
  (a vigência inicia na ativação).
- **CA2:** valida `signedAt` (`isValidDate`) → `ContractInvalidSignedAt` quando inválido.
- **CA3:** emite evento **`ContractActivated`** (`{ type, contractId, occurredAt }`, `occurredAt = signedAt`).
- **CA4 (garantia estática):** `activate` recebe **somente `PendingContract`** — o compilador rejeita
  `ActiveContract`/`ExpiredContract`/`TerminatedContract` em compile time (espelha `expire`/`terminate`
  que só aceitam `ActiveContract`).
- **CA5:** `ContractEvent` += `ContractActivated`; quaisquer `switch` exaustivos sobre `ContractEvent`
  no domínio/adapters são atualizados (sem `default` com `throw`).

## Fora de escopo

- **Use case `activate-contract`** (application) — orquestra a RN-CV-02 (verificar que existe documento
  assinado antes de chamar `Contract.activate`), persiste e publica o evento. Próximo ticket.
- **Referência de documento no `Contract`** — o agregado `Contract` não referencia documentos; a prova
  de "documento assinado" é responsabilidade do use case (consulta o agregado `Document`). Se decidir-se
  armazenar `signedDocumentRef` no `ActiveContract`, vira ticket próprio (impacta persistência).
- **Propagação cross-módulo** de `ContractActivated` (outbox/`public-api`) — só quando um consumidor
  (ex.: Financeiro) precisar.
- **CLI** expondo `activate`.

## Notas

- Skill: `ts-domain-modeler`. Pipeline W0→W3. Size S (uma transição + um evento; espelha `expire`/`terminate`).
- Coerência: `create` (nasce Active) e `createPending`+`activate` convergem no mesmo `ActiveContract`
  (`current = original`, `signedAt` presente). A diferença é só o momento da assinatura.
