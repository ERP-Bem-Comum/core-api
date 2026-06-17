# W2 — Code Review (FIN-SUPPLIER-VIEW-APPLY)

**Veredito:** ✅ APPROVED · **Disciplina:** code-reviewer (read-only) · **Round:** 1/3
**Blocker:** 0 · **Major:** 0 · **Minor:** 0

## Escopo

`applySupplierEvent` (application) — consumidor da camada de evento de integração no read-model.

## Conformidade

- **Evento de integração ≠ domínio (ADR-0006/0043; Vernon "Domain Events").** O use case trata o
  payload como contrato externo (string JSON), parseia/valida na borda da aplicação e projeta no
  read-model — não toca agregado nem reusa evento de domínio. ✅
- **Application pura (`.claude/rules/application.md`).** Factory `(deps) => (input) => Promise<Result>`;
  `store` é port (sem import de adapter); sem `throw` (JSON.parse encapsulado em `safeJsonParse → Result`);
  `useUnknownInCatchVariables` respeitado (catch sem binding). ✅
- **Parse defensivo.** Valida `typeof` de cada campo + `occurredAt` válido (`Number.isNaN` no Date);
  payload malformado/incompleto → `err('supplier-event-payload-invalid')` (at-least-once → retry/DLQ). ✅
- **Filtro do contrato.** `SupplierRegistered`/`SupplierEdited` aplicam; demais → `ok` (skip) —
  bate com ADR-0043. ✅
- **Idempotência/ordem.** Delegadas ao `SupplierViewStore.upsert` (guard de recência já validado
  contra MySQL no FIN-SUPPLIER-VIEW-SCHEMA) — sem duplicar a regra. ✅

## Verificação

```
pnpm run typecheck / lint → verde
apply-supplier-event.test.ts → 6/6
```

Sem achados. A simplificação (sem regra pura `applySupplierEventToView` separada — guard no store) é
correta e evita duplicação (DRY).
