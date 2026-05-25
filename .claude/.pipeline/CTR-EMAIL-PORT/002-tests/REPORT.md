# 002 - W0 (RED) - CTR-EMAIL-PORT

**Skill:** tdd-strategist
**Data:** 2026-05-21
**Veredito:** RED CONFIRMADO - `pass=0, fail=3` (3 arquivos com top-level import quebrado; src/modules/notifications/ ainda nao existe).

---

## Arquivos criados

| Arquivo | Cenarios | CA cobertos |
| :--- | ---: | :--- |
| `tests/modules/notifications/domain/email/address.test.ts` | 3 | CA-T1, CA-T2, CA-T3 |
| `tests/modules/notifications/domain/email/subject.test.ts` | 3 | CA-T4, CA-T5, CA-T6 |
| `tests/modules/notifications/adapters/email/in-memory.test.ts` | 4 | CA-T7, CA-T8, CA-T9, CA-T10 |
| **Total** | **10** | **CA-T1..T10** |

---

## Intencao de cada teste

### `EmailAddress.parse` (3 tests)

- **CA-T1**: `parse('valid@example.com')` -> `ok` com value preservado (brand nao muda runtime).
- **CA-T2**: `parse('invalid')` (sem `@`) -> `err('invalid-email-format')`.
- **CA-T3**: `parse(324-char string)` -> `err('email-address-too-long')` (RFC 5321: max 320 = local 64 + @ + domain 255).

### `EmailSubject.parse` (3 tests)

- **CA-T4**: `parse('Hello world')` -> `ok`.
- **CA-T5**: `parse('')` -> `err('empty-subject')`.
- **CA-T6**: `parse(999-char string)` -> `err('subject-too-long')` (RFC 5322 §2.1.1: max 998 excluindo CRLF).

### `createInMemoryEmailSender` (4 tests)

- **CA-T7**: `send(msg)` -> `ok({ messageId: UUID-v4, acceptedAt: ISO-8601 })`. Regex validacao explicita para ambos campos.
- **CA-T8**: 3 sends sucessivos -> `getSent().length === 3`, em ordem de envio.
- **CA-T9**: 2 sends + `clear()` -> `getSent().length === 0`.
- **CA-T10**: smoke type-level - `const port: EmailSender = createInMemoryEmailSender()` compila + tem method `send`.

---

## Convencoes de design fixadas (constraints para W1)

### 1. Padrao module-as-namespace (igual `money.ts`, `contract-id.ts`)

Os tests fazem `import * as EmailAddress from '...address.ts'` e chamam `EmailAddress.parse(raw)`. Isso difere do request original (que sugeria `EmailAddress(raw)` direto), mas alinha com o resto do projeto.

**Constraint para W1:** cada arquivo VO exporta:
- `type EmailAddress = Brand<string, 'EmailAddress'>`
- `type EmailAddressError = 'invalid-email-format' | 'email-address-too-long'`
- `const parse = (raw: string): Result<EmailAddress, EmailAddressError> => { ... }`

E **NAO** uma function exportada com o mesmo nome do type. Consumers usam namespace import.

### 2. Subpath imports `#src/*` (nao path relativo)

Tests usam `import * as EmailAddress from '#src/modules/notifications/domain/email/address.ts'`. Isso e o padrao em `tests/` (confirmado em `tests/cli/contracts.cli.test.ts`).

Implicacao para W1: NAO precisa import relativo nos tests; o `package.json#imports` ja resolve.

### 3. Fixture helper `makeMessage` no test de InMemory

O test CA-T7..T10 precisa construir `EmailMessage` valido. Helper local (`makeMessage`) usa `EmailAddress.parse` e `EmailSubject.parse` para gerar valores brandados a partir de raw strings.

**Constraint para W1:** assinatura do `EmailMessage` deve ser:

```ts
type EmailMessage = Readonly<{
  from: EmailAddress;
  to: readonly EmailAddress[];
  cc?: readonly EmailAddress[];
  bcc?: readonly EmailAddress[];
  subject: EmailSubject;
  textBody: string;
  htmlBody?: string;
}>;
```

(Branded para `from`/`to`/`cc`/`bcc`/`subject`. `textBody` permanece string crua.)

### 4. Regex UUID-v4 e ISO-8601 estritas

CA-T7 valida `r.value.messageId` contra `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i` (v4 com bits especificos). Implicacao: usar `crypto.randomUUID()` (Node 19+, garantido v4).

Idem `acceptedAt` valida ISO-8601 com `T` e `.000Z` final - usar `new Date().toISOString()`.

### 5. `InMemoryEmailSender` exporta `EmailSender` extendido

Type:

```ts
type InMemoryEmailSender = EmailSender & Readonly<{
  getSent: () => readonly EmailMessage[];
  clear: () => void;
}>;
```

Isso permite CA-T10 (smoke: `InMemoryEmailSender` e assignable a `EmailSender`).

### 6. `import type` para tipos puros (verbatimModuleSyntax)

Tests fazem `import type { EmailSender } from '...port.ts'` e `import type { EmailMessage } from '...types.ts'`. Mesma regra no W1.

### 7. ASCII puro em todo arquivo novo

Lecao da serie Pipeline Tooling (Node 24 strip-types bug). Comentarios sem acentos, strings sem `-` ou `*` Unicode.

---

## Saida do runner

```
ℹ tests 3
ℹ pass 0
ℹ fail 3
ℹ duration_ms 278.14
```

**Por que `tests=3` em vez de 10:** mesmo padrao dos tickets anteriores - quando o import top-level quebra, `node:test` reporta o arquivo inteiro como 1 fail unitario. Os 10 cenarios individuais (3 + 3 + 4) virao a tona em W1 quando o codigo passar a compilar.

Erros (3 arquivos, todos com mesmo motivo):

```
ERR_MODULE_NOT_FOUND
  - src/modules/notifications/domain/email/address.ts
  - src/modules/notifications/domain/email/subject.ts
  - src/modules/notifications/adapters/email/in-memory.ts
```

---

## Notas para W1

Estrutura minima a criar:

```
src/modules/notifications/
├── domain/email/
│   ├── address.ts       # EmailAddress + parse + EmailAddressError
│   ├── subject.ts       # EmailSubject + parse + EmailSubjectError
│   ├── message.ts       # EmailMessage type
│   ├── receipt.ts       # EmailReceipt type
│   ├── errors.ts        # EmailError tagged union
│   └── types.ts         # barrel ou re-exports (decidir em W1)
├── application/ports/
│   └── email-sender.ts  # type EmailSender
├── adapters/email/
│   └── in-memory.ts     # createInMemoryEmailSender + InMemoryEmailSender type
└── public-api/
    └── index.ts         # barrel para outros modulos
```

W1 cria TUDO. Tests devem virar 10/10 verde.

---

## Veredito W0

RED confirmado. 10 cenarios distribuidos em 3 arquivos. Convencao `module-as-namespace` fixada (igual ao resto do projeto). ASCII puro aplicado.

Proxima wave: **W1 - GREEN** com `ts-domain-modeler` (smart constructors) + `ports-and-adapters` (port + InMemory adapter).
