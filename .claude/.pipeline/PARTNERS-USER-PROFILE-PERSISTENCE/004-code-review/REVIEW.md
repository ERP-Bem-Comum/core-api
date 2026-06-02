# W2 — REVIEW · PARTNERS-USER-PROFILE-PERSISTENCE

**Skill:** code-reviewer · **Round:** 1 · **Veredito:** ✅ APPROVED

## Escopo auditado (read-only)

- `schemas/mysql.ts` (`par_user_profiles`), `migrations/mysql/0003_absent_morph.sql`
- `mappers/user-profile.mapper.ts`, `repos/user-profile-repository.drizzle.ts`
- testes (mapper unit + repo gated), `package.json`

## Aderência (ADR-0020 / ADR-0014 / adapters.md)

- ✅ **ADR-0020**: sem ENUM/JSON/ODKU/AUTO_INCREMENT; PK natural varchar(36); datetime(3); `save` =
  SELECT-then-UPDATE-or-INSERT.
- ✅ **ADR-0014**: prefixo `par_*`, reusa `migrationsTable __drizzle_migrations_partners`. `collaborator_ref`
  **sem FK** (referência por ID).
- ✅ **Boundary**: mapper e repo retornam `Result`; try/catch → Result; zero throw.
- ✅ **Mapper** delega a `UserProfile.rehydrate` (domínio intocado); rejeita user_ref/cpf/collaborator_ref inválidos.
- ✅ **Migration manual** coerente: `utf8mb4_bin` em user_ref/cpf/collaborator_ref, ENGINE/charset, UNIQUE cpf.
- ✅ **Dup discriminado**: `isCpfDupEntry` → `user-profile-cpf-duplicate`.

## Observações (não-bloqueantes)

1. **PK = `user_ref`** (vs UUID próprio dos outros agregados) — correto: expressa o 1:1 com auth.User;
   `save` por user_ref atualiza sem duplicar.
2. **Sem soft-delete** — coerente com o domínio (ciclo de vida no auth.User).
3. **`collaborator_ref` sem FK mesmo sendo mesmo módulo/DB** — alinhado ao padrão "referência por ID" do
   projeto; evita acoplamento de schema entre agregados. OK.
4. **Repo só validado sob integração** (Docker) — gap conhecido; mapper round-trip unit cobre a tradução.

## Conclusão

Fiel ao template collaborator, ADR-compliant, fronteira por ID respeitada. **APPROVED** — segue para W3.
