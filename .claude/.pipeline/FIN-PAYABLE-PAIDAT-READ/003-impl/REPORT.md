# W1 — Implementação (GREEN) · FIN-PAYABLE-PAIDAT-READ (#231)

**Agentes:** ts-domain-modeler + drizzle-schema-author + fastify-server-expert · **Resultado:** GREEN ✅

## Mudanças

**Domínio**: `Payable` += `paidAt: Date | null`; `create` (2 construtores) → `paidAt: null`; `payPayableManually` → `paidAt: input.at`.

**Schema/migration**: `fin_payables.paid_at` (date, nullable) → migration **`0021_slippery_red_shift.sql`** (`ALTER TABLE fin_payables ADD paid_at date`) via `db:generate:financial`.

**Persistência** (`document.mapper.ts`): `mapPayablesToRows` += `paidAt: p.paidAt`; `mapPayableRows` += `paidAt: row.paidAt`.

**Read path** (6 pontos): `PayableListItem` + `PayableListRow` + `rowToPayableListItem` + `payable-list-view.drizzle` (SELECT `finPayables.paidAt`) + `payable-list-view.in-memory` (`toItem` += `p.paidAt`) + `payableSummarySchema` + `payableListItemToDto` (date-only).

## Achados

- `db:generate` é do módulo **contracts**; o financial usa `db:generate:financial` (configs por módulo em `db/drizzle/`).
- Única regressão de tipo: `baseRow` do mapper-test (os fixtures usam `Document.create`, que já seta `paidAt: null`).
- `paidAt` do título vem de `fin_payables` (não do documento) — distinto dos 5 campos do #229.

Teste #231 (HTTP in-memory): ✅. Suíte unit: 3147 pass. **Integração Drizzle: 53/53** (paid_at round-trip real).
