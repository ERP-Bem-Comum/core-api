# W0 (RED) — AUTH-USER-PASSWORD-OPTIONAL

**Skill:** tdd-strategist · **Wave:** W0 RED · **Data:** 2026-06-02 · **Ambiente:** Docker OFF.

> Materializado pelo orquestrador-main (harness bloqueou escrita de `.md` pelo subagent).
> Diagnóstico fundado em auditoria de 2 especialistas (security-backend + drizzle-orm).

## Objetivo

Cobrir com RED o bug em que user federado (`password_hash=NULL`) falha ao hidratar e, com a
**Opção A** (`passwordHash: PasswordHash | null`), nunca autentica por senha local —
**equalizando timing via dummy verify** (OWASP WSTG-ATHN, anti-enumeração de contas).

## Bug + correção (Opção A)

- `user.mapper.ts:152` `?? ''` → `PasswordHash.fromString('')` → `err('password-hash-empty')`.
  Coluna `auth_user.password_hash` nullable (`schemas/mysql.ts:106`). Divergência: domínio
  `UserCore.passwordHash: PasswordHash` (`types.ts:17`, não-null) vs schema nullable.
- Correção: `UserCore.passwordHash: PasswordHash | null` — invariante "user OIDC nunca autentica
  local" provada pelo compilador. Guard anti-timing em `authenticate-user.ts` (dummy verify antes
  de retornar `invalid-credentials`).

## Arquivos de teste (RED)

- `tests/modules/auth/adapters/persistence/mappers/user.mapper.test.ts` — CA1/CA2/CA2b (mapper
  hidrata `password_hash=NULL` → `passwordHash:null`).
- `tests/modules/auth/application/use-cases/federated-user-no-password.test.ts` — CA3/CA4
  (authenticateUser/changePassword com `passwordHash=null` → erro + **dummy verify chamado**,
  via fake passwordHasher que conta chamadas a `verify`).
- `tests/modules/auth/adapters/persistence/user-federated-roundtrip.drizzle.test.ts` — CA5 gated
  (`MYSQL_INTEGRATION=1`): write `passwordHash=null` → `password_hash=NULL` no banco.

## Blast radius confirmado (8 arquivos de produção)

`types.ts:17` · `user.ts` (RegisterInput/rehydrate) · `password-hash.ts` · `user.mapper.ts:152,224,236`
· `authenticate-user.ts:109` (guard + dummy verify, espelhar :92-97) · `change-password.ts:82` ·
`confirm-password-reset.ts:88` (semântica reset OIDC) · `errors.ts:5` (`user-has-no-local-credential`).

## Prova do RED

- `pnpm test`: **1945 / 1926 pass / 3 fail / 16 skipped**. Os 3 fails são os CAs (zero regressão):
  CA1 `UserMapperInvalidPasswordHash`; CA3/CA4 `ERR_INVALID_ARG_TYPE Received null` em
  `authenticate-user.ts:109` / `change-password.ts:82`.
- `pnpm run typecheck`: verde. CA6 (compilador forçando tratar `| null`) é prova da mudança de tipo
  em W1. CA5 skipa com Docker OFF.

## DD proposta (gap)

Não há `DD-*` sobre OIDC/federação. Proposta **`DD-USER-OIDC`** no `000-request.md`: user federado
tem `passwordHash=null`; nunca autentica por senha local; auth equaliza timing via dummy verify.
Registro formal em `handbook/domain/auth/design-decisions.md` em W1.

## Próximo passo

W1 GREEN (skill `ts-domain-modeler` + `ports-and-adapters`), ordem: types → user → errors → mapper →
authenticate-user → change-password/confirm-password-reset. Checkpoint humano antes.
