# W0 — RED (FIN-DOC-LIST-FILTERS)

**Skill:** tdd-strategist · **Outcome:** RED

## Testes
### HTTP (memory) — `list-documents.http.test.ts` (bloco #164)
- **CA1** `valorMin/valorMax` — faixa de `netValue` (só o de 500k na faixa 200k–600k).
- **CA2** `contractRef`/`programRef` filtram; `contractRef=not-a-uuid` → 400.
- **CA3** `type` multi-valor (`type=NFS-e&type=Boleto`) → união; valor único preservado.
- **CA4** `sort=netValue&order=desc` ordena desc; `sort=foo` → 400.

### x99 — `document-repository.drizzle-mysql.test.ts` (bloco #164)
- **CA5** — `valorMin/valorMax` + `sort=supplierName` (LEFT JOIN fin_supplier_view) sem duplicar count.

## Prova do RED
`node --test` (#164 HTTP) → **4/4 fail**: filtros/sort são ignorados hoje (schema descarta params) → não filtram e params inválidos retornam 200 em vez de 400. x99 CA5 usa `findPaged({ valorMin, sort, ... })` → typecheck RED (campos ausentes em `DocumentListFilter`).

## Próximo (W1)
`DocumentListFilter` += `valorMin/valorMax/contractRef/programRef/types[]/supplierRefs[]/sort/order`; schema HTTP; handler; drizzle (`gte/lte` netValue, `eq` contract/program, `inArray` multi, `orderBy` dinâmico); in-memory paridade.
