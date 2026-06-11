# Quickstart — contagem de contratos/aditivos por parceiro

## O que muda (front)

Os grids de Colaborador, Fornecedor e ACT passam a receber, em cada item, `contractsCount` e
`amendmentsCount` (a coluna "Contratos/Aditivos" deixa de ser `—`). O Colaborador ganha `programId` e o grid
aceita filtro `programIds`; o Fornecedor ganha o filtro `contractStatus`.

## Como validar (aceitação)

1. **Contagem (R1)**: parceiro referenciado por N contratos (M aditivos) → o item de lista mostra
   `contractsCount=N`, `amendmentsCount=M`; parceiro sem contrato → `0/0` (não `—`).
2. **Batch (SC-002)**: listar uma página de K parceiros dispara **1** contagem (não K).
3. **Filtro Fornecedor (R2)**: `GET /api/v1/suppliers?contractStatus=Active` → só fornecedores com contrato
   Active.
4. **Vínculo Programa (R3)**: cadastrar colaborador com `programId`; `GET /api/v1/collaborators?programIds=<id>`
   → só os vinculados.

## Testes

```bash
# Eixo A (count port + consumo)
node --test --experimental-strip-types --no-warnings \
  tests/modules/contracts/public-api/contract-count-read.in-memory.test.ts \
  tests/modules/partners/adapters/http/collaborators-list.routes.test.ts

# Eixo B (vínculo programa)
node --test --experimental-strip-types --no-warnings \
  tests/modules/partners/domain/collaborator/collaborator.test.ts \
  tests/modules/partners/application/use-cases/list-collaborators.test.ts

# migration do par_collaborators.program_id
pnpm run db:generate:partners   # editar charset/collate no SQL gerado

# Gate W3 + integração (read port no MySQL real)
pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test
pnpm run test:integration
```
