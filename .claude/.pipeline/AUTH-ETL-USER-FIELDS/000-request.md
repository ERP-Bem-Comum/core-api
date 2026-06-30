# AUTH-ETL-USER-FIELDS — escopo + CAs

> Corrige a **issue #277**. Size **M**. Módulo `auth` (+ `scripts/etl`). Escopo: **paridade total**.
> ⚠️ Mudança que afeta a migração de dados legado/prod → **MCP canônico** (DDD/Evans) + **agentes especialistas** escrevem o código.

## Problema

O ETL (`provisionLegacyUser`) cria o usuário migrado via `User.register({id, email, passwordHash, roles})` — só email. `User.register` hardcoda `name/cpf/telephone/photo/collaboratorId = null`. Resultado: `auth_user` dos migrados tem `name/cpf/telephone/collaborator_id` **null**. A listagem `GET /users` lê `auth_user.name` → tela mostra "—". O dado existe e já vem validado no `orchestrate` (`validated.name/cpf/telephone` + `collaboratorRef` resolvido), mas só é gravado no `par_user_profiles` (partners), não no auth.

## Solução (paridade com createUserByAdmin)

O ETL passa a popular `auth_user.name`, `cpf`, `telephone`, `collaborator_id` a partir do legado.

**Ancoragem canônica (Evans, *DDD*, p.82 — "Reconstituting Stored Objects"):** o ETL é uma **factory de reconstituição** (importa estado legado existente), não de criação nova. Evans: *"a FACTORY reconstituting an object will handle violation of an invariant differently... a more flexible response may be necessary... some strategy for repairing such inconsistencies."* → justifica (a) estender o factory para aceitar os atributos do legado e (b) **degradar** campos opcionais inválidos para null em vez de rejeitar (como faz a criação nova).

## Decisões adotadas (mapeadas pelo Explore)

1. **Domínio:** estender `User.register` (`domain/identity/user/user.ts`) com `name?/cpf?/telephone?/photo?/collaboratorRef?` (default null) — cirúrgico, retrocompat (self-register/OIDC seguem passando só o núcleo → tudo null). NÃO criar `User.provision` nem usar `create+assignRole+updateProfile`.
2. **Validação cpf/telephone:** **degradar para null + warning** (legacyId) em falha de `Cpf.parse`/`Telephone.parse`, **dentro do `provisionLegacyUser`** (mantém VOs do auth no auth, ADR-0006). Coerente com o incidente login-500 e com o read-mapper. CPF na prática já chega válido (quarentenado antes pelo mapper ETL); telephone NÃO é validado no mapper → é o caso real de degradação.
3. **collaborator_id:** o `orchestrate` já resolve `collaboratorRef` (`resolveCollaboratorRef`, refs map de collaborators migrados antes dos users); só passar ao port. Coluna `auth_user.collaborator_id varchar(64)`, ref lógica sem FK (ADR-0006). Órfão (collaborator não migrado) já quarentena a linha.
4. **Foto FORA de escopo:** `auth.ProfilePhotoRef` é chave S3, não URL; o legado tem `avatarUrl` (URL). `auth_user.image_url` fica null; `par_user_profiles.avatarUrl` segue com a URL.
5. **Persistência:** NÃO muda — `userToInsert` já grava as 5 colunas; coluna `collaborator_id` já existe.

## Arquivos a tocar

- `src/modules/auth/domain/identity/user/user.ts` — estender `RegisterInput` + `register`.
- `src/modules/auth/application/use-cases/provision-legacy-user.ts` — input + degradação cpf/telephone + repasse ao register.
- `scripts/etl/orchestrate.ts` — passar `name/cpf/telephone/collaboratorRef` ao `provisionLegacyUser`.

## Critérios de aceite

- **CA1** — Dado um user legado com name/cpf/telephone válidos e collaborator migrado, Quando provisionado, Então `auth_user` tem os 4 campos populados; `GET /users` retorna o `name` (não "—").
- **CA2** — Dado um user legado com **telephone inválido**, Quando provisionado, Então o usuário é criado com `telephone = null` (degradado, **não** quarentenado) + warning com legacyId.
- **CA3** — Dado um user legado sem collaborator (`legacyCollaboratorId = null`), Então `collaborator_id = null` (sem erro).
- **CA4** — Self-register/criação sem perfil (núcleo só) seguem com name/cpf/telephone null (retrocompat de `User.register`).
- **CA5** — E2E na VM: re-rodar o ETL → usuários migrados passam a ter nome/cpf/telephone/vínculo (`GET /users` mostra os nomes reais).

## DoD (W3)

`typecheck` + `format:check` + `lint` + `test` verdes; `test:integration:{auth,etl}` (Docker/CI) cobrindo CA1/CA2; validação E2E na VM.
