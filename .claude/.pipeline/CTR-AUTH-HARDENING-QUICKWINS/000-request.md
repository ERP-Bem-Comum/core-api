# CTR-AUTH-HARDENING-QUICKWINS — Hardening de auth (quick wins)

> **Size:** M · **Origem:** `specs/003-auth-security-hardening/spec.md` (auditoria frontend/BFF contra OWASP WSTG/ASVS).

## Escopo

Os 3 itens contidos do relatorio de seguranca, que nao exigem design pesado:

- **BE-REC-005** (blocklist de senhas vazadas/comuns) — OWASP WSTG-ATHN-07, NIST 800-63B.
- **BE-REC-002** (dummy-hash no login para usuario inexistente) — anti-timing, OWASP WSTG-ATHN.
- **BE-REC-004** (expor rotas HTTP `change-password` + `revoke-all`) — use cases ja existiam.

## Fora de escopo (viram epico de design)

- **BE-REC-001** (rate-limit/lockout dedicado) — toca modelo de dominio (DD-USER-06: lockout na camada de sessao).
- **BE-REC-003** (fluxo de reset de senha) — feature nova: token + TTL + one-time + EmailPort + anti-enumeracao + host-header.

Ver `.claude/.planning/EPIC-AUTH-SECURITY-HARDENING.md`.

## Criterios de aceite

- [x] `password-too-common` rejeita senhas da blocklist (case-insensitive), no register e no change-password.
- [x] Login roda verify (dummy) quando o usuario nao existe — tempo equivalente ao ramo senha-errada.
- [x] `POST /api/v2/auth/change-password` (autenticada) troca a senha e revoga todas as sessoes.
- [x] `POST /api/v2/auth/sessions/revoke-all` (autenticada) encerra todas as sessoes do usuario.
- [x] typecheck + lint + format + testes auth verdes.
