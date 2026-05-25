# 003 - W1 (GREEN) - CTR-EMAIL-PORT

**Skill:** main-session (nodejs-fs-scripter + ts-domain-modeler patterns).
**Data:** 2026-05-21.
**Veredito:** GREEN - 10/10 tests pass + typecheck verde + lint verde. Modulo `notifications` criado seguindo ADR-0006 + ADR-0010.

---

## Arquivos criados

| Arquivo | Linhas | Responsabilidade |
| :--- | ---: | :--- |
| `src/modules/notifications/domain/email/address.ts` | 25 | EmailAddress branded + parse smart constructor |
| `src/modules/notifications/domain/email/subject.ts` | 23 | EmailSubject branded + parse smart constructor |
| `src/modules/notifications/domain/email/types.ts` | 30 | EmailMessage, EmailReceipt, EmailError tagged union |
| `src/modules/notifications/application/ports/email-sender.ts` | 18 | type EmailSender |
| `src/modules/notifications/adapters/email/in-memory.ts` | 40 | createInMemoryEmailSender + InMemoryEmailSender type |
| `src/modules/notifications/public-api/index.ts` | 26 | Barrel para outros modulos consumirem |

Total: ~162 linhas (size S confirmado).

---

## Decisoes de design

### 1. Padrao `module-as-namespace` aplicado (igual money.ts/contract-id.ts)

Cada VO file (`address.ts`, `subject.ts`) exporta:
- `type X = Brand<string, 'X'>`
- `type XError = '...' | '...'`
- `const parse = (raw: string): Result<X, XError>`

Consumers internos do modulo fazem `import * as EmailAddress from '...address.ts'` e chamam `EmailAddress.parse(raw)`. Tests do W0 ja seguiam esse padrao.

### 2. Public API renomeia `parse` para evitar conflito com tipo

Problema: `export type { EmailAddress }` + `export * as EmailAddress` no mesmo barrel causa `TS2300 Duplicate identifier`. Solucao: o public-api re-exporta `parse` com prefixo (`parseEmailAddress`, `parseEmailSubject`):

```ts
export type { EmailAddress, EmailAddressError } from '...address.ts';
export { parse as parseEmailAddress } from '...address.ts';
```

Consumers externos (outros modulos) usam `parseEmailAddress(raw)` direto, sem namespace. Internos continuam com namespace pattern.

**Trade-off:** dois estilos coexistindo no projeto. Aceitavel - cada um tem contexto claro (interno vs externo).

### 3. `await Promise.resolve()` no `send` do InMemory

ESLint `@typescript-eslint/require-await` exige que async functions tenham `await`. Como `send` e async-by-contract (port retorna `Promise<Result>`) mas o InMemory nao faz I/O, adicionei `await Promise.resolve()` no inicio. Trivial e satisfaz a regra.

### 4. ASCII puro aplicado preventivamente

Todos os 6 arquivos novos usam apenas chars ASCII em comentarios e strings (licao da serie Pipeline Tooling sobre Node 24 strip-types). Zero `TS1127 Invalid character`.

### 5. `randomUUID()` + `new Date().toISOString()`

`crypto.randomUUID()` retorna UUID v4 (formato `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx` com bits especificos). Regex no test CA-T7 valida esses bits. `new Date().toISOString()` retorna `YYYY-MM-DDTHH:mm:ss.sssZ`, matched pelo regex `ISO_8601` no test.

### 6. Mutavel dentro da closure do InMemory

O array `sent` e mutado via `push` e `length = 0`. Aceitavel porque:
- E adapter de teste (nao dominio).
- Encapsulado em closure - inacessivel de fora exceto via `getSent()/clear()`.
- Retorna `readonly EmailMessage[]` no `getSent` (consumers nao podem mutar).

---

## Resultado dos gates

```
$ pnpm run typecheck
(zero erros)

$ pnpm run lint -- src/modules/notifications tests/modules/notifications
(zero erros)

$ node --test --experimental-strip-types tests/modules/notifications/**/*.test.ts
ℹ tests 10
ℹ suites 3
ℹ pass 10
ℹ fail 0
ℹ duration_ms 223
```

Detalhe dos 10 tests:
- `address.test.ts`: 3 (T1 valido, T2 invalid format, T3 too long)
- `subject.test.ts`: 3 (T4 valido, T5 empty, T6 too long)
- `in-memory.test.ts`: 4 (T7 send + receipt, T8 cumulative, T9 clear, T10 smoke type)

---

## Criterios de aceitacao atendidos

| CA | Status | Evidencia |
| :--- | :---: | :--- |
| CA1 - EmailAddress + EmailSubject branded + smart constructors | OK | address.ts + subject.ts |
| CA2 - EmailSender port sem implementacao | OK | application/ports/email-sender.ts |
| CA3 - InMemoryEmailSender expoe getSent + clear | OK | adapters/email/in-memory.ts |
| CA4 - public-api/index.ts barrel | OK | public-api/index.ts |
| CA5 - randomUUID + ISO toISOString | OK | in-memory.ts:24-26 + CA-T7 valida regex |
| CA6 - 10 tests CA-T1..T10 | OK | 10/10 pass |
| CA7 - Gates verdes | OK | typecheck + lint + tests |
| CA8 - EmailError tagged union com tag: discriminante | OK | types.ts:18-21 |
| CA9 - import type para tipos puros | OK | todos os arquivos |
| CA10 - ASCII puro | OK | grep nao retorna non-ASCII |

---

## Notas

1. **Estrutura do modulo segue ADR-0006** (modular monolith): domain/, application/ports/, adapters/, public-api/. Sem use-cases ainda - virao quando algum modulo (Contracts, Financeiro) precisar enviar email.

2. **Sem CLAUDE.md update** - decidi nao adicionar `notifications` ao mapa de modulos do CLAUDE.md ainda. Fica para o ticket #2 (CTR-EMAIL-ADAPTER-NODEMAILER) quando o modulo "estiver completo" com adapter real.

3. **EmailAddress regex e simplificada** - rejeita casos esotericos RFC 5322 (quoted local part, etc.). Trade-off documentado no 000-request.md §"Risco".

4. **Tests usam subpath imports `#src/*`** (nao caminho relativo), seguindo convencao de `tests/cli/`.

---

## Veredito W1

GREEN. Modulo notifications criado com 6 arquivos source + 3 arquivos test. Padrao module-as-namespace internamente; public-api com aliases para evitar colisao type/namespace. ASCII puro. Branded types consistentes com Money/Period/IDs do modulo Contracts.

Proxima wave: **W2 - REVIEW** com `code-reviewer`.
