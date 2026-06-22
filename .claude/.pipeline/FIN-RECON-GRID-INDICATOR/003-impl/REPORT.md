# W1 — Implementação GREEN · FIN-RECON-GRID-INDICATOR (#204)

**Wave**: W1 · **Outcome**: **GREEN** (Docker no ar — integração provada) · **Data**: 2026-06-22

## Pivot de design (YAGNI) durante o W1

O port `DocumentReconciliationReader` + adapter in-memory + unit test (do checkpoint anterior) foram **REMOVIDOS**. Motivo: ao implementar, confirmei que documento `Paid` só existe na **persistência** (o agregado de domínio não modela Paid/Reconciled — ver §"Achado"), então a derivação é um concern **SQL puro** e o port virava abstração especulativa (in-memory nunca tem Paid). YAGNI (Fowler) — a derivação vai **inline no `findPaged` drizzle**. O RED do W0 (reader) foi substituído pelo **teste de integração** do `findPaged` (a acceptance real).

## Implementação (produção)

1. `document-repository.drizzle.ts` (`findPaged`): subquery `recon` (`COUNT(*)`, `SUM(status='Reconciled')` por documento) + LEFT JOIN; `displayStatus = CASE WHEN status='Paid' AND total>0 AND total=reconciled THEN 'Reconciled' ELSE status END`; filtro `Reconciled`/`Paid` mapeado à condição derivada. **Sem escrita em `fin_documents`** (ADR-0022). ADR-0020: GROUP BY/agregação/JOIN permitidos.
2. `schemas.ts:159`: filtro `status` aceita `Paid`/`Reconciled` (além de Draft/Open/Approved).
3. In-memory `findPaged`: **sem mudança** (não há documento Paid no agregado in-memory; filtros Paid/Reconciled retornam vazio — coerente).

## Verificação (PROVADA, Docker no ar)

| Gate | Resultado |
|---|---|
| `pnpm run test:integration:financial` | ✅ **40/40** (inclui `#204 — status Conciliado derivado em findPaged`) |
| `pnpm run typecheck` | ✅ |
| `pnpm run format:check` | ✅ |
| `pnpm run lint` | ✅ |
| `pnpm test` (padrão) | ✅ **3109 · 3091 pass · 0 fail · 18 skip** |

Teste de integração (drizzle-mysql, INSERT direto simulando CNAB/016): documento Pago + TODOS os títulos Reconciled → grid `Reconciled`; **parcial** (1 de 2) → `Paid` (FR-004); sem conciliação → `Paid`; filtro `Reconciled` → 1; filtro `Paid` → 2 (exclui o reconciliado). Bug encontrado no setup do teste (doc tinha 1 título → "parcial" virava full) **corrigido** (INSERT de 1 Child) — a produção estava correta.

---

## (checkpoint anterior — recon + achado arquitetural)

**Wave**: W1 · ~~in-progress~~ → **done (GREEN)** · **Data**: 2026-06-22

## Entregue e VERIFICADO (GREEN, sem Docker)

1. **Port** `src/modules/financial/application/ports/document-reconciliation-reader.ts` — `DocumentReconciliationReader.reconciledDocumentIds(ids) → Promise<Result<ReadonlySet<string>>>` (batch, N+1-free; FR-004: ≥1 título e todos `Reconciled`).
2. **Adapter in-memory** `src/modules/financial/adapters/persistence/repos/document-reconciliation-reader.in-memory.ts` — deriva do `PayableStore` compartilhado (fonte única que a conciliação muta).
3. **Teste do reader** `document-reconciliation-reader.in-memory.test.ts`: **4/4 GREEN** (RED do W0 → verde). typecheck ✅ · format ✅ · sem regressão (fatia aditiva).

## Achado arquitetural que redefine o restante do W1

`Document = DraftDocument | OpenDocument | ApprovedDocument` (`domain/document/types.ts:112`) — **não há variante `Paid`/`Reconciled`**. O `DocumentStatus` tem Paid/Reconciled no enum, mas o **agregado de domínio não os modela**. Logo `fin_documents.status='Paid'` é escrito **só na persistência** (fluxo CNAB/016), fora do agregado. Consequências:

- **In-memory não consegue guardar um documento `Paid`** (o tipo do agregado proíbe) → o cenário Paid→Reconciled **não ocorre** no driver memory. A derivação no `findPaged` in-memory seria código sem cenário real.
- **O fix do #204 vive na camada drizzle**: a query de listagem (`document-repository.drizzle.ts:list` ~L408) precisa do JOIN/derivação sobre `fin_payables` para refletir Reconciled; só ali existe documento `Paid`.
- **Verificação = teste de integração drizzle-mysql** (INSERT direto de documento+payables `Paid`/`Reconciled` → `list()` reflete) — exige **Docker/MySQL** (`pnpm run test:integration:financial`). **Docker estava parado nesta sessão** → não verificável aqui.

## Restante do W1 (pendente de Docker para prova)

- Adapter drizzle do reader: `SELECT document_id FROM fin_payables WHERE document_id IN (...) GROUP BY document_id HAVING COUNT(*) = SUM(status='Reconciled')` (ADR-0020 permite).
- `findPaged` (drizzle): refletir `status='Reconciled'` quando `status='Paid'` e id no conjunto; filtro `Paid`/`Reconciled` mapeado à condição derivada.
- `schemas.ts:159`: filtro aceita `Paid`/`Reconciled`. `dto.ts`: reflete o status derivado.
- Composition: criar o reader do `payableStore` compartilhado (L252) e injetar em `findPaged`.
- (Paridade) wiring in-memory: opcional/dead-path (sem documento Paid no agregado) — manter só se agregar valor de contrato.
- **Teste de integração** `document-repository.drizzle-mysql.test.ts` (+ HTTP) com Docker.

## Decisão de checkpoint (regressão-zero)

Não escrevi a query drizzle "às cegas" para não declarar GREEN sem prova (Docker indisponível). O núcleo (port + reader + unit test) está verde e versionável; a fatia drizzle será implementada **e provada** quando o Docker subir (`pnpm run test:integration:financial`).

## Possível follow-up (registrar como issue se confirmado)

O agregado `Document` não modela Paid/Reconciled, mas a persistência sim — divergência domínio×persistência. Para o #204 (reflexo de leitura) a derivação drizzle basta; mas vale avaliar modelar as transições no domínio (issue separada).
