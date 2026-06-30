# PARTNERS-COLLABORATOR-PERSISTENCE — Adapter Drizzle + tabela `par_collaborators`

> **Size:** L · **ADR:** [ADR-0031](../../../handbook/architecture/adr/0031-partners-registry-module.md) · ADR-0020/0014/0013 · **Épico:** `.claude/.planning/EPIC-PARTNERS-CADASTROS.md` (Fase 4)
> **Espelha:** `PARTNERS-SUPPLIER-PERSISTENCE` (template já entregue). Reusa `drizzle.config.partners.ts`, driver `openPartnersMysql` e `migrationsTable __drizzle_migrations_partners` já existentes — **3ª tabela** do módulo `partners`, mesmo DB `core`.

## Contexto

Fecha o agregado `Collaborator`: persistência MySQL real, implementando o port `CollaboratorRepository`
(entregue em `PARTNERS-COLLABORATOR-USECASES`). Diferenças-chave vs. Supplier:

- **Duas unicidades** — `cpf` UNIQUE **e** `email` UNIQUE (legado `collaborators`). Dois caminhos de
  `ER_DUP_ENTRY` (1062) → `collaborator-cpf-duplicate` / `collaborator-email-duplicate`.
- **Sem destino de pagamento embedded** (mais simples que supplier nesse ponto), mas **muitos campos
  pessoais nullable + enums** (`occupation_area`, `employment_relationship`, `gender_identity`, `race`,
  `education`, `food_category`, `disable_by`).
- **Duas dimensões de estado**: `registration_status` (PreRegistration/Complete — varchar livre, sem
  CHECK de enum, igual serviceCategory) + soft-delete (`active`/`deactivated_at`/`disable_by`).
- **`Collaborator.rehydrate` já existe** (entregue no DOMAIN) — este ticket **NÃO toca o domínio**, só
  consome `rehydrate` no mapper.

## Escopo

1. **Schema** `adapters/persistence/schemas/mysql.ts` — adicionar `par_collaborators` (ADR-0020):
   - PRE_CADASTRO: `id` varchar(36) PK, `name`/`email`/`role` varchar, `cpf` varchar(11),
     `occupation_area` varchar(10), `start_of_contract` datetime(3), `employment_relationship` varchar(5),
     `registration_status` varchar(20).
   - Pessoais nullable: `rg` varchar(20), `date_of_birth` datetime(3), `gender_identity` varchar(30),
     `race` varchar(30), `education` varchar(30), `food_category` varchar(20),
     `food_category_description` varchar(255), `complete_address` varchar(500), `telephone` varchar(30),
     `emergency_contact_name` varchar(255), `emergency_contact_telephone` varchar(30),
     `allergies` varchar(500), `biography` varchar(2000), `experience_in_the_public_sector` boolean.
   - Soft-delete: `active` boolean default true, `disable_by` varchar(40) nullable,
     `deactivated_at` datetime(3) nullable. Timestamps `created_at`/`updated_at` datetime(3).
   - CHECK soft-delete (Inactive carrega disableBy **e** deactivatedAt):
     `((active = FALSE) = (deactivated_at IS NOT NULL)) AND ((active = FALSE) = (disable_by IS NOT NULL))`.
   - UNIQUE `par_collaborators_cpf_idx` (cpf) **e** `par_collaborators_email_idx` (email).
   - Exporta `CollaboratorRow` / `NewCollaboratorRow`.
2. **Migration** `0002_*.sql` via `pnpm db:generate:partners` + edição manual (ENGINE/charset;
   `utf8mb4_bin` em `id`/`cpf`; UNIQUE em `email` mantém collation default).
3. **Mapper** `adapters/persistence/mappers/collaborator.mapper.ts` — `collaboratorToInsert(c, now)` /
   `collaboratorFromRow(row): Result<Collaborator, CollaboratorMapperError>` (row→domínio via
   `Collaborator.rehydrate`; reconstrói VOs/enums na borda — `Cpf`, `OccupationArea`,
   `EmploymentRelationship`, `GenderIdentity`/`Race`/`Education`/`FoodCategory`/`DisableReason` nullable;
   valida `registration_status`; rejeita estado inválido).
4. **Repo Drizzle** `adapters/persistence/repos/collaborator-repository.drizzle.ts` — implementa
   `CollaboratorRepository` (findById/findByCpf/findByEmail/list/save). `save` = SELECT-then-UPDATE-or-INSERT
   (ADR-0020 sem ODKU); UNIQUE cpf → `collaborator-cpf-duplicate`, UNIQUE email → `collaborator-email-duplicate`
   (discriminar pelo nome do índice no `sqlMessage`). Transient → `collaborator-repo-unavailable`.
5. **Testes**: mapper round-trip unit (gate default) + repo integração (`MYSQL_INTEGRATION=1`, gated Docker).
6. Estender `test:integration:partners` para incluir a suíte do collaborator repo.

## Fora de escopo

- CLI, public-api, eventos/outbox de Collaborator; `collaborator_history` projection; `/users` profile.
- Mudança no domínio (`rehydrate` já entregue).

## Critérios de aceite

- [ ] Mapper round-trip: `collaboratorFromRow(collaboratorToInsert(c, now))` reconstrói o agregado para
      Active+PreRegistration, Active+Complete e Inactive — unit, gate default.
- [ ] `collaboratorFromRow` rejeita id/cpf/enum inválidos e estado incoerente (Inactive sem disable_by/deactivated_at).
- [ ] `db:generate:partners` emite `par_collaborators`; migration tem ENGINE/charset + `utf8mb4_bin` em
      `id`/`cpf` + o CHECK de soft-delete + os 2 UNIQUE.
- [ ] **(Integração, gated)** repo: save→findById; findByCpf; findByEmail; list; 2º save com mesmo cpf
      (id distinto) → `collaborator-cpf-duplicate`; 2º save com mesmo email → `collaborator-email-duplicate`.
- [ ] Gate default (W3): typecheck + lint + format + `pnpm test` verdes (mapper unit roda; integração skipped sem `MYSQL_INTEGRATION`).
- [ ] `test:integration:partners` cobre collaborator (invocação manual — gap conhecido).

## Notas de disciplina

- ADR-0020: sem ENUM/JSON/ODKU/AUTO_INCREMENT; UUID varchar(36); datetime(3) UTC; enums são varchar.
- ADR-0014: prefixo `par_*`, reusa `migrationsTable __drizzle_migrations_partners`. Boundary: zero throw cruza a borda (Result).
- ⚠️ Repo Drizzle só valida sob integração (Docker); W3 default NÃO cobre o repo real (gap documentado).
- Gate local: `MYSQL_PORT=3307` OU `docker stop bemcomum-mysql` (com autorização) para evitar conflito de porta da suíte de infra.
