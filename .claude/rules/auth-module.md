---
paths:
  - 'src/modules/auth/**/*.ts'
  - 'tests/modules/auth/**/*.ts'
verify:
  - claim: 'o port `Authenticator` do ADR-0024 não existe em src — nem o nome'
    root: 'src'
    pattern: 'Authenticator'
    expect: []
  - claim: 'os use cases que autorizam por conta própria, fora do wrapper, são exatamente quatro'
    root: 'src/modules/auth/application/use-cases'
    pattern: 'authorizeActor'
    expect:
      - 'src/modules/auth/application/use-cases/assign-role.ts'
      - 'src/modules/auth/application/use-cases/create-user-by-admin.ts'
      - 'src/modules/auth/application/use-cases/revoke-role.ts'
      - 'src/modules/auth/application/use-cases/update-user-profile.ts'
---

Identidade própria e RBAC por permissão granular ([ADR-0024](../../handbook/architecture/adr/0024-identity-and-rbac-auth-module.md)). Teste de autorização se escreve contra o `PermissionCatalog` + `authorize`, nunca montando uma `Role` a partir de string crua. A resolução de `AUTH_RBAC_MODE` — default `enforced`, typo não abre, bypass não toca o 401 — **já é cobrada por teste**: `tests/modules/auth/adapters/http/rbac-mode.test.ts` (CA1–CA3) e `rbac-bypass.routes.test.ts` (CA4–CA7). Não repetir aqui. O que segue é o que nenhum deles pega.

- **O port `Authenticator` não existe — e o ADR-0024 fala dele como se existisse.** O ADR o cita quatro vezes (§1, §Consequências, §A, §Evolução) prometendo que "um `OidcAuthenticator` pode ser plugado depois sem refactor de domínio". Não há **nenhuma** ocorrência do nome em `src/` ou `tests/`. O que existe de OIDC-ready é uma coisa só, e é real: `password_hash` **nullable** em `auth_user`. A verificação de credencial é o **corpo** de `authenticate-user.ts`, que depende de `PasswordHasher`, `TokenIssuer`, `RefreshTokenMinter` e `LoginLockoutStore` — quatro ports que abstraem o *como*, nenhum deles a **fonte** da autenticação. ⚠️ Consequência para a migração Cognito (issue #603): **não há adapter a plugar.** Planejar federação como "implementar o port que já está lá" parte de premissa falsa — o ponto de extensão precisa ser criado antes, e isso é mudança de use case, não de adapter. Mesma classe do read/write split do ADR-0026 que motivou a [spec 040](../../handbook/specs/040-rules-match-code-reality/spec.md): afirmação de ADR que o código nunca implementou.

- **RBAC não é ponto único, e o wrapper não alcança quatro use cases.** O ponto de aplicação principal é `buildAuthHttpDeps`, que embrulha `authorize`/`hasPermission` por injeção — todo plugin de módulo herda. Mas `assign-role`, `revoke-role`, `create-user-by-admin` e `update-user-profile` chamam `authorizeActor(deps.rbacMode, …, 'user:assign-role')` **dentro do use case**, porque concedem alçada (DD-USER-07, auto-gestão de RBAC). Alterar só o wrapper deixa esses quatro para trás. Use case novo que autorize por conta própria precisa receber o `rbacMode` — senão o modo `bypass` fica inconsistente ([ADR-0052](../../handbook/architecture/adr/0052-rbac-bypass-flag.md)).

- **Uma proteção sobrevive ao bypass de propósito, e a assimetria é deliberada.** `revoke-role.ts:88` chama `authorize` **direto** — não `authorizeActor` — ao impedir que o ator revogue de si a própria capacidade de gestão (`cannot-self-lockout`). Isso protege o **estado persistido**: não deixar o sistema sem gestor quando o `enforced` voltar. ⚠️ Trocar por `authorizeActor` "por consistência" com os outros quatro faz o bypass permitir o auto-lockout, e o estrago só aparece quando alguém desligar a flag. O `revoke-role.test.ts` cobre o caso (CA6/CA7) mas **não sob bypass** — a regressão passaria verde.

- **`auth` é produtor de evento, não chamador do `notifications`.** `PasswordResetRequested` vai para o `auth_outbox` na **mesma transação** do save do token ([ADR-0047](../../handbook/architecture/adr/0047-transactional-email-via-producer-domain-event.md)); quem envia é o worker `email-dispatch`. Duas consequências no ponto de edição: a **anti-enumeração** depende de o evento só ser emitido para conta existente e ativa — `request-password-reset.ts:51` devolve `ok(undefined)` antes disso, e adiantar a emissão vaza quais e-mails existem; e o evento **carrega o token de uso único**, então esse outbox não é logado.
