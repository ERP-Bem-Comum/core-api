[← Voltar para ADRs](./README.md)

# ADR-0028: Localização do shell HTTP de borda e do composition root (verticalidade por feature)

- **Status:** Accepted
- **Date:** 2026-05-28
- **Deciders:** Gabriel Aderaldo + Arquiteto técnico
- **Relacionado:** [ADR-0006](./0006-modular-monolith-core-api.md) (cumpre `:53-63` — `shared/` transversal + `server.ts` na raiz), [ADR-0025](./0025-http-server-fastify-core-api.md) (HTTP é adapter; composition root único `:37`), [ADR-0027](./0027-zod-openapi-contract-first-http-edge.md) (Zod na borda do módulo)

---

## Contexto

O ticket `CORE-HTTP-FASTIFY-BOOTSTRAP` (H0 do `EPIC-HTTP-CORE-API`) entregou o alicerce HTTP em
**`src/http/`** — no topo da árvore, ao lado de `src/modules/` e `src/shared/`. Isso funciona, mas dá a
`src/http/` a aparência de uma **camada técnica horizontal** ("a camada HTTP", estilo MVC), em tensão com
a organização **vertical por feature** do core-api (Modular Monolith por Bounded Context — ADR-0006), onde
cada `src/modules/<m>/` é uma fatia completa (`domain → application → adapters → cli → public-api`).

O próprio ADR-0006 já prescrevia a estrutura transversal **fora** dos BCs:

> `0006-modular-monolith-core-api.md:53-63`:
> ```
> src/
> ├── contexts/<bc>/      ← domain/ application/ adapters/
> ├── shared/             ← Código transversal do app (não BC)
> └── server.ts           ← Composition root
> ```

E o ADR-0025 fixou que o HTTP é **um adapter** e que há **um composition root único**:

> `0025-http-server-fastify-core-api.md:29` — *"É um **adapter** na camada `adapters/`"*
> `0025-http-server-fastify-core-api.md:37` — *"Composition root **único** monta o servidor e injeta os adapters."*

Falta fixar **onde** vive o shell de borda transversal (o que não pertence a nenhum módulo) e reforçar a
fronteira entre esse shell e o HTTP-de-feature, para que a verticalidade fique explícita na árvore.

---

## Decisão

A borda HTTP do core-api distribui-se em **três lugares com responsabilidades distintas**:

| Responsabilidade | Localização | Conteúdo |
| :--- | :--- | :--- |
| **Shell de borda transversal** | `src/shared/http/` | `buildApp` (factory Fastify + hardening + Zod compilers + OpenAPI), error handler/envelope, `sendResult` (Result→HTTP), config HTTP |
| **Composition root (entrypoint)** | `src/server.ts` | lê env, chama `buildApp({ routes })`, `listen`, graceful shutdown — cumpre `ADR-0006:63` |
| **HTTP de cada feature** | `src/modules/<m>/adapters/http/` | plugin Fastify do módulo, rotas, handlers, schemas Zod por rota — exposto ao root via `<m>/public-api/http.ts` (ADR-0006) |

**Invariantes:**

- Nenhuma rota/handler/schema de feature vive no shell transversal (`src/shared/http/`). O shell é
  agnóstico de domínio: só sabe subir o servidor, aplicar hardening, traduzir `Result` e gerar OpenAPI.
- O composition root (`src/server.ts`) **só** importa plugins de módulo via `<m>/public-api/http.ts`
  (cross-módulo por public-api, ADR-0006) — nunca de `<m>/domain/` ou `<m>/application/`.
- Zod permanece exclusivo de `src/modules/<m>/adapters/http/` e `src/shared/http/` (ADR-0027); domínio e
  application seguem sem framework (ADR-0025:30).

Esta decisão **não superseda** ADR-0006 nem ADR-0025 — ela os **cumpre** (a home `src/shared/http/` é o
`shared/` transversal do `0006:53-63`; o `src/server.ts` é o composition root do `0006:63`/`0025:37`).

---

## Consequências

### Positivas

- **Verticalidade explícita na árvore.** `src/modules/<m>/` são as fatias de feature; o transversal
  concentra-se em `src/shared/` (incl. `http/`) + `src/server.ts`. Some a aparência de "camada HTTP".
- **Cumpre o ADR-0006 ao pé da letra** (`shared/` + `server.ts`), reduzindo dívida conceitual.
- **Fronteira testável.** O HTTP-de-feature mora junto da feature (`adapters/http/`), coeso com seu
  `application`/`domain`; o code-reviewer audita o import do root contra `public-api/http.ts`.

### Negativas

- **Refactor do H0.** Os 5 arquivos de `src/http/` movem (`src/shared/http/` + `src/server.ts`) e os
  imports `#src/http/*` viram `#src/shared/http/*`. Mitigado: o H0 está untracked e coberto por testes
  (`bootstrap.test.ts`) que validam o refactor (sem mudança de comportamento). Ticket `CORE-HTTP-SHELL-RELOCATE`.

### Neutras

- O glob do ESLint para folgas de adapter de borda passa a cobrir `src/shared/http/**` e
  `src/modules/*/adapters/http/**`.

---

## Alternativas Consideradas

### A. Manter `src/http/` no topo

**Rejeitada porque:** ao lado de `src/modules/`, sugere uma camada técnica horizontal — contra a
organização vertical-por-feature (ADR-0006) — e diverge da estrutura `shared/` + `server.ts` que o
próprio ADR-0006:53-63 prescreve.

### B. Mini-bootstrap por módulo (cada feature sobe seu próprio servidor)

**Rejeitada porque:** viola o **composition root único** (ADR-0025:37) — não há como ter múltiplos
`listen()` num único processo deployável (ADR-0006). O shell de borda é, por natureza, transversal.

---

## Quando Re-avaliar

- Se surgir um **segundo protocolo de borda** (ex.: gRPC/WebSocket): avaliar se `src/shared/http/`
  generaliza para `src/shared/<protocol>/` ou se o shell vira `src/shared/transport/`.
- Se o composition root crescer a ponto de exigir múltiplos entrypoints (ex.: worker + HTTP no mesmo
  binário com flags): reavaliar `src/server.ts` único.

---

## Referências

- [ADR-0006](./0006-modular-monolith-core-api.md) — Modular Monolith; estrutura `shared/` + `server.ts` (`:53-63`), domínio sem framework (`:152`).
- [ADR-0025](./0025-http-server-fastify-core-api.md) — HTTP é adapter (`:29`); composition root único (`:37`).
- [ADR-0027](./0027-zod-openapi-contract-first-http-edge.md) — Zod só na borda (`adapters/http/`).
- `EPIC-HTTP-CORE-API` (`.claude/.planning/`) — épico que entregou o H0 em `src/http/` (atualizado por esta decisão).
- `.claude/skills/ts-domain-modeler/SKILL.md:413` (§3.A.5) — exemplo canônico de HTTP em `src/modules/<m>/adapters/http/`.
