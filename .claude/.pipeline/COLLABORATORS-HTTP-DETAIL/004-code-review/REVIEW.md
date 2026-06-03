# W2 — REVIEW — COLLABORATORS-HTTP-DETAIL (P1a)

> Skill: `code-reviewer` (audit read-only). **Round 1.**

## Veredito: ✅ APPROVED

## Escopo auditado (7 arquivos)

Novos: `application/ports/collaborator-reader.ts`, `adapters/persistence/repos/collaborator-reader.{in-memory,drizzle}.ts`.
Editados: `adapters/http/{schemas,collaborator-dto,composition,plugin}.ts`.

## Conformidade

| Regra | Status | Evidência |
| :--- | :--- | :--- |
| ADR-0006 — port em `application/ports`; cross-módulo via public-api | ✅ | `CollaboratorReader` é `type Readonly<{...}>` em `application/ports/`; borda importa do módulo. |
| ADR-0014 — read só `par_*`, não expõe row cru | ✅ | reader Drizzle devolve `CollaboratorReadRecord` (agregado + meta), nunca a row. |
| ADR-0026 — reader pool | ✅ | `collaboratorReader` wirado ao `readerHandle` em `buildMysqlPools`. |
| ADR-0027 — Zod na borda | ✅ | `collaboratorDetailSchema` + `collaboratorIdParamSchema` em `adapters/http/`. |
| ADR-0033 — `/api/v1`; espelha schema legado | ✅ | rota `/collaborators/:id`; DTO espelha `Collaborator` (openapi.yaml:2435); `id`=UUID + `legacyId`. |
| Result→HTTP; sem `throw` na borda | ✅ | `getById` adapter: try/catch → `err('collaborator-read-unavailable')`; handler: 404 (`collaborator-not-found`) / 503 via `sendResult`. |
| Mapeamento legado correto | ✅ | `status`←registrationStatus; `active`=status==='Active'; `disableBy` narrow (Inactive) senão null; datas ISO. |
| Domínio intocado; sem `String()` redundante | ✅ | agregado não editado; VOs são union literal (assign direto); só `id`/`cpf` branded usam `String()`. |

## Observações não-bloqueantes

1. **Sobreposição leve** com `ContractorReadPort.getCollaboratorView` (public-api): aquele é uma View **enxuta cross-módulo** (id/name/email/document/role/occupationArea/updatedAt); este `CollaboratorReadRecord` é o **detalhe completo + legacyId/createdAt** para a borda v1. Responsabilidades distintas — sem violação. Se crescerem juntos, reavaliar unificação.
2. Envelope da **lista** (P0) ainda é `{items, meta:{total}}`; será alinhado ao shape legado (`PaginatedCollaborators`) na **P1b** (registrado na spec §5).

## Saída literal do gate (audit log)

```
$ pnpm run lint
$ eslint .
(zero erros/warnings)

$ pnpm run typecheck
$ tsc --noEmit
(zero erros)
```

Varredura global `</content>`: **0 ocorrências** no repo.

## Próximo passo

W3 (QUALITY) — `ts-quality-checker`: gate final encadeado.
