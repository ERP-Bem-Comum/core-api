# W1 — Implementação (GREEN) · PAR-COLLAB-HISTORY-EXPORT (#126)

**Data**: 2026-06-19

| Parte | Arquivo | Conteúdo |
| --- | --- | --- |
| **P3** diff | `domain/collaborator/collaborator-history.ts` + `…/mappers/collaborator-history.mapper.ts` | `trackedValues` passa a serializar `territory` (`UF/Município`), `bankAccount` (`código/agência/conta`), `pixKey` (`chave`); labels PT `Território`/`Banco`/`Chave PIX`. Viram linhas novas no histórico. |
| **P2** formato | `adapters/export/collaborator-history-csv.ts` | Assinatura `collaboratorHistoryToCsv(groups: CollaboratorHistoryGroup[])`. Cabeçalho de **9 colunas** `nome;email;cpf;programa;inicio_contrato;tipo_alteracao;historico_antes;historico_depois;data_alteracao`; identidade repetida por linha (`programa` = área de atuação). Serve lista e detalhe. |
| **P1** endpoints | `adapters/http/{plugin,schemas}.ts` | `GET /collaborators/export?type=history` → CSV combinado de todos os colaboradores do filtro (helper `toHistoryGroup`). Detalhe `/:id/export` busca a identidade (`getCollaboratorById`) → grupo único; history-first (503 antes de 404). |

GREEN: domínio 5/5, export 4/4, rotas 3/3; suíte 3007 pass / 0 fail. Identidade vem do read-model (grid) — correto p/ prod (reader=writer single-node); no teste memory o reader é seedado + history via override.
