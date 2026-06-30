# W2 — REVIEW — COLLABORATORS-HTTP-REGISTER (P2)

> Skill: `code-reviewer` (audit read-only). **Round 1 — APPROVED.**

## Veredito: ✅ APPROVED

## Conformidade

| Regra | Status | Evidência |
| :--- | :--- | :--- |
| ADR-0026 — writer pool nas escritas | ✅ | register/complete wirados ao `collaboratorWriterRepo` (writerHandle no mysql). |
| ADR-0033 — `/api/v1`; espelha legado | ✅ | POST 201 sem corpo (legado) + `Location`; PATCH complete-registration. |
| ADR-0027 — Zod na borda | ✅ | `createCollaboratorBodySchema`/`completeRegistrationBodySchema`; shape inválido → 400. |
| ADR-0024 — RBAC | ✅ | ambas as rotas `authorize('collaborator:write')`. |
| Result→HTTP; sem `throw` na borda | ✅ | `sendWriteError` (sets → status; default 422); nenhum throw vaza. |
| Reuso do domínio; sem regra na borda | ✅ | handlers só chamam use cases + mapeiam erro; validação semântica no domínio (DV CPF → 422). |
| Decisão do dono respeitada | ✅ | complete-registration **autenticado** (não público); 201 + Location. |

## Observações não-bloqueantes

1. **complete-registration público (legado) NÃO implementado** — decisão consciente do dono (segurança). Se o auto-cadastro for necessário, abrir fatia própria com token de convite.
2. **PUT /:id (update cadastral)** do legado fora de escopo (sem use case de update). Follow-up se a P.O. pedir edição.
3. Em memory, reader (seed) e writer são stores distintos → read-after-write não reflete; em mysql (reader=writer) reflete. Sem impacto nos CAs (POST→PATCH usa o writer; detalhe pós-cadastro não é testado aqui).

## Gate (audit log)

```
$ pnpm run lint      → eslint .   (zero, após --fix `as string`→`!`)
$ pnpm run typecheck → tsc --noEmit (zero)
$ pnpm run format:check → clean
```

## Próximo passo

W3 (QUALITY) — gate final encadeado.
