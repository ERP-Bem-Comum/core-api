# Documentação — `core-api` (ERP Bem Comum)

> Documentação consolidada e **IA-friendly** (markdown plano, sem JS) do backend `core-api`. Para LLMs/
> agentes: comece por [`/llms.txt`](../llms.txt) na raiz. Para humanos: o GitHub renderiza estes `.md`.
>
> Esta doc **consolida e indexa** — a fonte de verdade canônica é o [`handbook/`](../handbook/) (domínio,
> ADRs, reference) e o próprio código. Onde houver divergência, **o handbook/ADR vence**.

## Mapa da documentação

| Documento                                          | Conteúdo                                                                              |
| :------------------------------------------------- | :------------------------------------------------------------------------------------ |
| [01 — Arquitetura & ADRs](./01-architecture.md)    | Modular monolith, camadas, ports & adapters, hierarquia de regras, índice dos 28 ADRs |
| [02 — API HTTP (borda)](./02-http-api.md)          | Rotas `/api/v2` (auth + contracts), RBAC, dual-pool RW, OpenAPI, envelope de erro     |
| [03 — Domínio Contratos](./03-domain-contracts.md) | Agregados Contract/Amendment/Document, estados, eventos, regras de negócio, outbox    |
| [04 — Guia do dev](./04-dev-guide.md)              | Setup, comandos pnpm, pipeline W0→W3, drivers memory/mysql, Docker, testes/E2E        |

## O que é o `core-api` em uma frase

Backend do ERP Bem Comum, um **modular monolith** em Node.js 24 + TypeScript 6 (ESM), com o **módulo
Contratos** completo (domínio puro → application → adapters Drizzle/MySQL → borda HTTP Fastify + CLI),
mais os módulos `auth` (identidade & RBAC) e os emergentes `financial`/`notifications`.

## Estado atual (2026-05-28)

- **Contratos:** domínio completo, persistência MySQL (Drizzle), CLI, **borda HTTP `/api/v2/contracts`
  completa** (reads, writes, documentos, export CSV) — ver [02](./02-http-api.md).
- **Auth:** identidade própria + RBAC por permissão, JWT ES256, borda HTTP `/api/v2/auth` — ADR-0024.
- **Eventos:** Outbox MySQL (ADR-0015) para comunicação cross-módulo.
- **Storage:** S3 (prod) / MinIO (dev) via port único `DocumentStorage` — ADR-0019.

## Convenções desta doc

- **Idioma:** prosa em PT-BR; identificadores de código, rotas e erros internos em EN (regra do projeto).
- **Links:** relativos (`./`, `../`) para navegação por agente e no GitHub.
- **Citações de regra:** sempre apontam para `handbook/.../arquivo.md` ou `src/.../arquivo.ts` — abrir a
  fonte para o texto normativo literal.
