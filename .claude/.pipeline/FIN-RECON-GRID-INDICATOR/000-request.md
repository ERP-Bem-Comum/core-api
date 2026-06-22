# FIN-RECON-GRID-INDICATOR — Request (#204)

**Size:** M · **Épico:** #64 · **Feature SDD:** `specs/023-fin-reconciled-grid/` · **Prioridade:** P1 (bloqueia teste de tesouraria)

## Problema

A conciliação flipa o título pagável `Paid→Reconciled` (`reconciliation-repository.drizzle.ts:59`), mas o grid de Contas a Pagar (`GET /api/v2/financial/documents`) lê `fin_documents.status` — que nunca vira Reconciled — então o documento segue "Pago", nunca "Conciliado". Front já pronto (chip Conciliado).

## Decisão (clarify 2026-06-22, ancorada em ADR-0022:37/40 + emenda #130)

**Indicador derivado em tempo de leitura.** O grid deriva o estado de conciliação por documento a partir dos títulos pagáveis (`fin_payables`), **sem** escrever em `fin_documents` nem criar projeção/consumidor. Evita dependência do #127.

## Escopo

- Novo port `DocumentReconciliationReader` (batch, N+1-free): `reconciledDocumentIds(ids) → Set<id>` (documento com ≥1 título e TODOS `Reconciled`).
- Adapters: drizzle (`GROUP BY document_id HAVING COUNT(*)=SUM(status='Reconciled')`) + in-memory (deriva do `PayableStore`).
- `findPaged` (drizzle + in-memory): reflete `status='Reconciled'` no item quando `status='Paid'` e id no conjunto; filtro `Paid`/`Reconciled` mapeado à condição derivada.
- `schemas.ts:159`: filtro de status aceita `Paid`/`Reconciled`.

## Critérios de aceite

- **CA1**: documento Pago com TODOS os títulos conciliados → grid mostra **Conciliado**.
- **CA2**: undo reverte (Conciliado → Pago).
- **CA3**: conciliação **parcial** → permanece Pago (FR-004).
- **CA4**: filtro por `Paid` e `Reconciled` retorna o conjunto correto.
- **CA5**: nenhuma escrita em `fin_documents`; derivação reconstruível (ADR-0022).
- **CA6**: cobertura com authorize/flow real (read store in-memory + **drizzle-mysql de integração** + HTTP).
- **CA7**: gate W3 verde (+ `test:integration` para a derivação drizzle).

## Não-objetivos

Sem migration (só leitura — JOIN/subquery/GROUP BY, ADR-0020), sem evento novo, sem rota nova, sem campo extra obrigatório no DTO (reflete no `status`).

## Referências

Issue #204 · Plano: `specs/023-fin-reconciled-grid/plan.md` · Citação: `research.md` (ADR-0022:37/40).
