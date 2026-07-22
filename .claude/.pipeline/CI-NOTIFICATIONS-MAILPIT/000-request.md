# CI-NOTIFICATIONS-MAILPIT — testes de integração de e-mail no CI com SMTP efêmero

## Contexto

US4 da spec 033 (issue #135, item "CI: SMTP de teste"): a suíte de integração de notifications existe (`tests/modules/notifications/adapters/email/*.integration.test.ts`, gated por `NOTIFICATIONS_INTEGRATION=1`) mas **nunca roda no CI** — `ci.yml` é deliberadamente offline (cabeçalho `ci.yml:7-9`), e o runner `scripts/ci/test-integration.ts` declara a suíte `notifications` com `services: []` (não sobe SMTP; assume um Mailpit já disponível). Resultado: o adapter de envio só é validado manualmente.

## Escopo

1. `scripts/ci/test-integration.ts`: a suíte `notifications` passa a subir o serviço `mailpit` do compose (profile `mail`, já existe — `compose.yaml:230`) e a exportar as envs SMTP apontando para ele (`SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, `SMTP_SECURE=false`, `SMTP_REQUIRE_TLS=false`, credenciais dummy — Mailpit aceita qualquer auth), além do `NOTIFICATIONS_INTEGRATION=1` já existente.
2. Novo workflow `.github/workflows/integration-notifications.yml` (ou job dedicado — decisão da wave, registrada): roda `pnpm run test:integration:notifications` em PRs que toquem `src/modules/notifications/**`, `src/workers/email-dispatch/**` ou `tests/modules/notifications/**` (path filter) + `workflow_dispatch`. Actions pinadas por SHA (padrão do repo — ver `ci.yml`/`audit.yml`); sem secrets novos.
3. Gate preservado: `pnpm test` puro continua sem exigir SMTP (nada muda nos skips).
4. Docs: nota curta no runbook 08 (§ CI) OU no cabeçalho do workflow — onde a wave julgar canônico.

**Fora do escopo:** rodar a integração localmente NESTA sessão (Docker proibido — migração de banco do humano em andamento; a validação e2e real acontece no CI quando o PR abrir), mudanças no adapter, Resend.

## Critérios de aceite

- CA1 — **Dado** o runner, **Quando** se inspeciona a config da suíte `notifications`, **Então** ela declara o serviço `mailpit` e exporta as envs SMTP corretas (testável por unit test da config do runner, se exportável; senão por asserção de estrutura).
- CA2 — **Dado** um PR tocando `src/modules/notifications/**`, **Então** o workflow novo dispara; PRs fora dos paths não disparam (path filter correto).
- CA3 — **Dado** o workflow, **Então** todas as actions estão pinadas por SHA (nenhuma tag mutável), coerente com `ci.yml`/`audit.yml`.
- CA4 — **Dado** `pnpm test` puro sem envs, **Então** os testes de integração de notifications continuam skipped (gate intacto — regressão zero).
- CA5 — Suíte unit completa sem regressão (≥ 3374) + lint/format/typecheck com a ressalva de baseline dos tickets-irmãos.
- CA6 (pós-merge, fora do W3 local) — o job fica verde no GitHub Actions no primeiro PR que tocar notifications; se falhar lá, é regressão a tratar (não fechar a issue #135/US4 antes disso).

## Processo (regras duras da worktree)

Waves despachadas pelo harness; identificadores EN; sem Docker/integration local nesta sessão; `.env*` via `git apply` se precisar; W3 herda a ressalva do baseline ETL alheio e a condição de fechamento conjunta dos tickets da branch.
