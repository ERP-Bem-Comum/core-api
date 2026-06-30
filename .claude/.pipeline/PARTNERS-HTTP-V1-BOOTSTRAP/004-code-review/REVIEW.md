# W2 — REVIEW — PARTNERS-HTTP-V1-BOOTSTRAP

> Skill: `code-reviewer` (audit read-only). **Round 1.**

## Veredito: ✅ APPROVED

## Escopo auditado (8 arquivos)

Novos: `partners/public-api/{permissions,http}.ts`, `partners/adapters/http/{schemas,collaborator-dto,composition,plugin}.ts`.
Editados: `src/shared/http/app.ts`, `src/server.ts`.

## Conformidade com ADRs / regras transversais

| Regra | Status | Evidência |
| :--- | :--- | :--- |
| ADR-0006/0028 — cross-módulo só via public-api; HTTP-de-feature em `adapters/http/` | ✅ | `server.ts` importa só `partners/public-api/http.ts`; nenhuma rota/schema no shell `src/shared/http/`. |
| ADR-0033 — `/api/v1` espelho do legado; união retrocompatível | ✅ | `RouteRegistration` em `app.ts`; `server.ts` registra `{plugin, prefix:'/api/v1'}`; auth/contracts seguem plugin direto → v2 (sem mudança de call-site). |
| ADR-0027 — Zod só na borda; OpenAPI gerado | ✅ | `schemas.ts` em `adapters/http/`; rota com `satisfies FastifyZodOpenApiSchema`; path em `/docs/json` (testado). |
| ADR-0026 — RW split | ✅ | `composition.ts` abre writer+reader; `listCollaborators` wirado ao `collaboratorReaderRepo`; memory reader=writer. |
| Result→HTTP; sem `throw` vazando na borda | ✅ | handler usa `sendResult`; erro de repo→503. `throw` só no boot do composition (config inválida), padrão idêntico ao de contracts (last-resort handler do server). |
| Domínio/application intocados | ✅ | nenhum arquivo de `domain/`/`application/` editado; reusa `listCollaborators` existente. |
| Sem `class`/`any`; `import type`; extensão `.ts`; idioma EN no código | ✅ | grep limpo; erros internos kebab EN (`collaborator-repo-unavailable`). |

## Achados

**Round 1 — RESOLVIDO (lint):** `collaborator-dto.ts:15-16` usava `String(c.occupationArea)` /
`String(c.employmentRelationship)` — redundante (são literal unions, já `string`;
`@typescript-eslint/no-unnecessary-type-conversion`). Corrigido para atribuição direta. `id`/`cpf`
permanecem com `String()` (branded). `pnpm run lint` + `tsc` verdes após o fix.

## Observações não-bloqueantes (débito consciente, P1)

1. Envelope `{ items, meta: { total } }` diverge do `contracts` (`page/limit/totalPages`) — **intencional/YAGNI**: P0 não pagina; P1 adiciona filtros + paginação real (registrado na spec §5 e no REPORT W1).
2. `email` no item de lista é `z.string()` (não `z.email()`) — aceitável: validação de **saída** (serialização), não de entrada; o domínio já garante o invariante.

## Saída literal do gate (audit log)

```
$ pnpm run lint
$ eslint .
(zero erros/warnings após o fix)

$ pnpm run typecheck
$ tsc --noEmit
(zero erros)
```

## Próximo passo

W3 (QUALITY) — skill `ts-quality-checker`: gate final `typecheck` + `format:check` + `test` + `lint`.
