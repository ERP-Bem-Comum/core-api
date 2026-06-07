# W0 (RED) — PARTNERS-EXPORT-PARITY-HTTP

**Wave:** W0 · **Agente:** tdd-strategist · **Data:** 2026-06-06 · **Resultado:** RED ✅

Feature `specs/003-partners-aggregator-export/` · US-002 (paridade de export CSV).

## Testes escritos (falham por inexistência da API do W1)

| Arquivo | Cobre | Falha esperada |
| --- | --- | --- |
| `tests/modules/partners/adapters/export/financier-csv.test.ts` | `financiersToCsv`: HEADER (9 colunas) + BOM/CRLF; Active/Inactive (status + deactivatedAt ISO); cnpj normalizado; escape anti-injection (`=`) | `ERR_MODULE_NOT_FOUND` de `financier-csv.ts` |
| `tests/modules/partners/adapters/export/act-csv.test.ts` | `actsToCsv`: HEADER (11 colunas, core do placeholder Act) + Active/Inactive; cpf normalizado; escape anti-injection (`@`) | `ERR_MODULE_NOT_FOUND` de `act-csv.ts` |
| `tests/modules/partners/adapters/http/partners-export-parity.routes.test.ts` | `GET /collaborators|financiers|acts/export` (`fastify.inject`): 200 `text/csv` + `Content-Disposition: attachment` + `nosniff`; 401 sem sessão; 403 sem `<tipo>:read` | 404 (rotas inexistentes) → asserções falham |

## Prova de RED (não-ambiente)

```
ERR_MODULE_NOT_FOUND: '.../adapters/export/financier-csv.ts'
ERR_MODULE_NOT_FOUND: '.../adapters/export/act-csv.ts'
✖ /collaborators/export 200 ... ✖ /financiers/export ... ✖ /acts/export ... (404, rota inexistente)
```

Os 2 serializers falham por import inexistente; as 9 asserções de rota falham por 404 (rota não registrada) — tudo por **inexistência** do que o W1 deve criar.

## HEADERs definidos (contrato p/ W1)

- **financier-csv** (9): `id,name,corporateName,legalRepresentative,cnpj,telephone,address,status,deactivatedAt`.
- **act-csv** (11): `id,name,email,cpf,occupationArea,role,startOfContract,employmentRelationship,registrationStatus,status,deactivatedAt` (core do placeholder — sem os campos pessoais ricos do Collaborator).
- Ambos via `toCsv` (BOM + RFC 4180 + escape anti-injection do util compartilhado).

## Contrato esperado do W1 (para GREEN — achado U1 do analyze)

- `financier-csv.ts` (`financiersToCsv`) + `act-csv.ts` (`actsToCsv`) espelhando `supplier-csv.ts`.
- `act-list-query.ts` (filtro mínimo); financier/collaborator aplicam `queryToFilter` existente (não há `*ForExport` pré-pronto).
- Rotas `GET /collaborators/export` (reusa `collaborator-csv.ts`), `/financiers/export`, `/acts/export` nos respectivos plugins; `authorize('<tipo>:read')` + headers CSV (`text/csv`, `attachment`, `nosniff`).

## Próximo passo

W1 (`ports-and-adapters`): implementar serializers + filtros + 3 rotas até GREEN. Sem schema/migration.
