---
sidebar_position: 3
title: Módulo Auth
description: Identidade própria, sessão híbrida (JWT ES256 + refresh opaco), RBAC e hardening de segurança.
---

# Módulo Auth

O **Auth** é o módulo de **identidade & RBAC** (ADR-0024): identidade própria (OIDC-ready), sessão
híbrida e autorização por permissão granular. Ele protege a borda HTTP `/api/v2/auth` e é consumido
pelos outros módulos via `public-api`.

## Sessão híbrida (ADR-0024)

- **Access token**: JWT **ES256** (algoritmo travado em allow-list — bloqueia confusão de algoritmo
  `alg:none`/RS↔HS). Curto. Valida `iss`, exige `sub`. Sem roles/e-mail no token.
- **Refresh token**: opaco, alta entropia (`randomBytes(32)` base64url); o **hash** (sha256) persiste,
  o claro vai ao cliente. **Rotação obrigatória** a cada uso + **reuse-detection** (reapresentar um
  refresh já rotacionado revoga a cadeia inteira).
- **Senha**: argon2id (parâmetros OWASP), comparação constant-time. O domínio nunca hasheia nem vê
  senha em claro.

## Rotas `/api/v2/auth`

| Rota | Descrição |
| :--- | :--- |
| `POST /register` | Cadastro (e-mail + senha; valida a política do domínio) |
| `POST /login` | Credencial → access JWT + refresh opaco |
| `POST /refresh` | Rotação do par (one-time; reuse-detection) |
| `POST /logout` | Revoga o refresh apresentado (idempotente) |
| `GET /me` | userId do token (autenticada) |
| `POST /change-password` | Troca de senha autenticada; revoga todas as sessões |
| `POST /sessions/revoke-all` | Encerra todas as sessões do usuário |
| `POST /forgot-password` | Solicita reset (resposta **sempre 202**, anti-enumeração) |
| `POST /reset-password` | Confirma o reset (token one-time + TTL); troca a senha e revoga sessões |

## Hardening de segurança (spec 003)

Endereçados os achados da auditoria OWASP WSTG/ASVS:

- **Rate-limit dedicado** em `/login` e `/refresh` (5/min), separado do teto global — anti brute force.
- **Account lockout progressivo por conta** (5 falhas → cooldown 1/5/15/cap 60 min, temporário,
  resposta genérica). Persistido em MySQL (`auth_login_lockout`).
- **Login anti-timing**: verify "dummy" no ramo usuário-inexistente (o relógio não vaza contas reais).
- **Reset de senha seguro**: token one-time + TTL, origem confiável via config (anti
  Host-Header-Injection), anti-enumeração, revoga sessões após a troca, entrega por e-mail (Nodemailer).
- **Blocklist de senhas vazadas/comuns** + política NIST 800-63B (comprimento > composição).

> Veja a entrega completa no **[Changelog → Hardening de segurança](/changelog/auth-security-hardening)**.

## Persistência (ADR-0014/0020)

Tabelas `auth_*` (MySQL único, Drizzle): `auth_user`, `auth_role`, `auth_permission`,
`auth_user_role`, `auth_role_permission`, `auth_refresh_token`, `auth_password_reset`,
`auth_login_lockout`. Cada repositório tem adapter InMemory (testes/CLI) + Drizzle (real).

:::tip Fonte
Decisões vivas em `handbook/domain/auth/design-decisions.md`; ADRs 0024 (identidade/RBAC), 0025
(Fastify), 0026 (RW split), 0027 (Zod contract-first). Código em `src/modules/auth/`.
:::
