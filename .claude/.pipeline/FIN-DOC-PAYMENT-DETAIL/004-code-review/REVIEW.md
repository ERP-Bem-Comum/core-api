# Code Review — Ticket FIN-DOC-PAYMENT-DETAIL — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (W2)
**Data:** 2026-06-29
**Feature:** 027-fin-document-payment-detail · Issue #273 (sub de #89) · Size **S**
**Escopo revisado (read-only):**

- `src/modules/financial/domain/document/types.ts`
- `src/modules/financial/domain/document/document.ts`
- `src/modules/financial/application/use-cases/save-document.ts`
- `src/modules/financial/application/use-cases/save-draft.ts`
- `src/modules/financial/adapters/http/schemas.ts`
- `src/modules/financial/adapters/http/plugin.ts`
- `src/modules/financial/adapters/http/dto.ts`
- `src/modules/financial/adapters/persistence/schemas/mysql.ts`
- `src/modules/financial/adapters/persistence/mappers/document.mapper.ts`
- `src/modules/financial/adapters/persistence/migrations/mysql/0026_concerned_bromley.sql` (+ `meta/_journal.json`, `meta/0026_snapshot.json`)
- `tests/modules/financial/domain/document-create-payment-detail.test.ts`
- `tests/modules/financial/adapters/persistence/document-repository-payment-detail.test.ts`
- `tests/modules/financial/adapters/http/document-payment-detail.routes.test.ts`
- Contexto cruzado: `src/shared/http/app.ts` (redact Pino), `specs/027-.../{research,data-model}.md`

Diff: **51 inserções / 10 arquivos `src/`** + 3 testes novos. Mecânico, espelha precedente `issueDate` (#163) / `accessKey` (#115) / `competencia` (#197).

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

**nenhuma.**

### 🟡 Importante (não-bloqueia, registrar)

**nenhuma.**

### 🔵 Sugestão (estilo / clareza)

#### Sugestão 1 — `src/modules/financial/application/use-cases/save-draft.ts:166`

**Categoria:** D (ports & adapters / consistência de bridge)
**Observação:** o spread condicional de `paymentDetail` usa `!== undefined`, enquanto os campos irmãos da mesma função usam `!= null`:

```ts
...(cmd.accessKey != null ? { accessKey: cmd.accessKey } : {}),
...(cmd.contaDebitoRef != null ? { debitAccountRef: cmd.contaDebitoRef } : {}),
...(cmd.paymentDetail !== undefined ? { paymentDetail: cmd.paymentDetail } : {}),
```

**Veredito:** **não é defeito** — é até ligeiramente mais correto. `Document.saveDraft` normaliza com `input.paymentDetail ?? null` (`document.ts:565`), então `!== undefined` e `!= null` produzem resultado de domínio idêntico no caminho create. O `!== undefined` ainda preserva o `null` explícito (semântica "apagar" útil para o futuro PATCH/US2) e respeita `exactOptionalPropertyTypes` (não vaza `undefined` para o tipo `string | null`). Mantido como observação de consistência — **não exige correção**.

---

## Conformidade com o checklist (8 itens)

| # | Item | Resultado | Evidência |
|---|------|-----------|-----------|
| 1 | **Domínio puro** — `paymentDetail: string \| null` em `Readonly<{...}>`; sem classe/throw/VO; propagação completa em todas as transições | ✅ | `types.ts:84` (DocumentCore) + `:121` (DraftDocument), ambos `Readonly`. Sem `class`/`throw`/branded (D1/Vernon p.292). **Todas as transições preservam o atributo:** `create` (`document.ts:187`, explícito), `saveDraft` (`:565`, explícito), `undoApproval` (`:465`, explícito `d.paymentDetail`), `submit` (`:609`, passthrough p/ `create`); `approve` (`:223` `...input.document`), `adjust` (`:354` `...d`), `editMetadata` (`:405` `...d`) preservam via spread — nenhuma transição perde o campo |
| 2 | **Application** — commands com `paymentDetail?: string \| null`; bridge `?? null` | ✅ | `save-document.ts:72` (campo) + `:207` (`cmd.paymentDetail ?? null` em `Document.create`); `save-draft.ts:59` (campo) + `:166` (spread condicional — ver Sugestão 1) |
| 3 | **Adapters/borda (ADR-0027)** — `paymentDetailInput` zod (`trim/min1/max255/regex control-chars`), `.optional()` no create; response `nullable`; **summary intocado** (BE-030); **`adjustDocumentBodySchema` não alterado** (US2 fora — fail-first); bridge `?? null`; DTO nos 2 branches | ✅ | `schemas.ts:84-89` (fragmento) + `:129` (create `.optional()`) + `:236` (response `.nullable()`). `documentSummarySchema` (`:267`) e `adjustDocumentBodySchema` (`:142`) **sem** `paymentDetail` (grep confirmou). `plugin.ts:302` (create) + `:341` (saveDraft) bridge `body.paymentDetail ?? null`. `dto.ts:114` (Draft) + `:146` (Open/Approved) |
| 4 | **Persistência** — `varchar(255)` nullable, sem index/CHECK/COLLATE; migration `0026` = `ALTER ... ADD ... varchar(255)`; mapper `?? null` nos 4 pontos; sem novo `DocumentMapperError`; isolamento `fin_*` (ADR-0014) | ✅ | `mysql.ts:151` (`varchar('payment_detail', { length: 255 })`, nullable, sem index/check/collate). Migration `0026_concerned_bromley.sql`: `ALTER TABLE \`fin_documents\` ADD \`payment_detail\` varchar(255);` — auditado: aditiva, nullable, INSTANT, prefixo `fin_`. Mapper: `document.mapper.ts:348` (row→Draft), `:471` (row→core), `:614` (Draft→row), `:655` (core→row) — todos `?? null`. Zero novo error type |
| 5 | **TS strict / idioma** — `import type`, extensão `.ts`, sem `any`, `exactOptionalPropertyTypes` (undefined↔null via `?? null`); código EN, comentário só onde o "porquê" é não-óbvio | ✅ | Diff `src/` não adiciona import novo; testes usam `import type` + extensão `.ts`. Zero `any` em `src/`. Campo opcional resolvido por `?? null` / spread condicional. Identificadores EN; comentários PT (permitido — tabela Idioma) explicando regex/ADR-0018 (porquê não-óbvio) |
| 6 | **Testes** — cobrem CA1/CA2/CA3/CA5 (+CA4 integração gated); `MYSQL_INTEGRATION` gate; padrão `node:test`/`fastify.inject`; sem testar interno além do necessário | ✅ | domínio: CA1/CA2 (`document-create-payment-detail.test.ts`). http: CA1/CA2 + CA3 (6 casos: vazio/espaços/`\n`/`\r`/`\x00`/>255) + CA5 (`hasOwnProperty` false na listagem). integração: CA1/CA4 gated por `MYSQL_INTEGRATION` (describe não registrado sem o env — sem falso-negativo em `pnpm test` puro; mesmo opt-in de `document-repository.drizzle-mysql.test.ts`). CA6/PATCH **deliberadamente fora** (fail-first US2) |
| 7 | **Decisões dos 5 canais** — backend NÃO sanitiza (só trim+bounds+control-chars); XSS delegado ao front (documentado); `paymentDetail` fora do redact do Pino | ✅ | regex bloqueia só control-chars, preserva `<`/`'`/acentos (D2/OWASP). Sem strip de HTML. D3 (XSS = output-encoding do front) documentado em `research.md`. Redact do Pino (`app.ts:74-84`) contém só credenciais — `paymentDetail` **não** listado, conforme D7 (instrumento de pagamento, não credencial) |
| 8 | **Anti-padrões do AGENTS.md** | ✅ nenhum | Sem `throw` em domínio; sem `default: throw` em switch; imports com `.ts` + `import type`; sem cross-módulo proibido (testes importam só `partners/public-api/`); sem mistura indevida; ADR-0018/0014/0020/0027 respeitados; nenhum doc/script com `npm` |

---

## O que está bom

- **Espelhamento fiel do precedente** `issueDate`/`accessKey`/`competencia`: posição, estilo e `?? null` idênticos — diff previsível e de baixo risco.
- **Cobertura de transições completa**, incluindo as que o diff *não* tocou: `approve`/`adjust`/`editMetadata` preservam o campo por spread — verificado explicitamente, não assumido.
- **Gate de integração correto** (opt-in `MYSQL_INTEGRATION`): respeita `.claude/rules/testing.md` e a política de regressão-zero (não roda vermelho em `pnpm test` puro).
- **Comentários ancorados em ADR/research** (ADR-0018 §"Texto livre curto", OWASP, D1-D7) — explicam o porquê, não o quê.
- **Escopo US1 disciplinado**: `adjustDocumentBodySchema` e `documentSummarySchema` intocados — US2/PATCH e listagem preservados (fail-first e CA5/BE-030 mantidos).
- **Migration aditiva segura**: `ALTER ADD COLUMN` nullable (INSTANT, back-compat), sem index/CHECK/COLLATE supérfluos.

---

## Próximo passo

- **APPROVED** → pipeline-maestro avança para **W3** (`typecheck` + `format:check` + `lint` + `test`; e `test:integration:financial` com Docker para CA1/CA4). Confirmar migration `0026` versionada e contagem ≥ baseline (DoD do `000-request.md`).
- Lembrete de escopo (não-bloqueante): **US2/PATCH (CA6)** segue fora desta fatia — exige novo W0 RED antes de tocar `adjustDocumentBodySchema`/`adjust`.
