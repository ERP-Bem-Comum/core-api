# W0 — RED (FIN-DOC-SEARCH)

**Skill:** tdd-strategist · **Outcome:** RED

## Testes adicionados

### HTTP (driver memory) — `tests/modules/financial/adapters/http/list-documents.http.test.ts`
Helper `newUuidLike(seed)` (UUID v4 determinístico p/ supplierRef distinto). Bloco #167:
- **CA1** — `?q=alpha` retorna só títulos cujo `documentNumber` contém "alpha" (CI); BETA não aparece.
- **CA2** — `?q=QCOMBO&status=Open` acha; `?q=QCOMBO&status=Paid` → total 0 (AND entre filtros).
- **CA3** — termo com espaços é trimado; `?q=` e `?q=<espaços>` → **400** (min 1 após trim); `?q=%` → total 0 (wildcard literal/escapado).

### Integração MySQL (x99) — `tests/modules/financial/adapters/persistence/payable-list-view.drizzle-mysql.test.ts`
- **CA4** — semeia `fin_supplier_view` (name="Padaria Bartolomeu LTDA", document="12345678000199") + documento; `findPaged({ q })` casa por **nome**, **CNPJ** e **documentNumber**; LEFT JOIN não duplica (parent aparece 1×); termo ausente não acha.

## Prova do RED
- `pnpm run typecheck` → **4× TS2353** `'q' does not exist in type PayableListFilter` (drizzle-mysql test).
- `node --test` HTTP (#167) → **CA1/CA3 falham**: `q` é ignorado hoje (schema descarta o param), retorna tudo e `?q=` responde 200 em vez de 400.

## Próximo (W1)
- Domínio `payable/query.ts`: `PayableListFilter += q?: string`.
- Borda `schemas.ts` + `plugin.ts`: `q` no schema (trim/min1/max100) e no filtro.
- Drizzle `payable-list-view.drizzle.ts`: LEFT JOIN fin_supplier_view + `LIKE` contains (escapado) em documentNumber/name/document, no count e nas rows.
- In-memory `payable-list-view.in-memory.ts`: `q` por documentNumber (contains, CI).
