# AUTH-EMAIL-LINK-BASE-URLS — base URLs dos links de e-mail configuráveis + validadas (issues #331 + #332)

## Contexto

Q.A. em produção (2026-07-02) confirmou dois bugs nos links dos e-mails transacionais:

- **#331 (crítico):** convites (usuário e colaborador) saem com `http://localhost:3000/activate?token=...` — o `server.ts` nunca injeta `activationBaseUrl`/`autocadastroBaseUrl` nas composições e **não existe env** para configurá-las; os defaults de dev vazam para produção.
- **#332 (alto):** o link de reset saiu `erp.abemcomum.org?token=...` (sem protocolo/path) porque `AUTH_RESET_BASE_URL` aceita qualquer string não-vazia (`server.ts:114-120`) e o use case concatena por template string.

Evidência e análise completas: issues #331/#332 + `specs/033-email-deploy-provisioning/qa-prod-validation.md`.

## Escopo (mínimo, YAGNI)

1. Novo helper `src/shared/http/email-link-base-urls.ts`: lê e valida as 3 envs de base URL de link de e-mail (`AUTH_RESET_BASE_URL`, `AUTH_ACTIVATION_BASE_URL`, `PARTNERS_AUTOCADASTRO_BASE_URL`) com `Result<T, E>`:
   - presente → deve ser URL absoluta `http:`/`https:` (rejeita sem protocolo, `ftp:`, `javascript:`, whitespace);
   - `NODE_ENV=production` + ausente/vazia → erro (fail-fast; default `localhost` nunca sai em prod);
   - não-prod + ausente → omitida (composições mantêm defaults de dev);
   - acumula todos os erros (mensagens PT-ASCII, estilo do worker `run.ts`).
2. `src/server.ts`: usa o helper; em erro, escreve as mensagens em stderr e sai com **exit code 78** (`EX_CONFIG`, mesma convenção do worker); repassa `activationBaseUrl` para `buildAuthHttpDeps` e `autocadastroBaseUrl` para `buildPartnersHttpDeps` (campos já existem nas composições).
3. `.env.example` + `handbook/infrastructure/03-secrets-catalog.md` §3.6: documentar as 2 envs novas.

**Fora do escopo:** mudança nas composições/use cases (já corretos), TTLs por env, allowlist de domínio do From (issue própria), correção operacional das envs no deploy (registrada nas issues).

## Critérios de aceite (das issues)

- CA1 (#332): valor sem protocolo (`erp.abemcomum.org`) → boot falha fail-fast, exit 78, mensagem clara.
- CA2 (#332): `https://erp.abemcomum.org/reset-password` → `resetUrl === '...reset-password?token=<token>'` (já coberto por testes de use case; wiring novo coberto pelo helper).
- CA3 (#332): `ftp://x`, `"   "`, `javascript:alert(1)` → rejeitados; só `http:`/`https:` passam.
- CA4 (#331): `AUTH_ACTIVATION_BASE_URL`/`PARTNERS_AUTOCADASTRO_BASE_URL` setadas → fluem para as composições (server.ts injeta).
- CA5 (#331): `NODE_ENV=production` + env ausente → boot falha (as 3 envs); dev/test sem envs → defaults preservados (testes existentes não regridem).
- CA6 (#331): `.env.example` + catálogo §3.6 documentam as envs novas.

## Nota de baseline (escalação explícita — política de regressão zero, saída 3)

A `dev` HEAD (`038c7313`) já estava **vermelha no typecheck** antes de qualquer mudança deste ticket (erros em `tests/jobs/financial/payable-view-backfill/backfill.test.ts` — trabalho da migração ETL do Gabriel, fechado green hoje mas ainda não commitado; conserto vive não-commitado na worktree principal). Prova: typecheck rodado na worktree recém-criada, checkout limpo, antes do W0. O W3 deste ticket só fecha após rebase sobre o commit dessa migração — não se fecha com vermelho não-endereçado, e não se mistura diff alheio nesta branch.
