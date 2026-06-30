# Phase 0 — Research: Financial Hardening

Consolida a investigação read-only de 4 agentes especialistas (`security-backend-expert`, `zod-expert`, `drizzle-orm-expert`, `typescript-language-expert`). Cada decisão segue o formato Decision / Rationale / Alternatives. Citações canônicas (princípio IX) a registrar por ticket no W0/W2.

---

## #52 — Mascaramento de erro 4xx (segurança, OWASP API8:2023)

**Estado atual**

- `toErrorEnvelope(code, message, requestId)` em `src/shared/http/errors.ts:29-35` — passthrough literal.
- `sendDomainError` em `src/modules/financial/adapters/http/plugin.ts:90-108`: 5xx oculta (`code:'internal'`); **4xx (linha 107)** faz `toErrorEnvelope(error, error, …)` → slug vira `code` **e** `message`.
- Rota `DELETE` usa `sendResult` (`src/shared/http/reply.ts:47-49`) — mesmo vazamento.
- **Não existe** dicionário PT-BR HTTP (a CLI foi removida — ADR-0037). `auth`/`contracts` também ecoam slug (problema latente, fora de escopo).

**Decision**

- Introduzir `toPublicCode(slug)` (deriva dos sets já existentes `CONFLICT_CODES`/`NOT_FOUND_CODES`/`BAD_REQUEST_CODES`, default `unprocessable`/422) e `toPublicMessage(slug)` (novo dicionário `src/modules/financial/adapters/http/error-messages.ts`, `Record<string,string>` PT-BR).
- `sendDomainError` 4xx passa a chamar `toErrorEnvelope(toPublicCode(error), toPublicMessage(error), requestId)`; slug interno vai **só** para `request.log`.
- Cobrir também o caminho `sendResult` do DELETE (extrair helper compartilhado ou migrar DELETE para `sendDomainError`).
- **Corrigir 2 bugs latentes de mapeamento** encontrados: `partner-ref-invalid` cai hoje em 422 (deveria **400**); `timeline-document-not-found` cai em 422 (deveria **404**). O set `BAD_REQUEST_CODES` lista o slug morto `invalid-supplier-ref`.

**Rationale**: OWASP API8:2023 (Security Misconfiguration) — não revelar mecanismo interno (concorrência versão-baseada, máquina de estados). Idioma: mensagem ao humano em PT-BR (AGENTS.md §Idioma). 5xx já segue o padrão — estende-se a coerência ao 4xx.

**Alternatives considered**: (a) unificar o mascaramento no `src/shared/http/reply.ts` — rejeitado por afetar outros módulos (escopo por BC, ADR-0014); (b) manter slug e só traduzir `message` — rejeitado, o `code` é o vetor de enumeração.

**Mapeamento** (tabela completa de ~20 slugs → `conflict`/`not-found`/`bad-request`/`unprocessable`) em [`contracts/README.md`](./contracts/README.md).

**W0 RED** (`tests/modules/financial/adapters/http/error-envelope-hardening.http.test.ts`, `fastify.inject`):

- CA-H1 PATCH version stale → 409 `code:'conflict'`, `message` ≠ slug.
- CA-H2 approve sobre Approved → 409 `conflict` (não `invalid-state-transition`).
- CA-H3 GET inexistente → 404 `not-found`, `message` ≠ slug.
- CA-H4 POST sem `dueDate` (não-draft) → 422 `unprocessable`.
- CA-H5 POST `supplierRef` inválida → **400** `bad-request` (hoje 422 — bug).
- CA-H7 falha de repositório (5xx) → `code:'internal'` (**guard de regressão**, passa hoje).
- CA-H8 DELETE sobre Approved → 409 `conflict` (caminho `sendResult`).

---

## #54 — Bounds de coluna no response schema da trilha (gap-contrato, ADR-0027)

**Estado atual**

- `src/modules/financial/adapters/http/schemas.ts:248-250`: `field: z.string()`, `before/after: z.string().nullable()` — sem `.max`.
- Banco (`adapters/persistence/schemas/mysql.ts:428,433,436`): `field varchar(60)`, `before_value`/`after_value text` (limite TEXT 65535).
- OpenAPI via `fastify-zod-openapi@5.6.1`; `serializerCompiler` executa `schema.safeParse(value)` em runtime na serialização (`index.mjs:64`).

**Decision**

- `field: z.string().max(60)`; `before/after: z.string().max(65535).nullable()`; `.meta({ description })` individual (coerência com o resto do arquivo).
- `.max(N)` produz `maxLength: N` no JSON Schema/OpenAPI de fato (mecanismo idiomático do `zod-openapi`).

**Rationale**: ADR-0027 contract-first — o OpenAPI deve refletir o storage. `.max()` é **seguro** como validação de saída: espelha exatamente o constraint físico do banco; nenhuma linha que o banco aceitou pode exceder o bound (FR-012/SC-005). Usado só em `documentTimelineResponseSchema` (response), nunca como input.

**Alternatives considered**: `.meta({ maxLength })` sem `.max()` — documenta no OpenAPI mas **não** valida; rejeitado por não unificar o caminho com `field` e por ser menos explícito. (Ambos satisfazem o OpenAPI; `.max()` é preferido.)

**W0 RED** (`tests/modules/financial/adapters/http/timeline-schema-bounds.test.ts`, inspeção de schema, sem servidor): `safeParse('a'.repeat(61))` em `field` falha; `safeParse('x'.repeat(65536))` em `before`/`after` falha. Opcional: snapshot do OpenAPI (`app.swagger()`) confirmando `maxLength`.

---

## #55 — Optimistic lock no cancelamento (débito, concorrência)

**Estado atual**

- Lock pattern em `adapters/persistence/repos/document-repository.drizzle.ts:224-266`: SELECT FOR UPDATE na PK → `UPDATE … WHERE id=? AND version=?` → `affectedRows===0` → `err('document-version-conflict')`. `adjust`/`approve`/`undo` recebem `expectedVersion` obrigatório no Command.
- `delete` hoje: port `domain/document/repository.ts:51` (`delete(id)`), drizzle `:337-342` (hard delete sem version). Cascade `ON DELETE CASCADE` em `fin_payables`/`fin_retentions`/`fin_registered_taxes`/`fin_document_timeline`.
- `version` em `schemas/mysql.ts:117` (`int default 0`).
- `cancelDocument` (`application/use-cases/cancel-document.ts:35`) chama `repo.delete(id.value)` sem version.

**Decision**

- Port: `delete(id, expectedVersion)`.
- Drizzle: DELETE condicional dentro de `db.transaction` com SELECT FOR UPDATE prévio (espelha o `save`); `DELETE … WHERE id=? AND version=?`; `affectedRows===0` → `err('document-version-conflict')`.
- In-memory: checar `existing.version !== expectedVersion` → conflict.
- Use case: `CancelDocumentCommand` ganha `expectedVersion: number` obrigatório; repassa a `repo.delete`.
- HTTP: `cancelDocumentBodySchema = z.object({ version: z.number().int().min(0).max(MAX_SAFE_INTEGER) })`; handler DELETE lê `req.body.version`; `document-version-conflict` → 409 (já em `CONFLICT_CODES`); sucesso → 204.

**Rationale**: simetria com `adjust`/`approve`/`undo` (FR-009 da fatia 2); fecha o TOCTOU `findById`→`delete`. O cascade continua correto — só dispara quando o DELETE casa a versão. `expectedVersion` vem do cliente (a versão que leu), não de `found.value.version`.

**Alternatives considered**: DELETE sem SELECT FOR UPDATE (só `WHERE version`) — funcional, mas mantém janela de corrida menor; preferido o padrão transacional idêntico ao `save` por consistência. Documentar e não travar (alternativa CA3 da issue) — rejeitado: deixa a assimetria e o lost-update.

**W0 RED**: use case InMemory (`transitions.test.ts`): cancel `expectedVersion=0` → sucesso, `findById`→not-found; cancel `expectedVersion=999` → conflict, documento permanece. Suíte de contrato de repo + integração MySQL (`document-repository.drizzle-mysql.test.ts`). HTTP: DELETE sem `version` → 400; com version-ok → 204; version-stale → 409.

---

## #56a — Rename `kind` → `eventType` (smell)

**Estado atual** — 6 pontos (todos em `src/modules/financial/`):
| Arquivo:linha | Papel | Ação |
|---|---|---|
| `domain/timeline/types.ts:23` | decl. `kind: DocumentEvent['type']` | renomear chave → `eventType` |
| `domain/timeline/projection.ts:70` | entry Document `kind:` | renomear chave |
| `domain/timeline/projection.ts:91` | entry Payable `kind:` | renomear chave |
| `adapters/persistence/mappers/timeline.mapper.ts:107` | row→entry `kind:` | renomear chave |
| `adapters/persistence/mappers/timeline.mapper.ts:135` | entry→row lê `entry.kind` | ajustar leitura → `entry.eventType` |
| `adapters/http/dto.ts:104` | DTO `eventType: entry.kind` | ajustar leitura → `entry.eventType` |

**NÃO mexer**: `target.kind` (`'Document'`/`'Payable'`) e `payable.kind` (`'Parent'`/`'Child'`) — variantes de entidade legítimas. Coluna de banco já é `event_type`; schema Zod (`schemas.ts:228`) já valida `eventType`; DTO de saída já expõe `eventType`.

**Decision**: rename interno apenas; o contrato HTTP **não muda** (já era `eventType`).

**Rationale**: convenção de discriminadores — `type`/`eventType` para eventos, `kind` para variantes de entidade. Zero efeito funcional.

**W0 RED**: teste de domínio (`projection.test.ts`) referenciando `docEntry.eventType` → `pnpm run typecheck` falha enquanto o campo for `kind`. **Gate byte-idêntico**: CT-014 (`timeline.http.test.ts`) lê `eventType` na interface tipada e passa antes/depois (prova SC-005).

---

## #56b — `TIMELINE_EVENT_TYPES` + migration do CHECK (smell/contrato)

**Estado atual**

- `DOCUMENT_EVENT_TYPES` em `domain/document/events.ts:56-62` lista os 5 literais (inclui `'DocumentCancelled'`).
- CHECK `ck_fin_tl_event_type` em `adapters/persistence/schemas/mysql.ts:380-383` (e migration `0001_natural_shadowcat.sql:30`) lista os 5 — incluindo `'DocumentCancelled'`.
- Response schema usa `z.enum([...DOCUMENT_EVENT_TYPES])` (`schemas.ts:228`).

**Decision**

- Novo `TIMELINE_EVENT_TYPES = exhaustiveStringUnion<Exclude<DocumentEvent['type'], 'DocumentCancelled'>>()([...] as const)` em `domain/document/events.ts` (4 literais, sem `DocumentCancelled`).
- `DOCUMENT_EVENT_TYPES` permanece intacto (`DocumentCancelled` é evento de domínio legítimo).
- Response schema (`schemas.ts:228`) passa a usar `TIMELINE_EVENT_TYPES`.
- CHECK em `mysql.ts:380` perde `'DocumentCancelled'` → `pnpm run db:generate` emite `0002_*.sql` com `ALTER TABLE fin_document_timeline DROP CHECK / ADD CONSTRAINT … CHECK`.

**Rationale**: o conjunto **publicado** (OpenAPI) e o CHECK não devem anunciar um tipo inalcançável — cancelar faz hard-delete + cascade, a trilha some junto. `Exclude<…>` preserva exaustividade: adicionar um evento novo a `DocumentEvent` sem listá-lo em `TIMELINE_EVENT_TYPES` quebra o typecheck.

**Alternatives considered**: `DOCUMENT_EVENT_TYPES.filter(t => t !== 'DocumentCancelled')` — perde a exaustividade em compile-time; rejeitado. Só documentar (sem migration) — rejeitado no clarify (decisão "Contrato + CHECK").

**Risco**: nenhuma linha com `event_type='DocumentCancelled'` pode existir (cascade + `cancelDocument` não grava timeline) — migration segura, rollback trivial.

**W0 RED** (integração MySQL): cancelar apaga a trilha (cascade, array vazio pós-delete); `INSERT` direto com `event_type='DocumentCancelled'` → rejeitado pelo CHECK (`ER_CHECK_CONSTRAINT_VIOLATED`, MySQL 3819) via `assert.rejects`.

---

## Princípio IX — citações canônicas a registrar (por ticket)

| Decisão-chave                     | Fonte canônica sugerida                                                                                                                                                                  | Onde citar                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| #52 mascaramento de erro          | OWASP API Security Top 10 — API8:2023 (Security Misconfiguration); OWASP ASVS V7 (Error Handling)                                                                                        | W0/W2 de `FIN-HTTP-ERROR-PUBLIC-CODE` |
| #55 optimistic lock / lost-update | Concorrência: prevenção de lost-update (isolamento, versionamento) — Ramakrishnan & Gehrke (controle de concorrência); ou consultor `database-engineer`/`tdd-strategist` via acdg-skills | W0/W2 de `FIN-CANCEL-OPTIMISTIC-LOCK` |
| #56 convenção de discriminadores  | DDD tático (Evans/Vernon) — nomenclatura de modelo; clean-code (naming)                                                                                                                  | W2 de `FIN-TIMELINE-MODEL-TIDY`       |

> Citação literal ≥4 linhas via `skills_buscar`/`skills_citar` (MCP acdg-skills) ou fallback local `acdg/skills_base/shared-references/`. Sem citação, a decisão-chave não avança o gate (constituição §IX).
