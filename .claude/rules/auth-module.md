---
paths:
  - "src/modules/auth/**/*.ts"
  - "tests/modules/auth/**/*.ts"
---

# Módulo Auth — identidade e RBAC

Identidade própria, **OIDC-ready** ([ADR-0024](../../handbook/architecture/adr/0024-identity-and-rbac-auth-module.md)): o core-api guarda usuários e verifica credencial localmente, com a fonte de autenticação abstraída por um port `Authenticator`. Federação não foi descartada — foi adiada, e plugar um `OidcAuthenticator` não deve exigir refactor de domínio.

RBAC é por **permissões granulares**, não por checagem de papel. Teste de autorização se escreve contra o `PermissionCatalog` + `authorize`, nunca montando uma `Role` a partir de string crua.

## ⚠️ RBAC não é ponto único ([ADR-0052](../../handbook/architecture/adr/0052-rbac-bypass-flag.md))

O ponto de aplicação principal é `buildAuthHttpDeps`, que embrulha `authorize`/`hasPermission` por injeção — todos os plugins de módulo herdam. **Mas quatro use cases do próprio `auth` fazem `authorize` embutido, fora do wrapper**: `assignRole`, `revokeRole`, e a concessão de alçada em `createUserByAdmin` e `updateUserProfile` (DD-USER-07, auto-gestão de RBAC).

**Consequência prática:** ao mexer em autorização, alterar só o wrapper deixa esses quatro para trás. Todo use case novo que faça `authorize` embutido precisa receber o `rbacMode` (via `authorizeActor`) — senão o modo `bypass` fica inconsistente.

## `AUTH_RBAC_MODE`

| Valor                                  | Efeito                                                          |
| -------------------------------------- | ---------------------------------------------------------------- |
| `enforced` (**default**, e todo valor inválido) | RBAC fail-closed — comportamento normal                 |
| `bypass`                               | `authorize` vira no-op; `hasPermission` sempre `true`           |

- **Autenticação não muda em modo algum.** `requireAuth` segue obrigatório: sem `Bearer` válido é **401**. O bypass elimina o **403**, não o 401.
- **O bypass nunca pode ser silencioso.** Ele nasceu num contexto de combate a fallback silencioso (#456/#462/#474) — desligar autorização sem sinal seria a pior instância dessa classe.
- **Uma proteção de integridade sobrevive ao bypass:** `revokeRole` impede o ator de revogar de si a própria capacidade de gestão (`cannot-self-lockout`). Isso protege o **estado persistido** — não deixar o sistema sem gestor quando o `enforced` voltar — e por isso vale em qualquer modo. Não a condicione ao `rbacMode`.

## E-mail de fluxo de credencial

`auth` é **produtor** de evento, não chamador do `notifications`: `PasswordResetRequested` vai para o outbox do próprio `auth`, na mesma transação do save do token ([ADR-0047](../../handbook/architecture/adr/0047-transactional-email-via-producer-domain-event.md)). Ver [`application.md`](./application.md).

- **Anti-enumeração preservada:** o evento só é emitido quando a conta existe e está ativa.
- O evento carrega o token de uso único → **o outbox é interno e não é logado**.
