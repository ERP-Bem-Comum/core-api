# NOTIF-SMTP-REQUIRETLS — W0 (RED) REPORT

**Wave:** W0 — RED (fail-first)
**Skill:** tdd-strategist (via contratos-orchestrator; REPORT persistido pela sessão principal)
**Data:** 2026-07-02
**Escopo coberto:** CA1-CA4 do `000-request.md` (parsing da env `SMTP_REQUIRE_TLS` em `SmtpConfig` + wiring `requireTLS` no transport). CA5 (não-regressão) provado rodando a suíte existente. Docs/compose (itens 3-4 do escopo) são W1.

## Arquivos de teste

| Arquivo | Ação | Conteúdo |
| :--- | :--- | :--- |
| `tests/modules/notifications/adapters/email/nodemailer-config.test.ts` | ESTENDIDO | novo `describe('parseSmtpConfig - requireTLS (NOTIF-SMTP-REQUIRETLS)')` com 5 casos (CA1, CA2, CA3, CA4, CA4-boundary). Os 6 `describe('parseSmtpConfig')` (CA-T1..T6) NÃO foram tocados. |
| `tests/modules/notifications/adapters/email/nodemailer-require-tls.test.ts` | CRIADO | wiring do `requireTLS` no `createTransport` (3 casos), via argument-captor `t.mock.method`. Fora do gate `NOTIFICATIONS_INTEGRATION` — `createTransport` não conecta na construção, roda em `pnpm test` puro. |

## Casos × Critérios de aceite

| Caso (teste) | CA | Superfície | Asserção | RED por |
| :--- | :--- | :--- | :--- | :--- |
| CA1 default fail-secure | CA1 | config | `SMTP_SECURE=false` + `SMTP_REQUIRE_TLS` ausente ⇒ `requireTLS === true` | `requireTLS` inexistente em `SmtpConfig` (`undefined`) |
| CA1 wiring pool=false | CA1 | transport | `config.requireTLS=true` ⇒ `createTransport` recebe `requireTLS: true` | `baseOpts` (nodemailer.ts:49-54) sem `requireTLS` (`undefined`) |
| CA1 wiring pool=true | CA1 | transport | idem no branch de pool (`nodemailer.ts:56-60`) | idem |
| CA2 opt-out config | CA2 | config | `SMTP_REQUIRE_TLS=false` ⇒ `requireTLS === false` | `undefined !== false` |
| CA2 opt-out wiring | CA2 | transport | `config.requireTLS=false` ⇒ `createTransport` recebe `requireTLS: false` | `undefined !== false` |
| CA3 secure não interfere | CA3 | config | `SMTP_SECURE=true` (465) ⇒ `secure===true` **e** `requireTLS===false` | `undefined !== false` (secure já era verde) |
| CA4 malformado | CA4 | config | `SMTP_REQUIRE_TLS=banana` ⇒ `ok` + `requireTLS===true` (não rejeita) | `undefined !== true` |
| CA4 boundary maiúsculo | CA4 | config | `SMTP_REQUIRE_TLS=FALSE` ⇒ `requireTLS===true` (match exato) | `undefined !== true` |

## Decisão CA4 — tolerante fail-secure (default seguro), NÃO fail-fast

**Decisão:** valor malformado de `SMTP_REQUIRE_TLS` **não é rejeitado**; apenas a string exata `'false'` desativa a exigência. Qualquer outro valor (incl. malformado, ausente, maiúsculo) cai no default **fail-secure** = `!secure` (`true` quando `SMTP_SECURE=false`).

**Justificativa ancorada no código real de `parseSmtpConfig`:**

- O parsing **booleano** existente NUNCA rejeita valor malformado — só a string exata decide:
  - `SMTP_POOL` → `nodemailer-config.ts:75` `env['SMTP_POOL'] === 'false' ? false : DEFAULT_POOL`
  - `SMTP_SECURE` → `nodemailer-config.ts:80` `env['SMTP_SECURE'] === 'true'`
- A rejeição fail-fast (`invalid-port` :61, `invalid-max-connections` :69) só existe para envs **numéricas/required**, categoria diferente de `SMTP_REQUIRE_TLS` (booleana).
- Seguir o padrão booleano real dá a propriedade de segurança mais forte: um **typo nunca desativa TLS** (o valor errado cai no default seguro). Fail-fast crasharia o boot num typo (risco de disponibilidade) sem ganho de segurança sobre o fail-secure.

Contrato final do campo (para o W1): `requireTLS = (SMTP_REQUIRE_TLS === 'false') ? false : !secure`

## Cobertura não-duplicada

- CAs de **parsing** ficam em `nodemailer-config.test.ts` (mesmo sujeito: `parseSmtpConfig`), sem alterar os 6 casos verdes existentes.
- CAs de **wiring do transport** ficam em arquivo novo (sujeito distinto: `createNodemailerEmailSender`; técnica de arg-captor), separado do `nodemailer.integration.test.ts` (que testa envio real, guardado por `NOTIFICATIONS_INTEGRATION`).
- Nenhuma sobreposição com a suíte de integração.

## Evidência RED (sem Docker, sem integração)

Binário real (`$HOME/.nvm/versions/node/v24.16.0/bin/node`, v24.16.0) para evitar recursão nvm.

`nodemailer-config.test.ts`:

    tests 11 · suites 2 · pass 6 (CA-T1..T6 existentes = CA5 não-regressão) · fail 5 (CA1-CA4 novos)

`nodemailer-require-tls.test.ts`:

    tests 3 · suites 1 · pass 0 · fail 3 (CA1 pool=false, CA1 pool=true, CA2 wiring)

Todas as falhas são `AssertionError [ERR_ASSERTION]` com `actual: undefined` / `expected: true|false` — falham por o comportamento novo não existir, não por import/sintaxe/mock. `assert.ok(opts)` passa (`createTransport` É chamado); só a asserção de `requireTLS` falha. Nenhum arquivo de `src/` tocado.

## Próximo passo (W1 — GREEN, nodemailer-email-expert)

1. `nodemailer-config.ts`: adicionar `requireTLS: boolean` a `SmtpConfig` e computar `requireTLS = (env['SMTP_REQUIRE_TLS'] === 'false') ? false : !secure`.
2. `nodemailer.ts`: incluir `requireTLS: config.requireTLS` em `baseOpts` (linhas 49-54) — herdado pelos dois branches (pool e não-pool).
3. Itens 3-4 do escopo: `compose.yaml` (`SMTP_REQUIRE_TLS=false` no `email-dispatch`), `.env.example` via `git apply`, secrets-catalog §3.6 — no mesmo W1.
