# W1 (GREEN) — PARTNERS-CONTRACTOR-ACTVIEW

**Wave**: W1 · **Agente**: ports-and-adapters · **Size**: S
**Feature**: `specs/002-contracts-http-gaps/` (ticket #3) · **Data**: 2026-06-06

## Resultado

Gates verdes: `typecheck` ✓ · `format:check` ✓ · `lint` ✓ · `test` (default 2234/0) ✓ ·
`test:integration:partners` (31/0) ✓ — inclui o round-trip de `getActView` em MySQL real.

## Mudanças (produção — só módulo partners)

- `public-api/contractor-view.mapper.ts` — novo `ActView` (type 'act' + campos espelhando `CollaboratorView`) + `actToView`; `ContractorView` 3→4 tipos.
- `application/ports/contractor-read.ts` — `getActView` no `ContractorReadPort`.
- `adapters/persistence/repos/contractor-read.drizzle.ts` — `getActView` (SELECT `parActs` + `actFromRow` + `actToView`; mesma forma dos demais: id inexistente → ok(null), erro → `contractor-read-unavailable`).
- `public-api/read.ts` + `public-api/index.ts` — reexportam `ActView`.

## Testes

- `tests/modules/partners/public-api/contractor-view.mapper.test.ts` (estendido) — `actToView` (unit, 2 casos).
- `tests/modules/partners/public-api/partners-read-port.integration.test.ts` (estendido) — `getActView` round-trip + caso inexistente (4/4 views); truncate de `parActs`. Guarded `MYSQL_INTEGRATION`.

## Aderência

- ADR-0014: lê só `par_*`, devolve View plana (nunca row cru). Zero escrita, zero throw cruzando a borda.
- `Act` é placeholder (ADR-0036) — `ActView` espelha `CollaboratorView`, consistente com a decisão da spec.
- FR-005 (paridade 4/4) satisfeita.
