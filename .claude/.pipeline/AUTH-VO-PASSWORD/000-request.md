# AUTH-VO-PASSWORD — VOs `Password` (política) + `PasswordHash` (opaco)

## Origem

Série [ADR-0024](../../../handbook/architecture/adr/0024-identity-and-rbac-auth-module.md), ticket D3
da Fase D. Backlog: [`.claude/.planning/AUTH-MODULE-TICKETS.md`](../../.planning/AUTH-MODULE-TICKETS.md).
O agregado `User` (D5) guarda `passwordHash: PasswordHash`; o use case `register`/`change-password`
(A2/A6) valida a senha em claro pela política **antes** de chamar o port de hashing.

## Recorte (domínio vs efeito)

- **Domínio (este ticket):** `PasswordPolicy` (regra de força — pura) e `PasswordHash` (tipo branded **opaco**).
- **Efeito (X1, fora daqui):** o hashing argon2id e a verificação vivem no port `PasswordHasher`
  (adapter). O domínio **nunca** computa hash nem vê o algoritmo.

## Dois conceitos, dois arquivos

1. `domain/credential/password-policy.ts` — `Password = Brand<string, 'Password'>` (senha em claro que
   **passou** na política) + `parse(raw): Result<Password, PasswordPolicyError>`.
2. `domain/credential/password-hash.ts` — `PasswordHash = Brand<string, 'PasswordHash'>` (hash já
   computado, opaco) + `fromString(raw): Result<PasswordHash, PasswordHashError>` (reidrata de string,
   ex.: do banco).

## Critérios de aceitação

### Política (`Password.parse`)
- **CA1 (válida):** comprimento em **[8, 128]** → `ok(Password)`. **NÃO normaliza** — caixa e espaços
  preservados exatamente (senha é sensível). Boundaries 8 e 128 são válidos.
- **CA2 (curta):** comprimento < 8 (inclui vazia) → `err('password-too-short')`.
- **CA3 (longa):** comprimento > 128 → `err('password-too-long')`.

### Hash (`PasswordHash.fromString`)
- **CA4 (válido):** hash não-vazio → `ok(PasswordHash)`, valor **preservado** (sem normalização).
- **CA5 (vazio):** vazio ou só espaços → `err('password-hash-empty')`.

### Transversal
- **CA6 (branded, total):** `parse`/`fromString` nunca lançam; sem `class`/`throw`/`new Error`.

## Fora de escopo

- Hashing/verificação argon2id (port `PasswordHasher`, ticket X1).
- Regras de composição (maiúscula/dígito/símbolo) — **decisão NIST 800-63B**: comprimento > complexidade.
  Reabrir só se a P.O. exigir política específica.
- Validação do formato interno do hash (`$argon2id$...`) — acoplaria o domínio ao algoritmo do adapter.

## Notas

- **Skill:** `ts-domain-modeler`. Padrão D, smart constructors, cast único auditado.
- **Idioma:** EN; erros kebab EN.
- **Pipeline W0→W3:** RED em `tests/modules/auth/domain/credential/{password-policy,password-hash}.test.ts`.
- **Atenção:** ao contrário de `Email`/`Permission`, senha e hash **não são normalizados** (preservação byte-a-byte). ASCII puro nos arquivos.
