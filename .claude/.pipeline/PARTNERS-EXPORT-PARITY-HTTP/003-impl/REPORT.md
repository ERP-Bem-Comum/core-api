# W1 (GREEN) — PARTNERS-EXPORT-PARITY-HTTP

**Wave:** W1 · **Agente:** ports-and-adapters · **Data:** 2026-06-06 · **Resultado:** GREEN ✅

Feature `specs/003-partners-aggregator-export/` · US-002 (paridade de export CSV).

## Implementação mínima (até GREEN)

| Arquivo | O quê |
| --- | --- |
| `src/modules/partners/adapters/export/financier-csv.ts` (NOVO) | `financiersToCsv` — achata `Financier` (9 colunas) via `toCsv` (BOM/RFC 4180/anti-injection); `deactivatedAt` discriminado por `status` |
| `src/modules/partners/adapters/export/act-csv.ts` (NOVO) | `actsToCsv` — achata `Act` placeholder (11 colunas do core) idem |
| `src/modules/partners/adapters/http/act-list-query.ts` (NOVO — achado U1) | `queryToFilter` + `actsForExport` (filtro search/active replicando o predicado inline do `act-plugin`; Act não tem `matchesFilter` no domínio) |
| `collaborator-list-query.ts` | + `collaboratorsForExport` (reusa `collaboratorMatchesFilter`) |
| `financier-list-query.ts` | + `financiersForExport` (reusa `financierMatchesFilter`) |
| `plugin.ts` (collaborators) | + rota `GET /collaborators/export` (reusa `collaborator-csv.ts` existente) |
| `financier-plugin.ts` | + rota `GET /financiers/export` |
| `act-plugin.ts` | + rota `GET /acts/export` |

Cada rota: `authorize('<tipo>:read')`; headers `text/csv; charset=utf-8` + `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff`; rota estática antes do `/:id` (precedência Fastify). **Sem schema/migration.**

## Achado U1 do analyze — confirmado e resolvido

- `collaborator`/`financier` tinham `queryToFilter` mas não `*ForExport` → adicionados (espelham `suppliersForExport`).
- `act` não tinha list-query algum → criado `act-list-query.ts` com filtro mínimo (search em name/email/cpf + active), idêntico ao filtro inline já usado na rota `GET /acts`.

## Correções durante o W1

- Fixture `financier-csv.test.ts`: `address` tinha vírgula (`'Av. Teste, 100'`) → o CSV (corretamente) envolve em aspas, quebrando o `split(',')` ingênuo do teste. Fixture ajustado p/ endereço sem vírgula (o escape em si é coberto pelo teste anti-injection).
- `act-csv.test.ts`: `Act.deactivate` retorna o agregado **direto** (não `Result`, diferente de Supplier/Financier) → `makeInactive` ajustado.
- Lint: `String(a.occupationArea)` desnecessário (já é string) → removido.

## Testes (W0 agora GREEN) + gate

```
✔ financier-csv.test.ts · act-csv.test.ts · partners-export-parity.routes.test.ts → 18/18
typecheck ✅ · format:check ✅ · lint ✅ · test 2286/2269 pass, 0 fail (+18 vs. 2268)
```

## Próximo passo

W2 (code-reviewer): audit read-only (security: escape CSV, exposição de PII no export, RBAC por tipo; clean-code: DRY dos serializers/ForExport).
