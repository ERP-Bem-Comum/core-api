# Melhoria planejada — Fachada OO (objeto-fachada de arrow-functions) na borda HTTP

> **Status:** 📋 Planejado · **não-prioritário** (parqueado) · **Data:** 2026-06-06
> **Spec completa:** [`specs/004-http-facade-controllers/`](../../specs/004-http-facade-controllers/spec.md) (branch `004-http-facade-controllers`)
> **Método:** sessão multi-agente read-only — `typescript-language-expert` + `nodejs-runtime-expert` + MCP `acdg-skills`.
> **Não puxar sem repriorização do dono.** Não destrava requisito de produto.

## O que é

Refactor **só de legibilidade** (Size L, **zero mudança de comportamento**): agrupar os handlers HTTP —
hoje arrow-functions inline soltas dentro de `scope.route({...})` — como **membros nomeados de um
objeto-fachada** criado por uma factory que fecha sobre `deps`/`hooks`. Lê-se como um controller OO,
mantendo 100% da semântica funcional (`Result`, ports/adapters, domínio sem framework).

```ts
// makeXController(deps, hooks) => ({ list, getById, create }) satisfies Record<string, RouteHandler>
```

## Por que está parqueado

- **Ganho subjetivo** (organização/leitura) vs. **churn de ~2k linhas** em ~8 plugins (~62 handlers).
- Não fecha gap do front, não corrige bug, não destrava feature. Pura higiene estética.
- Baixo risco técnico, mas custo de revisão/merge não-trivial — só compensa quando não houver fila de valor.

## Decisões já travadas (não re-litigar quando for puxado)

- **Proibido `class`** (Opção A, não B): `eslint.config.js` `no-restricted-syntax` proíbe `ClassDeclaration`/`ClassExpression` globalmente (o override de `adapters/http/**` NÃO relaxa) **e** `--experimental-strip-types` rejeita parameter properties/decorators (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`). A keyword `class` nem roda sem build step.
- **Fachada DENTRO da closure** `xRoutes(scope)` — obrigatório para preservar a inferência tipada de `req.query`/`params`/`body` do `FastifyZodOpenApiTypeProvider`. Extrair pra fora → `req` vira `FastifyRequest` cru. Sem `this`.
- **Restrito** a `src/modules/*/adapters/http/` + composition root. Não toca `domain/`/`application/`, contratos HTTP, ADRs, env.
- Ancoragem: Fowler Cap.7 Encapsulation; mensagem do próprio `no-restricted-syntax` ("use `type Readonly<{}>` + funções"); ADR-0025/0028.

## Fatiamento (quando for puxado — 1 ticket por módulo, nunca big-bang)

| Ordem | Ticket | Alvo | Handlers |
| --- | --- | --- | --- |
| 1 (piloto) | `HTTP-FACADE-AUTH` | `auth/adapters/http/plugin.ts` | 9 |
| 2 | `HTTP-FACADE-CONTRACTS` | `contracts/adapters/http/plugin.ts` | 15 |
| 3 | `HTTP-FACADE-PARTNERS` | 6 plugins de `partners/adapters/http/` (collaborator/supplier/financier/act/geography/aggregator) | ~38 |

Rede de segurança: os testes de rota existentes (`fastify.inject`) como **caracterização** no W0. Cada ticket fecha com gate W3 verde.

## Como retomar

`/speckit-plan` na branch `004-http-facade-controllers` → `/speckit-tasks` → `/speckit-analyze` → W0 do piloto `auth`.
