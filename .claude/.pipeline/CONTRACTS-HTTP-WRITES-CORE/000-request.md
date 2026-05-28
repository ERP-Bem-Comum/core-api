# CONTRACTS-HTTP-WRITES-CORE (C2) — mutações core de contrato

## Origem

[`EPIC-CONTRACTS-HTTP`](../../.planning/EPIC-CONTRACTS-HTTP.md) §10 C2.
Terceira fatia da borda HTTP de contratos: expõe as **mutações core** (criar, ativar, aditivar,
homologar), no **writer pool** (ADR-0026), protegidas por `requireAuth` + `authorize('contract:write')`.
Paralela ao C1 (reads); depende só do C0 (composition + dual-pool).

## O que este ticket entrega

### Rotas (plugin `src/modules/contracts/adapters/http/plugin.ts` + `schemas.ts`)

Todas sob `/api/v2/contracts`, `[requireAuth, authorize('contract:write')]`, escrita no **writer**:

1. `POST /contracts` — cria contrato. Body discrimina `Pending` (cadastro) vs `Active` (cadastro +
   assinatura). Use cases: `createPendingContract` / `createContract`. → **201** com o contrato criado.
2. `POST /contracts/:id/activate` — ativa um contrato `Pending`. Use case: `activateContract`. → **200**.
3. `POST /contracts/:id/amendments` — cria um aditivo (`Addition`|`Suppression`|`TermChange`|`Misc`),
   status inicial `Pending`. Use case: `createAmendment`. → **201** com o aditivo.
4. `POST /contracts/:id/amendments/:amendmentId/homologate` — homologa um aditivo (exige
   `signedDocumentRef`, RN-12) e aplica o ajuste ao contrato (RN-06/07). Use case:
   `homologateAmendment`. → **200** com o contrato atualizado.

### Composition (`src/modules/contracts/adapters/http/composition.ts`)

- **Expor os repos do writer.** Hoje o C0 abre o writer pool em `buildMysqlPools` mas **só expõe o
  reader** (`contractReaderRepo`). O C2 deve estender `Pools`/`ContractsHttpDeps` para:
  - `contractWriterRepo` (writer);
  - `amendmentRepo` (writer) — novo;
  - `documentRepo` (writer) — novo (dependência de `activateContract`).
- **Read-after-write no writer:** a resposta das mutações lê do **writer** (consistência), não do reader
  (réplica pode estar atrasada). Os use cases já devolvem o agregado pós-save; basta serializar a saída.
- Instanciar `createPendingContract`, `createContract`, `activateContract`, `createAmendment`,
  `homologateAmendment` (todos com `Clock` + repos do writer).
- `seed` de contratos (C1) continua válido para preparar fixtures de teste das mutações.

## Critérios de aceitação (a detalhar em 001-spec/SPEC.md)

- **CA1 (Authn/Authz):** toda rota — sem token → **401**; token sem `contract:write` → **403**.
- **CA2 (POST /contracts):** body válido `Active` → **201** + contrato `Active`; body válido `Pending`
  → **201** + contrato `Pending`; body inválido (Zod) → **400**; violação de invariante de domínio
  (ex.: período/valor inválido) → **422** (ou código mapeado do `Result`).
- **CA3 (activate):** `Pending` + doc assinado presente → **200** `Active`; contrato inexistente → **404**;
  estado não-`Pending` ou sem doc → erro mapeado (409/422).
- **CA4 (amendments):** contrato existente → **201** aditivo `Pending`; contrato inexistente → **404**;
  body inválido → **400**.
- **CA5 (homologate):** aditivo `Pending` com `signedDocumentRef` → **200** contrato com valor/período
  recalculados (RN-06/07); sem doc assinado → erro mapeado (RN-12); aditivo/contrato inexistente → **404**.
- **CA6 (read-after-write):** a resposta de cada mutação reflete o estado **do writer** imediatamente.
- **CA7 (Zod & OpenAPI):** bodies/params validados; `/docs/json` contém as 4 rotas novas.
- **CA8 (regressão):** reads do C0/C1 (`GET /contracts`, `/{id}`, `/{id}/history`) intactos.

## Pontos de atenção / dependências

- **`activateContract` depende de `documentRepo`** (verifica doc assinado anexado). Anexar documento é o
  **C3**. Tensão a resolver no W0: ou o teste de activate-sucesso usa um `documentRepo` InMemory seedado
  com o doc, ou o caso 200 de activate fica diferido para depois do C3 (testar só os caminhos de erro
  aqui). Decisão a registrar na SPEC.
- **Mapeamento de erros de domínio → HTTP:** os `Result` errors dos use cases são unions amplos (string
  literals + tagged records). Reusar o helper `toErrorCode` do plugin; definir o mapa code→status por rota
  (404 not-found, 409 estado-inválido, 422 invariante, 400 Zod). Sem `500` para erro de negócio.
- **`authorize('contract:write')`** é permissão nova — o seed RBAC (C1) precisa suportá-la nos testes.
- **Sem outbox/eventBus no caminho HTTP:** os use cases de escrita não recebem `EventBus` (deps só têm
  repos + clock); os eventos de domínio são persistidos via `repo.save(aggregate, events)`. Confirmar.

## Fora de escopo

- Upload/gestão de documentos (`POST /{id}/documents`, supersede) → **C3**.
- Export CSV → **C4**.
- Smoke E2E no docker → **C5**.
- Encerramento de contrato (`end-contract`) — não listado no C2 da spec-mãe; avaliar ticket próprio.
