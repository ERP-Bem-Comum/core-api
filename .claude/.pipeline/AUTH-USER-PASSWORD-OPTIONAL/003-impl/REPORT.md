# W1 (GREEN) — AUTH-USER-PASSWORD-OPTIONAL

**Skill:** ts-domain-modeler + ports-and-adapters · **Wave:** W1 · **Data:** 2026-06-02.

> Materializado pelo orquestrador-main (harness bloqueou escrita pelo subagent).
> Provas re-verificadas independentemente (regressão zero).

## Arquivos alterados

**Produção (5):**
- `domain/identity/user/types.ts:21` — `UserCore.passwordHash: PasswordHash | null` (`| null`, não `?` — `exactOptionalPropertyTypes`).
- `adapters/persistence/mappers/user.mapper.ts` — leitura `password_hash NULL → null` (sem `?? ''`); escrita `null → password_hash NULL`.
- `application/use-cases/authenticate-user.ts` — guard anti-timing (dummy verify) no ramo `passwordHash === null`.
- `application/use-cases/change-password.ts` — guard `null → invalid-credentials`.
- `application/use-cases/confirm-password-reset.ts` — guard `null → reset-token-invalid`.

`user.ts`/`errors.ts` NÃO mudaram — `register`/`changePassword` já produzem hash não-nulo; reuso de
`invalid-credentials`/`reset-token-invalid` (erro genérico anti-enumeration, sem literal novo).

**Testes (regressão zero):** a mudança de tipo propagou TS2345 em 3 testes pré-existentes
(`change-password`, `confirm-password-reset`, `register-user`) que liam `user.passwordHash` e passavam
a `verify` — corrigidos com narrowing mínimo.

**Handbook:** `DD-USER-OIDC` registrado em `handbook/domain/auth/design-decisions.md` (seção :318 + histórico :375).

## Guard anti-timing (CRÍTICO — segurança)

`authenticate-user.ts`, antes do verify real, espelhando o ramo "usuário inexistente":
```ts
if (found.value.passwordHash === null) {
  await deps.passwordHasher.verify(password.value, deps.dummyPasswordHash);
  return err('invalid-credentials');
}
```
CA3 conta exatamente 1 chamada a `verify` (lockout false p/ user fresco) → equalização provada.
Mapper leitura: `userRow.passwordHash !== null ? fromString(...) : null`. Escrita:
`user.passwordHash === null ? null : (user.passwordHash as unknown as string)`.

## Prova dos 4 gates (verificada pelo orquestrador-main)

- `pnpm run typecheck` → zero erros (mudança de tipo propaga limpa).
- `pnpm run lint` → zero erros.
- `pnpm run format:check` → "All matched files use Prettier code style!".
- `pnpm test` → **1945 / 1929 pass / 0 fail / 16 skipped** (baseline W0: 1926 pass / 3 fail → +3 CAs).
  CA5 (round-trip NULL) skipa sem Docker — sem `ERR_MODULE_NOT_FOUND`.

## Pendente

CA5 — prova end-to-end (write `passwordHash=null` → `password_hash=NULL`; read de volta) com Docker via
`pnpm run test:integration:auth` (`MYSQL_INTEGRATION=1`).

## Próximo passo

W2 (REVIEW read-only) — `code-reviewer`. Foco: guard anti-timing em TODOS os ramos sem verify real;
mapper leitura↔escrita simétrico; nenhum vazamento de PasswordHash; anti-enumeration nos use cases.
