# CTR-USECASE-ACTIVATE-CONTRACT — use case de ativação (`Pending → Active`)

## Origem

4º ticket da série [ADR-0023](../../../handbook/architecture/adr/0023-contract-lifecycle-pending-state.md).
O domínio já tem `Contract.activate` (`PendingContract + signedAt → ActiveContract` + evento
`ContractActivated`). Falta o **use case (application)** que orquestra a **RN-CV-02**: só ativa um
contrato `Pending` quando há documento assinado.

## Estado atual

- `Contract.activate(pending, signedAt)` — transição de domínio pronta.
- `ContractRepository` — `findById`, `save(contract, events)`.
- `DocumentRepository` — `findById`, `findByParent(parentId, parentType)`, `save`.
- `DocumentCategory` inclui `'signed_contract'`; `ContractDocument` tem `parentType`/`parentId`/
  `categoria`/`status` (`Active`/`LogicallyDeleted`/`Superseded`).
- Padrão de use case (ver `homologate-amendment.ts`): factory `(deps) => (cmd) => Promise<Result>`;
  sequência validar → fetch → domain → persist (+evento no `save`).

## Critérios de aceitação

- **CA1 (happy path):** dado `contractId` de um contrato `Pending` **com** documento `signed_contract`
  `Active` vinculado, `activateContract({ contractId, signedAt })` chama `Contract.activate`,
  persiste via `contractRepo.save(active, [event])` e retorna `ActiveContract`.
- **CA2 (estado):** contrato inexistente → `'contract-not-found'`; contrato **não-`Pending`**
  (Active/Expired/Terminated) → `'contract-not-pending'`. Narrowing inline (`status !== 'Pending'`)
  — a union discriminada refina sem `parsePending` novo.
- **CA3 (RN-CV-02):** sem documento `signed_contract` `Active` vinculado ao contrato →
  `'activate-contract-no-signed-document'`. A verificação usa `documentRepo.findByParent(contractId, 'Contract')`.
- **CA4:** `signedAt` inválido (parse) → erro de parse; `signedAt` inválido no domínio →
  `ContractInvalidSignedAt` (propagado de `Contract.activate`).
- **CA5 (sequência):** evento `ContractActivated` só é publicado **após** o `save` ter sucesso
  (vai como 2º argumento de `contractRepo.save`, padrão CTR-OUTBOX-INTEGRATION-IN-REPOS).

## Contrato (esboço — refina no W0/W1)

```
type ActivateContractCommand = Readonly<{ contractId: string; signedAt: string }>;
type ActivateContractError =
  | ContractIdError | 'create-contract-invalid-signed-at' | 'contract-not-found'
  | 'contract-not-pending' | 'activate-contract-no-signed-document'
  | ContractError /* ContractInvalidSignedAt */
  | ContractRepositoryError | DocumentRepositoryError;
type Deps = Readonly<{ contractRepo: ContractRepository; documentRepo: DocumentRepository; clock: Clock }>;
```

## Fora de escopo

- **CLI** expondo `activate` (próximo ticket).
- Criar o documento `signed_contract` (já coberto por `upload-document`/`attach`); aqui só **verifica**.
- HTTP/ACL.

## Notas

- Skill: `ports-and-adapters`. Pipeline W0→W3. Application puro (sem infra; só ports).
- Exportar no `public-api`? O use case é interno ao módulo; exposição via CLI/HTTP é ticket próprio.
