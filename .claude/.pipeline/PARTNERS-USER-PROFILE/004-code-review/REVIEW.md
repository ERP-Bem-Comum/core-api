# W2 — REVIEW · PARTNERS-USER-PROFILE

**Skill:** code-reviewer · **Round:** 1 · **Veredito:** ✅ APPROVED

## Escopo auditado (read-only)

- `domain/user-profile/{types,events,errors,user-profile,repository}.ts`
- `adapters/persistence/repos/user-profile-repository.in-memory.ts`
- `application/use-cases/{create,update,link-collaborator,get,find-by-cpf}-*.ts`
- testes (domínio + app)

## Fronteira cross-módulo (foco do ticket — ADR-0006/0014)

- ✅ **Zero import de `auth/domain/`** (grep confirmou) — referência ao user só via `UserRef` do shared
  kernel (rehydrate-only). Nenhuma FK física; `userRef` é coluna de correlação lógica.
- ✅ `collaboratorRef` via `CollaboratorId` do **próprio** módulo (não cruza fronteira).
- ✅ **`massApprovalPermission` corretamente ausente** — D5 o aloca ao RBAC do auth; o perfil não tem
  campo booleano de permissão. Registrado como follow-up no auth.

## Aderência (domain.md / application.md)

- ✅ Domínio puro: `Result`, `Readonly`/`immutable`, sem `throw`/`class`; IDs/instantes injetados.
- ✅ Identidade = `userRef` (1:1) — modelagem expressa o invariante "1 perfil por user"; sem UUID redundante.
- ✅ `cpf` imutável (não há setter); `updateContact` preserva `cpf`/`userRef` (testado).
- ✅ Use cases factory `(deps) => (cmd)`; sequência validar → fetch → domain → persist; erros kebab EN.
- ✅ Port `type Readonly<{...}>`; InMemory recusa cpf duplicado (userRef distinto).

## Observações (não-bloqueantes)

1. **Sem soft-delete próprio** — decisão correta: o estado ativo/inativo é do `auth.User`. Se um requisito
   futuro exigir desativar o perfil independentemente, revisitar.
2. **Persistência Drizzle fora** — follow-up `PARTNERS-USER-PROFILE-PERSISTENCE` (tabela `par_user_profiles`,
   `user_ref` PK varchar(36), `cpf` UNIQUE, sem FK cross-módulo). Mesmo padrão de fatiamento do collaborator.
3. **`getUserProfile`/`findUserProfileByCpf`** retornam `null` para ausência (não-erro) — consistente com o módulo.

## Conclusão

Agregado de perfil isolado, fronteira auth respeitada, D5 honrada. **APPROVED** — segue para W3.
