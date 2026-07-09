# FIN-DOC-SEARCH — busca textual (`q`) na listagem de Contas a Pagar

> Feature #167. Size **S**. Módulo: `financial` (fin_*). Sprint Backlog · go-live · gap-contrato.

## Contexto

`GET /api/v2/financial/documents` (read-model payable-centric `payable-list-view`, #201/#221) só aceita
`status`, `type`, `supplierRef`, `dueFrom/dueTo`, `issuedFrom/issuedTo`, `page`, `pageSize`. O grid tem o
campo "Buscar por fornecedor, número, CNPJ…", hoje resolvido **client-side só na página carregada** (não
cruza páginas). A P.O. quer busca **server-side**, em todas as páginas, combinável com os demais filtros.

## Escopo (o que muda)

> **Correção W1:** o endpoint `GET /financial/documents` está ligado a `DocumentRepository.findPaged` /
> `DocumentListFilter` (`composition.ts:206,626`), NÃO ao `payable-list-view` (esse serve `GET /payable-titles`).
> Os alvos corretos são os arquivos do `document-repository` abaixo.

1. **Domínio** `domain/document/query.ts` — `DocumentListFilter` ganha `q?: string` (termo de busca).
2. **Borda HTTP** `adapters/http/schemas.ts` — `listDocumentsQuerySchema` ganha `q` (trim, 1..100, sem control chars).
3. **Handler** `adapters/http/plugin.ts` (GET /documents) — repassa `q` ao `DocumentListFilter`.
4. **Adapter Drizzle** `document-repository.drizzle.ts` — `findPaged`: `LEFT JOIN fin_supplier_view` (já existia nas
   rows; **adicionado ao COUNT**); quando `q` presente, `WHERE (documentNumber LIKE ? OR fin_supplier_view.name LIKE ?
   OR fin_supplier_view.document LIKE ?)`. `LIKE` **contains** case-insensitive (collation utf8mb4 CI), **wildcards
   `%`/`_`/`\` escapados**.
5. **Adapter in-memory** `document-repository.in-memory.ts` — `matchesFilter` trata `q` por `documentNumber`
   (contains, CI). `supplierName`/`supplierDocument` só são resolvidos na página (após o filtro), então o match por
   fornecedor/CNPJ **não** é exercível em memória — é servido pelo Drizzle (validado no x99).

## Decisões de design

- **`LIKE '%q%'` (contains), não `FULLTEXT`** — os campos são curtos (nome/nº/CNPJ), a busca é "contém", e evita
  migration + quirks de min-word-length. ADR-0020 permite `LIKE`. **Sem migration.**
- **Escape de wildcards** — `%` e `_` no termo são escapados (`q="50%"` não vira match-tudo).
- **Fatiamento de teste** (segue o padrão documentado em `payable-summary-by-ids-view.in-memory.ts`): busca por
  `documentNumber` valida em unit/HTTP (memory); busca por **nome do fornecedor + CNPJ** valida em **x99** (MySQL
  real com `fin_supplier_view` semeado). Sem esconder: a limitação do driver memory é registrada aqui.

## Critérios de aceite

- **CA1** (in-memory/HTTP) — Dado documentos com `documentNumber` distintos, Quando `GET /documents?q=<nº>`, Então
  retorna só os títulos cujo `documentNumber` contém o termo (case-insensitive), **server-side em todas as páginas**.
- **CA2** (HTTP) — Dado `q` combinado com `status`/`type`, Quando lista, Então aplica os filtros em conjunto (AND entre
  filtros; OR entre os campos do `q`). `q` ausente → comportamento atual inalterado.
- **CA3** (HTTP) — Dado `q` com espaços nas bordas, Quando lista, Então usa o termo trimado; `q` vazio/só espaços →
  400 (min 1 após trim). Wildcards no termo (`%`/`_`) são literais (escapados), não coringas.
- **CA4** (x99, MySQL real) — Dado `fin_supplier_view` semeado, Quando `q` casa por **nome do fornecedor** OU **CNPJ/CPF**
  OU **documentNumber**, Então o título aparece; o LEFT JOIN não duplica linhas nem quebra a paginação/count.

## Definition of Done

W0 RED → W1 GREEN → W2 APPROVED → W3 (typecheck + format:check + lint + test). CA4 validado no x99. Sem migration.
Fecha #167.
