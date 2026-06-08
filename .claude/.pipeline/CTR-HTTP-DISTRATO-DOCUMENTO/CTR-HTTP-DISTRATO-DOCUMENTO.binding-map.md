# Binding-map — Distrato (front web-app v2 ↔ core-api)

> Acompanha o ticket **CTR-HTTP-DISTRATO-DOCUMENTO**. Mapa para o tech lead (1) atualizar o backend e
> (2) religar o front ao endpoint de distrato. A religação é uma troca cirúrgica num ponto só (a server
> function/BFF). Verificado contra `core-api@dev` em 2026-06-08.

## 1. Decisão de modelagem
Distrato é **transição de ciclo de vida** (`Em Andamento → Distrato`), NÃO um aditivo.
- ✅ `POST /contracts/:id/end` com `kind: 'Terminate'` (já existe).
- ❌ Hoje no front (provisório): Distrato é um "tipo de aditivo" que cai em `Misc` → gambiarra com `DISTRATO_MARKER`.

## 2. Endpoint atual (verificado)
```
POST /contracts/:id/end   auth: requireAuth + authorize(contract:write)
body: { kind: 'Expire' | 'Terminate' }   // Terminate = distrato
200: contractDetail (status → Terminated)
```
`endedAt` = clock (now). Sem documento, data efetiva ou motivo.

## 3. Contrato desejado (após o ticket)
```
# (a) upload do documento de distrato (octet-stream + query), espelhando /documents:
POST /contracts/:id/documents?categoria=signed_termination&fileName=...&mimeType=application/pdf&signedElectronically=true
body: <bytes do PDF>   →   201: documento
# (b) efetivar com data + motivo:
POST /contracts/:id/end   body: { kind:'Terminate', terminatedAt:'YYYY-MM-DD', reason: string }
200: contractDetail (status Terminated, endedAt = terminatedAt)
```
Alternativa: endpoint único (documento+data+motivo → efetiva), análogo a `activate`. A forma é decisão do
backend; a **regra** (doc + data efetiva não-futura + motivo) não.

Erros novos (envelope `{ error: { code } }`): `terminate-invalid-date`, `terminate-no-signed-document`,
`terminate-document-magic-bytes-mismatch`, `terminate-not-active` (ou reuso `contract-not-active`).

## 4. Camadas do front (religação = trocar 1 método da BFF)
| Camada | Arquivo | Papel |
|---|---|---|
| Server fn (★ fronteira) | `server/adapters/server-fns/end-contract.service.fn.ts` | Zod + auth + validação do PDF (magic bytes %PDF, ≤20MiB, data não-futura) → BFF |
| BFF (★ ponto de religação) | `core-api-contracts.ts` → `endContract(contractId, { kind, terminatedAt, reason, bytes, fileName }, token)` | hoje `POST /:id/end {kind}`; após o ticket: upload `signed_termination` + `POST /:id/end {kind,terminatedAt,reason}` |
| Repository/Mutation/UI/Erros | `client/contract-terminate/*`, `contracts-error-tag.ts` | binding `useEndContractBinding`; modal coleta PDF+data+motivo; tags `contracts.terminate.error.*` |

## 5. Estado provisório no front (gambiarra — remover na religação)
Distrato hoje vira aditivo `Misc` com `DISTRATO_MARKER` na descrição; ao homologar (doc+assinatura não-futura)
o front encadeia `POST /:id/end` (Terminate). `endedAt = now` (ignora data efetiva); marcador frágil sem `kind`.

## 6. Status (Terminated) — já suportado no front
`statusApiToDomain: 'Terminated' → 'Distrato'`; badge vermelho; detalhe/grid já renderizam.

## Referências
ADR-0023 (ciclo de vida). Espelho de implementação: `modules/contracts/client/contract-attach-document/*`.
