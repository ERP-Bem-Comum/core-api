[← Voltar para ADRs](./README.md)

# ADR-0035: Caddy 2.x como edge / reverse-proxy com HTTPS automático

- **Status:** Accepted
- **Date:** 2026-06-02
- **Deciders:** Gabriel Aderaldo + Product Owner
- **Relacionado:** [ADR-0034](./0034-runtime-infra-aws-prod-magalu-qa.md) (infra de runtime), [ADR-0025](./0025-http-server-fastify-core-api.md) (HTTP é adapter Fastify), [ADR-0028](./0028-http-edge-shell-location.md) (HTTP de feature em `adapters/http/`), [ADR-0011](./0011-supply-chain-hardening.md) (supply-chain), skill [[web-security-backend]]. **Origem:** `.claude/.planning/EPIC-DEVOPS-FOUNDATION.md`.

---

## Contexto

A infra de runtime (ADR-0034) hospeda **dois deployables Node** — o `core-api` (Fastify) e o `frontend` (TanStack Start, full-stack) — nos ambientes QA e prod. Ambos precisam de **terminação TLS**, **redirect HTTP→HTTPS** e **security headers na borda**, na frente das aplicações.

O agente `caddy-server-expert` estava **reservado** (anti-padrão #11 do `CLAUDE.md`: não ativar agente reservado sem ADR). Sua própria documentação exigia *"um ADR de adoção com justificativa contra alternativas (TLS direto no Fastify, nginx, Traefik, Cloudflare-only, ALB/CloudFront)"*. Este ADR é esse documento.

---

## Decisão

Adotar **Caddy 2.x como edge único** na frente das aplicações, nos ambientes QA e prod (e opcionalmente em dev):

- **HTTPS automático** via ACME (Let's Encrypt/ZeroSSL) — emissão e renovação de certificado sem operação manual.
- **HTTP→HTTPS redirect** (default do Caddy) + **HSTS**.
- **`reverse_proxy`** por host: `api.<dominio> → core-api`, `app.<dominio> → frontend`.
- **Security headers no edge** (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) — alinhados à skill `web-security-backend`.
- **`trusted_proxies`** para parsing correto do client IP e proteção contra spoof de `X-Forwarded-For`.
- **`encode zstd gzip`** para compressão.
- **Caddy como serviço no Compose** (mesmo `Caddyfile` em QA/prod; subdomínios por ambiente; volume persistente para os certificados).

Esta decisão **destrava** o agente `caddy-server-expert` (sai de "reservado" para ativo).

---

## Consequências

### Positivas

- **TLS sem operação manual** (ACME) — renovação automática, sem cron de certbot.
- **Edge único e simples** para os dois apps; `Caddyfile` declarativo e curto.
- **Secure-by-default** — HTTPS, HSTS, headers e proteção de proxy na borda, fora do app.
- **Paridade** QA↔prod (mesmo edge), reforçando ADR-0034.

### Negativas

- **Mais um container** no runtime (o edge). Custo desprezível na topologia EC2/VM.
- **ACME depende de DNS público** dos subdomínios e de rate limits do Let's Encrypt. Mitigação: usar o endpoint de **staging** do ACME primeiro; DNS pronto antes do deploy; volume persistente para os certs.

### Neutras

- Quando a infra migrar para ECS Fargate + ALB (ADR-0034, alternativa A), o **ALB** assume a terminação TLS e o Caddy recua/sai — sem impacto no app.

---

## Alternativas Consideradas

### A. TLS direto no Fastify (`node:https`)

**Rejeitada:** joga gestão de certificado (emissão/renovação ACME) para dentro do app; sem o automatismo do Caddy; mistura responsabilidade de borda com a aplicação.

### B. nginx / Traefik

**Rejeitadas:** nginx não tem ACME nativo (precisa de certbot externo); Traefik é capaz mas mais complexo de configurar que o Caddy para este caso. O **Caddy** entrega HTTPS automático com o menor `Caddyfile`.

### C. AWS ALB / CloudFront

**Rejeitada (por ora):** custo fixo do ALB contraria o critério econômico do ADR-0034; é o caminho de escala, não o de partida.

### D. Cloudflare-only (proxy + TLS no provedor)

**Rejeitada:** coloca um terceiro obrigatório no caminho de todo request e acopla a borda a um provedor externo; mantemos a borda sob nosso controle no container.

---

## Quando Re-avaliar

- Migração para **ECS Fargate + ALB** (ADR-0034) → ALB assume o TLS; Caddy sai.
- Necessidade de **WAF/CDN** gerenciado (escala/ataque) → reavaliar CloudFront/Cloudflare na frente.

---

## Referências

- [ADR-0034](./0034-runtime-infra-aws-prod-magalu-qa.md) — infra de runtime que hospeda o edge.
- [ADR-0025](./0025-http-server-fastify-core-api.md) / [ADR-0028](./0028-http-edge-shell-location.md) — Fastify atrás do proxy.
- `.claude/agents/caddy-server-expert.md` — agente destravado por este ADR.
- `handbook/reference/caddy/` — documentação oficial do Caddy (base do agente).
