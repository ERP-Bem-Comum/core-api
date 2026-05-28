# W1 — Implementação GREEN · AUTH-VO-PASSWORD

- **Wave:** W1 (GREEN) · **Skill:** `ts-domain-modeler` · **Data:** 2026-05-27 · **Outcome:** GREEN (10/10 · typecheck limpo)

## Arquivos criados

- `src/modules/auth/domain/credential/password-policy.ts` — `Password` + `parse` (política de força).
- `src/modules/auth/domain/credential/password-hash.ts` — `PasswordHash` (opaco) + `fromString`.

```ts
// password-policy.ts
export type Password = Brand<string, 'Password'>;
export type PasswordPolicyError = 'password-too-short' | 'password-too-long';
export const parse = (raw: string): Result<Password, PasswordPolicyError> => { ... };

// password-hash.ts
export type PasswordHash = Brand<string, 'PasswordHash'>;
export type PasswordHashError = 'password-hash-empty';
export const fromString = (raw: string): Result<PasswordHash, PasswordHashError> => { ... };
```

## Decisões aplicadas

- **Recorte domínio/efeito respeitado:** nenhum hashing/verificação aqui — só política (regra de negócio pura) e tipo opaco. argon2id fica no port `PasswordHasher` (X1).
- **Sem normalização** (divergência consciente vs `Email`/`Permission`): `parse` preserva a senha exatamente; `fromString` preserva o hash byte-a-byte. O `trim()` em `fromString` serve **apenas** ao teste de vazio, não muta o valor retornado.
- **Política:** comprimento [8, 128], sem regras de composição (NIST 800-63B — comprimento > complexidade). Comentado no código.
- **`PasswordHash` opaco:** única invariante de domínio é não-vazio; formato do algoritmo não é validado (evita acoplar ao adapter).
- YAGNI: só `parse` e `fromString`.

## Testes

```
ℹ tests 10
ℹ pass 10
ℹ fail 0
```
`pnpm run typecheck`: sem erros.

## Checklist auto-revisão
- [x] Zero `throw`/`class`/`this`/`any`; cast único auditado por VO.
- [x] Return types explícitos; `import type`; `.ts`; ASCII puro.
- [x] Identificadores EN; erros kebab EN; isolamento de módulo.

## Próxima wave
W2 (code review read-only).
