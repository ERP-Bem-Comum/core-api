# W2 — code review (self, read-only) — FIN-PAYABLE-COUNTS (#536)

**Veredito: APPROVED.**

- **Port** `PayableListView` + `countByStatus` — read-only, `Result<PayableStatusCounts, E>`. `byStatus`
  é `Partial<Record<DocumentStatus, number>>` (só status presentes; ausente = 0 no front).
- **Drizzle**: `SELECT status, count(*) … INNER JOIN … GROUP BY status`, reusa os mesmos `wheres` do
  `findPaged` (consistência de filtro). `count(*)` como `sql<number>` sem `Number()` — idêntico ao
  `findPaged` já em produção (ADR-0020: agregação simples + GROUP BY permitidos). try/catch → Result.
- **In-memory**: reusa `derivePayableListItems` + `matchesFilter` (mesma derivação do `findPaged`), agrupa.
  Paridade de semântica de filtro com o Drizzle.
- **Handler**: 1 request do front. `countByStatus` (títulos) + reusa `listDocuments({status:'Draft'},1,1).total`
  para o `draft` (rascunho não tem título) — sem novo port de documento. Filtros propagados aos dois lados.
- **Rota** estática `/payable-titles/counts` declarada **antes** de `/payable-titles` — sem sombreamento no
  find-my-way. Gate `fiscal-document:read` (401/403 cobertos por CA4).
- Query schema sem `status`/paginação (o breakdown exige todos os status). Response `.strict()`.

Sem Blocker/Major/Minor. 1 round.
