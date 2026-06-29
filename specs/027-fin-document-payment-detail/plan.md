# Implementation Plan: Complemento da forma de pagamento no lançamento de documento

**Branch**: `027-fin-document-payment-detail` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/027-fin-document-payment-detail/spec.md`

## Summary

Adicionar um atributo textual opcional `paymentDetail` ao agregado `Document` (Contas a Pagar, módulo `financial`) — complemento da forma de pagamento (linha digitável/código de barras de boleto, id de cartão corporativo, referência de câmbio). O front "Lançar Documento" já o captura; hoje o `create` o descarta. A abordagem é um campo primitivo `string | null` propagado pela cadeia existente (domínio → application → persistência → borda HTTP), espelhando o precedente já trilhado 3× na mesma tabela (`issueDate` #163, `accessKey` #115, `competencia` #197). Pré-validado por 5 canais (agentes drizzle/zod/security + MCP DDD/OWASP) antes desta etapa: **0 bloqueante**.

## Technical Context

**Language/Version**: TypeScript 6.0 · Node.js 24 LTS · ESM (`NodeNext`, `verbatimModuleSyntax`, `exactOptionalPropertyTypes`)

**Primary Dependencies**: Fastify 5 + Zod (borda HTTP, contract-first ADR-0027) · Drizzle 0.45 + `mysql2` (persistência)

**Storage**: MySQL 8.4 — tabela `fin_documents` (coluna nova `payment_detail`)

**Testing**: `node:test` (`--experimental-strip-types`) — unit no domínio/borda; integração Drizzle-MySQL via Docker (`test:integration`)

**Target Platform**: container Linux (single process, modular monolith)

**Project Type**: web service (modular monolith) — BC Financeiro (`fin_*`)

**Performance Goals**: N/A — atributo de leitura/escrita simples, sem índice, sem query nova; impacto nulo no plano de execução

**Constraints**: ADR-0006 (isolamento de módulo) · ADR-0014 (prefixo `fin_*`) · ADR-0018 (mapeamentos canônicos: texto livre curto → `varchar(255)`) · ADR-0020 (MySQL único; `varchar` permitido; sem JSON/ENUM/CHECK desnecessário) · ADR-0027 (Zod na borda)

**Scale/Scope**: 1 coluna nova · 1 migration aditiva (`0026`) · ~7 camadas tocadas · 0 novo agregado/evento/rota

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. TDD W0→W3 | ✅ ticket `FIN-DOC-PAYMENT-DETAIL`, size **S**; W0 RED antes de tocar `src/` |
| II. Regressão zero | ✅ back-compat por coluna nullable; nenhuma regressão prevista |
| III. pnpm | ✅ `pnpm run db:generate`, `pnpm test`; nunca npm |
| IV. Modular monolith + isolamento | ✅ só `fin_*`; sem import cross-módulo; sem leitura cruzada |
| V. Domínio puro | ✅ `paymentDetail: string \| null` em `Readonly<{...}>`; sem classe/throw; leitura sempre válida (sem novo `DocumentMapperError`) |
| VI. MySQL 8 + Drizzle, migration gerada | ✅ coluna em `schema.ts` → `db:generate` → migration `0026`; sem JSON/ENUM/trigger/proc |
| VII. HTTP-first, CLI aposentada | ✅ estende rotas Fastify existentes (create/patch/detail); sem `cli:*` |
| VIII. TS strict + ESM + idioma | ✅ bridge `?? null` resolve `undefined↔null` sob `exactOptionalPropertyTypes`; `import type`; código EN / docs PT |
| IX. Citação canônica ≥4 linhas | ✅ Vernon p.292 (atributo vs VO) + OWASP Input Validation (XSS) — ver `research.md` |

**Resultado**: PASS, sem violações. Complexity Tracking vazio.

## Project Structure

### Documentation (this feature)

```text
specs/027-fin-document-payment-detail/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões + citações canônicas
├── data-model.md        # Phase 1 — atributo no agregado + mapeamento de persistência
├── quickstart.md        # Phase 1 — como validar (W0 + manual)
├── contracts/
│   └── http-payment-detail.md  # Phase 1 — contrato request/response
└── tasks.md             # Phase 2 (/speckit-tasks — NÃO criado aqui)
```

### Source Code (repository root) — arquivos tocados

```text
src/modules/financial/
├── domain/document/
│   └── types.ts                         # + paymentDetail: string|null em DocumentCore E DraftDocument
├── application/use-cases/
│   └── save-document.ts                 # + paymentDetail no SaveDocumentCommand + Document.create()
└── adapters/
    ├── http/
    │   ├── schemas.ts                   # createDocumentBodySchema + adjustDocumentBodySchema + documentResponseSchema
    │   ├── plugin.ts                    # bridge body.paymentDetail ?? null (create e patch)
    │   └── dto.ts                       # documentToDto: serializa nos 2 branches (Draft / Open-Approved)
    └── persistence/
        ├── schemas/mysql.ts             # coluna payment_detail varchar(255)
        ├── migrations/mysql/0026_*.sql  # gerada por db:generate (ALTER ADD COLUMN)
        └── mappers/document.mapper.ts   # propaga em 4 pontos (row→doc Draft/core; doc→row Draft/Open-Approved)

tests/modules/financial/
├── domain/                              # unit: create com/sem paymentDetail
├── adapters/http/                       # fastify.inject: create/patch/detail + rejeições 400; ausência na listagem
└── adapters/persistence/                # integração Drizzle-MySQL: round-trip + back-compat coluna nullable
```

**Structure Decision**: monolito modular existente; nenhuma pasta nova. A feature percorre a cadeia já estabelecida do agregado `Document`, sem novos agregados, ports ou rotas.

## Complexity Tracking

> Sem violações de constituição — seção vazia.

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] colunas (1) · [ ] tabelas · [ ] índices · [ ] FKs
- **Prefixo de isolamento correto?** Sim — `fin_documents` (ADR-0014).
- **Outbox**: não — atributo local, sem evento cross-BC.
- **Comando**: editar `schemas/mysql.ts` (`paymentDetail: varchar('payment_detail', { length: 255 })`) → `pnpm run db:generate` → versionar `0026_*.sql`. Auditar o SQL: deve ser `ALTER TABLE \`fin_documents\` ADD \`payment_detail\` varchar(255);` (sem index, sem COLLATE explícito — herda `utf8mb4_unicode_ci` da tabela; só UUID usa `utf8mb4_bin`).
- **Restrições MySQL 8 (ADR-0020)**: respeitadas — `varchar` permitido; sem JSON/ENUM/CHECK/trigger/proc. `ALTER ADD COLUMN` é `ALGORITHM=INSTANT` por default no MySQL 8.4 (lock-free, back-compat; row-version counter de `fin_documents` = 8/64).

## Contrato HTTP (ADR-0025/0027)

- **`POST /api/v1/financial/documents`** (create) — `createDocumentBodySchema` ganha:
  `paymentDetail: z.string().trim().min(1).max(255).regex(/^[^\x00-\x1F\x7F]*$/, 'caracteres de controle não são permitidos').optional()`
- **`PATCH /api/v1/financial/documents/:id`** (adjust) — `adjustDocumentBodySchema` ganha:
  `paymentDetail: z.string().trim().min(1).max(255).regex(/^[^\x00-\x1F\x7F]*$/, ...).nullable().optional()` (`null` apaga; ausente = sem alteração — padrão de `description`)
- **`GET /api/v1/financial/documents/:id`** (detalhe) — `documentResponseSchema` ganha `paymentDetail: z.string().nullable()`
- **`GET /api/v1/financial/documents`** (listagem) — **NÃO** alterado (`documentSummarySchema` não recebe o campo — BE-030, detail-only)
- **Backward-compat**: campo opcional no input; nullable no output. Clientes existentes não quebram. Documentos pré-feature retornam `paymentDetail: null`.

## Estimativa de Pipeline (W0 size)

- **Tamanho**: [x] **S** — coluna + propagação por cadeia conhecida, sem novo agregado/port/rota.
- **Justificativa**: padrão idêntico a `issueDate`/`accessKey`/`competencia`; superfície pequena e fechada; risco baixo (back-compat por nullable).
- **Plano de testes W0 (RED)**:
  - **domínio** (`tests/.../domain`): `Document.create` aceita e preserva `paymentDetail`; ausência → `null`. (falha: campo inexistente em `DocumentCore`/`SaveDocumentCommand`)
  - **borda** (`fastify.inject`): `POST` com `paymentDetail` válido → 201 e detalhe retorna o valor; `""`/whitespace/control-char/>255 → 400; `PATCH` com `null` apaga; `GET` listagem **não** traz o campo. (falha: schema sem o campo)
  - **persistência** (integração Drizzle-MySQL, Docker): round-trip insert→select preserva; linha legada (coluna nova nullable) lê sem erro. (falha: coluna inexistente)
