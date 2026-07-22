# NOTIF-EMAIL-FROM-DOMAIN-ALLOWLIST — allowlist de domínio do remetente (guarda-corpo)

## Contexto

Incidente real (Q.A. prod 2026-07-02, issue #331 e avaliações dos agentes): TODOS os e-mails transacionais de produção saíam com `From: ses-testes-abc-95118@codebit.dev` — identidade SES de TESTE da software house, não o domínio do cliente. O código aceita qualquer `EMAIL_FROM*` sintaticamente válido (`email-config.ts` valida só formato via `EmailAddress.parse`); nada impede uma credencial/remetente de teste vazar para produção de novo. Este ticket é o guarda-corpo recomendado pelo `security-backend-expert` (item 9 do ranking).

## Escopo (mínimo)

1. Nova env `EMAIL_FROM_ALLOWED_DOMAINS` (CSV de domínios, ex.: `abemcomum.org`): quando **presente**, o parse da config de e-mail passa a exigir que o domínio de TODO remetente resolvível (`EMAIL_FROM`, `EMAIL_FROM_RESET`, `EMAIL_FROM_INVITE`, `EMAIL_FROM_NOTIFICATION`, aliases legados quando usados) pertença à lista — senão a config é inválida e o **boot falha** (mesmo comportamento fail-fast já existente para config inválida; no worker, exit 78).
2. Quando **ausente**: comportamento atual preservado (qualquer domínio — dev/Mailpit/testes).
3. Comparação pelo domínio após o `@`, **case-insensitive**; suporta o formato com display name (`"Bem Comum <no-reply@dominio>"`).
4. Docs: `.env.example` (via `git apply` — `.env*` bloqueado a Read/Edit) + `handbook/infrastructure/03-secrets-catalog.md` §3.6 (recomendar setar em prod).

**Fora do escopo:** mudança de provider, validação do domínio contra DNS/SES, envs de base URL (tickets-irmãos).

## Critérios de aceite

- CA1 (o incidente) — **Dado** `EMAIL_FROM_ALLOWED_DOMAINS=abemcomum.org` e `EMAIL_FROM=no-reply@codebit.dev`, **Quando** a config é parseada, **Então** falha com erro nomeando a env e o domínio rejeitado.
- CA2 — **Dado** a mesma allowlist e `EMAIL_FROM="Bem Comum <no-reply@abemcomum.org>"`, **Então** a config é aceita (display name suportado; case-insensitive: `No-Reply@ABEMCOMUM.ORG` também passa).
- CA3 — **Dado** `EMAIL_FROM_ALLOWED_DOMAINS` ausente, **Então** comportamento atual preservado (testes existentes não regridem).
- CA4 — **Dado** allowlist presente e um override por fluxo fora dela (`EMAIL_FROM_INVITE=x@outro.dev`) com `EMAIL_FROM` válido, **Então** falha (a checagem cobre todos os remetentes resolvíveis, não só o global).
- CA5 — **Dado** CSV multi-domínio (`abemcomum.org, mail.abemcomum.org`), **Então** qualquer um deles é aceito; espaços em volta das vírgulas tolerados.
- CA6 — Docs atualizadas (.env.example + §3.6).
- CA7 — Suíte completa sem regressão (≥ 3368).

## Processo (regras duras da worktree)

Waves despachadas pelo harness; identificadores novos EN (auditoria um a um no W2; legado PT nunca é padrão); sem Docker/integration; W3 herda a ressalva do baseline ETL alheio (2 erros `payable-view-backfill`) e a mesma condição de fechamento dos tickets-irmãos.
