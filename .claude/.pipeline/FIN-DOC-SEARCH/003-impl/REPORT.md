# W1 — GREEN (FIN-DOC-SEARCH)

**Agente/skill:** drizzle-orm-expert (read-model) + implementação inline. **Outcome:** GREEN

## Correção de rota no meio do W1 (registrada)
Explorei primeiro o `payable-list-view` (GET /payable-titles), mas o #167 é sobre **GET /documents** →
`deps.listDocuments` = `DocumentRepository.findPaged` (`DocumentListFilter`). Revertido o read-model errado
(`payable-list-view` + PayableListFilter + handler payable-titles + teste mysql) via `git checkout`; aplicado no
read-model correto. Vantagem: o `document-repository` **já fazia LEFT JOIN fin_supplier_view** nas rows
(supplierName/supplierDocument, #47/US2) — só faltou o join no COUNT.

## Mudanças (read-model correto)
- **Domínio** `domain/document/query.ts` — `DocumentListFilter += q?: string`.
- **Borda** `adapters/http/schemas.ts` — `listDocumentsQuerySchema += q: z.string().trim().min(1).max(100).optional()`.
- **Handler** `adapters/http/plugin.ts` (GET /documents) — repassa `q.q` (já trimado) ao filtro.
- **Drizzle** `document-repository.drizzle.ts` — `findPaged`: condição `q` = `OR(documentNumber LIKE, name LIKE, document LIKE)` com wildcards escapados (`likeContains`); **LEFT JOIN fin_supplier_view adicionado ao COUNT** (rows já tinham). Sem migration.
- **In-memory** `document-repository.in-memory.ts` — `matchesFilter` trata `q` por `documentNumber` (contains, CI); nome/CNPJ (enriquecidos só na página) ficam para o adapter Drizzle/x99.

## Testes
- **HTTP (memory)** `list-documents.http.test.ts` — CA1/CA2/CA3 **GREEN** (documentNumber contains, AND com status, trim/400/escape de wildcard).
- **x99** `document-repository.drizzle-mysql.test.ts` — CA4 (nome/CNPJ/documentNumber + LEFT JOIN sem duplicar count) atrás de `MYSQL_INTEGRATION=1`.
- `pnpm run typecheck` limpo; listagem + documents http **26/26** sem regressão.

## Próximo (W2)
Revisão adversarial: `drizzle-orm-expert` (LIKE/escape/JOIN/count) + `code-reviewer` + `security-backend-expert` (injeção/escape do termo, exposição).
