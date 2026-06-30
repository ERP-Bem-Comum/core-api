# W0 — Testes RED · PAR-COLLAB-HISTORY-EXPORT (#126, P1)

**Agente**: tdd-strategist · **Data**: 2026-06-19 · branch `feat/partners-collaborator-list-export`.

Export de histórico de colaboradores no formato legado de **9 colunas** (lista + detalhe) + novos campos no diff.

| Parte | Camada | Teste RED |
| --- | --- | --- |
| P3 | Domínio | `collaborator-history.test.ts` — território/banco/PIX no `diffCollaborator` (serializados); RED (não rastreados). |
| P2 | Export | `collaborator-history-csv.test.ts` — cabeçalho de 9 colunas + identidade por linha; RED (formato antigo de 5 colunas). |
| P1 | Borda HTTP | `collaborators-history.routes.test.ts` — detalhe (9 col + identidade) + lista `?type=history` (combinado) + 503. |

**Descoberta de arquitetura:** o reader (identidade) é seed-only no driver memory (em prod single-node reusa o pool do writer). Os testes de rota seedam o reader + injetam histórico via override (a captura PUT→diff é coberta pelo teste de domínio).
