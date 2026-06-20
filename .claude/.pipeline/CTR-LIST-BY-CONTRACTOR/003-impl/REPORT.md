# W1 — Implementação (GREEN) · CTR-LIST-BY-CONTRACTOR (#116)

**Data**: 2026-06-19

| Parte | Arquivos | Conteúdo |
| --- | --- | --- |
| **Exposição no list-item** | `adapters/http/{contract-dto,schemas}.ts` | `contractToListItem` adiciona `contractorId`/`contractorType` ao `registration` (espalhado em todos os status), de `c.contractor` (ref local, sem N+1). Schema base do list-item ganha os campos. |
| **Filtro** | `domain/contract/repository.ts` (ListContractsQuery +`contractorId?`/`contractorType?`), `repos/contract-repository.{drizzle,in-memory}.ts` (WHERE/matchesQuery), `adapters/http/{schemas,plugin}.ts` (query `contractorId`(uuid)/`contractorType`(enum) + mapeamento; brand pós-Zod). |
| **Índice** | `schemas/mysql.ts` + migration `0016_rainy_blur.sql` | `ctr_contracts_contractor_idx` (contractor_id, status) — suporta "contratos vigentes do fornecedor". ALTER ADD INDEX não-quebrante. |

GREEN: paged 10/10 (inclui filtro), suíte 3011 pass / 0 fail. Fixture `buildContract` estendido (`contractorId`/`contractorType`); teste de DTO atualizado (deepEqual + campos novos). Resolve as duas opções do issue.
