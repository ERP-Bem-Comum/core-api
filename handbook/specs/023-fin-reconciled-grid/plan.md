# Implementation Plan: CONCILIADO reflete no grid de Contas a Pagar

**Branch**: `023-fin-reconciled-grid` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/023-fin-reconciled-grid/spec.md`

## Summary

A conciliação flipa o **título pagável** Paid→Reconciled (`reconciliation-repository.drizzle.ts:59`), mas o grid de Contas a Pagar (`GET /api/v2/financial/documents`) lê `fin_documents.status` — que nunca vira Reconciled — então o documento segue como "Pago" (#204, bloqueia tesouraria).

**Abordagem (clarify 2026-06-22 — indicador derivado em tempo de leitura, ADR-0022)**: o grid passa a **derivar** o estado de conciliação por documento na própria query de listagem (a partir do estado de conciliação dos seus títulos pagáveis em `fin_payables`), **sem** escrever em `fin_documents` nem criar projeção/consumidor. Regra (FR-004): documento conta como **Reconciled** sse `status='Paid'` **e TODOS** os seus títulos pagáveis estão `Reconciled`; parcial → permanece Paid. O DTO da lista reflete `status='Reconciled'` nesse caso (o front já lê `status` e tem o chip Conciliado). O filtro de status (`schemas.ts:159`) é estendido para aceitar `Paid`/`Reconciled`, mapeando-os à condição derivada. O **undo** (Reconciled→Paid no payable) reverte naturalmente — a derivação é read-time, sem estado próprio a reverter.

## Technical Context

**Language/Version**: TypeScript 6 (strict) · Node.js 24 LTS · ESM `NodeNext`.

**Primary Dependencies**: Drizzle ORM + `mysql2` (MySQL 8.4); `node:test`; borda HTTP Fastify (`GET /api/v2/financial/documents`). Sem libs novas.

**Storage**: MySQL 8 — **sem alteração de schema, sem migration**. Tabelas existentes: `fin_documents` (grid) e `fin_payables` (estado de conciliação dos títulos, FK `document_id`). A derivação é leitura (JOIN/subquery), não escrita.

**Testing**: `node:test`. Unit do read store (in-memory + drizzle-mysql de integração) + teste HTTP do grid (`GET /documents`) exercitando conciliar→reflete / undo→reverte / filtrar Pago|Conciliado.

**Target Platform**: backend modular-monolith, borda HTTP `/api/v2`.

**Project Type**: modular monolith backend (ADR-0006).

**Performance Goals**: a derivação adiciona um agregado por documento sobre `fin_payables` (FK `document_id` indexada). Manter a listagem paginada eficiente — subquery/agregação agrupada, não N+1.

**Constraints**: ADR-0020 (features SQL permitidas: JOIN, subquery, agregação simples, `COUNT` — todas dentro da lista normativa). ADR-0022 (read-model derivado). ADR-0014 (1 BC: `fin_*`).

**Scale/Scope**: query de listagem (2 adapters: drizzle + in-memory) + DTO + filtro (schema) + testes. Tamanho **M**.

## Constitution Check

| Princípio                         | Status | Nota                                                                                                                      |
| --------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------- | ----------- |
| I. TDD W0→W3 fail-first           | ✅     | W0 RED: grid não reflete Conciliado / filtro rejeita Paid                                                                 | Reconciled. |
| II. Regressão zero                | ✅     | Gate W3 + suíte financial completa verde.                                                                                 |
| III. pnpm único                   | ✅     | Sem deps novas.                                                                                                           |
| IV. Modular monolith + isolamento | ✅     | Só `fin_*`; JOIN intra-módulo `fin_documents`⋈`fin_payables`. Sem leitura cross-módulo.                                   |
| V. Domínio puro                   | ✅     | A regra "todos os payables Reconciled" pode viver como predicado puro no domínio/query; derivação é leitura, sem `throw`. |
| VI. MySQL/Drizzle migrations      | ✅ N/A | **Sem schema novo** → sem `db:generate`. Só leitura. ADR-0020: JOIN/subquery/COUNT permitidos.                            |
| VII. HTTP-first; CLI aposentada   | ✅     | Validação por teste HTTP (`fastify.inject`); sem CLI.                                                                     |
| VIII. TS strict + ESM + idioma    | ✅     | Código EN; `import type`; `.ts`.                                                                                          |
| IX. Decisões ancoradas no cânone  | ✅     | Mecanismo ancorado em ADR-0022:37/40 + emenda #130 — ver [research.md](./research.md).                                    |

**Resultado**: PASS. `Complexity Tracking` vazio.

## Project Structure

### Documentation (this feature)

```text
specs/023-fin-reconciled-grid/
├── plan.md · spec.md · research.md · data-model.md · quickstart.md
├── contracts/grid-reconciled-indicator.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/modules/financial/
├── domain/document/query.ts                         # (W1?) tipo DocumentListFilter: status passa a aceitar Paid|Reconciled
├── adapters/http/schemas.ts                          # (W1) filtro status (L159) + Paid|Reconciled
├── adapters/http/dto.ts                              # (W1) list item reflete status derivado 'Reconciled'
└── adapters/persistence/repos/
    ├── document-repository.drizzle.ts                # (W1) list(): subquery fin_payables → deriva Reconciled; filtro mapeia Paid|Reconciled
    └── document-repository.in-memory.ts              # (W1) paridade da derivação no adapter in-memory

tests/modules/financial/adapters/
├── http/<grid-reconciled>.http.test.ts               # (W0, NOVO) conciliar→grid reflete; undo→reverte; filtro Paid|Reconciled
└── persistence/document-repository.*.test.ts         # (W0) derivação no read store (in-memory + drizzle-mysql integração)
```

**Structure Decision**: monolito existente. A derivação vive na **query de leitura** (read store) — drizzle + in-memory em paridade — e o DTO reflete o `status` derivado. Nenhuma escrita em `fin_documents`; nenhuma migration.

## Complexity Tracking

> Sem violações. Nada a justificar.

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] **nenhuma** · Outbox: não · `db:generate`: N/A.
- **Nota**: derivação por JOIN/subquery em `fin_payables` (FK `document_id` já indexada). ADR-0020 permite JOIN/subquery/agregação `COUNT`.

## Contrato HTTP (Fase 2+)

`GET /api/v2/financial/documents` — **sem rota nova**. Mudanças:

1. **Resposta**: o campo `status` do item da lista reflete `Reconciled` quando o documento está Pago e **todos** os títulos conciliados (derivado; sem novo campo obrigatório — preserva o contrato que o front já consome).
2. **Filtro**: `status` (query) passa a aceitar `Paid` e `Reconciled` além dos atuais; o filtro mapeia para a condição derivada (Reconciled = Paid + todos reconciliados; Paid = Paid + nem todos).

Ver [contracts/grid-reconciled-indicator.md](./contracts/grid-reconciled-indicator.md).

## Estimativa de Pipeline (W0 size)

- **Tamanho**: [x] **M** (query de leitura em 2 adapters + DTO + filtro/schema + testes de read store e HTTP; sem schema/migration).
- **Justificativa**: a lógica derivada (todos-payables-reconciled, mapeamento do filtro Paid×Reconciled) e a paridade drizzle↔in-memory dão peso M, ainda que sem escrita nova. Ticket único `FIN-RECON-GRID-INDICATOR` (fatiável em READ-STORE + HTTP se necessário).
- **Plano de testes W0 (RED)**:
  1. **Read store** (`document-repository.in-memory.test.ts` + `.drizzle-mysql.test.ts`): documento Pago com todos os payables `Reconciled` → `list()` retorna o item com `status='Reconciled'`; com payable parcial → `Paid`; filtro `Reconciled` retorna só os derivados-reconciliados; filtro `Paid` exclui os totalmente reconciliados.
  2. **HTTP** (`<grid-reconciled>.http.test.ts`, NOVO): fluxo real conciliar (`POST /reconciliations`) → `GET /documents` reflete `Conciliado`; `POST .../undo` → reverte para `Pago`; `GET /documents?status=Reconciled|Paid` filtra corretamente.
