# W0 — Testes RED · FIN-RECON-GRID-INDICATOR (#204)

**Wave**: W0 · **Outcome**: **RED** · **Data**: 2026-06-22

## RED autorado (núcleo da derivação)

`tests/modules/financial/adapters/persistence/document-reconciliation-reader.in-memory.test.ts` (NOVO) — exercita o adapter in-memory do novo port `DocumentReconciliationReader` contra um `PayableStore` semeado:

```
tests 1 · pass 0 · fail 1 (RED)
```

Falha esperada: `ERR_MODULE_NOT_FOUND` — `document-reconciliation-reader.in-memory.ts` ainda não existe (estilo W0 RED do repo: o teste importa o adapter inexistente). Casos cobertos (viram GREEN no W1):
- **CA1**: documento com TODOS os títulos `Reconciled` → no conjunto.
- **CA2**: parcial (1 Paid + 1 Reconciled) → fora (FR-004).
- **CA3**: documento sem títulos no store → fora.
- **CA4**: batch N+1-free (uma chamada resolve vários documentos).

## Restante do W0 acoplado ao W1 (bloqueio documentado)

`findPaged`-derivação, HTTP (`grid-reconciled.http.test.ts`) e drizzle-mysql de integração **dependem de semear um documento em `Paid`**, que **não é possível no driver memory** (não há rota que põe documento/título em Paid — é a 016/CNAB; o teste de conciliação existente semeia payables direto no `PayableStore`). Logo:
- A derivação no `findPaged` + a borda HTTP serão testadas **no W1**, junto com o wiring do reader em `findPaged`/`buildFinancialHttpDeps`.
- O caso drizzle-mysql (GROUP BY/HAVING real) vai por **INSERT direto** de documento+payables `Paid`/`Reconciled` em teste de **integração** (`pnpm run test:integration`, exige Docker/MySQL).

Esta fatia (reader isolado) é a unidade design-driving que define o contrato; o resto encadeia no W1 com a implementação.

---

## (recon + design — fixados antes do RED)

**Wave**: W0 · **Status**: ~~in-progress~~ → **done (RED)** · **Data**: 2026-06-22

## Achado de recon que refina o plano

A derivação read-time (clarify: documento Reconciled sse todos os títulos `Reconciled`) **precisa de um read dependency que não existe hoje**:

- O agregado `Document` (`domain/document/types.ts`) **não** carrega payables.
- O document repo in-memory (`document-repository.in-memory.ts:findPaged`) só vê `{ aggregate, version }` — **sem** estado de conciliação dos títulos.
- O document repo drizzle (`document-repository.drizzle.ts:list` ~L408) faz leftJoin só de `finSupplierView` — **não** junta `finPayables`.
- Não há reader "payables por `documentId`" (a `PayableReconciliationView` expõe `findSnapshotsByIds`/`searchPaid`, não "por documento").
- No teste HTTP de conciliação existente, o document store (base) e o payable store (seedado) são **separados** — a derivação exige que a listagem leia o estado dos payables.

## Design proposto (a confirmar no W1 — espelha o padrão existente `supplierViewStore`)

A listagem já enriquece via store injetado opcional (`enrichWithSupplierView(items, supplierViewStore)`). Mesmo padrão para a conciliação: um **reader batch, N+1-free**:

```
type DocumentReconciliationReader = Readonly<{
  // dentre os documentIds da página, os que têm ≥1 título e TODOS Reconciled
  reconciledDocumentIds: (documentIds: readonly string[]) => Promise<ReadonlySet<string>>;
}>;
```

- **Drizzle**: `SELECT document_id FROM fin_payables WHERE document_id IN (...) GROUP BY document_id HAVING COUNT(*) = SUM(status='Reconciled')` (ADR-0020: GROUP BY/HAVING/agregação permitidos).
- **In-memory**: derivar do `PayableStore` seedado.
- **Reflexo**: `toListItem` → se `status='Paid'` e `id ∈ reconciledDocumentIds` → `status='Reconciled'`.
- **Filtro** (`schemas.ts:159` + `matchesFilter`): `Reconciled` → id no conjunto; `Paid` → `status='Paid'` e id **fora** do conjunto.

## Plano de testes W0 (RED) — a escrever contra o port acima

1. **Read store in-memory** (`document-repository.in-memory.test.ts`): doc Pago + todos payables Reconciled → `findPaged` retorna `status='Reconciled'`; parcial → `Paid`; filtro Reconciled/Paid.
2. **Read store drizzle-mysql** (`document-repository.drizzle-mysql.test.ts`, integração — exige Docker/`test:integration`): mesma derivação via GROUP BY/HAVING real.
3. **HTTP** (`grid-reconciled.http.test.ts`, NOVO): conciliar → `GET /documents` reflete Conciliado; undo → reverte; filtro. (Exige wiring do reader no `buildFinancialHttpDeps`.)

## Por que pausei a autoria do RED aqui

Criar o port `DocumentReconciliationReader` + alterar a assinatura dos 2 adapters (drizzle + in-memory) + do `buildFinancialHttpDeps` é **design deliberado** (skill `ports-and-adapters`), não improviso. Escrever um RED apressado contra um port ainda não desenhado arriscaria retrabalho e um teste frágil. Recon e direção de design estão fixados acima — a autoria do RED parte daqui.

## Próximo

Autorar os 3 RED contra o port `DocumentReconciliationReader` (in-memory primeiro, depois drizzle-integração + HTTP), rodar até RED, fechar W0.
