# PARTNERS-COLLABORATOR-DOMAIN — Agregado de domínio puro `Collaborator`

> **Size:** L · **ADR:** [ADR-0031](../../../handbook/architecture/adr/0031-partners-registry-module.md) · **Épico:** `.claude/.planning/EPIC-PARTNERS-CADASTROS.md` (Fase 4)
> **Template:** `PARTNERS-FINANCIER-DOMAIN` / `PARTNERS-SUPPLIER-DOMAIN` (padrão por camada). Skill: `ts-domain-modeler`.

## Contexto

3º e maior agregado do módulo `partners` (legado `collaborators`, `database.dbml:84` /
`database-er.md:135`). **Domínio puro apenas** — zero infra. Persistência, use cases, CSV, history e
`/users` profile são tickets posteriores. **History (`collaborator_history`) NÃO é entidade filha** —
é projeção/audit (planning §"collaborator_history"), fora deste ticket.

### Duas dimensões de estado ORTOGONAIS (decisão de modelagem central)

1. **Registro** (monotônico): `registrationStatus: 'PreRegistration' | 'Complete'`
   (legado `registration_status` PRE_CADASTRO/CADASTRO_COMPLETO). Modelado como **campo de união
   simples no core** — a transição preenche campos pessoais, mas (ver D3) **não há subconjunto
   obrigatório enforçado**; logo não refina o tipo. Tradução EN coerente com Active/Inactive.
2. **Soft-delete** (discriminado, como supplier/financier): `status: 'Active' | 'Inactive'`.
   `Inactive` carrega `disableBy: DisableReason` (**obrigatório** ao desativar) + `deactivatedAt: Date`.

## Escopo (`src/modules/partners/domain/collaborator/`)

1. **VO `CollaboratorId`** (`collaborator-id.ts`) — branded, `generate`/`rehydrate` (espelha supplier-id).
2. **Enums como union types** (`enums.ts` ou arquivos por enum). Mantêm **código legado** como literal
   (precedente `serviceCategory`; D2 exige manter opaco em race/genderIdentity/occupationArea — e por
   coerência os demais BR-específicos seguem igual; PT no formatter futuro):
   - `OccupationArea`: `PARC|DDI|DCE|EPV`
   - `EmploymentRelationship`: `CLT|PJ`
   - `GenderIdentity`: 8 valores (PREFIRO_NAO_RESPONDER|HOMEM_CIS|HOMEM_TRANS|MULHER_CIS|MULHER_TRANS|TRAVESTI|NAO_BINARIO|OUTRO)
   - `Race`: 6 (AMARELO|BRANCO|PARDO|INDIGENA|PRETO|PREFIRO_NAO_RESPONDER)
   - `FoodCategory`: 6 (ONIVORO|VEGANO|VEGETARIANO|PESCETARIANO|OUTRO|PREFIRO_NAO_RESPONDER)
   - `Education`: 7 (EDUCACAO_INFANTIL|ENSINO_FUNDAMENTAL|ENSINO_MEDIO|ENSINO_SUPERIOR|POS_GRADUACAO|MESTRADO|DOUTORADO)
   - `DisableReason` (legado `disable_by`): 4 (DESLIGAMENTO_ABC|FALECIMENTO|TEMPO_CONTRATO_FINALIZADO|SOLICITACAO_RESCISAO_CONTRATUAL)
   - Cada enum com smart `parse(raw): Result<T, '...-invalid'>` (espelha `service-category.ts`).
3. **`types.ts`** — `CollaboratorCore` (campos PRE_CADASTRO obrigatórios + pessoais nullable),
   `ActiveCollaborator`, `InactiveCollaborator` (+`disableBy`/`deactivatedAt`), `Collaborator` union;
   `RegisterCollaboratorInput`, `CompleteRegistrationInput`, `RehydrateCollaboratorInput`.
   - PRE_CADASTRO obrigatórios (OpenAPI `CreateCollaborator.required`): `name, email, cpf,
     occupationArea, role, startOfContract, employmentRelationship`.
   - Pessoais nullable (preenchidos em completeRegistration): `rg, dateOfBirth, genderIdentity, race,
     education, foodCategory, foodCategoryDescription, completeAddress, telephone,
     emergencyContactName, emergencyContactTelephone, allergies, biography, experienceInThePublicSector`.
   - `cpf` reusa VO `Cpf` do kernel; `email` validado inline (regex, até VO Email migrar — D4).
4. **`events.ts`** — `CollaboratorRegistered`, `CollaboratorRegistrationCompleted`,
   `CollaboratorDeactivated`, `CollaboratorReactivated` (EN passado, `occurredAt` injetado).
5. **`errors.ts`** — string union kebab EN (`collaborator-name-required`, `invalid-cpf`,
   `invalid-occupation-area`, `collaborator-already-inactive`, `collaborator-already-active`,
   `collaborator-already-complete`, `collaborator-inactive-requires-disable-reason`, etc. + erros dos enums).
6. **`collaborator.ts`** — operações (IDs/instantes injetados, `Result`, sem evento em `rehydrate`):
   - `register(input)` → `ActiveCollaborator` em `PreRegistration` + `CollaboratorRegistered`.
   - `completeRegistration(collaborator, personal, at)` → `registrationStatus='Complete'` + merge dos
     pessoais + `CollaboratorRegistrationCompleted`. Guard: deve estar em `PreRegistration` (senão
     `collaborator-already-complete`). **D3:** sem subconjunto obrigatório (OpenAPI all-optional); se
     P.O. definir campos mandatórios depois, vira guard localizado aqui.
   - `deactivate(collaborator, disableBy, at)` → `InactiveCollaborator` + `CollaboratorDeactivated`.
   - `reactivate(collaborator, at)` → `ActiveCollaborator` + `CollaboratorReactivated`.
   - `rehydrate(input)` → reconstrói estado (registro + soft-delete) sem evento.

## Fora de escopo

- Persistência (`par_collaborators`), use cases + port, CSV, history projection
  (`par_collaborator_history`), `/users` profile, role-change/update, bulk import. Tickets posteriores.
- `migrate-occupation-area` / `history/import` (são migration/seed, não produto).

## Critérios de aceite

- [ ] Cada enum: `parse` aceita os valores legados e rejeita desconhecido com erro kebab.
- [ ] `register` exige os 7 campos PRE_CADASTRO; nasce `Active`+`PreRegistration`; rejeita cpf/email/enum inválidos; emite `CollaboratorRegistered`.
- [ ] `completeRegistration` em PreRegistration → `Complete` + merge pessoais + evento; em Complete → `collaborator-already-complete`.
- [ ] `deactivate` exige `disableBy`; → `Inactive` (com `disableBy`+`deactivatedAt`) + evento; em Inactive → `collaborator-already-inactive`.
- [ ] `reactivate` → `Active` (limpa disableBy/deactivatedAt) + evento; em Active → `collaborator-already-active`.
- [ ] `rehydrate` reconstrói Active/Inactive × PreRegistration/Complete; incoerências (Inactive sem disableBy/deactivatedAt) → erro; sem evento.
- [ ] W3 (gate default): typecheck + format:check + test + lint verdes. Domínio puro (sem IO/infra).

## Notas de disciplina

- Domínio puro: `Result<T,E>`, branded, `Readonly`/`immutable`, switch exaustivo, zero `throw`/`class`/`any`.
- IDs e `occurredAt` injetados (sem `new Date()`/random no domínio).
- Enums mantêm código legado como literal (D2 + precedente `service-category.ts`); tradução PT fica no formatter (ticket futuro).
- Template vivo: `domain/financier/` e `domain/supplier/`. Este é o maior por nº de campos/enums e pela 2ª dimensão de estado.
