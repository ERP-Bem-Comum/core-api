# PARTNERS-USER-PROFILE-PERSISTENCE — Adapter Drizzle + tabela `par_user_profiles`

> **Size:** M · **ADR:** [ADR-0031](../../../handbook/architecture/adr/0031-partners-registry-module.md) · ADR-0020/0014/0013 · **Épico:** `.claude/.planning/EPIC-PARTNERS-CADASTROS.md` (Fase 5) · **Pré-requisito P1 de** `PARTNERS-ETL-BOOTSTRAP`.
> **Espelha:** `PARTNERS-COLLABORATOR-PERSISTENCE`. 4ª tabela do módulo `partners`, mesmo DB `core`, `migrationsTable __drizzle_migrations_partners`.

## Contexto

Fecha o agregado `UserProfile` (domínio/aplicação entregues em `PARTNERS-USER-PROFILE`): persistência
MySQL real, implementando o port `UserProfileRepository`. `UserProfile.rehydrate` **já existe** — este
ticket **não toca o domínio**. Diferenças vs. collaborator:

- **Identidade = `user_ref`** (PK natural; 1:1 com auth.User). Sem id próprio.
- **Sem soft-delete** (ciclo de vida é do auth.User) — sem `active`/`deactivated_at`/CHECK.
- **Uma unicidade**: `cpf` UNIQUE (legado `users.cpf`). `user_ref` é PK (duplicado de PK = update).
- `collaborator_ref` varchar(36) nullable — referência por ID ao colaborador (**sem FK**, ADR-0014).

## Escopo

1. **Schema** `adapters/persistence/schemas/mysql.ts` — `par_user_profiles` (ADR-0020):
   - `user_ref` varchar(36) PK, `name` varchar(255), `cpf` varchar(11), `telephone` varchar(30),
     `avatar_url` varchar(500) nullable, `collaborator_ref` varchar(36) nullable, timestamps datetime(3).
   - UNIQUE `par_user_profiles_cpf_idx` (cpf). Exporta `UserProfileRow`/`NewUserProfileRow`.
2. **Migration** `0003_*.sql` via `pnpm db:generate:partners` + edição manual (ENGINE/charset;
   `utf8mb4_bin` em `user_ref`/`cpf`/`collaborator_ref`).
3. **Mapper** `adapters/persistence/mappers/user-profile.mapper.ts` — `userProfileToInsert(p, now)` /
   `userProfileFromRow(row): Result<UserProfile, UserProfileMapperError>` (reconstrói `UserRef`/`Cpf`/
   `CollaboratorId` nullable na borda; delega a `UserProfile.rehydrate`).
4. **Repo Drizzle** `adapters/persistence/repos/user-profile-repository.drizzle.ts` — implementa
   `UserProfileRepository` (findByUserRef/findByCpf/save). `save` = SELECT-then-UPDATE-or-INSERT por
   `user_ref` (ADR-0020 sem ODKU); UNIQUE cpf → `user-profile-cpf-duplicate`. Transient → `user-profile-repo-unavailable`.
5. **Testes**: mapper round-trip unit (gate default) + repo integração (`MYSQL_INTEGRATION=1`, gated).
6. Estender `test:integration:partners` com a suíte do user-profile repo.

## Fora de escopo

- CLI, public-api, eventos/outbox; coluna `legacy_id` (vem com a ETL, P2); mudança no domínio.
- Criação do `auth.User` (é do auth); a ETL (P5).

## Critérios de aceite

- [ ] Mapper round-trip: `userProfileFromRow(userProfileToInsert(p, now))` reconstrói o agregado com e sem `collaboratorRef` — unit, gate default.
- [ ] `userProfileFromRow` rejeita user_ref/cpf/collaborator_ref inválidos na row.
- [ ] `db:generate:partners` emite `par_user_profiles`; migration tem ENGINE/charset + `utf8mb4_bin` em `user_ref`/`cpf`/`collaborator_ref` + UNIQUE cpf.
- [ ] **(Integração, gated)** repo: save→findByUserRef; findByCpf; update (2º save mesmo user_ref); 2º save cpf de outro user_ref → `user-profile-cpf-duplicate`.
- [ ] Gate default (W3): typecheck + lint + format + `pnpm test` verdes (mapper unit roda; integração skipped sem `MYSQL_INTEGRATION`).

## Notas de disciplina

- ADR-0020: sem ENUM/JSON/ODKU/AUTO_INCREMENT; PK natural varchar(36); datetime(3) UTC.
- ADR-0014: prefixo `par_*`, reusa `migrationsTable __drizzle_migrations_partners`. Boundary: zero throw cruza a borda.
- ⚠️ Repo Drizzle só valida sob integração (Docker); W3 default NÃO cobre o repo real (gap conhecido).
