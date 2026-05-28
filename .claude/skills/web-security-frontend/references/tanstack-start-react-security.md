# Frontend Security Spec — TanStack Start (React) + TypeScript

> Spec **normativa** (MUST/SHOULD/MAY) + **regras de auditoria** para frontend TanStack Start/React. Regras
> `FE-NNN`. Baseado na doc oficial do TanStack Start + reference React do openai/skills `security-best-practices`.
> **Abrir a doc oficial (WebFetch) antes de prescrever API** — o framework evolui.

---

## 0) Boundaries & anti-abuso (MUST)

- **MUST NOT** tratar nada do browser como secreto: bundle, env var inlined, código cliente, `localStorage` — tudo é público (view-source/devtools/proxy).
- **MUST NOT** "consertar" segurança desligando proteção (CSP off, `unsafe-inline`/`unsafe-eval` sem plano, CSRF off, sanitização removida).
- **MUST** dar finding com evidência (`arquivo:linha` + snippet + impacto).
- **MUST** tratar como hostil: URL/query/hash/route params, `localStorage`/`sessionStorage`/`IndexedDB`, `postMessage`, resposta de API, conteúdo de CMS/markdown, script de terceiro.
- **TLS:** o frontend roda atrás de TLS na borda/CDN. Não reportar "sem TLS" no código da app como vulnerabilidade (confirmar o deploy antes).

## 1) Server functions = RPC exposto (MUST) — o ponto nº 1

- **FE-001 (MUST):** `createServerFn` é um **endpoint RPC** alcançável por **POST direto**, independente da rota/UI que o chama. ⇒ **authz no HANDLER** (via `authMiddleware` ou check in-handler), nunca confiar que "só a tela X chama". Server function que muta estado sem check de auth ⇒ **Crítica**.
- **FE-002 (MUST):** **validar input** do server function (shape + invariante) como numa rota de API — não confiar nos args vindos do cliente.
- **FE-003 (MUST):** **authz na server function, não só na rota** — a rota protege a navegação; o RPC continua chamável diretamente.
- **FE-004 (SHOULD):** middleware de auth reutilizável (`middleware: [authMiddleware]`) em vez de check repetido e esquecível.

## 2) CSRF (MUST quando sessão por cookie)

- **FE-010 (MUST se cookie):** aplicar `createCsrfMiddleware` às server functions; por default rejeita request sem `Sec-Fetch-Site`/`Origin`/`Referer` esperados. Sessão por **cookie** ⇒ CSRF é relevante. Bearer token em header (não cookie) ⇒ CSRF menos aplicável — confirmar o modelo antes de reportar.

## 3) Env vars & secrets (MUST)

- **FE-020 (MUST):** secret server-only **nunca** lido em **module scope** de código que vai ao cliente — o bundler **inlina** o valor no bundle. Ler dentro da server function/loader server-side. Secret inlined no bundle ⇒ **Crítica**.
- **FE-021 (MUST):** variável com prefixo público (ex.: `VITE_*`) é **pública por definição** — nunca pôr secret nela.
- **FE-022 (SHOULD):** source maps tratados como artefato sensível (não publicar abertos; ou só para error-reporting autenticado) — revelam estrutura/URLs internas.

## 4) XSS & DOM sinks (MUST)

- **FE-030 (MUST):** `dangerouslySetInnerHTML` só com HTML **sanitizado** (DOMPurify) — nunca com input cru. ⇒ **Crítica** se input do usuário.
- **FE-031 (MUST):** sem sinks diretos de DOM com input: `innerHTML`, `outerHTML`, `document.write`, `eval`, `new Function`, `setTimeout(string)`.
- **FE-032 (MUST):** atributo de URL (`href`, `src`, `action`, `formAction`) derivado de input valida o **esquema** — bloquear `javascript:`/`data:` perigoso. Open via `window.open`/`location` idem.
- **FE-033 (SHOULD):** markdown/rich-text renderizado com renderer seguro (sem HTML cru) + sanitização.

## 5) CSP / Trusted Types / SRI (SHOULD/MUST em prod)

- **FE-040 (SHOULD, MUST em prod):** CSP sem `unsafe-inline`/`unsafe-eval` — usar nonce/hash. CSP fraca enfraquece toda defesa de XSS.
- **FE-041 (SHOULD):** **Trusted Types** para travar sinks de DOM (`require-trusted-types-for 'script'`).
- **FE-042 (SHOULD):** **SRI** (`integrity`) em `<script>`/`<link>` de terceiro; CSP `script-src` com allowlist.
- **FE-043 (SHOULD):** `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options`/`frame-ancestors` (clickjacking).

## 6) Auth, token & sessão (MUST) — alinha ADR-0005

- **FE-050 (MUST):** token de acesso/refresh **não** persiste em `localStorage`/`sessionStorage` (XSS rouba). Sessão via cookie **`HttpOnly` + `SameSite`** setado pelo servidor. O browser **nunca** vê JWT/refresh (BFF é o Iron Frontier). Token em storage do browser ⇒ **Alta**.
- **FE-051 (MUST):** fluxo OAuth/login redireciona só para destino em **allowlist** (anti open-redirect no callback).

## 7) Navegação & terceiros (MUST/SHOULD)

- **FE-060 (MUST):** redirect derivado de input (`?next=`, `returnTo`) validado contra **allowlist** (path relativo / host conhecido) — anti open-redirect.
- **FE-061 (MUST):** `target="_blank"` ⇒ `rel="noopener noreferrer"` (anti reverse tabnabbing).
- **FE-062 (SHOULD):** `postMessage` valida `origin`; não usar `'*'` como targetOrigin com dado sensível.

## 8) SSR / data loading (MUST)

- **FE-070 (MUST):** loader/SSR não serializa para o HTML/cliente dado **server-only** (segredo, campo sensível do usuário, hash). O que vai no `dehydrate`/props é público.

---

## Required audit finding format

`Rule ID · Severity (Crítica/Alta/Média/Baixa) · Location (arquivo:componente:linha) · Evidence (snippet) · Impact · Fix (diff mínimo) · False-positive notes`.

## Falsos-positivos comuns

- "Sem CSRF token" com auth por **Bearer header** (não cookie) → CSRF menos aplicável; confirmar modelo de sessão.
- "Env var no cliente" que é genuinamente pública (URL de API pública, feature flag) → ok; o problema é **secret**, não config pública.
- "Sem TLS" no código da app → TLS é da borda/CDN; confirmar deploy.
