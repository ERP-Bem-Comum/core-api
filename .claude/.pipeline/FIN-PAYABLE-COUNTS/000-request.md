# FIN-PAYABLE-COUNTS — escopo (#536)

> Size **M**. O grid de Contas a Pagar mostra a contagem por status em cada chip (Todos/Rascunho/
> Aberto/Aprovado/Pago/Conciliado). Sem endpoint de contagem, o front dispara ~6 queries (`pageSize=1`
> só para ler `total`). Fix: **um endpoint** de contagem agregada por status, com o `rascunho` junto.

## Pedido (#536)
`GET /financial/payable-titles/counts?[filtros]` → 1 request no lugar de ~6:
```json
{ "total": 62, "draft": 78, "byStatus": { "Open": 2, "Approved": 25, "Paid": 1, "Reconciled": 0 } }
```
- `total` = total de **títulos** (qualquer status) que casam o filtro.
- `byStatus` = contagem de títulos por status (1 query `GROUP BY status` sobre `fin_payables`).
- `draft` (rascunho) = documentos `Draft` — **não têm título**; contados na tabela de documentos.
- Mesmos filtros da lista: `supplierRef`, `documentType`, `dueFrom`/`dueTo` (sem `status`, sem paginação).

## Escopo (in)
1. **Port** `PayableListView` + `countByStatus(filter)` → `{ total; byStatus: Partial<Record<DocumentStatus, number>> }`.
2. **Adapters**: in-memory (agrupa os itens derivados) + Drizzle (`SELECT status, count(*) … GROUP BY status`).
3. **Handler** compõe (1 request do front): `countByStatus(filter)` + reusa `listDocuments({ status:'Draft', …filtros }, 1, 1).total` para o `draft`. Sem novo port de documento.
4. **Rota** `GET /financial/payable-titles/counts` (gate `fiscal-document:read`) + `payableCountsResponseSchema`.

## Fora de escopo
- Dois endpoints separados — a P.O. decidiu **um só**, com `rascunho` no payload.
- Contagem por outros recortes (Rede, contrato) — só os filtros da lista atual.

## Critérios de aceite
- **CA1** `GET /payable-titles/counts` sem filtro → `total` = nº de títulos; `byStatus` soma para `total`.
- **CA2** `draft` = nº de documentos `Draft` (rascunho), contados à parte dos títulos.
- **CA3** Filtro (`supplierRef`) recorta tanto `byStatus`/`total` quanto o `draft`.
- **CA4** Gate `fiscal-document:read` (401 sem token, 403 sem permissão).
- **CA5** Regressão zero: `pnpm test` verde. (A query real `GROUP BY` é #500-gated; wiring provado por inject.)

## Pipeline
| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — inject: counts com total/byStatus/draft + filtro |
| W1 | `fastify-server-expert` (par `drizzle-orm-expert`) | port + 2 adapters + rota + schema |
| W2 | `code-reviewer` | audit — GROUP BY, gate, filtro no draft |
| W3 | `ts-quality-checker` | gate |
