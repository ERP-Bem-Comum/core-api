# Ticket AUTH-USER-PASSWORD-OPTIONAL: `passwordHash` opcional no agregado User (OIDC-ready, anti-timing)

## Contexto

A coluna `auth_user.password_hash` é **nullable** desde o schema inicial
(`src/modules/auth/adapters/persistence/schemas/mysql.ts:106`, comentário "OIDC-ready /
usuários federados não têm senha local"). Mas o **domínio** modela `passwordHash` como
`PasswordHash` **não-null** (`domain/identity/user/types.ts:17`), e o `PasswordHash`
tem como única invariante "não-vazio" (`domain/credential/password-hash.ts` →
`fromString('')` retorna `err('password-hash-empty')`).

O mapper de leitura tenta costurar essa divergência com um placeholder, mas o código
faz `?? ''` (vazio) em vez de um placeholder não-vazio:

```ts
// adapters/persistence/mappers/user.mapper.ts:152-154
const rawHash = userRow.passwordHash ?? '';            // ← vazio
const hashR = PasswordHash.fromString(rawHash);
if (!hashR.ok) return err(invalidPasswordHash('password-hash-empty'));  // ← sempre falha p/ NULL
```

**Consequência (bug latente):** todo usuário federado (`password_hash = NULL`, ex.: os
provisionados por OIDC) **falha ao hidratar** — `userFromRows` retorna
`err(UserMapperInvalidPasswordHash)`. O comentário do mapper descreve a intenção certa
(placeholder não-vazio), mas o código faz o oposto.

O mapper de **escrita** (`userToInsert`, linhas ~219-242) nunca grava `NULL` porque o
domínio exige `passwordHash: PasswordHash` não-null — então hoje a inconsistência é
"unidirecional": ninguém grava NULL pela borda do core-api, mas a ETL/legado/OIDC pode
ter gravado, e a leitura quebra.

### Dimensão de segurança (decidida por auditoria security-backend)

Tornar `passwordHash` opcional reabre um **side-channel de timing** (OWASP WSTG-ATHN,
mesma família do BE-REC-002 já implementado para usuário inexistente). Se
`authenticateUser` curto-circuitar com `err('invalid-credentials')` para
`passwordHash === null` **sem** rodar o verify, o tempo de resposta delata quais e-mails
são contas federadas (sem senha local). A correção **obriga** o dummy verify nesse ramo,
espelhando o ramo "usuário não encontrado" (`authenticate-user.ts:92-97`).

## Correção decidida (auditoria de 2 especialistas: security-backend + drizzle-orm)

**OPÇÃO A — `passwordHash` opcional no domínio.** `UserCore.passwordHash: PasswordHash | null`.
Modela explicitamente a ausência de credencial local; o compilador (com
`exactOptionalPropertyTypes` + `strictNullChecks`) força todo consumidor a tratar o `null`.

- **Opção B (sentinel/placeholder não-vazio):** rejeitada — esconde o estado real atrás de
  um valor mágico; o verify rodaria contra lixo; anti-padrão.
- **Opção C (discriminated union `LocalUser | FederatedUser`):** rejeitada para este ticket —
  over-engineering; `| null` já dá fail-closed por tipo. Reavaliar se federação crescer.

## Escopo

Blast radius confirmado lendo o código real (8-10 arquivos):

| Arquivo | Mudança (W1) |
| :--- | :--- |
| `domain/identity/user/types.ts:17` | `passwordHash: PasswordHash \| null` em `UserCore`. |
| `domain/identity/user/user.ts` | `RegisterInput.passwordHash` aceita `\| null`; `register`/`disable`/`assignRole` propagam; `changePassword(user, newHash)` recebe hash **não-null** (resultado da troca é sempre credencial local — ok). |
| `domain/identity/user/errors.ts:5` | considerar `'user-has-no-local-credential'` (avaliar em W1; pode não ser necessário se os use cases reusarem `invalid-credentials`). |
| `adapters/persistence/mappers/user.mapper.ts:147-154` | leitura: `userRow.passwordHash === null → passwordHash: null` (sem `?? ''`, sem `fromString` quando null). |
| `adapters/persistence/mappers/user.mapper.ts:~224/236` | escrita: grava `password_hash = null` quando `user.passwordHash === null`. |
| `application/use-cases/authenticate-user.ts:~109` | **GUARD ANTI-TIMING (crítico):** se `found.value.passwordHash === null` → dummy verify + `err('invalid-credentials')`, espelhando o ramo das linhas 92-97. |
| `application/use-cases/change-password.ts:~82` | guard `null` antes do verify da senha atual (user OIDC não tem senha local p/ re-autenticar). |
| `application/use-cases/confirm-password-reset.ts` | revisar semântica de reset p/ user OIDC (provável erro dedicado ou `reset-token-invalid` anti-enumeration). |

## Fora de escopo

- Discriminated union `LocalUser | FederatedUser` (Opção C).
- Implementar fluxo de login OIDC propriamente dito (federação real). Aqui só garantimos
  que um user **sem** senha local hidrata e **nunca** autentica por senha.
- Tocar qualquer outro módulo (`ctr_*`, `fin_*`, `par_*`). Apenas `auth`.
- Migration de schema (a coluna já é nullable).

## Critérios de aceite

- [ ] **CA1 (mapper leitura):** `userFromRows` com `userRow.passwordHash = null` hidrata o
      `User` com `passwordHash: null` e `status: 'active'` (hoje retorna
      `err(UserMapperInvalidPasswordHash)`).
- [ ] **CA2 (mapper leitura, regressão):** `userFromRows` com hash não-vazio continua
      hidratando `passwordHash` brandado normalmente.
- [ ] **CA3 (authenticate, anti-timing):** `authenticateUser` para user com
      `passwordHash = null` retorna `err('invalid-credentials')` **E** o `passwordHasher.verify`
      É chamado exatamente 1× (dummy verify) — provado por fake hasher que conta `verify`.
- [ ] **CA4 (change-password):** `changePassword` para user sem credencial local retorna
      erro adequado (não crasha, não verifica `null`).
- [ ] **CA5 (mapper escrita, round-trip, gated `MYSQL_INTEGRATION=1`):** salvar um user com
      `passwordHash = null` grava `password_hash = NULL` e `findById` reidrata com
      `passwordHash: null`.
- [ ] **CA6 (typecheck):** `pnpm run typecheck` zero erros — o compilador força tratar o
      `| null` em todos os consumidores (prova do fail-closed).
- [ ] **CA7 (lint):** `pnpm run lint` zero erros.

## Decisão de domínio a registrar (gap de DD)

Não há nenhum `DD-*` sobre OIDC/federação em
`handbook/domain/auth/design-decisions.md`. **Proposta `DD-USER-OIDC`:**

> **DD-USER-OIDC — Usuário federado não tem credencial local.**
> Um `User` pode ter `passwordHash = null` (usuário federado/OIDC). Esse usuário **nunca**
> autentica por senha local: `authenticateUser` e `changePassword` o tratam como
> "sem credencial", retornando o mesmo erro genérico de senha inválida. Para não vazar
> quais contas são federadas (timing side-channel, OWASP WSTG-ATHN), o ramo
> `passwordHash === null` **roda o dummy verify** antes de responder, espelhando o ramo
> "usuário inexistente" (BE-REC-002). O mapper de persistência mapeia
> `password_hash NULL ↔ passwordHash null` byte-a-byte, sem placeholder.

O registro formal em `handbook/domain/auth/design-decisions.md` fica para W1 (ou nota no
REPORT da W1).

## Referências

- `src/modules/auth/adapters/persistence/schemas/mysql.ts:95-137` (coluna nullable + CHECKs).
- `src/modules/auth/domain/identity/user/types.ts`, `.../user.ts`, `.../errors.ts`.
- `src/modules/auth/application/use-cases/authenticate-user.ts` (BE-REC-002, ramo 92-97).
- `src/modules/auth/application/use-cases/change-password.ts`, `confirm-password-reset.ts`.
- `.claude/rules/domain.md`, `.claude/rules/application.md`, `.claude/rules/adapters.md`,
  `.claude/rules/testing.md`.
- ADR-0006 (ports & adapters / module isolation), ADR-0020 (MySQL único — nullable ok),
  ADR-0014 (isolamento por prefixo `auth_*`).
- OWASP WSTG-ATHN (timing/enumeration); BE-REC-002 já implementado.

## Estado do ambiente (W0)

- Docker **OFF** → testes de integração auth (Drizzle, `MYSQL_INTEGRATION=1`) ficam
  skipped. OK para W0 RED (ver `[[project-test-integration-auth-gap]]`). CA5 entra como
  teste gated cujo RED é provado por inspeção + execução do gate dedicado quando Docker
  estiver ON (W1/W3).
