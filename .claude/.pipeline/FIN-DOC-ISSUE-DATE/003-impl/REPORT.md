# W1 — Implementação (GREEN) · FIN-DOC-ISSUE-DATE (#163)

**Data**: 2026-06-19 · estratégia: adicionar `issueDate` aos tipos → typecheck como checklist dos call-sites.

| Camada | Arquivos | Conteúdo |
| --- | --- | --- |
| Domínio | `domain/document/{types,document,query}.ts` | `issueDate: Date \| null` em `DocumentCore` + `DraftDocument`; `CreateDocumentInput`/`SaveDraftInput` aceitam; `create`/`saveDraft` capturam; `undoApproval` preserva (adjust/editMetadata via spread). Filtro `issuedFrom`/`issuedTo` + `issueDate` no `DocumentListItem`. |
| Persistência | `schemas/mysql.ts` (+`issue_date` date nullable + índice), `migrations/.../0011_smooth_zodiak.sql` (ALTER ADD não-quebrante), `mappers/document.mapper.ts` (row↔domínio), `repos/document-repository.{drizzle,in-memory}.ts` (SELECT/build + filtro `issuedFrom`/`issuedTo`). |
| Application | `use-cases/{save-document,save-draft}.ts` | input + repasse de `issueDate` ao domínio. |
| Borda HTTP | `adapters/http/{schemas,dto,plugin}.ts` | create body aceita `issueDate`; query `issuedFrom`/`issuedTo`; responses (detail + summary) expõem `issueDate`; `queryToFilter` + body→domínio. |

GREEN: domínio 5/5, suite in-memory 12/12 (inclui janela de emissão), suíte 3010 pass / 0 fail. Migration ALTER nullable (sem quebrar dados). Integração drizzle roda via `test:integration:financial` (gated). Fixture de DTO ajustado (`issueDate: null`).
