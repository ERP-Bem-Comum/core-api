---
slug: auth-security-hardening
title: 🔐 Hardening de segurança da autenticação (spec 003)
authors: [time-core-api]
tags: [seguranca, auth]
date: 2026-05-30T18:20
---

Fechamos a **auditoria de segurança da autenticação** (spec 003, OWASP WSTG/ASVS): os cinco achados
do relatório foram endereçados de ponta a ponta — e o fluxo de **reset de senha** nasceu inteiro,
seguro por construção.

{/* truncate */}

## ✨ O que mudou

### 🔴 Alta prioridade

- **Rate-limit dedicado de login/refresh** — um teto restritivo (5/min) só para os endpoints de
  senha, separado do limite global, contra brute force.
- **Account lockout progressivo por conta** — após 5 falhas, cooldown crescente (1 → 5 → 15 min, cap
  60 min), **sempre temporário** (anti-DoS) e com resposta genérica (não vaza se a conta existe).
  Agora **persiste no MySQL** (sobrevive a restart, vale entre instâncias).
- **Login anti-timing** — quando o e-mail não existe, o login ainda paga o custo de um hash "dummy",
  para que o relógio não revele quais e-mails são contas reais.
- **Fluxo de reset de senha** — `POST /forgot-password` (resposta **sempre 202**, anti-enumeração) e
  `POST /reset-password` (token **one-time** + TTL curto, troca a senha e **revoga todas as sessões**).
  O link vem de origem confiável de config (nunca do header `Host`), entregue por e-mail via
  Nodemailer.

### 🟡 / 🟢 Complementos

- **Rotas de conta**: `POST /change-password` e `POST /sessions/revoke-all` (autenticadas; o `userId`
  vem sempre do JWT — sem IDOR).
- **Blocklist de senhas vazadas/comuns** na política (NIST 800-63B: comprimento + lista de conhecidas).

## 🧪 Qualidade

Tudo via pipeline fail-first **W0→W3**, em **7 tickets** `CTR-AUTH-*` (closed-green). **231 testes**
do módulo auth verdes; migrations e repositórios Drizzle validados contra **MySQL 8.4 real**.

## 📌 Decisão registrada

O store compartilhado (Redis/Valkey) para o rate-limit foi **deliberadamente adiado** — ver
[ADR-0030](/decisoes/catalogo): single-instance hoje, in-memory é suficiente; direção futura travada
(Valkey + ioredis) para quando o core-api escalar horizontalmente.

→ Detalhe técnico do módulo em **[Módulos → Auth](/modulos/auth)**.
