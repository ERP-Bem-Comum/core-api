# NOTIF-SMTP-REQUIRETLS — W2 (REVIEW) REVIEW

**Wave:** W2 — REVIEW (audit read-only)
**Skill:** code-reviewer (via contratos-orchestrator; REVIEW persistido pela sessão principal)
**Round:** 1 / 3
**Data:** 2026-07-02
**Veredito:** ✅ **APPROVED**

Diff auditado (`git diff HEAD` + arquivo untracked `nodemailer-require-tls.test.ts`):

- `src/modules/notifications/adapters/email/nodemailer-config.ts` (M)
- `src/modules/notifications/adapters/email/nodemailer.ts` (M)
- `tests/modules/notifications/adapters/email/nodemailer-config.test.ts` (M)
- `tests/modules/notifications/adapters/email/nodemailer.integration.test.ts` (M)
- `tests/modules/notifications/adapters/email/nodemailer-require-tls.test.ts` (novo)
- `compose.yaml` (M — serviço `email-dispatch`)
- `.env.example` (M) · `handbook/infrastructure/03-secrets-catalog.md` (M)

---

## 1. Auditoria de idioma (identificador-a-identificador)

Critério: **EN puro por mérito próprio** — "consistência com legado" NÃO foi usada como justificativa (legado PT é violação rastreada #333). Strings de valor / comentários PT-ASCII permitidos.

| Identificador novo | Tipo | Local | Veredito |
| :--- | :--- | :--- | :--- |
| `requireTLS` | campo de `SmtpConfig` + prop de `baseOpts` | nodemailer-config.ts:32, nodemailer.ts:53 | ✅ EN (acrônimo TLS) |
| `SMTP_REQUIRE_TLS` | env var | config/compose/.env.example/catálogo | ✅ EN SCREAMING_SNAKE |
| `secure` | const local (hoisting de expressão existente) | config.ts:79 | ✅ EN |
| `Captor`, `firstOpts`, `baseConfig`, `overrides`, `captor`, `opts` | helpers/locais de teste | require-tls.test.ts | ✅ EN |
| Textos de `it(...)` em PT-ASCII | strings de valor | testes | ✅ permitido |

**Nenhum identificador PT introduzido.**

## 2. Correção do fail-secure (contrato do W0)

Implementado (config.ts:81): `const requireTLS = env['SMTP_REQUIRE_TLS'] === 'false' ? false : !secure;` — **idêntico ao contrato**. Semântica verificada: 587/`secure=false` → `true` salvo opt-out explícito (STARTTLS deixa de ser oportunista); 465/`secure=true` → `false` (TLS implícito, no-op); typo → default seguro (**typo nunca desliga TLS**). Espelha o parsing booleano existente (`SMTP_POOL` :77, `SMTP_SECURE` :79) — categoria correta (booleana tolerante), não a fail-fast (numéricas/required). Mudança comportamental **estritamente endurecedora**: só o caso 587-sem-opt-out muda, para seguro.

## 3. Os 2 ajustes de regressão-zero do W1

- **(a) Lint no teste do W0** — `interface Captor` + `readonly T[]` confirmados no arquivo; corrige `consistent-type-definitions` + `array-type` (não relaxadas em `tests/**`). Artefato deste ticket → entregável, não scope-creep. ✅
- **(b) `requireTLS: false` nos 2 literais de `nodemailer.integration.test.ts`** — diff mostra exatamente 2 adições do campo agora obrigatório (`etherealConfig()` ~:56 e literal `config` ~:133); **nenhuma asserção alterada**; valor adequado ao contexto de teste. ✅ Confirmado contra o diff.

## 4. compose.yaml — `email-dispatch`

`SMTP_REQUIRE_TLS: '${SMTP_REQUIRE_TLS:-false}'` — estilo `${VAR:-default}` idêntico às linhas vizinhas; default `false` correto para Mailpit local. **Sem vazamento para prod**: prod (ECS) não consome o compose — o default só afeta dev local. ✅

## 5. YAGNI / escopo

`baseOpts` ganhou **apenas** `requireTLS` (nada de `rateLimit`/`rateDelta`/pool extra). CA1–CA5 do `000-request.md` cobertos (CA5 provado pelo W1: 3365 tests, 0 fail). ✅

## 6. Sintaxe TS / errors-as-values / ADR-0006

`import type` / extensões `.ts` / `#src/*` respeitados; `parseSmtpConfig` segue `Result`-based sem `throw` vazando; `requireTLS` é opção válida de `SMTPTransport.Options`, herdada pelo branch de pool. ✅

---

## Achados

**Blocker:** nenhum. **Major:** nenhum. **Minor:** nenhum.

**Nits (informativos, não bloqueiam):**

- **N1 — comentário do compose ligeiramente impreciso:** diz que "PROD sobrescreve"; na prática prod (ECS) não consome esse serviço do compose — o default simplesmente não se aplica lá. Substância correta; redação opcional de ajustar.
- **N2 — o diff de `.env.example`/`03-secrets-catalog.md` carrega também o conteúdo do ticket-irmão** (`AUTH-EMAIL-LINK-BASE-URLS`, #331/#332) que coabita esta worktree/branch. As linhas em escopo deste ticket estão corretas; garantir no commit/PR que a fronteira entre os dois tickets é intencional. Não é defeito.

---

## Veredito final

✅ **APPROVED** — Round 1. Contrato fail-secure 1:1 com o W0, idioma EN limpo, ajustes de regressão-zero mecânicos e verificados, YAGNI respeitado, CA1–CA5 cobertos.

## Próximo passo (W3 — QUALITY, ts-quality-checker)

`typecheck` + `format:check` + `lint` + `test`. Herda a ressalva do baseline: os 2 erros pré-existentes de `payable-view-backfill` são alheios — W3 deve provar **0 erros introduzidos** por este ticket e registrar a ressalva conforme `000-request.md` §Processo.
