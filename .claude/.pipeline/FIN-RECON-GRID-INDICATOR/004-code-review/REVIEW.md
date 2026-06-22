# W2 — Code Review (read-only) · FIN-RECON-GRID-INDICATOR (#204)

**Wave**: W2 · **Round**: 1 · **Veredito**: **APPROVED** · **Data**: 2026-06-22

## Escopo revisado

```
src/modules/financial/adapters/http/schemas.ts                          (+1/-1) filtro status
src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts (+48/-9) derivação findPaged
tests/modules/financial/adapters/persistence/document-repository.drizzle-mysql.test.ts (~) integração #204
(pivot) removidos: port + adapter in-memory + unit test do reader
```

## Checklist

| Critério | Veredito | Nota |
|---|---|---|
| ADR-0022 (read-model derivado, sem escrita cross-agregado) | ✅ | `findPaged` só SELECT/deriva; **nenhuma escrita em `fin_documents`**. Estado de conciliação tem fonte única em `fin_payables`; reconstruível. |
| ADR-0020 (features SQL permitidas) | ✅ | Subquery agrupada + `COUNT`/`SUM` + `LEFT JOIN` + `CASE` — todos na lista permitida. Sem UPSERT/JSON/proc. |
| FR-004 (Conciliado = todos os títulos) | ✅ | `status='Paid' AND total>0 AND total=reconciled`; parcial → Paid. Provado na integração. |
| Borda repassa o filtro | ✅ | `plugin.ts:436` `{ ...(q.status ? {status: q.status} : {}) }` → `listDocuments`. Schema valida Paid/Reconciled (`schemas.ts:159`). |
| Pivot YAGNI limpo | ✅ | `grep` por `document-reconciliation-reader`/`DocumentReconciliationReader` = **vazio**. Sem dead code. |
| Paridade in-memory | ✅ (coerente) | In-memory `findPaged` inalterado: o agregado não modela Paid → não há cenário Paid in-memory; filtros Paid/Reconciled retornam vazio (correto). Não é dead-path nocivo. |
| Verificação | ✅ | `test:integration:financial` 40/40 (cenário full/partial/paid + filtros); gate padrão verde (3109/0). |

## Achados

### Blocker: nenhum · Major: nenhum

### Minor (2) — observações, sem ação obrigatória

- **M1 — custo da subquery em toda listagem**: o `LEFT JOIN (SELECT document_id, COUNT(*), SUM(...) FROM fin_payables GROUP BY document_id)` materializa um GROUP BY sobre `fin_payables` em **todas** as chamadas de `findPaged` (mesmo sem filtro de conciliação). Para a escala do grid (paginado, `document_id` indexado por FK) é aceitável; em volume alto, considerar otimização (subquery correlacionada limitada aos ids da página, índice cobrindo `(document_id, status)`, ou EXPLAIN dedicado). **Registrar como follow-up de perf se o grid crescer.**
- **M2 — divergência domínio×persistência (pré-existente, exposta aqui)**: o agregado `Document` não modela `Paid`/`Reconciled` (só persistência). Fora do escopo do #204 (reflexo de leitura), mas vale uma issue para decidir se modela as transições no domínio. Registrado em memória do projeto.

## Avaliação do pivot (port removido)

Correto. O port `DocumentReconciliationReader` era abstração especulativa: como documento Paid só existe na persistência, a derivação é SQL puro (drizzle), e o adapter in-memory do reader nunca seria exercido por cenário real. YAGNI (Fowler) — removido com o RED do W0 (substituído pelo teste de integração do `findPaged`, a acceptance real). Sem perda de cobertura: a derivação está provada na integração.

## Conclusão

Mudança correta, mínima na superfície de produção, alinhada ao ADR-0022/0020, e **provada** por integração drizzle-mysql. **APPROVED** para W3.
