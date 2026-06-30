# CTR-CLI-ACTIVAR-CONTRATO — comando CLI `activar-contrato`

## Origem

[ADR-0023](../../../handbook/architecture/adr/0023-contract-lifecycle-pending-state.md), frente CLI.
Fecha o fluxo da transição `Pending → Active` (RN-CV-02): o agregado e o use case **já existem**,
falta apenas a borda CLI para a P.O. exercer a ativação. Consome diretamente o
`CTR-CLI-SUBIR-DOCUMENTO-CATEGORIA` (recém-fechado): a ativação exige um documento
`signed_contract` `Active` vinculado ao contrato, que agora a CLI sabe produzir.

## Estado atual (o que já existe — NÃO reimplementar)

- **Domínio:** `Contract.activate(contract, signedAt)` em `domain/contract/contract.ts`; evento
  `ContractActivated` em `domain/contract/events.ts`; estado `PendingContract` em `domain/contract/types.ts`.
- **Application:** use case `activateContract` em `application/use-cases/activate-contract.ts`:
  - `ActivateContractCommand = { contractId: string; signedAt: string }`
  - Deps: `contractRepo: ContractRepository`, `documentRepo: DocumentRepository`
  - Output: `{ contract: ActiveContract; event: ContractEvent }`
  - Erro union `ActivateContractError`: `ContractIdError | 'activate-contract-invalid-signed-at'
    | 'contract-not-found' | 'contract-not-pending' | 'activate-contract-no-signed-document'
    | ContractError | ContractRepositoryError | DocumentRepositoryError`
  - O evento é persistido junto do estado via `contractRepo.save` (publish via EventBus é futuro — fora de escopo).
- **CLI:** `registry.ts` tem `mostrar-contrato`, `subir-documento`, etc. **NÃO há** `activar-contrato`.

## O que este ticket entrega

1. Novo comando `cli/commands/activar-contrato.ts` que parseia flags, monta o `ActivateContractCommand`,
   resolve `contractRepo` + `documentRepo` do `CliContext` (driver memory/mysql) e invoca `activateContract`.
2. Registro do comando em `cli/registry.ts` (+1 entry).
3. Mensagens PT-BR para os erros novos do union em `cli/formatters/` (espelha o padrão de `subir-documento`/`mostrar-contrato`).

## Critérios de aceitação

- **CA1 (happy path):** `activar-contrato --contract-id <uuid de contrato Pending com signed_contract Active>
  --signed-at 2026-05-01` → contrato passa a `Active`; **exit 0**; confirmação PT mostrando id + status `Em Andamento` + data de assinatura.
- **CA2:** `--contract-id` ausente → **exit 64**, mensagem PT pedindo a flag.
- **CA3:** `--contract-id` mal formado (não-UUID) → **exit 64** (`ContractIdError`), mensagem PT.
- **CA4:** `--signed-at` ausente ou data inválida → **exit 64** (`activate-contract-invalid-signed-at`), mensagem PT.
- **CA5:** contrato inexistente → `contract-not-found` traduzido em PT, exit de erro de negócio (alinhar com `cli/formatters/error.ts`).
- **CA6:** contrato não está `Pending` (já `Active`/`Expired`/`Terminated`) → `contract-not-pending` em PT.
- **CA7:** contrato `Pending` **sem** documento `signed_contract` `Active` → `activate-contract-no-signed-document`
  em PT, **orientando** subir o documento via `subir-documento --categoria signed_contract` primeiro.
- **CA8:** `--contract-id` e `--signed-at` entram em `ALLOWED` (flags conhecidas; `allowedFlags` exportado).
- **CA9 (regressão):** comandos existentes seguem verdes; `pnpm test` sem regressão.

## Fora de escopo

- Publicação do `ContractActivated` via EventBus (o use case só persiste; publish é série futura).
- Alterar domínio ou o use case `activateContract` (já prontos — só consumir).
- Coerência categoria↔parentTipo do documento (decisão de `CTR-CLI-SUBIR-DOCUMENTO-CATEGORIA`).
- Schema/migration de persistência (séries de domínio/DB do ADR-0023, fora desta frente CLI).

## Notas

- **Skill:** `application-cli-builder`. Pipeline W0→W3. E2E em `tests/cli/`.
- Espelhar o estilo de `cli/commands/subir-documento.ts` (mutação via use case, exit 64 na borda,
  erro de negócio traduzido) e `mostrar-contrato.ts` (acesso a `contractRepo` via `CliContext`).
- Exit codes: borda/validação de formato = 64 (EX_USAGE); erro de negócio = alinhar com o
  mapeamento existente em `cli/formatters/error.ts` (não inventar código novo).
- Idioma: código EN; strings ao humano PT via `cli/formatters/`.
