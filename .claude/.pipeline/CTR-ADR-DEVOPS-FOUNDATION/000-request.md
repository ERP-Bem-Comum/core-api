# CTR-ADR-DEVOPS-FOUNDATION — ADRs de infra (0034) e edge Caddy (0035)

> **Size:** S · **Origem:** `.claude/.planning/EPIC-DEVOPS-FOUNDATION.md` §11 (D0).
> Decisões já fixadas pelo dono em §10 da spec-mãe (brainstorming 2026-06-02).

## Escopo

1. **ADR-0034** — Infra de runtime: PROD=AWS (EC2 `t4g.small` ARM + Docker Compose + Caddy + RDS MySQL `db.t4g.micro` + S3, deploy keyless OIDC+SSM); QA=Magalu Cloud (VM + Compose + Caddy + MySQL container + object-storage S3-compat). Paridade via mesma imagem multi-arch. Escala futura EC2→ECS Fargate+ALB sem refactor.
2. **ADR-0035** — Adoção do Caddy 2.x como edge único (TLS automático ACME, HTTP→HTTPS, HSTS+security headers, trusted_proxies, reverse_proxy). Destrava o agente `caddy-server-expert` (anti-padrão #11 do CLAUDE.md).
3. Registrar ambos no índice (`adr/README.md`) e no `handbook/CHANGELOG.md`.
4. Destravar o agente `caddy-server-expert.md` (frontmatter + seção de status) e atualizar a linha do Caddy na tabela de agentes do `CLAUDE.md`.

## Critérios de Aceite

- [ ] CA1 — `adr/0034-*.md` e `adr/0035-*.md` existem, Status `Accepted`, seguindo o template do `adr/README.md` §4.
- [ ] CA2 — As 2 linhas no índice `adr/README.md` e a entrada no `CHANGELOG.md`.
- [ ] CA3 — `caddy-server-expert.md` não contém mais "RESERVED (Fase 2+)" nem "## Status: reservado"; referencia ADR-0035.
- [ ] CA4 — A linha do Caddy na tabela de agentes do `CLAUDE.md` não diz mais "reservado".
- [ ] CA5 — Teste estrutural `tests/infra/devops-foundation-adrs.test.ts` verde no `pnpm test`.

## Fora de escopo

- Implementação de qualquer workflow/IaC/Caddyfile (são D1–D7).
