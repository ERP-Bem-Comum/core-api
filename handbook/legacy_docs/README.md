# Documentação — ERP Bem Comum (Backend)

Artefatos gerados a partir da **fonte de verdade do código** (controllers, DTOs,
entities e enums NestJS/TypeORM).

| Arquivo | O que é | Como visualizar |
|---|---|---|
| [`openapi.yaml`](./openapi.yaml) | Contrato OpenAPI 3.1 dos módulos **Parceiros, Programas, Usuários, Orçamento, Relatórios, Estatísticas e Arquivos** (exclui `auth`, `contratos` e `financeiro`). 114 rotas, 78 schemas. | [Swagger Editor](https://editor.swagger.io), Redocly, Postman, ou `npx @redocly/cli preview-docs docs/openapi.yaml` |
| [`database-er.md`](./database-er.md) | Diagrama **ER** (Mermaid) de **todas as 30 tabelas** — visão de relacionamentos + visão detalhada com colunas. | Renderiza direto no GitHub e no VS Code (extensão *Markdown Preview Mermaid*) |
| [`database.dbml`](./database.dbml) | Esquema do banco em **DBML** com os **tipos exatos de coluna**, índices, unicidades e FKs. | [dbdiagram.io](https://dbdiagram.io) → cole o conteúdo; ou `dbml2sql` para gerar DDL |

## Notas importantes

- **Escopo do OpenAPI**: cobre tudo que **não** é `auth` (`/auth/*`), `contratos`
  (`/contracts/*`) nem `financeiro` (`/payables`, `/receivables`, `/accounts`, `/cards`,
  `/bank-reconciliation`, `/apiBradesco/*`). As rotas `/files/*` aparecem porque o service
  é compartilhado.
- **Divergências front × backend** estão marcadas com `⚠️ DIVERGÊNCIA` no `openapi.yaml`.
  As principais confirmadas no código:
  - Rota base de usuários é **`/users`** (e existe `/users/me`).
  - `occupationArea` (`PARC|DDI|DCE|EPV`) e `employmentRelationship` (`CLT|PJ`) são **enums**,
    não strings livres.
  - `POST /budget-plans` exige **`programId`** (não aceita null).
  - `GET /budgets` exige **`budgetPlanId`**.
  - `POST /share-budget-plans/check-credentials` espera **`{ username, password }`**.
  - Mutações (POST/PUT/PATCH/DELETE) em geral retornam **corpo vazio** (`void`).
- **Banco**: MySQL. Toda tabela herda `id`/`createdAt`/`updatedAt` de `AbstractEntity`.
  Objetos *embedded* (`bancaryInfo`, `pixInfo`, `contractPeriod`, `recurenceData`) viram
  colunas achatadas com prefixo (ex.: `suppliers.bancaryInfoBank`). Valores `*InCents` são
  inteiros em centavos (`bigint`).
