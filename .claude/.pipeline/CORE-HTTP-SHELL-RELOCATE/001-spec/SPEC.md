# SPEC — Mover o shell HTTP para `src/shared/http/` + `src/server.ts` (`CORE-HTTP-SHELL-RELOCATE`)

> **Tipo:** ticket · **Size:** S · **Épico-pai:** `EPIC-HTTP-CORE-API`
> **Status da spec:** aprovada (2026-05-28, Gabriel)
> **ADRs tocados:** `ADR-0028` (origem), `ADR-0006`, `ADR-0025`, `ADR-0027`

## 1. Problema & contexto

O H0 entregou o shell HTTP em `src/http/` (topo), que aparenta "camada HTTP horizontal" — em tensão com a
verticalidade por feature do Modular Monolith. O [ADR-0028](../../../../handbook/architecture/adr/0028-http-edge-shell-location.md)
(Accepted) fixa a home: shell transversal em `src/shared/http/`, composition root em `src/server.ts`. Este
ticket é a **execução do refactor** — movimentação pura, sem mudança de comportamento (os 7 CAs do H0 cobrem).

## 2. User stories

- Como **mantenedor**, quero o shell de borda em `src/shared/http/` e o entrypoint em `src/server.ts`, para
  que a árvore reflita a verticalidade por feature (ADR-0028) e cumpra o ADR-0006:53-63.

## 3. Critérios de aceitação (viram os testes do W0)

- **CA1 (comportamento preservado)** — os **7 CAs do H0** (`/health` 200; exceção→500 com envelope sem stack;
  body Zod inválido→400; helmet `x-content-type-options: nosniff`; rota inexistente→404; `/docs/json`
  `openapi==='3.1.1'`; `sendResult` ok→2xx/err→status mapeado) seguem **verdes** a partir de
  `tests/shared/http/bootstrap.test.ts`, importando `#src/shared/http/{app,reply}.ts`.
- **CA2 (sem duplicata / sem import órfão)** — `src/http/` e `tests/http/` **não existem** mais; `grep -r
  "#src/http/" src/ tests/` retorna **vazio**.
- **CA3 (composition root)** — `src/server.ts` existe; importa `buildApp`/`readHttpConfig` de
  `#src/shared/http/{app,config}.ts`; mantém o graceful shutdown (SIGTERM/SIGINT → `app.close`) e o
  `installLastResortHandlers` (`#src/shared/runtime/last-resort.ts`).
- **CA4 (lint)** — `pnpm run lint` verde; o override de borda do `eslint.config.js` cobre
  `src/shared/http/**/*.ts` **e** `src/modules/*/adapters/http/**/*.ts`.
- **CA5 (gate W3)** — `pnpm test` + `pnpm run typecheck` + `pnpm run format:check` + `pnpm run lint` verdes.

## 4. Não-objetivos / fora de escopo

- Plugin de rotas do `auth` → `AUTH-HTTP-PLUGIN-EXPORT`.
- Script `serve`/`start` para `src/server.ts` → H1+.
- Qualquer alteração de envelope/hardening/OpenAPI/Result→HTTP — **só movimentação**.

## 5. Clarificações (Q&A resolvidas)

- **Q:** Mover ou copiar? · **R:** **Mover** (sem deixar `src/http/` para trás) — CA2 garante ausência de
  duplicata e de import órfão. (2026-05-28.)
- **Q:** `server.ts` na raiz (`src/server.ts`) ou em `src/shared/http/`? · **R:** **`src/server.ts`** — é o
  composition root do ADR-0006:63 (transversal ao app, acima dos módulos). O shell *reutilizável* (`buildApp`
  etc.) é que vai para `src/shared/http/`. (ADR-0028.)
- **Q:** Risco de quebrar consumidores? · **R:** Baixo — só `src/http/*` (entre si) e o teste importam
  `#src/http/*`; nenhum módulo nem script depende. Blast radius mapeado no `000-request.md`. (2026-05-28.)

## 6. Plano técnico de alto nível (sem código)

```
Movimentações (git mv-equivalente):
  src/http/app.ts     → src/shared/http/app.ts
  src/http/config.ts  → src/shared/http/config.ts
  src/http/errors.ts  → src/shared/http/errors.ts
  src/http/reply.ts   → src/shared/http/reply.ts
  src/http/server.ts  → src/server.ts
  tests/http/bootstrap.test.ts → tests/shared/http/bootstrap.test.ts

Reescrita de imports (#src/http/* → #src/shared/http/*):
  src/shared/http/app.ts    : #src/http/errors.ts, #src/http/config.ts
  src/shared/http/reply.ts  : #src/http/errors.ts
  src/server.ts             : #src/http/app.ts, #src/http/config.ts
  tests/shared/http/bootstrap.test.ts : #src/http/app.ts, #src/http/reply.ts
  (imports #src/shared/* já corretos — não mudam: correlation, result, last-resort)

ESLint (eslint.config.js):
  files: ['src/http/**/*.ts']
    → files: ['src/shared/http/**/*.ts', 'src/modules/*/adapters/http/**/*.ts']
  (comentário do bloco atualizado p/ citar ADR-0028)

Remoção: diretórios src/http/ e tests/http/ vazios após o move.
```

- **Ordem fail-first (W0→W1):** W0 cria `tests/shared/http/bootstrap.test.ts` com os imports já apontando
  para `#src/shared/http/*` → **RED** (arquivos ainda em `#src/http/`). W1 move os 5 arquivos + reescreve
  imports + ajusta ESLint + remove pastas antigas → **GREEN**. Conteúdo das 7 asserções **idêntico**.

## 7. Constitution check (aderência aos ADRs/regras)

| Fonte | Exigência (citada) | Como a spec adere |
| :-- | :-- | :-- |
| `ADR-0028` | shell em `src/shared/http/`; root em `src/server.ts`; HTTP de feature em `modules/<m>/adapters/http/` | É a execução literal do ADR (itens 1-2 do §6) |
| `ADR-0006:53-63` | `shared/` transversal (não-BC) + `server.ts` composition root | `buildApp`/envelope → `shared/http/`; entrypoint → `src/server.ts` |
| `ADR-0006:152` | domínio/application sem framework | Refactor não toca domínio nem application; só move o adapter de borda |
| `ADR-0025:29,37` | HTTP é adapter; composition root **único** | Continua um único `buildApp` + um único entrypoint (`src/server.ts`) |
| `ADR-0027` | Zod só na borda | Zod segue em `src/shared/http/` (shell) — sem entrar em domínio |
| `.claude/rules/testing.md` | testes espelham `src/` via `#src/*` | `tests/http/` → `tests/shared/http/` (espelha `src/shared/http/`) |

## 8. Riscos & mitigações

| Risco | Severidade | Mitigação |
| :-- | :-- | :-- |
| Import `#src/http/` órfão sobrando após move | média | CA2: `grep -r "#src/http/"` deve dar vazio; W3 `typecheck` pega referência quebrada |
| Teste movido mas algum CA do H0 regredir | média | CA1: as 7 asserções migram **sem alteração**; só o path do import muda |
| ESLint glob esquecer `src/shared/http/**` → lint quebra | baixa | CA4 explícito; W3 roda `pnpm run lint` |
| `prettier-write` hook reformatar arquivos movidos divergente | baixa | W3 `format:check`; arquivos já eram formatados no H0 |

## 9. Definition of Done

- [ ] CA1–CA5 verdes (W0→W3).
- [ ] `src/http/` e `tests/http/` removidos; `grep -r "#src/http/" src/ tests/` vazio.
- [ ] `src/server.ts` é o entrypoint; shell em `src/shared/http/`.
- [ ] ESLint glob cobre `src/shared/http/**` + `src/modules/*/adapters/http/**`.
- [ ] Pós-merge: SPEC do `AUTH-HTTP-PLUGIN-EXPORT` reapontada aos novos paths; `EPIC-HTTP-CORE-API.md` atualizado.
