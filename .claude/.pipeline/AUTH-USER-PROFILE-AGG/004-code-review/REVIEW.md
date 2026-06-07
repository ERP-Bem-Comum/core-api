# W2 — Code Review (read-only) — AUTH-USER-PROFILE-AGG

**Wave:** W2 · **Outcome:** APPROVED · **Round:** 1 · **Data:** 2026-06-07

## Domínio (`.claude/rules/domain.md`)

| Item | Veredito |
|------|----------|
| Sem `throw`/classe; funções puras → `{user, event}` | ✅ |
| Discriminated union preservada (narrowing por `status` em updateProfile/setPhoto) | ✅ |
| Campos de perfil nullable; `register` não quebra (perfil null) | ✅ |
| Eventos sem PII (asserção defensiva no teste CA2) | ✅ |
| `enable` é o par exato de `disable` (vocabulário reusado, sem `UserActivated`) | ✅ |
| `at: Date` injetado; imutabilidade via `immutable` | ✅ |

## Persistência (`.claude/rules/adapters.md`)

| Item | Veredito |
|------|----------|
| Mapper retorna `Result`; estado inválido do DB → `UserMapperInvalidProfile` (domínio rejeita) | ✅ |
| Reidratação via smart constructor dos VOs (não cast cego) | ✅ |
| Colunas nullable (ADR-0020: sem ENUM; varchar) | ✅ |
| Migration gerada por `db:generate:auth` (nunca SQL à mão) — 5 ADD nullable | ✅ |
| `collaboratorId` sem FK cross-módulo (FR-017, opaco) | ✅ |

## Observações

- Patch parcial via spread condicional (`!== undefined`) preserva a semântica null-limpa de `collaboratorId`
  — correto evitar `??` aqui (mudaria o significado). Lint satisfeito sem `disable`.
- Escopo expandiu para mapper/schema/migration por necessidade de compilação (regressão zero) — alinhado à
  decisão de ticket abrangente. Documentado no `000-request` e no W1.

**Resultado:** APPROVED.
