# NOTIF-SMTP-REQUIRETLS — W1 (GREEN) REPORT

**Wave:** W1 — GREEN (implementação mínima)
**Especialista:** nodemailer-email-expert (via contratos-orchestrator; REPORT persistido pela sessão principal)
**Data:** 2026-07-02
**Escopo coberto:** itens 1-5 do `000-request.md`. Contrato fixado pelo W0 (ver `002-tests/REPORT.md` §"Decisão CA4 — tolerante fail-secure"). Implementação YAGNI: só o mínimo para os 8 testes RED ficarem GREEN + docs/compose.

## Arquivos tocados

| Arquivo | Ação | Mudança |
| :--- | :--- | :--- |
| `src/modules/notifications/adapters/email/nodemailer-config.ts` | EDITADO | `requireTLS: boolean` em `SmtpConfig`; deriva `secure` uma vez; `requireTLS = (SMTP_REQUIRE_TLS === 'false') ? false : !secure`; docstring atualizada |
| `src/modules/notifications/adapters/email/nodemailer.ts` | EDITADO | `requireTLS: config.requireTLS` no `baseOpts` (herdado pelos branches pool/não-pool) |
| `compose.yaml` | EDITADO | `SMTP_REQUIRE_TLS: '${SMTP_REQUIRE_TLS:-false}'` no serviço `email-dispatch` (aponta p/ Mailpit sem TLS), + comentários no estilo do arquivo |
| `.env.example` | EDITADO (via `git apply --recount`) | linha `SMTP_REQUIRE_TLS=` documentada junto de `SMTP_SECURE`, comentário fail-secure |
| `handbook/infrastructure/03-secrets-catalog.md` §3.6 | EDITADO | linha na tabela: `SMTP_REQUIRE_TLS` · config · opcional · default fail-secure |
| `tests/modules/notifications/adapters/email/nodemailer-require-tls.test.ts` | EDITADO (fix lint deste ticket) | `type Captor` → `interface Captor` + `ReadonlyArray<T>` → `readonly T[]` (regras não-relaxadas em `tests/**`) |
| `tests/modules/notifications/adapters/email/nodemailer.integration.test.ts` | EDITADO (forçado pelo contrato) | `requireTLS: false` nos 2 literais `SmtpConfig` (campo agora obrigatório) |

## Decisões de design

1. **Ordem de precedência (contrato do W0):** `requireTLS = (SMTP_REQUIRE_TLS === 'false') ? false : !secure`. Espelha o parsing booleano existente (`SMTP_POOL` :75, `SMTP_SECURE` :80) — nunca rejeita valor malformado; só a string exata decide. Propriedade de segurança: typo (`banana`, `FALSE`) cai no default seguro; um erro de digitação **nunca** desativa TLS.
2. **`compose.yaml` no estilo `${VAR:-default}`:** `'${SMTP_REQUIRE_TLS:-false}'` (não literal) preserva o override de PROD igual às demais envs do serviço — PROD não seta a env e volta ao default fail-secure `true`.
3. **Correção de lint (regressão-zero, entregável do ticket):** o arquivo de teste do W0 tinha 2 erros de lint (`consistent-type-definitions`, `array-type` — regras não relaxadas em `tests/**`). Corrigido por ser artefato deste ticket, não teste pré-existente.
4. **Fix do teste de integração (regressão-zero, forçado pelo contrato):** tornar `requireTLS` obrigatório quebrou 2 literais `SmtpConfig` em `nodemailer.integration.test.ts`. Adicionado `requireTLS: false` (contexto de teste sem STARTTLS) — correção mecânica, sem tocar asserções. **Sinalizado para o W2 auditar.**

## Evidência GREEN

- `nodemailer-config.test.ts`: **tests 11 · pass 11 · fail 0** (6 CA-T existentes + 5 novos CA1-CA4).
- `nodemailer-require-tls.test.ts`: **tests 3 · pass 3 · fail 0** (wiring pool=false, pool=true, opt-out).
- `pnpm run lint`: **0 problemas**.
- `pnpm run typecheck`: apenas os **2 erros pré-existentes de `payable-view-backfill`** (baseline alheio — ver ticket `AUTH-EMAIL-LINK-BASE-URLS`); **0 erros** introduzidos por este ticket.
- `pnpm test`: **tests 3365 · pass 3347 · fail 0 · skipped 18** (3357 baseline + 8 novos).
- `pnpm run format:check`: **All matched files use Prettier code style!**

## Próximo passo (W2 — REVIEW, code-reviewer)

Auditar: (a) identificadores novos em EN (`requireTLS`, `SMTP_REQUIRE_TLS`) — um a um, sem "consistência com legado" como critério; (b) comentários PT-ASCII; (c) fail-secure correto; (d) YAGNI (nada de rateLimit/pool tocado); (e) os 2 ajustes de regressão-zero (fix de lint no teste do W0; `requireTLS: false` nos literais do teste de integração).
