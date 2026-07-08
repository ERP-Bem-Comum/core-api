# W2 — Code Review (audit read-only, revisor independente)

## VEREDITO: APPROVED (round 1)

Réplica fiel do baseline #357 (`payables:batch`). A única adição documento-específica — a derivação
`recon`/`displayStatus` — é idêntica ao precedente canônico `document-repository.drizzle.ts §findPaged`.
Sem Blocker, sem Major.

## Verificações que passaram

- **application.md**: port é `type Readonly<{ fn }>`, sem infra, só importa `Result`.
- **adapters.md**: `try/catch → err(...)` na borda; mapper retorna `Result`; nunca vaza `Error`.
- **ADR-0014**: só `fin_documents`/`fin_payables`/`fin_supplier_view` (mesmo módulo).
- **ADR-0020**: apenas `LEFT JOIN`, `inArray` (IN), `GROUP BY`+agregação, `CASE` (permitidos).
- **ADR-0049**: 9 campos enxutos, sem `bankAccount`/`pixKey`.
- **ADR-0022**: `displayStatus` derivado, sem escrita em `fin_documents`.
- **Recon não multiplica linhas**: subquery agrupada por `documentId` → LEFT JOIN 1:0..1; `fin_supplier_view.supplierRef` é PK → 1:0..1.
- **Nullable** (`netValueCents`/`dueDate`/`type`): coerente entre schema Zod, port, mapper e DTO; guard `dueDate !== null && !(instanceof Date)`.
- **Custom method**: `:action(^:batch$)` não vaza p/ `/documentsXYZ` (CA7) nem colide com `/documents/:id` (CA6 prova coexistência com o create 201).
- **Idioma/sintaxe**: código EN, docstring PT, imports `.ts`, `import type`, subpath `#src/*`.
- **Gate de integração**: `MYSQL_INTEGRATION` + registrado em `scripts/ci/test-integration.ts`.

## Minors — ambos ENDEREÇADOS neste round

1. **[corrigido]** Catálogo de rotas no header do `plugin.ts` não listava a nova rota → adicionada a linha
   `POST /financial/documents:batch … getDocumentsSummaryByIds (#358)`.
2. **[corrigido]** Ramo `Reconciled` da derivação não era exercido por teste deste ticket (só via `findPaged`)
   → adicionado **CI5** no teste de integração: promove documento a `Paid` + título a `Reconciled` via SQL
   direto e assere `status === 'Reconciled'`, exercitando a subquery `recon` DESTE adapter.
3. (Informativo) Divergência memory↔drizzle em `netValueCents`/`status` para Draft é o padrão pré-existente
   do grid (`findPaged` vs `toListItem`), documentada e intencional — não é defeito.

## Pós-correção

`typecheck` verde · `pnpm test` (http) 8/8 · integração pula limpo sem MySQL · format + lint limpos.
