# W3 — Gate de Qualidade — AUTH-USER-PROFILE-AGG

**Wave:** W3 · **Outcome:** GREEN · **Data:** 2026-06-07

| Comando | Resultado |
|---------|-----------|
| `pnpm run typecheck` | ✅ OK (mapper recompila com `UserCore` estendido) |
| `pnpm run format:check` | ✅ OK |
| `pnpm run lint` | ✅ OK (sem `eslint-disable`) |
| `pnpm test` | ✅ **2301 pass / 0 fail** · 17 skipped · 733 suites |

Sem regressão (+6 do perfil; register-user e mapper unit intactos).

## Integração (pré-merge, fora do gate unit)

`pnpm run test:integration:auth` valida a migration `0004` + `user-repository.drizzle`/mapper contra
MySQL real (Docker). **Deve rodar antes do merge da branch 005** — exige Docker.

## Foundational da 005 — status

VOs (Cpf/Telephone/ProfilePhotoRef) ✅ · agregado+mapper+schema ✅. **Foundational concluída.**
Próximo: User Story 1 (`AUTH-USECASE-LIST-USERS` — listar/buscar/filtrar, o MVP).
