# W0 — Testes RED · AUTH-VO-PASSWORD

- **Wave:** W0 (RED) · **Skill:** `tdd-strategist` · **Data:** 2026-05-27 · **Outcome:** RED

## Arquivos de teste (mirror)

- `tests/modules/auth/domain/credential/password-policy.test.ts` → `Password.parse` (7 `it()`)
- `tests/modules/auth/domain/credential/password-hash.test.ts` → `PasswordHash.fromString` (3 `it()`)

## Mapa CA → teste

| CA | Casos |
| :-- | :-- |
| CA1 (válida + preservação) | `'super-secret-123'` ok; `'  AbCdEfg  '` ok **sem normalizar**; boundaries 8 e 128 ok |
| CA2 (curta) | `''` e `'short12'` (7) → `err('password-too-short')` |
| CA3 (longa) | 129 chars → `err('password-too-long')` |
| CA4 (hash válido) | hash argon2id ilustrativo → ok, valor preservado |
| CA5 (hash vazio) | `''`, `'   '` → `err('password-hash-empty')` |
| CA6 (total) | `parse`/`fromString` retornam `Result`, sem throw |

## Saída (RED)

```
ℹ tests 2
ℹ pass 0
ℹ fail 2
```

Ambos `ERR_MODULE_NOT_FOUND` — `password-policy.ts`/`password-hash.ts` inexistentes. `src/` intocado.

## Decisões para o W1

- `PasswordPolicyError = 'password-too-short' | 'password-too-long'`; `PasswordHashError = 'password-hash-empty'`.
- Comprimento da senha em **[8, 128]**; sem regra de composição (NIST 800-63B).
- **NÃO normalizar** senha nem hash (preservação byte-a-byte) — divergência consciente vs Email/Permission.
- `PasswordHash` opaco: só checa não-vazio (trim só para o teste de vazio; valor preservado intacto).
- Path `domain/credential/`. YAGNI: só `parse` e `fromString`.
