# Binding-map — Distrato (front web-app v2 ↔ core-api)

> Acompanha o ticket **[CTR-HTTP-DISTRATO-DOCUMENTO](./CTR-HTTP-DISTRATO-DOCUMENTO.md)**.
> Objetivo: dar ao **tech lead** o mapa completo para (1) **atualizar o backend** e (2) fazer a
> **religação** do front ao endpoint de distrato. O front fica **pronto e isolado** atrás de uma única
> fronteira (a server function), de modo que a religação seja uma troca cirúrgica num ponto só.
> Verificado contra `core-api@dev` em 2026-06-08.

---

## 1. Decisão de modelagem (importante)
Distrato é uma **transição de ciclo de vida** do contrato (`Em Andamento → Distrato`), **NÃO um aditivo**.
- ✅ Correto: `POST /contracts/:id/end` com `kind: 'Terminate'` (já existe).
- ❌ Hoje no front (provisório): Distrato é um **tipo de aditivo** que cai em `Misc` (vira "Outro" na
  tabela). Isso é um **stand-in** até a religação — ver §5.

## 2. Endpoint atual (verificado)
```
POST /contracts/:id/end
auth: requireAuth + authorize(contract:write)
body: { kind: 'Expire' | 'Terminate' }      // Terminate = distrato
200: contractDetail (agregado serializado; status → Terminated)
```
`endedAt` é definido pelo **clock (now)**. Não há documento, data efetiva nem motivo.

## 3. Contrato desejado (após o ticket) — o que o front vai enviar
O front coleta na modal de distrato: **PDF assinado**, **data efetiva** (obrigatória, não-futura) e **motivo**.
Forma sugerida (espelhando ativação + homologação de aditivo):

```
# (a) upload do documento de distrato (octet-stream + query), espelhando /documents:
POST /contracts/:id/documents?categoria=signed_termination&fileName=...&mimeType=application/pdf&signedElectronically=true
body: <bytes do PDF>
201: documento

# (b) efetivar o distrato com data + motivo:
POST /contracts/:id/end
body: { kind: 'Terminate', terminatedAt: 'YYYY-MM-DD', reason: string }
200: contractDetail (status Terminated, endedAt = terminatedAt)
```
> Alternativa equivalente: endpoint único que recebe documento+data+motivo e efetiva o distrato
> (análogo a `activate`). A decisão de forma é do backend; a **regra** (doc + data efetiva + motivo) não.

Erros novos esperados (envelope padrão `{ error: { code } }`), para o front mapear em i18n:
`terminate-invalid-date`, `terminate-no-signed-document`, `terminate-document-magic-bytes-mismatch`,
`terminate-not-active` (ou reuso de `contract-not-active`).

## 4. Camadas do front (onde a religação acontece)
A fronteira **única** client↔server é a **server function**. A religação é trocar o corpo de **1 método
da BFF**. Estrutura espelha o fluxo de "anexar documento assinado" (já implementado):

| Camada | Arquivo (a criar/ajustar) | Papel |
|---|---|---|
| Server fn (★ fronteira) | `modules/contracts/server/adapters/server-fns/end-contract.service.fn.ts` | inputValidator Zod + auth + validação de borda do PDF (magic bytes %PDF, ≤20MiB, data não-futura) → chama a BFF |
| BFF (core-api client) | `core-api-contracts.ts` → método `endContract(contractId, { kind, terminatedAt, reason, bytes, fileName }, token)` | **PONTO DA RELIGAÇÃO**: hoje chamaria `POST /:id/end {kind}`; após o ticket, faz upload `signed_termination` + `POST /:id/end {kind,terminatedAt,reason}` |
| Schema resposta | `contracts.schema.ts` | valida o `contractDetail` retornado (já existe `CoreApiContractDetailSchema`) |
| Repository (client) | `client/data/repository/contracts.repository.ts` (+ instance) | `endContract(input): Result<Contract, ContractsError>` |
| Mutation/binding | `client/contract-terminate/{mutation,binding}.ts` | `useEndContractBinding` (espelha `useAttachSignedDocumentBinding`: running/errorTag/result/execute/reset, invalida `['contracts']`) |
| UI | modal de distrato + ação na tela de detalhe | coleta PDF + data efetiva + motivo; on success → contrato Distrato |
| Erros | `contracts-error-tag.ts` + união `ContractsError` (3 arquivos em sincronia) | novas variantes → tags `contracts.terminate.error.*` |

### Mapeamento de erro (BFF `SLUG_TO_ERROR`)
```
terminate-invalid-date            → 'invalid-terminate-date'   (ou reuso 'invalid-value')
terminate-no-signed-document      → 'no-signed-document'
terminate-document-*              → 'document-conflict' / 'invalid-pdf'
contract-not-active               → 'server' (já mapeado)
```

## 5. Estado provisório no front (até a religação)
> **Decisão de UX pendente da stakeholder** — ver opções no resumo do PR/handoff.
- **Hoje:** Distrato é um tipo na modal de aditivo → cria aditivo `Misc`. Serve só para validar a UI.
- **Quando o backend estiver pronto:** o tech lead troca o método `endContract` da BFF para o contrato da §3
  e remove o stand-in de aditivo. A UI/binding já estarão prontos atrás da server fn.

## 6. Status (Terminated) — já suportado no front
- `statusApiToDomain`: `'Terminated' → 'Distrato'`.
- Badge `statusBadgeTerminated` (vermelho) já existe.
- Detalhe/grid já sabem renderizar o status Distrato.

## Referências
- Ticket: [CTR-HTTP-DISTRATO-DOCUMENTO](./CTR-HTTP-DISTRATO-DOCUMENTO.md)
- ADR-0023 (ciclo de vida) — core-api `handbook/architecture/adr/0023-...md`
- Espelho de implementação no front: `modules/contracts/client/contract-attach-document/*`
