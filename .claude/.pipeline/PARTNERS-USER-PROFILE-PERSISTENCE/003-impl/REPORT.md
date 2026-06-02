# W1 — GREEN · PARTNERS-USER-PROFILE-PERSISTENCE

**Skill:** drizzle-schema-author · **Resultado:** GREEN (mapper 8/8; suíte partners 226/226)

## Arquivos criados/editados

**Schema** `schemas/mysql.ts` — `par_user_profiles` (4ª tabela): `user_ref` PK, `name`, `cpf` UNIQUE,
`telephone`, `avatar_url?`, `collaborator_ref?` (sem FK), timestamps. Exporta `UserProfileRow`/`NewUserProfileRow`.

**Migration** `0003_absent_morph.sql` — gerada + edição manual: `COLLATE utf8mb4_bin` em
`user_ref`/`cpf`/`collaborator_ref`; ENGINE/charset; UNIQUE cpf.

**Mapper** `mappers/user-profile.mapper.ts` — `userProfileToInsert` / `userProfileFromRow` (reconstrói
`UserRef`/`Cpf`/`CollaboratorId` nullable; delega a `UserProfile.rehydrate`; domínio **não tocado**).

**Repo Drizzle** `repos/user-profile-repository.drizzle.ts` — `createDrizzleUserProfileStore`
(findByUserRef/findByCpf/save). `save` = SELECT-then-UPDATE-or-INSERT por `user_ref`; UNIQUE cpf → `user-profile-cpf-duplicate`.

**package.json** — `test:integration:partners` estendido com o user-profile repo.

## Decisões de design

- **PK = `user_ref`** (1:1); `save` faz update quando o user_ref já existe (não duplica).
- **`collaborator_ref` sem FK** — referência por ID (ADR-0014), nullable.
- **Sem soft-delete** no schema (segue auth.User).

## Confirmação GREEN

```
mapper unit:    ℹ tests 8   · pass 8
suíte partners: ℹ tests 226 · pass 226 · fail 0
```

> Repo Drizzle valida sob integração (Docker, `MYSQL_INTEGRATION=1`) — não rodado neste W1 (gap conhecido).
