# W1 — Implementação (GREEN) · PAR-COLLABORATOR-HISTORY-EXPORT (US4)

**Outcome:** GREEN · ts-domain-modeler + ports-and-adapters + drizzle-schema-author + clean-code (export). Modelagem decidida via mysql-database-expert + acdg-skills (Abordagem A).

## O que entrou
- **Domínio**: `collaborator-history.ts` → `diffCollaborator(before, after)` (log de atualizações por campo, EN-puro; 9 campos rastreados).
- **Port**: `CollaboratorHistoryRepository` (`record(before, after, ctx)` + `listByCollaborator`). O adapter faz o diff, resolve label PT e gera id.
- **Mapper/labels**: `collaborator-history.mapper.ts` (mapa `fieldName→label PT` + `buildHistoryEntries`; `field_label` desnormalizado).
- **Adapters**: InMemory (store único) + Drizzle (`par_collaborator_history`, índice `(collaborator_id, occurred_at)` + UNIQUE idempotência). Migration **`0013`**.
- **Captura (consistência forte)**: `editCollaborator`/`deactivate`/`reactivate` chamam `historyRepo.record` após o save (mesmo `now`); falha → `collaborator-repo-unavailable`. register/completeRegistration inicial NÃO geram histórico (before null / sem diff cadastral).
- **Export CSV legado**: `collaborator-history-csv.ts` — cabeçalho `tipo_alteracao;historico_antes;historico_depois;data_alteracao` + `programa` vazia, separador `;`, datas `dd/MM/aaaa`. Rota `GET /collaborators/:id/export?type=history`.
- **Shared**: `src/shared/utils/csv.ts` parametrizado com `separator` (default `,` — os 5 exports existentes inalterados); reusa o hardening anti-fórmula (#102).
- **Wiring**: composition (history repo nos 2 drivers + injeção nos 3 use cases + `listCollaboratorHistory` + seed `collaboratorHistory`).

## Decisões registradas
- Export **por colaborador** (`:id/export?type=history`) — o cabeçalho legado não tem coluna de colaborador. Divergência consciente da spec (`/collaborators/export?type=history`).
- `changed_by` omitido (sem RBAC — ADR-0022). Serialização de valores a validar com importador legado (nota).
- Captura sequencial no use case (não tx compartilhada DB) — janela mínima; refinamento futuro.

## Resultado
Gate W3 verde: typecheck+format+lint + **2701 pass / 0 fail**.
