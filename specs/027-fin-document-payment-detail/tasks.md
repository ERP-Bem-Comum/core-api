# Tasks: Complemento da forma de pagamento no lançamento de documento

**Feature**: 027-fin-document-payment-detail · **Ticket**: `FIN-DOC-PAYMENT-DETAIL` (size **S**)

**Input**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/http-payment-detail.md](./contracts/http-payment-detail.md)

> Testes são **requeridos** (Princípio I — TDD W0→W3; cada fase começa pelo teste RED). Caminhos relativos à raiz do repo. `[P]` = paralelizável (arquivos distintos, sem dependência pendente).

---

## Phase 1: Setup

- [ ] T001 Abrir o ticket de pipeline com `pnpm run pipeline:state init FIN-DOC-PAYMENT-DETAIL --size S` e escrever o escopo + CAs em `.claude/.pipeline/FIN-DOC-PAYMENT-DETAIL/000-request.md` (copiar CA1–CA5 da spec)

---

## Phase 2: Foundational (bloqueia US1 e US2)

> Atributo no domínio + persistência + migration + mapper. Compartilhado por ambas as histórias — deve estar GREEN antes de qualquer borda.

**W0 (RED):**

- [ ] T002 [P] Teste de domínio: `Document.create` aceita e preserva `paymentDetail`; ausência → `null` em `tests/modules/financial/domain/document-create-payment-detail.test.ts`
- [ ] T003 [P] Teste de integração (Drizzle-MySQL, Docker): round-trip insert→select preserva `paymentDetail`; linha legada (coluna nova nullable) lê `null` sem erro em `tests/modules/financial/adapters/persistence/document-repository-payment-detail.test.ts`

**W1 (GREEN):**

- [ ] T004 Adicionar `paymentDetail: string | null` a `DocumentCore` **e** `DraftDocument` em `src/modules/financial/domain/document/types.ts`
- [ ] T005 Adicionar `paymentDetail?: string | null` ao `SaveDocumentCommand` e propagar `paymentDetail: cmd.paymentDetail ?? null` em `Document.create(...)` em `src/modules/financial/application/use-cases/save-document.ts`
- [ ] T006 Adicionar coluna `paymentDetail: varchar('payment_detail', { length: 255 })` à tabela `fin_documents` em `src/modules/financial/adapters/persistence/schemas/mysql.ts`
- [ ] T007 Gerar a migration com `pnpm run db:generate` e auditar o SQL (`ALTER TABLE \`fin_documents\` ADD \`payment_detail\` varchar(255);` — sem index/COLLATE) em `src/modules/financial/adapters/persistence/migrations/mysql/0026_*.sql`
- [ ] T008 Propagar `paymentDetail ?? null` nos 4 pontos do mapper (`mapRowToDocument` Draft + core; `mapDocumentToRow` Draft + Open/Approved) em `src/modules/financial/adapters/persistence/mappers/document.mapper.ts`

**Checkpoint**: T002–T003 passam a GREEN. Domínio + persistência prontos para as bordas.

---

## Phase 3: User Story 1 — Registrar e ver o complemento (Priority: P1) 🎯 MVP

**Goal**: informar `paymentDetail` no lançamento e recuperá-lo no detalhe.

**Independent Test**: `POST /documents` com `paymentDetail` → `GET /documents/:id` retorna o valor idêntico; inválidos → 400; listagem não traz o campo.

**W0 (RED):**

- [ ] T009 [P] [US1] Testes `fastify.inject`: `POST` create com `paymentDetail` válido → 201 e detalhe retorna; `""`/whitespace/control-char/`>255` → 400; `GET /documents` (listagem) **não** contém a chave em `tests/modules/financial/adapters/http/document-payment-detail.routes.test.ts`

**W1 (GREEN):**

- [ ] T010 [US1] Definir o fragmento `paymentDetailInput` (`z.string().trim().min(1).max(255).regex(/^[^\x00-\x1F\x7F]*$/, '…')`) e adicionar `paymentDetail: paymentDetailInput.optional()` ao `createDocumentBodySchema` em `src/modules/financial/adapters/http/schemas.ts`
- [ ] T011 [US1] Adicionar `paymentDetail: z.string().nullable()` ao `documentResponseSchema` em `src/modules/financial/adapters/http/schemas.ts` (mesmo arquivo de T010 — sequencial)
- [ ] T012 [P] [US1] Bridge `paymentDetail: body.paymentDetail ?? null` no handler de create em `src/modules/financial/adapters/http/plugin.ts`
- [ ] T013 [P] [US1] Serializar `paymentDetail` nos dois branches de `documentToDto` (Draft e Open/Approved) em `src/modules/financial/adapters/http/dto.ts`

**Checkpoint**: T009 GREEN. **MVP entregável e demonstrável** (registrar + ver no detalhe), independente da US2.

---

## Phase 4: User Story 2 — Editar/remover o complemento via PATCH (Priority: P2)

**Goal**: corrigir ou apagar `paymentDetail` após o lançamento, com auditoria.

**Independent Test**: `PATCH /documents/:id` com novo valor atualiza (timeline before/after); `null` apaga; ausente não altera; inválido → 400.

**W0 (RED):**

- [ ] T014 [P] [US2] Testes `fastify.inject`: `PATCH` com novo valor → 200 + timeline registra before/after; `null` apaga; ausente não altera; inválido → 400 em `tests/modules/financial/adapters/http/document-payment-detail-patch.routes.test.ts`

**W1 (GREEN):**

- [ ] T015 [US2] Adicionar `paymentDetail: paymentDetailInput.nullable().optional()` ao `adjustDocumentBodySchema` em `src/modules/financial/adapters/http/schemas.ts`
- [ ] T016 [US2] Bridge `paymentDetail` no handler de adjust/patch em `src/modules/financial/adapters/http/plugin.ts`

**Checkpoint**: T014 GREEN. Edição completa.

---

## Phase 5: Polish & Cross-Cutting

- [ ] T017 Gate W3: `pnpm run typecheck` + `pnpm run format:check` + `pnpm run lint` + `pnpm test` + `pnpm run test:integration` todos verdes (política de regressão zero)
- [ ] T018 [P] E2E Bruno (ADR-0034): cenários create/patch/detail do `paymentDetail` na coleção `financial` em `api-collections/core-api/`
- [ ] T019 [P] Atualizar o checklist da issue #89 (item do complemento) e registrar no handoff de front a cláusula de fronteira XSS (renderizar como text content; `dangerouslySetInnerHTML` proibido)

---

## Dependencies

```
Setup (T001)
   └─> Foundational (T002→T003 RED; T004,T005,T006,T007,T008 GREEN)   [bloqueia US1 e US2]
          ├─> US1 / P1 (T009 RED; T010→T011 seq schemas.ts; T012,T013 [P])   🎯 MVP
          └─> US2 / P2 (T014 RED; T015 schemas.ts; T016 plugin.ts)
                 └─> Polish (T017 gate; T018, T019 [P])
```

- US1 e US2 são independentes entre si após a Foundational (ambas só estendem a borda). Podem ser fatiadas: entregar US1 (MVP) e US2 em PR separado.
- Dentro de US1: T010 e T011 editam o **mesmo** arquivo (`schemas.ts`) → sequenciais. T012 (`plugin.ts`) e T013 (`dto.ts`) → paralelos entre si.

## Parallel execution examples

- **Foundational RED**: T002 e T003 em paralelo (arquivos de teste distintos).
- **US1 GREEN**: após T010+T011, rodar T012 e T013 em paralelo.
- **Polish**: T018 e T019 em paralelo (coleção Bruno × GitHub/handoff).

## Implementation strategy (MVP-first)

1. **MVP** = Setup + Foundational + US1 (T001–T013) → registrar e ver o complemento no detalhe. Entregável e PR-able sozinho.
2. **Incremento** = US2 (T014–T016) → edição/remoção via PATCH. PR separado.
3. **Fechamento** = Polish (T017–T019) → gate W3 verde + E2E Bruno + handoff front/#89.
