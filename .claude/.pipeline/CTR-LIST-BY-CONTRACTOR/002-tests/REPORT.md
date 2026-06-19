# W0 — Testes RED · CTR-LIST-BY-CONTRACTOR (#116)

**Agente**: tdd-strategist · **Data**: 2026-06-19 · branch `feat/contracts-list-by-supplier`.

Filtrar `GET /contracts` por contratante + expor o ref do contratante no list-item (Categorização do Lançar Documento). Resolve as DUAS opções do issue.

| Camada | Teste RED |
| --- | --- |
| Persistência | `contract-repository-paged.test.ts` — `listPaged({ contractorId })` retorna só os contratos daquele contratante. RED (filtro não existe). |
| DTO | `contract-dto.test.ts` — `contractToListItem` expõe `contractorId`/`contractorType`. |

**Achado:** o `listPaged` já retorna `Contract` completo (que tem `contractor: ContractorRef` = type+id, **local** — sem composição cross-módulo). Logo o gap era só expor o ref leve + adicionar o filtro; sem N+1.
