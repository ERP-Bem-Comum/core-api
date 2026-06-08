# TDD — Feature pendente: conteúdo do documento (CTR-HTTP-DOCUMENT-CONTENT)

> **Tipo:** feature pendente de backend. **DEVE REPROVAR** até existir rota de conteúdo/URL.
> Fail-first: o vermelho dirige a implementação (W0 RED do ticket CTR-HTTP-DOCUMENT-CONTENT).
> **Estado atual:** upload/supersede/delete existem; nenhuma rota devolve bytes/URL; `getDocument` só metadados.
> **Forma esperada (a definir):** (a) `GET /contracts/:id/documents/:documentId/content` (stream PDF) **ou**
> (b) `GET .../url` (URL pré-assinada). Asserções abaixo assumem (a); ajustar para (b) se for a escolha.
> **Seed/tokens:** `contractsOperatorToken` (contract:read+write), `readerToken` (contract:read),
> `bareUserToken` (sem permissões). Documento-alvo criado no setup (upload num contrato).

## DOC-1 — preview (conteúdo inline) → 200 application/pdf

- Pré: contrato com documento anexado (`documentId` capturado do upload).
- `GET /contracts/:id/documents/:documentId/content` (Bearer contractsOperatorToken).
- Asserções: `status 200`; header `content-type` contém `application/pdf`.
- **Hoje: REPROVA** — rota inexistente (404).

## DOC-2 — download com nome original

- Mesmo GET.
- Asserções: `status 200`; header `content-disposition` presente, contendo o nome original do arquivo.
- **Hoje: REPROVA** — rota inexistente.

## DOC-3 — documento de aditivo acessível

- Pré: aditivo homologado com documento assinado.
- `GET` do conteúdo do documento do aditivo.
- Asserções: `status 200` com PDF.
- **Hoje: REPROVA**.

## DOC-4 — ownership: documento de outro contrato → 404/403

- `GET /contracts/:idAlheio/documents/:documentId/content` onde `documentId` pertence a outro contrato.
- Asserções: `status 404` ou `403` (sem vazar bytes).
- **Hoje: REPROVA** (rota inexistente) — após o fix, deve negar por ownership (mesma checagem do DELETE).

## DOC-5 — exige contract:read → 403

- `bareUserToken` (sem contract:read) faz o GET.
- Asserções: `status 403`.
- **Hoje: REPROVA** (rota inexistente).

## DOC-6 — sem sessão → 401

- GET sem `Authorization`.
- Asserções: `status 401`.
- **Hoje: REPROVA** (rota inexistente).

## Critério de fechamento

Após CTR-HTTP-DOCUMENT-CONTENT: DOC-1..3 retornam o PDF (contrato e aditivo); DOC-4 nega por ownership;
DOC-5/DOC-6 fail-closed. Gate W3 + e2e Bruno verdes.
