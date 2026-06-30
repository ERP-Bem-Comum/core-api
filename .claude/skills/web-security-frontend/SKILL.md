---
name: web-security-frontend
description: >
  Segurança aplicada do FRONTEND web JS/TS no stack-alvo: TanStack Start (React
  full-stack) + TypeScript. Use para review de segurança client-side, escrever UI
  secure-by-default, ou relatório de vulnerabilidades priorizado. Carrega reference
  normativa (MUST/SHOULD) e roda em 3 modos: generation, passive review, active
  audit. Cobre XSS/DOM sinks, CSP/Trusted Types/SRI, server functions como RPC
  (auth no handler), CSRF, env vars que vazam no bundle, token storage no browser,
  open redirect, source maps. Aciona em "segurança frontend", "XSS", "isso é seguro
  no React?", "server function segura", "CSP", "token no localStorage". NÃO é a
  `security-reviewer` (OWASP-AI/LLM) nem a `web-security-backend` (server-side).
---

# Web Security — Frontend (TanStack Start · React · TS)

Skill canônica de segurança **client-side** para o frontend que consome o core-api. Usada pelo agente [`security-frontend-expert`](../../agents/security-frontend-expert.md). Espelha o método do openai/skills `security-best-practices` (modo frontend), focado em **TanStack Start + React**.

> Idioma: doc PT-BR; código EN. **Abrir a doc oficial do TanStack Start (WebFetch) antes de prescrever API** — não citar de memória.

---

## Source of truth

1. **ADR-0005** (BFF burro: o browser nunca vê JWT/refresh/secret) — invariante de fronteira.
2. **Doc oficial TanStack Start** (server-functions, middleware, environment-variables, authentication, execution-model).
3. `references/tanstack-start-react-security.md` (spec normativa desta skill).
4. OWASP Cheat Sheets (XSS, DOM, CSP, CSRF) quando não conflita.

---

## Princípio nº 1 (frontend)

**Tudo que vai ao browser é público.** Bundle, env var inlined, "token no localStorage" — observável por view-source/devtools/proxy. O segredo mora no servidor: **server function** (`createServerFn`), **BFF**, **core-api**. Qualquer secret detectado no cliente ⇒ finding **Crítica**.

---

## Workflow

1. **Identificar o que está em escopo:** rota/componente React, loader/SSR data, **server function** (`createServerFn` — tem lado servidor!), middleware, config de build (Vite), CSP/headers.
2. **Carregar** `references/tanstack-start-react-security.md` (e abrir a doc oficial relevante).
3. **Operar em um dos 3 modos** abaixo.
4. **Lembrar:** server function é **RPC exposto** — aplicar a mesma disciplina de borda da skill [`web-security-backend`](../web-security-backend/SKILL.md) (validação + authz no handler).

## Modos

- **Generation (default):** UI/loader/server function secure-by-default — sem sinks crus de DOM, sanitização de HTML, validação+authz no server function, sem secret no cliente, CSP forte.
- **Passive review (sempre ligado):** sinaliza alto impacto ao tocar código — secret inlined no bundle, `dangerouslySetInnerHTML` sem sanitização, server function sem authz, token em `localStorage`, `target=_blank` sem `noopener`.
- **Active audit (sob pedido):** varre e escreve **`security_frontend_report.md`** — summary + findings por severidade (ID · `arquivo:linha` · evidência · impacto 1 frase · fix mínimo · nota de falso-positivo). Depois oferece aplicar fixes.

## Ordem de auditoria

1. Build/config (Vite), secrets & env (inlining), source maps.
2. Render de dado não-confiável (XSS): `dangerouslySetInnerHTML`, markdown/HTML, atributos de URL.
3. DOM sinks diretos (`innerHTML`, `eval`, `document.write`).
4. Auth/sessão/token (storage, cookie, fluxo OAuth).
5. **Server functions:** authz no handler, input validation, CSRF middleware.
6. Navegação/redirect (open redirect, `window.location`, `target=_blank`).
7. Terceiros/CSP/SRI; service worker/PWA.

---

## Report format

```markdown
# Security Frontend Report — <escopo> — <data>

## Executive summary
<3-5 linhas>

## 🔴 Críticas
### F1 — <título> — `app/.../arquivo.tsx:LINHA`
- **Impacto:** <1 frase>
- **Evidência:** `<snippet>`
- **Fix:** <mudança mínima>
- **Falso-positivo se:** <verificar>

## 🟠 Altas / 🟡 Médias / 🔵 Baixas
...
```

## Fixes
- Um por vez, comentário curto explicando o "porquê".
- Sem regressão (rodar o test/lint do projeto frontend).
- Seguir o fluxo de commit configurado.

---

## Como se relaciona

```
security-frontend-expert (agente) ──► web-security-frontend (esta skill)
                                            └─► references/tanstack-start-react-security.md
                                      pareia com web-security-backend (server functions têm lado servidor)
```

Distinta de [`security-reviewer`](../security-reviewer/SKILL.md) (OWASP-AI/LLM).

---

## Changelog

- **2026-05-28** — Criação. Foco TanStack Start (React) + TS. Adapta openai/skills `security-best-practices` (modo frontend / reference React) + doc oficial do TanStack Start.
