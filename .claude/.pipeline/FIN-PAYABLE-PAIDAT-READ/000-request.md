# FIN-PAYABLE-PAIDAT-READ — expõe paidAt na leitura do título

**Feature:** [025-fin-go-live-1-nucleo](../../../specs/025-fin-go-live-1-nucleo/) · **US1** · **Size:** M
**🎯 Goal:** fechar a issue **[#231](https://github.com/ERP-Bem-Comum/core-api/issues/231)**.

## Contexto

O #232 fez a baixa manual aceitar `paidAt`, mas o valor vive só no evento `PayableManuallyPaid` — `fin_payables` **não tem coluna `paid_at`** e o agregado `Payable` não carrega `paidAt`. Para a coluna "Pagamento" do grid (âncora do match da conciliação), o `paidAt` precisa ser persistido e lido.

## 📋 Definition of Done (CAs da #231 — fonte da verdade)

- [ ] `paidAt` (`string | null`, ISO date) por item em `GET /financial/payable-titles` — null enquanto não pago.
- [ ] a baixa manual **grava** o `paidAt` informado em `fin_payables.paid_at`.
- [ ] (caminho automático/remessa: `paidAt` = data da saída bancária — **follow-up**, fora deste ticket.)
- [ ] gate **W3** verde; **issue #231 fechada**.

## Escopo técnico

- **Domínio**: `Payable` += `paidAt: Date | null`; `create` (document.ts:86,97) → `paidAt: null`; `payPayableManually` (document.ts:258) → `paidAt: input.at`.
- **Schema/migration**: `fin_payables.paid_at` (date, nullable) via `pnpm run db:generate`.
- **Persistência**: `document-repository.drizzle.ts` — payable INSERT += `paid_at`; rowToPayable += `paidAt`.
- **Read path**: `PayableListItem` += `paidAt`; `payable-list-view.drizzle` SELECT += `finPayables.paidAt`; in-memory `toItem` += `p.paidAt`; mapper/schema/DTO.
- **Cobertura Drizzle real** (paid_at round-trip): teste de integração atrás de `MYSQL_INTEGRATION` (Docker) além do unit/HTTP in-memory.
