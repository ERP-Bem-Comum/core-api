# 002 - W0 (RED) - CTR-EMAIL-ADAPTER-NODEMAILER

**Skill:** tdd-strategist
**Data:** 2026-05-21
**Veredito:** RED CONFIRMADO - `pass=0, fail=2`. Causas:
  1. `src/modules/notifications/adapters/email/nodemailer-config.ts` nao existe.
  2. `src/modules/notifications/adapters/email/nodemailer.ts` nao existe.
  3. Dependency `nodemailer` ainda nao instalada via `pnpm add`.

---

## Arquivos criados

| Arquivo | Cenarios | CA cobertos |
| :--- | ---: | :--- |
| `tests/modules/notifications/adapters/email/nodemailer-config.test.ts` | 6 | CA-T1..T6 |
| `tests/modules/notifications/adapters/email/nodemailer.integration.test.ts` | 3 | CA-T7..T9 |
| **Total** | **9** | **CA-T1..T9** |

---

## Intencao de cada teste

### `parseSmtpConfig` - 6 tests unit (rodam em `pnpm test`)

- **CA-T1**: env valido completo (HOST/PORT/SECURE/USER/PASS) -> `ok` com `pool=true` e `maxConnections=5` (defaults).
- **CA-T2**: `SMTP_HOST` ausente -> `err({ tag: 'missing-env', field: 'SMTP_HOST' })`.
- **CA-T3**: `SMTP_PORT='abc'` -> `err({ tag: 'invalid-port', raw: 'abc' })`.
- **CA-T4**: `SMTP_POOL='false'` -> `ok` com `pool=false`.
- **CA-T5**: `SMTP_MAX_CONNS='10'` -> `ok` com `maxConnections=10`.
- **CA-T6**: `SMTP_MAX_CONNS='-3'` -> `err({ tag: 'invalid-max-connections', raw: '-3' })`.

### `createNodemailerEmailSender` - 3 tests integration (guarded por NOTIFICATIONS_INTEGRATION=1)

- **CA-T7**: Ethereal account dinamica + send -> `ok({ messageId: non-empty, acceptedAt: ISO-8601 })`.
- **CA-T8**: recipient invalido (bypass do brand) -> `err` com `tag ∈ {invalid-recipient, smtp-rejected}`.
- **CA-T9**: host inexistente (`nonexistent.invalid.local`) -> `err({ tag: 'transport-failed' })`.

Guards: `if (process.env.NOTIFICATIONS_INTEGRATION !== '1') { it.skip(...); return; }` no inicio do `describe`. Sem a env, os 3 tests sao skipped silenciosamente em `pnpm test` (sem rede). RED em W0 ainda funciona porque o IMPORT do `nodemailer.ts` quebra antes do describe rodar.

---

## Constraints e decisoes herdadas para W1

### 1. Dependencies a instalar

```bash
pnpm add nodemailer
pnpm add --save-dev @types/nodemailer
```

Conforme ADR-0010 + CA-T12 do request. NUNCA `npm install` (ADR-0012).

### 2. `parseSmtpConfig` recebe `NodeJS.ProcessEnv` como argumento

NAO le `process.env` internamente. Injection explicita permite testes deterministicos via objeto literal.

Signature exata:

```ts
export const parseSmtpConfig = (
  env: NodeJS.ProcessEnv,
): Result<SmtpConfig, SmtpConfigError>;
```

### 3. `SmtpConfig` shape exato (testado pelos CA-T1..T6)

```ts
export type SmtpConfig = Readonly<{
  host: string;
  port: number;          // numero, nao string
  secure: boolean;
  user: string;
  pass: string;
  pool: boolean;         // default true se SMTP_POOL ausente
  maxConnections: number; // default 5 se SMTP_MAX_CONNS ausente
}>;
```

### 4. `SmtpConfigError` tagged union

```ts
export type SmtpConfigError =
  | Readonly<{ tag: 'missing-env'; field: string }>
  | Readonly<{ tag: 'invalid-port'; raw: string }>
  | Readonly<{ tag: 'invalid-max-connections'; raw: string }>;
```

Tests CA-T2/T3/T6 acessam `r.error.tag` + `r.error.field`/`r.error.raw` - shape estavel obrigatorio.

### 5. Ordem de validacao em `parseSmtpConfig`

Validar nessa ordem (W1 confirme com tests):

1. Required: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` - se algum ausente -> `missing-env`.
2. `SMTP_PORT`: deve parsear para int positivo - senao `invalid-port`.
3. `SMTP_MAX_CONNS`: se presente, deve parsear para int >= 1 - senao `invalid-max-connections`.

`SMTP_SECURE` e parseado como `=== 'true'` (qualquer outro valor -> false).
`SMTP_POOL` idem (`=== 'false'` -> false, demais -> true por default).

### 6. `createNodemailerEmailSender(config: SmtpConfig): EmailSender`

Signature pura: recebe config, retorna port. Sem efeito colateral no top-level (transporter criado dentro da factory).

### 7. `mapNodemailerError` heuristica regex

CA-T8 e CA-T9 nao testam a heuristica em si - testam que erros REAIS do Ethereal/host-inexistente caem nos buckets corretos. W1 implementa a heuristica iniciamente segundo o request, ajusta se necessario apos CA-T8/T9 rodarem.

### 8. ASCII puro em todos os arquivos novos

Lecao da serie Pipeline Tooling. `nodemailer-config.ts` + `nodemailer.ts` em ASCII.

### 9. Integration test guard

```ts
const integrationOn = process.env['NOTIFICATIONS_INTEGRATION'] === '1';
describe('...', () => {
  if (!integrationOn) {
    it.skip('SKIP - NOTIFICATIONS_INTEGRATION=1 desligado', () => {});
    return;
  }
  // ... tests reais
});
```

Implicacao: `pnpm test` (sem env) -> 0 fail + skips silenciosos para CA-T7..T9.
`NOTIFICATIONS_INTEGRATION=1 pnpm test` -> roda Ethereal real (precisa rede).

### 10. `package.json` em W1

- `pnpm add nodemailer` adiciona como `dependencies` (NAO devDependencies).
- `pnpm add --save-dev @types/nodemailer`.
- Adicionar script: `"test:integration:notifications": "NOTIFICATIONS_INTEGRATION=1 node --test --experimental-strip-types --no-warnings 'tests/modules/notifications/**/*.test.ts'"`.

---

## Saida do runner

```
ℹ tests 2
ℹ pass 0
ℹ fail 2
ℹ duration_ms 212.12
```

**Por que `tests=2` em vez de 9:** padrao recorrente - os 2 arquivos tem top-level import quebrado (modulos nao existem); `node:test` reporta cada arquivo como 1 fail unitario. Em W1 (apos pnpm add + criar os 2 modulos), os 9 cenarios virao a tona individualmente.

---

## Notas para W1

Estrutura a criar:

```
src/modules/notifications/adapters/email/
├── nodemailer-config.ts  # SmtpConfig + SmtpConfigError + parseSmtpConfig
└── nodemailer.ts         # createNodemailerEmailSender + mapNodemailerError

package.json              # + nodemailer dep + script :integration:notifications

public-api/index.ts       # MODIFICAR: remove InMemory exports; add createNodemailerEmailSender + parseSmtpConfig + SmtpConfig types

CLAUDE.md                 # MODIFICAR: agente sai de RESERVED + modulo notifications no mapa
.claude/agents/nodemailer-email-expert.md  # MODIFICAR: versao ativa
```

W1 size M (8 itens). Skill principal: **`nodemailer-email-expert`** (saindo de RESERVED) + `ports-and-adapters`.

---

## Veredito W0

RED confirmado. 9 cenarios (6 unit + 3 integration) descritos. Guards de integration garantem que CA-T7..T9 nao quebram `pnpm test` default. ASCII puro aplicado.

Proxima wave: **W1 - GREEN** com `nodemailer-email-expert` (sair de RESERVED) + composition root via factory.
