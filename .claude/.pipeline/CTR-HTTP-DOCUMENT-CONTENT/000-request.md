# Request — CTR-HTTP-DOCUMENT-CONTENT

> Handoff do **front (web-app v2)** para o **core-api**. Origem: tela de detalhe do contrato —
> preview/baixa do documento anexado. Verificado contra `core-api@dev` em 2026-06-08.
> Testes de feature pendente: `specs/007-integration-test-suite/safety-net/{bdd,tdd}/pending-backend/document-content.*`.

## Título
Expor o conteúdo do documento anexado (preview + download)

## Size
M

## Contexto
Na tabela de Documentos do contrato, cada linha (contrato base e aditivos) tem o documento assinado anexado.
O front precisa **pré-visualizar** o PDF em modal (sem sair da página, sem baixar) e **baixar** o arquivo.
Hoje não há como obter os bytes do documento.

## Estado atual (verificado)
Rotas de documento existentes (`src/modules/contracts/adapters/http/plugin.ts`):
- `POST /contracts/:id/documents` (upload, octet-stream)
- `POST /contracts/:id/amendments/:amendmentId/documents` (upload do doc do aditivo)
- `POST /contracts/:id/documents/:documentId/supersede`
- `DELETE /contracts/:id/documents/:documentId`

**Não existe** rota que **devolva o conteúdo** (bytes) nem **URL**. `getDocument` retorna só metadados
(parentType/parentId/storageKey/hash…). Storage MinIO (bucket/storageKey), sem proxy de stream nem URL
pré-assinada exposta. O mapper do front marca `url: ''` ("rota futura").

### Sintoma em tela (2026-06-08)
A **seta de download fica desabilitada inclusive em aditivos `Homologado`** — que comprovadamente têm o
documento assinado (Homologado só é atingido após upload + homologação). O documento existe no storage, mas
o front não tem como obtê-lo porque **nenhum** documento expõe URL/conteúdo. Além disso, `GET /contracts/:id`
traz `documents` só no nível do contrato e **não associa documento ↔ aditivo**.

## Gap (o que falta)
Uma forma de o browser obter o PDF **via BFF**:
- (a) `GET /contracts/:id/documents/:documentId/content` → stream (`application/pdf`, `Content-Disposition`),
  auth `contract:read`, ownership documento ↔ contrato; **ou**
- (b) `GET /contracts/:id/documents/:documentId/url` → **URL pré-assinada** de leitura (curta duração) do MinIO.

## Escopo (proposta)
- Implementar (a) **ou** (b), com verificação de **ownership** (o documento deve pertencer ao contrato `:id`,
  direto ou via aditivo daquele contrato — mesma checagem do DELETE).
- Suportar documento de **contrato** e de **aditivo**.
- (Opcional) Associar documento ↔ aditivo no detalhe (`GET /contracts/:id`).

## Fora de Escopo
- Edição/versionamento de documento (já há supersede/delete).

## Critérios de Aceitação
1. Dado um documento existente, o front **renderiza a prévia** (PDF inline) sem baixar.
2. O front consegue **baixar** o arquivo com o nome original.
3. Acesso **negado** a documento de outro contrato (ownership) e sem `contract:read`.

## Referências
- Código: `src/modules/contracts/adapters/http/plugin.ts` (rotas de documento), storage MinIO (ADR-0019).
