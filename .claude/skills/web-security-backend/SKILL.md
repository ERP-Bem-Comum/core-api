---
name: web-security-backend
description: >
  Segurança aplicada do BACKEND web JS/TS no stack real do core-api (Node.js 24 +
  TypeScript 6 + Fastify 5 + pnpm + Magalu Cloud S3-compat). Use para review de
  segurança server-side, escrever código secure-by-default na borda/adapters/
  persistência, ou produzir relatório de vulnerabilidades priorizado. Carrega
  references normativas (MUST/SHOULD) por tecnologia e roda em 3 modos: generation,
  passive review, active audit. Aciona em "segurança backend", "isso é seguro?",
  "auditar/hardening", "injection/IDOR/SSRF", "exposição de secret", "CORS/helmet/
  rate-limit", "Prototype Poisoning", "supply-chain". NÃO é a `security-reviewer`
  (OWASP-AI/LLM) nem a `clean-code-reviewer` (qualidade).
---

# Web Security — Backend (Node · TS · Fastify · pnpm · Magalu)

Skill canônica de segurança **server-side** do core-api. Usada pelo agente [`security-backend-expert`](../../agents/security-backend-expert.md). Espelha o método do openai/skills `security-best-practices`, **adaptado ao stack fixo e aos ADRs do projeto**.

> Idioma: doc PT-BR; código EN. Erros internos EN kebab-case. Cite `handbook/reference/<tech>/<arquivo>.md:linha` literalmente — nunca de memória.

---

## Source of truth (ordem de autoridade)

1. **ADRs** (`handbook/architecture/adr/`) — imutáveis. Críticos: 0005/0025 (TLS no BFF), 0011/0012 (supply-chain/pnpm), 0024 (RBAC), 0019/0021 (storage), 0020 (MySQL), 0027 (Zod na borda).
2. `handbook/reference/{nodejs,typescript,fastify,fastify-plugins,pnpm,magalu-cloud}/`.
3. `CLAUDE.md` raiz + `.claude/rules/{adapters,testing}.md`.
4. `references/` desta skill (specs normativas — abaixo).
5. Conhecimento geral de segurança (OWASP) **só** quando não conflita com 1–4.

---

## Workflow

1. **Identificar o que está em escopo.** O stack do core-api é fixo (Node/Fastify/pnpm/Magalu). Confirme em qual camada está mexendo: borda HTTP (`adapters/http/`), persistência (`adapters/persistence/`), storage (`adapters/storage/`), CLI, ou supply-chain (`package.json`/lockfile).
2. **Carregar as references relevantes** (em `references/`):
   - `node-fastify-backend-security.md` — borda HTTP, input/output, authn/z, injection, crypto, logging.
   - `supply-chain-and-cloud-security.md` — pnpm/lockfile/approve-builds + credenciais e buckets Magalu/S3.
   Leia **todas** as que tocam a camada em questão antes de prescrever.
3. **Operar em um dos 3 modos** (§Modos).
4. **Respeitar os invariantes do projeto** que mudam a postura (§Invariantes) — especialmente: TLS é no BFF (não reportar falta de HTTPS no core-api).

---

## Modos

### 1. Generation (default)
Ao escrever código novo: aplica todo **MUST** das references. Validação na entrada (Zod shape → smart constructor), parametrização SQL, fail-closed em authz, sem secret em log, output schema apertado, CSPRNG para tokens.

### 2. Passive review (sempre ligado)
Ao tocar/ler código próximo, sinaliza violações de **alto impacto** com fix curto — sem varrer o repo. Foco: secret hardcoded, SQL concatenado, `req.body` sem validação, CORS `origin:true`, log de token/PII, `Math.random()` para segurança.

### 3. Active audit (sob pedido)
Varre o escopo e escreve **`security_backend_report.md`** (ou onde o usuário pedir — pergunte se ambíguo):
- **Executive summary** (3–5 linhas).
- **Findings por severidade** (Crítica → Baixa), cada uma com: **ID** numérico · `arquivo:linha` · evidência (snippet) · **impacto** (1 frase) · **fix mínimo** · nota de falso-positivo.
- Foco nas de maior impacto primeiro. Depois **oferece aplicar fixes** um a um.

---

## Invariantes do projeto (ajustam a postura — NÃO são bugs)

- **TLS no BFF (ADR-0005/0025):** core-api é HTTP interno. ❌ Não reportar "sem TLS/HTTPS"; ❌ não recomendar HSTS; cookies `Secure` só atrás do proxy (flag de ambiente, nunca incondicional). *(Mesma guidance da skill openai best-practices: "be very careful about not reporting lack of TLS as a security issue".)*
- **BFF burro + core emite credencial (ADR-0005/0024):** authz server-side via access token + `authorize(permission)`, fail-closed.
- **IDs opacos (UUID v4):** nunca auto-incremento exposto (IDOR/enumeração).
- **Zod só na borda, regra nos smart constructors (ADR-0006/0027).**
- **MySQL parametrizado, sem UPSERT nativo (ADR-0020).**
- **`pnpm` sempre, `npm` nunca (ADR-0012); `approve-builds` + lockfile congelado (ADR-0011).**

---

## Report format (audit)

```markdown
# Security Backend Report — <escopo> — <data>

## Executive summary
<3-5 linhas: postura geral, nº de findings por severidade, top risco>

## 🔴 Críticas
### F1 — <título> — `src/.../arquivo.ts:LINHA`
- **Impacto:** <1 frase: o que dá errado, quem explora>
- **Evidência:** `<snippet>`
- **Fix:** <mudança mínima>
- **Falso-positivo se:** <o que verificar>

## 🟠 Altas
...
## 🟡 Médias
...
## 🔵 Baixas
...
```

## Fixes
- Um finding por vez; comentário curto explicando o "porquê" da prática (não o quê).
- Sem regressão: rodar `pnpm test` (+ `typecheck`/`lint`) após cada fix.
- Seguir o fluxo de commit do projeto (PT-BR, escopo de módulo); não agrupar findings não-relacionadas.
- Mudança não-trivial em `src/` → abrir ticket de pipeline (W0→W3) como manda o `CLAUDE.md`.

---

## Como se relaciona

```
security-backend-expert (agente)
        │ aplica
        ▼
web-security-backend (esta skill) ──► references/{node-fastify-backend, supply-chain-and-cloud}-security.md
        │ pareia com
        ├─ fastify-server-expert        (implementar a borda)
        ├─ mysql2-driver-expert          (TLS/auth do driver)
        └─ web-security-frontend (skill) (contraparte cliente — TanStack Start)
```

Distinta de [`security-reviewer`](../security-reviewer/SKILL.md) (OWASP-AI/LLM) e [`clean-code-reviewer`](../clean-code-reviewer/SKILL.md) (qualidade, não segurança).

---

## Changelog

- **2026-05-28** — Criação. Adapta openai/skills `security-best-practices` (+ `security-threat-model`) ao stack backend real do core-api e aos ADRs de segurança.
