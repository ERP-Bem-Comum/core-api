# Implementation Plan: Geração de arquivo de remessa CNAB 240 (Bradesco)

**Branch**: `016-fin-remessa-cnab240` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/016-fin-remessa-cnab240/spec.md`

## Summary

Permitir que o operador **selecione** títulos `Approved` (forma `TED`/`TransferenciaBancaria`), **agrupe por conta-cedente** e gere **um arquivo CNAB 240 Bradesco por conta** (segmentos P/Q/J), persistido em object-storage com hash de integridade e NSA monotônico por conta; os documentos incluídos transicionam `Approved → Transmitted`. A complexidade do layout CNAB fica isolada numa **ACL** (port `CnabRemittanceTranslator`), fora do domínio. Eventos `RemittanceGenerated` (por lote) e `DocumentTransmitted` (por documento) via outbox. **Escopo: só geração** — retorno/extrato/conciliação são sub-fatias seguintes.

## Technical Context

**Language/Version**: TypeScript 6 · Node.js 24 LTS · ESM (NodeNext)
**Primary Dependencies**: Drizzle ORM + `mysql2` (MySQL 8.4) · `@aws-sdk/client-s3` (storage, ADR-0019) · `node:crypto` (SHA-256) · Fastify + Zod (borda, ADR-0027) · `node:test`
**Storage**: MySQL 8 (`fin_*`) para metadados de lote/NSA/itens + object-storage S3/MinIO para o blob CNAB
**Testing**: `node:test` + `fastify.inject` (borda) + Drizzle MySQL real (`pnpm run test:integration`)
**Target Platform**: backend (modular monolith), módulo `financial`
**Project Type**: módulo de BC único (`financial`) — sem novo módulo
**Performance Goals**: geração não é hot-path; lote típico dezenas–centenas de títulos; geração síncrona ≤ poucos segundos
**Constraints**: ACL isola CNAB (guideline `handbook/guidelines/bradesco_guideline/` é **local-only**, não commitável — R3); atomicidade de domínio (FR-011); não-duplicação (FR-012)
**Scale/Scope**: 1 banco (Bradesco), N contas-cedente; multi-banco é evolução futura via novas "receitas" de tradução

**Resolvido no Phase 0 (research.md)**: layout CNAB 240 (estrutura P/Q/J via ACL), algoritmo de hash (SHA-256), NSA por conta (contador persistido), modelagem de conta-cedente + **`debitAccountRef` no documento** (decisão D-CEDENTE), atomicidade storage×DB.

## Constitution Check

_GATE: avaliado contra a constituição v1.2.0 (princípios I–IX)._

| Princípio                                 | Status           | Nota                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. TDD W0→W3                              | ✅               | Feature roda por tickets pipeline; W0 RED antes de `src/`. Ver "Estimativa de Pipeline".                                                                                                                                                                                                                                                                        |
| II. Regressão zero                        | ✅               | Gate W3 + `test:integration` antes de merge.                                                                                                                                                                                                                                                                                                                    |
| III. pnpm                                 | ✅               | Sem `npm`.                                                                                                                                                                                                                                                                                                                                                      |
| IV. Modular monolith / isolamento         | ✅               | Toca **apenas** `financial` (`fin_*`). Cedente é config local ao financial (não cruza BC). Eventos via outbox.                                                                                                                                                                                                                                                  |
| V. Domínio puro                           | ✅               | Agregado `Remittance` + VOs (`Nsa`, `RemittanceHash`) com `Result<T,E>`, sem `throw`/classe. ACL/CNAB vivem no **adapter**.                                                                                                                                                                                                                                     |
| VI. MySQL 8 + Drizzle, migrations geradas | ✅               | Novas tabelas via `pnpm run db:generate`. Storage `@aws-sdk/client-s3`. Sem JSON/ENUM nativo/trigger.                                                                                                                                                                                                                                                           |
| VII. HTTP-first                           | ✅               | Nova rota `POST /api/v2/financial/remittances` (+ GET/download), Fastify+Zod.                                                                                                                                                                                                                                                                                   |
| VIII. TS strict + idioma                  | ✅               | EN no código; eventos EN-passado; docs/commits PT.                                                                                                                                                                                                                                                                                                              |
| IX. Citação canônica ACDG                 | ⚠️ **PENDÊNCIA** | MCP `acdg-skills` **off nesta sessão** e fallback local ausente. Decisões-chave (fronteira da ACL — Evans, cap. Anticorruption Layer / Open Host Service; agregado `Remittance` — Vernon, Aggregates) exigem citação literal ≥4 linhas **antes do gate**. Registrado em research.md como gap. Não bloqueia o plano; bloqueia o fechamento das decisões no gate. |

**Resultado**: PASS com 1 pendência de processo (IX) — sem violação arquitetural. Sem entradas em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/016-fin-remessa-cnab240/
├── plan.md              # este arquivo
├── research.md          # Phase 0 — decisões técnicas
├── data-model.md        # Phase 1 — agregado Remittance, VOs, transição, fin_*
├── quickstart.md        # Phase 1 — como rodar/testar
├── contracts/
│   ├── http-remittances.md   # endpoint POST/GET + schemas Zod
│   └── ports.md              # CnabRemittanceTranslator, RemittanceRepository, CedenteAccountStore, DocumentStorage
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/modules/financial/
├── domain/
│   ├── document/                  # EXISTE — adicionar operação transmit() (Approved→Transmitted) + evento DocumentTransmitted
│   └── remittance/                # NOVO — agregado Remittance: types, events, errors, remittance.ts; VOs Nsa, RemittanceHash
├── application/
│   ├── ports/                     # NOVO: cnab-remittance-translator.ts, remittance-repository.ts, cedente-account-store.ts, document-storage.ts (molde contracts)
│   └── use-cases/generate-remittance.ts   # NOVO
├── adapters/
│   ├── persistence/
│   │   ├── schemas/mysql.ts       # + fin_remittances, fin_remittance_items, fin_cedente_accounts, fin_documents.debit_account_ref
│   │   ├── migrations/mysql/      # 0004 gerada por db:generate
│   │   └── repos/                 # remittance-repository.{in-memory,drizzle}.ts, cedente-account-store.{...}
│   ├── cnab/                      # NOVO — ACL Bradesco: bradesco-cnab240-translator.ts (segmentos P/Q/J); fake p/ testes
│   ├── storage/                   # document-storage.{in-memory,s3}.ts (molde contracts)
│   └── http/plugin.ts             # + rotas de remessa; composition.ts + wiring
└── public-api/events.ts          # + RemittanceGenerated, DocumentTransmitted

tests/modules/financial/
├── domain/remittance/*.test.ts
├── application/use-cases/generate-remittance.test.ts
├── adapters/cnab/*.test.ts        # ACL: estrutura P/Q/J + hash
└── adapters/http/financial-remittances.http.test.ts
```

**Structure Decision**: módulo `financial` (BC único). Novo subdomínio `remittance/` + ACL em `adapters/cnab/`. Reusa o molde de `DocumentStorage` do `contracts` (copiado para o financial — ADR-0006 proíbe importar adapter de outro módulo).

## Complexity Tracking

> Sem violações de constituição a justificar. (A pendência IX é de processo, não de arquitetura.)

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] tabelas novas (`fin_remittances`, `fin_remittance_items`, `fin_cedente_accounts`) · [x] coluna (`fin_documents.debit_account_ref` — D-CEDENTE) · [x] índices · [x] FKs lógicas
- **Prefixo de isolamento correto?** `fin_*` — ADR-0014: **sim**
- **Outbox**: novos eventos `RemittanceGenerated`/`DocumentTransmitted` → `append` no outbox do financial: **sim**
- **Comando**: após editar `schema.ts`, rodar `pnpm run db:generate` (migration `0004_*`), versionar. Uma migration por ticket (serialização — lição dos PRs #83–86).
- **Restrições MySQL 8** (ADR-0020): sem JSON nativo/triggers/stored procs/ENUM nativo. NSA via `SELECT ... FOR UPDATE` + UPDATE na mesma tx.

## Contrato HTTP

- **`POST /api/v2/financial/remittances`** — permissão `payable:transmit` (nova). Body: `{ documentIds: string[] }`. Resposta `201`: `{ remittances: [{ id, debitAccountRef, nsa, hash, storageRef, documentIds[] }] }` (um por conta). Erros: `400` (seleção vazia/UUID inválido), `409` (título já `Transmitted` / não-`Approved` / forma inelegível — identificando), `422` (cedente/título inválido p/ CNAB), `503` (storage/repo indisponível).
- **`GET /api/v2/financial/remittances/:id`** — `payable:read`. Metadados do lote.
- **`GET /api/v2/financial/remittances/:id/download`** — `payable:read`. Arquivo CNAB (signed URL ou conteúdo).
- **Backward-compat**: aditivo; nenhuma rota existente muda.

## Estimativa de Pipeline (W0 size)

- **Tamanho**: [x] **L** (novo agregado + ACL + storage adapter + outbox + migration + borda)
- **Justificativa**: cruza domínio (novo agregado + transição), application (use case + 4 ports), adapters (Drizzle + ACL CNAB + S3) e borda HTTP; envolve migration e eventos. **Recomendação: fatiar em tickets W0→W3 menores**:
  1. `FIN-REMITTANCE-DOMAIN` (M) — agregado `Remittance` + VOs (`Nsa`, `RemittanceHash`) + `Document.transmit()` + eventos. Puro.
  2. `FIN-CNAB-ACL` (M) — port `CnabRemittanceTranslator` + adapter Bradesco (P/Q/J) + fake; testes de estrutura/hash.
  3. `FIN-REMITTANCE-PERSIST` (M) — schema `fin_*` + migration `0004` + repos Drizzle/InMemory + `CedenteAccountStore` + `DocumentStorage`.
  4. `FIN-REMITTANCE-USECASE-HTTP` (M) — `generateRemittance` + rotas + composition + outbox + E2E `fastify.inject`.
- **Plano de testes W0 (RED)**:
  - `tests/modules/financial/domain/remittance/remittance.test.ts` — criação do lote, NSA, hash, invariantes; `Document.transmit` Approved→Transmitted e recusa de não-Approved.
  - `tests/modules/financial/adapters/cnab/bradesco-cnab240-translator.test.ts` — estrutura P/Q/J + checksum.
  - `tests/modules/financial/application/use-cases/generate-remittance.test.ts` — seleção válida/inválida, agrupamento por conta (N→N lotes), atomicidade, não-duplicação, seleção vazia.
  - `tests/modules/financial/adapters/http/financial-remittances.http.test.ts` — `POST /remittances` (201 multi-conta, 409 inválido, 400 vazio), `GET /:id`, download.
