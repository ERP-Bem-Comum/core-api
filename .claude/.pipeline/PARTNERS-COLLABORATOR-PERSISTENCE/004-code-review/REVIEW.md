# W2 — REVIEW · PARTNERS-COLLABORATOR-PERSISTENCE

**Skill:** code-reviewer · **Round:** 1 · **Veredito:** ✅ APPROVED

## Escopo auditado (read-only)

- `schemas/mysql.ts` (`par_collaborators`)
- `migrations/mysql/0002_young_cerise.sql`
- `mappers/collaborator.mapper.ts`
- `repos/collaborator-repository.drizzle.ts`
- testes (mapper unit + repo gated) · `package.json` (`test:integration:partners`)

## Aderência (ADR-0020 / ADR-0014 / `.claude/rules/adapters.md`)

- ✅ **ADR-0020**: sem ENUM nativo (enums são varchar), sem JSON, sem AUTO_INCREMENT (UUID varchar(36)),
  sem ODKU (`save` = SELECT-then-UPDATE-or-INSERT), datetime(3). `registration_status` varchar livre
  (precedente `service_category`).
- ✅ **ADR-0014**: prefixo `par_*`, reusa `migrationsTable __drizzle_migrations_partners` (driver inalterado).
- ✅ **Boundary**: mapper e repo retornam `Result`; `try/catch → Result` no repo; zero throw cruza a borda.
- ✅ **Mapper row→domínio** retorna `Result` e rejeita estado inválido (id/cpf/enum/state); delega a
  `Collaborator.rehydrate` (domínio **não** tocado).
- ✅ **Migration manual**: `COLLATE utf8mb4_bin` em `id`/`cpf`, `ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  CHECK de soft-delete (2 colunas) + 2 UNIQUE. Coerente com o schema Drizzle.
- ✅ **Dup discriminado**: `dupEntryIndex` separa `par_collaborators_cpf_idx` / `_email_idx` no `sqlMessage`
  → `collaborator-cpf-duplicate` / `collaborator-email-duplicate`. Espelha o port.

## Observações (não-bloqueantes)

1. **`email` em collation default (utf8mb4_unicode_ci)** — UNIQUE de email é case-insensitive, enquanto o
   InMemory compara string exata. Em teoria `Maria@x` vs `maria@x` divergem (Drizzle recusa, InMemory aceita).
   Edge case improvável; consistente com supplier. Se virar requisito, normalizar email no domínio.
2. **CHECK soft-delete de 3 vias** (`active`/`deactivated_at`/`disable_by`) — mais estrito que supplier
   (2 vias), refletindo que Inactive do Collaborator exige `disableBy`. Correto vs. o agregado.
3. **`parseNullable` com `ParseFn<T>`** (erro fixado em `string`) — depende de covariância do `Result` em E;
   validação real fica no `tsc` do W3.

## Conclusão

Fiel ao template supplier, sem scope creep, ADR-compliant. **APPROVED** — segue para W3.
