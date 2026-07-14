# REPORTS-PAYMENT-POSITION — escopo (REP-4 · #243 · Bloco D do #404)

> Issue **#243** (fatia 4 do épico Relatórios **#114**). Estende `reports` + nova leitura agregada
> na public-api do `financial`. Size **M**. Empilhado sobre `feat/240-reports-suppliers-no-contract`.

## Contexto (via Explore)
"Posição de Pagamentos": agrega `fin_payable_view` (#235) na grão **Fornecedor × Centro de Custo ×
Categoria** com **3 baldes** de valor:
- **PENDENTE** = `status IN ('Open','Approved')`
- **PAGO** = `status = 'Paid'`
- **ATRASADO** = `status IN ('Open','Approved') AND due_date < hoje` (derivado na leitura — Core não
  materializa "atrasado"; SPIKE-233 Mapa C)

Nomes dos 3 níveis vêm de tabelas no MESMO schema financial (uma query só): `fin_supplier_view.name`
(LEFT JOIN, event-loaded → pode ser null), `fin_cost_centers(id,name)` e `fin_categories(id,name)`
(referência local). Cartão de crédito é só um `paymentMethod` no documento (não vive no read-model, não
filtra a agregação) — **incluído** sem filtro especial.

**NÃO depende do `cost_center_id` do #341** — usa `cost_center_ref`+`category_ref` que já estão no
`fin_payable_view` (grão do próprio payable).

## Decisões (consistentes com REP-1/REP-2 + SPIKE-233)
- **RBAC:** gate `authorize(FINANCIAL_PERMISSION.read)` = `'fiscal-document:read'`.
- **Shape FLAT** (`{ positions: [row] }`) — convenção do módulo `reports`; sem contrato de front no repo;
  o front aninha supplier→cc→categoria. Grão da linha = (supplierRef, costCenterRef, categoryRef).
- **`Cancelled` excluído** (não entra em nenhum balde → evita linhas all-zero).
- **Refs nulos incluídos** (payable sem CC/categoria/fornecedor → grupo com ref/name `null`).
- **Baldes se sobrepõem por definição:** ATRASADO ⊆ PENDENTE (o front mostra "PENDENTE: X, dos quais
  ATRASADO: Y").
- **Clock:** `Clock.today()` (PlainDate) injetado no reader; `PlainDate.toISOString()` → 'YYYY-MM-DD'
  comparado com `due_date` (date string). ClockReal no boot, ClockFixed no teste.

## Escopo (in)
1. **`financial/public-api`:** `openPaymentPositionReader({ connectionString, clock }) → Result<{ list, close }, string>`
   (boot-scoped, pool 1×). Query: GROUP BY supplier_ref, cost_center_ref, category_ref +
   `SUM(CASE WHEN status IN ('Open','Approved') THEN value_cents ELSE 0 END)` (pending),
   `SUM(CASE WHEN status='Paid' ...)` (paid), `SUM(CASE WHEN status IN ('Open','Approved') AND due_date < :today ...)` (overdue),
   LEFT JOIN supplier_view/cost_centers/categories p/ nomes, `WHERE status != 'Cancelled'`.
2. **Módulo `reports` (estende):** port + adapter ACL + in-memory + rota `GET /reports/payment-position`
   (gate `fiscal-document:read`, response Zod strict) + composition abre o 3º reader no boot (ClockReal),
   `shutdown` fecha os 3. Sem novo wiring de env (reusa `financialUrl`).

## Fora de escopo
- Aninhamento server-side (front monta a árvore). Breakdown por método de pagamento (read-model não tem
  a coluna). Índice extra. Demais slices (#241/#242 dashboard = módulo `statistics`).

## Critérios de aceite
- **CA1** `GET /api/v2/reports/payment-position` retorna linhas por (fornecedor, CC, categoria) com
  `pendingCents/paidCents/overdueCents` + nomes (nullable).
- **CA2** RBAC: sem `fiscal-document:read` → 403; com → 200.
- **CA3** Contrato de saída fechado (9 colunas por linha).
- **CA4** Agregação validada no MySQL real (OrbStack): baldes corretos (Cancelled fora; ATRASADO só
  Open/Approved com `due_date < hoje` via ClockFixed; PAGO só Paid), nomes via JOIN, refs nulos agrupam.

## Pipeline
| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — rota + agregação condicional |
| W1 | `ports-and-adapters` + `drizzle-orm-expert` (CASE WHEN) + `fastify-server-expert` (par `zod-expert`) | reader financial + endpoint + wiring |
| W2 | `code-reviewer` (+ `security-backend-expert`) | audit read-only |
| W3 | `ts-quality-checker` | gate + integração MySQL (OrbStack) |

## DoD
Gate W3 verde + endpoint `/api/v2` com RBAC + agregação validada no OrbStack. Fecha #243; não fecha #114.
