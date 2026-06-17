# W2 — Code Review (FIN-SUPPLIER-VIEW-BACKFILL)

**Veredito:** ✅ APPROVED · **Disciplina:** code-reviewer (read-only) · **Round:** 1/3
**Blocker:** 0 · **Major:** 0 · **Minor:** 0

## Conformidade

- **Idempotência + não-regressão (FR-011/FR-003).** `occurredAt` antigo (`2000-01-01`) + guard de
  recência do store → re-execução segura e snapshots de evento real (mais novos) nunca sobrescritos.
  Validado pelo teste "não regride evento real". ✅
- **Isolamento (ADR-0006).** O job consome `listSuppliersForProjection` da **public-api** do partners —
  não importa adapters do partners. A public-api encapsula o pool/repo e devolve só o contrato
  `{ supplierRef, name, document }`. ✅
- **One-shot (ADR-0041).** Entrypoint dedicado, exit codes (`EX_CONFIG`/0/1), pool fechado em `finally`,
  sem loop long-running. Reusa o mesmo `SupplierViewStore` do consumer (mesma porta de aplicação). ✅
- **Lógica pura testável.** `backfillSupplierViews` separada do entrypoint — testada sem DB (3/3). ✅
- **Boundary.** `listSuppliersForProjection` converte erros para `Result<…, string>`; sem `throw` cruzando. ✅

## Verificação

```
typecheck / lint → verde · backfill.test.ts → 3/3
```

Sem achados. O backfill completa a cobertura de fornecedores legados (decisão do clarify da 014).
