# Documentação — `core-api` (ERP Bem Comum)

> Documentação consolidada e **IA-friendly** (markdown plano, sem JS) do backend `core-api`. Para LLMs/
> agentes: comece por [`/llms.txt`](../llms.txt) na raiz. Para humanos: o GitHub renderiza estes `.md`.
>
> Esta doc **consolida e indexa** — a fonte de verdade canônica é o [`handbook/`](../handbook/) (domínio,
> ADRs, reference) e o próprio código. Onde houver divergência, **o handbook/ADR vence**.

## Mapa da documentação

| Documento                                                 | Conteúdo                                                                           |
| :-------------------------------------------------------- | :--------------------------------------------------------------------------------- |
| [01 — Arquitetura & ADRs](./01-architecture.md)           | Modular monolith, camadas, ports & adapters, hierarquia de regras                  |
| [02 — API HTTP (borda)](./02-http-api.md)                 | Rotas `/api/v2`, RBAC, dual-pool RW, OpenAPI, envelope de erro                     |
| [03 — Domínio Contratos](./03-domain-contracts.md)        | Agregados Contract/Amendment/Document, estados, eventos, regras de negócio, outbox |
| [04 — Guia do dev](./04-dev-guide.md)                     | Setup, comandos pnpm, drivers memory/mysql, Docker, testes/E2E                     |
| [05 — Handoff para o front](./05-frontend-api-handoff.md) | Contrato consumido pelo BFF                                                        |

> O índice dos ADRs vive em [`handbook/architecture/adr/README.md`](../handbook/architecture/adr/README.md)
> e **não** é replicado aqui — contagem copiada envelhece no dia seguinte.

## O que é o `core-api` em uma frase

Backend do ERP Bem Comum, um **modular monolith** em Node.js 24 + TypeScript 6 (ESM), com borda HTTP
Fastify (ADR-0025/0037), persistência MySQL única via Drizzle (ADR-0020), eventos por Outbox MySQL
(ADR-0015) e storage S3/MinIO por port único (ADR-0019).

## Quais módulos existem

**`src/modules/` é a resposta** — `ls src/modules` lista o que existe hoje, e nenhuma lista escrita aqui
sobrevive ao próximo módulo. Cada um traz `domain/`, `application/`, `adapters/` e `public-api/`, e só a
`public-api/` é alcançável de fora (ADR-0014, cobrado por `tests/cleanup/module-boundary.test.ts`).

Para o que mudou e quando, o histórico curado está em
[`handbook/CHANGELOG.md`](../handbook/CHANGELOG.md); para o que ainda está em aberto,
[`handbook/inquiries/PERGUNTAS-EM-ABERTO.md`](../handbook/inquiries/PERGUNTAS-EM-ABERTO.md).

## Convenções desta doc

- **Idioma:** prosa em PT-BR; identificadores de código, rotas e erros internos em EN (regra do projeto).
- **Links:** relativos (`./`, `../`) para navegação por agente e no GitHub.
- **Citações de regra:** sempre apontam para `handbook/.../arquivo.md` ou `src/.../arquivo.ts` — abrir a
  fonte para o texto normativo literal.
