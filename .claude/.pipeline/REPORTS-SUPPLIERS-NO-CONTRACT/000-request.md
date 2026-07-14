# REPORTS-SUPPLIERS-NO-CONTRACT — escopo (REP-2 · #240 · Bloco D do #404)

> Issue **#240** (fatia 2 do épico Relatórios **#114**). Estende o módulo `reports` (criado no #238)
> + nova leitura cross-módulo na public-api do `financial`. Size **M**. Empilhado sobre `feat/238-reports-team`.

## Contexto (via Explore)
Relatório "Fornecedores sem Contrato": agrega os payables com `contract_ref IS NULL` por fornecedor
(soma o valor, conta os títulos, exibe o nome). Fonte = read-model `fin_payable_view` (#235, entregue).
O nome vem do `fin_supplier_view` (#47) via LEFT JOIN por `supplier_ref` (mesmo eixo de identidade —
id do supplier no partners; precedente `document-summary-by-ids-view.drizzle.ts:107`).

O `financial` **não** tem read-port boot-scoped cross-módulo nem agregação por supplier hoje → precisa
criar. O molde de agregação é `document-summary-by-ids-view.drizzle.ts:79-108` (GROUP BY + SUM/COUNT +
LEFT JOIN `fin_supplier_view`).

## Decisões (P.O. / Gabriel 2026-07-14)
- **RBAC:** gate `authorize(FINANCIAL_PERMISSION.read)` = `'fiscal-document:read'` (o "Sem RBAC" da issue
  = sem RBAC por-linha; mantém auth + permissão de leitura financeira, consistente com REP-1). `payable:read`
  não existe (removida, inerte).
- **Status:** incluir **todos os status** (`contract_ref IS NULL`, inclusive `Cancelled`) — superset literal.
- **DIVERGÊNCIA documentada (issue):** core só tem `contract_ref IS NULL` (sem `NO_CONTRACT`) → superset,
  inclui reembolso/distrato/termo/fatura-cartão → número **maior** que o legado. Aproximado por ora.

## Escopo (in)
1. **`financial/public-api`:** novo reader boot-scoped `openSuppliersWithoutContractReader({ connectionString })
   → Result<{ list, close }, string>` (molde `openCollaboratorProjectionReader`/`buildPartnersReadPort`; pool
   1× no boot). `list()` agrega `fin_payable_view` WHERE `contract_ref IS NULL` AND `supplier_ref IS NOT NULL`,
   GROUP BY `supplier_ref`, `SUM(value_cents)`, `COUNT(*)`, LEFT JOIN `fin_supplier_view` p/ `name`.
   Registra a permissão no barrel se necessário.
2. **Módulo `reports` (estende):** port `SuppliersWithoutContractReadPort` + adapter ACL sobre o reader do
   financial + adapter in-memory + rota `GET /reports/suppliers-without-contract` (gate `fiscal-document:read`,
   response Zod) no `reportsHttpPlugin` + composition abre o reader do financial no boot + wiring `server.ts`
   (nova conn-string do financial + `shutdown` fecha ambos os readers).

## Fora de escopo
- Breakdown por `budgetPlan` (ADIADO, gate #113). Demais slices (#243 REP-4). Índice em `contract_ref`
  (full-scan aceito; volume baixo). CSV/PDF (front monta do JSON).

## Critérios de aceite
- **CA1** `GET /api/v2/reports/suppliers-without-contract` retorna lista agregada por fornecedor
  (`supplierRef, name, totalCents, payableCount`), só `contract_ref IS NULL`.
- **CA2** RBAC: sem `fiscal-document:read` → 403; com → 200.
- **CA3** Payables COM `contract_ref` são excluídos; `supplier_ref IS NULL` excluído; **todos os status**
  contam (inclui Cancelled).
- **CA4** Agregação validada no MySQL real (OrbStack): `SUM`/`COUNT` corretos + nome via LEFT JOIN
  (name `null` quando o supplier ainda não projetado em `fin_supplier_view`).

## Pipeline
| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — rota (fastify.inject) + agregação do financial |
| W1 | `ports-and-adapters` + `drizzle-orm-expert` (query) + `fastify-server-expert` (par `zod-expert`) | reader financial + endpoint reports + wiring |
| W2 | `code-reviewer` (+ `security-backend-expert` p/ boundary/exposição) | audit read-only |
| W3 | `ts-quality-checker` | gate + integração MySQL (OrbStack) |

## DoD
Gate W3 verde + endpoint no `/api/v2` com RBAC + agregação validada no OrbStack. Fecha #240; não fecha #114.
