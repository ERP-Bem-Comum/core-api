# Code Review — Ticket FIN-LISTAGEM-TIMELINE

**Veredito round 1:** REJECTED · **Veredito round 2:** ✅ APPROVED (ver seção final)

**Reviewers:** `code-reviewer` (qualidade/arquitetura) + `security-backend-expert` (segurança, audit ativo read-only)
**Data:** 2026-06-16
**Base do diff:** `origin/dev..HEAD` (4 commits de produção: US1 listagem `findPaged`, US2 trilha por-campo, optimistic lock + RBAC, exposição de `version`).

**Escopo revisado (28 arquivos `src/`):**

- Domínio: `domain/timeline/{types,projection,repository}.ts`, `domain/document/{query,repository}.ts`
- Application: `application/timeline-recording.ts`, 6 use cases mutantes + `get-document-timeline.ts`
- Adapters persistência: `document-repository.{drizzle,in-memory}.ts`, `timeline-repository.{drizzle,in-memory}.ts`, `mappers/timeline.mapper.ts`, `schemas/mysql.ts`, migration `0001_natural_shadowcat.sql`
- Borda HTTP: `adapters/http/{plugin,dto,schemas,composition}.ts`
- Auth/RBAC: `auth/domain/authorization/permission-catalog.ts`, `financial/public-api/permissions.ts`

---

## O que está bom (feedback positivo)

- **Domínio puro impecável.** `projection.ts`/`types.ts`: zero `throw`/`class`/`this`/`any`, `Readonly<>` em tudo, `readonly T[]`, discriminated union `TimelineTarget` com `kind` EN, return types explícitos. Diff por função pura sobre snapshots (ADR-0001) — o Functional Core não conhece relógio nem gerador de ID.
- **Imperative Shell correta.** `timeline-recording.ts` carimba `eventId` (UUID) + `occurredAt` (Clock) e delega à projeção pura. `Clock` injetado em todos os use cases mutantes — testável com `ClockFixed`.
- **Optimistic lock sólido e simétrico.** Drizzle: `UPDATE ... WHERE id=? AND version=?` → `affectedRows=0` → `document-version-conflict`, com `SELECT FOR UPDATE` serializando txs (citações Refman §13.2.17 / §15.7.2.4). In-memory **modela `version`** (`StoreEntry{aggregate,version}`) com a MESMA semântica — logo os testes de 409 contra in-memory são válidos, não falso-positivos.
- **Sentinela sem `class`.** `VERSION_CONFLICT_SYMBOL` distingue conflito semântico de falha de infra dentro de `save` sem violar `no-restricted-syntax` (class). Criativo e correto.
- **Trilha na MESMA transação do agregado** (Vernon:3257) — rollback atômico, sem trilha órfã. Cascade dupla bem modelada (`fin_document_timeline` → `fin_documents`; `fin_timeline_field_changes` → entry).
- **Zero SQL injection.** `findPaged`/`findByDocument` usam só construtores tipados do Drizzle (`eq/gte/lte/inArray/asc`), `LIMIT/OFFSET` posicionais. Confirmado pela auditoria de segurança.
- **Mappers retornam `Result`** (corrupção de row → erro tipado, defesa em profundidade com CHECK de banco). Borda converte todo `throw`/`catch` em `Result`.
- **RBAC limpo:** permissões inertes removidas do catálogo e do `FINANCIAL_PERMISSION` sem deixar consumidor órfão; rotas novas atrás de `fiscal-document:read`.

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

#### Issue 1 (Segurança — Major) — `adapters/http/schemas.ts:150` — filtro `type` sem enum

`listDocumentsQuerySchema.type` é `z.string().optional()`, repassado direto a `eq(finDocuments.type, filter.type)` (`document-repository.drizzle.ts:386`). Sem risco de SQLi (Drizzle parametriza), mas:

- Aceita string arbitrária (até o `bodyLimit`), forçando `WHERE type = <valor inexistente>` + `COUNT(*)` por requisição — consulta sempre-vazia ineficiente.
- **Inconsistência de borda:** `status` usa `z.enum([...])`, o `createDocumentBodySchema` define `documentTypeSchema` enum (`schemas.ts:54`), mas a listagem destoa. Viola ADR-0027 ("todo input externo é hostil até validação").

**Fix:** trocar por `type: z.enum(['NFS-e','DANFE','RPA','Fatura','Boleto','Recibo','Imposto']).optional()` — reutilizar o `documentTypeSchema` já declarado no arquivo. Rejeita inválido com 400 antes do banco.

> O `security-backend-expert` classifica este como o **único item que exige mudança antes da aprovação**. É o que puxa o veredito para REJECTED.

---

### 🟡 Importante (corrigir neste round)

#### Issue 2 — `document-repository.drizzle.ts:422` + `document-repository.in-memory.ts:130-135` — paginação instável + divergência de paridade

`findPaged` (Drizzle) ordena por `orderBy(asc(finDocuments.dueDate))` **sem tie-breaker único**. Como Drafts têm `dueDate NULL` (todos agrupados) e pode haver empates de `dueDate`, a ordem entre linhas equivalentes em paginação OFFSET é indefinida no MySQL → uma página pode **repetir ou pular** documentos. Hoje só não quebra porque a PK do InnoDB entra implicitamente no índice secundário **quando o otimizador usa o índice** — garantia frágil, não explícita. O comentário (`:350`) afirma "ordenação determinística" que a implementação não entrega.

Agravante de paridade: o **in-memory não ordena** (usa ordem de inserção do `Map`, `:134`). Os dois adapters do mesmo port divergem, e como a borda testa contra in-memory, a ordenação real do MySQL **não é coberta** por teste de contrato.

**Fix:** (a) adicionar tie-breaker explícito `asc(finDocuments.id)` ao `orderBy` do Drizzle; (b) replicar a mesma ordenação (`dueDate`, depois `id`) no in-memory; (c) adicionar caso na `document-repository.suite.ts` com empate de `dueDate` exercitando a ordem estável.

#### Issue 3 — `adapters/http/schemas.ts:223` + `mappers/timeline.mapper.ts:56` — `satisfies` não garante exhaustividade

`DOCUMENT_EVENT_TYPES = [...] as const satisfies readonly DocumentEvent['type'][]` e o `Set` `VALID_EVENT_TYPES` afirmam (via comentário) "o compilador acusa se a union de eventos mudar". **Falso:** `satisfies` só valida que cada literal é atribuível — **não** que todos os membros da union estão presentes. Um novo `DocumentEvent['type']` passaria silenciosamente, e o `z.enum` então **rejeitaria** esse tipo na serialização da resposta de `/timeline` (erro de validação de response em runtime).

**Fix:** forçar exhaustividade real — ex. derivar a lista de um `Record<DocumentEvent['type'], true>` (chaves obrigatórias) e extrair `Object.keys`, ou um helper que falhe a compilação ao faltar membro. Alternativa mínima: corrigir o comentário para descrever a garantia real (apenas "no extra", não "no missing").

---

### 🔵 Sugestão (estilo / clareza — opcional ou via issue-report)

#### Issue 4 — guard `events[0] === undefined → 'document-repository-failure'` repetido 6× (`save-document.ts:`, `save-draft.ts`, `adjust-document.ts`, `approve-document.ts`, `submit-draft.ts`, `undo-approval.ts`)

Semântica imprecisa (não é falha de repositório; é invariante de domínio "≥1 evento") + duplicação. Extrair helper `firstEvent(events): Result<DocumentEvent, ...>` ou mapear para um erro mais preciso.

#### Issue 5 — `domain/timeline/repository.ts:26-28` — comentário do port impreciso

Diz "Quem valida a existência do documento é o use case (via `DocumentRepository.findById`)", mas quem valida é o **handler HTTP** (`plugin.ts:412`), não `getDocumentTimeline`. Alinhar o comentário (sobrepõe-se ao N2 da segurança).

#### Issue 6 — naming domínio `kind` vs DTO `eventType`

`FinancialTimelineEntry.kind` carrega um `DocumentEvent['type']`; o DTO expõe como `eventType`. A convenção do projeto reserva `type` para events (`kind` para variantes de entidade). Considerar renomear o campo de domínio para `eventType`.

#### Issue 7 — `DocumentCancelled` inalcançável na trilha

Cancelar faz hard delete + CASCADE (`cancel-document.ts:35`), removendo a trilha; logo nenhuma entry com `event_type='DocumentCancelled'` jamais persiste/é lida. Manter no enum/CHECK como defensivo é aceitável — documentar que é inalcançável por design, ou remover.

#### Issue 8 — acentuação em comentários PT — `permission-catalog.ts:44`, `public-api/permissions.ts:14`

"permissoes inertes: sem rota enforca" → "permissões... força". Documentação/comentário PT exige acentos (regra de idioma).

#### Issue 9 — `cancel-document` fora do optimistic lock

Diferente de adjust/approve/undo, `cancel` não exige `expectedVersion` (findById→delete sem version check) — TOCTOU teórico entre leitura e delete. Provavelmente intencional (fora do escopo FR-009 + operação destrutiva final); confirmar.

---

## Segurança — relatório consolidado (`security-backend-expert`)

**Veredito de segurança:** CHANGES-REQUESTED · 0 Blocker · 1 Major · 2 Minor.

| ID | Severidade | Arquivo | Resumo | Onde está aqui |
| :-- | :-- | :-- | :-- | :-- |
| M1 | Major | `schemas.ts:150` | Filtro `type` aceita string arbitrária; restringir ao enum | **Issue 1 (🔴)** |
| N1 | Minor | `plugin.ts:106-108` | Código interno de erro replicado como `message` em 4xx (ex.: `document-version-conflict` revela mecanismo de concorrência; `invalid-state-transition` vaza a máquina de estados) | 🔵 abaixo |
| N2 | Minor | `plugin.ts:408-421` / `get-document-timeline.ts:5` | Contrato frágil de checagem de existência no `/timeline` + ausência de isolamento multi-tenant (pré-existente ao módulo, não regressão desta fatia) | sobrepõe Issue 5 |

**N1 (🔵):** separar `error.code` público (`not-found`/`conflict`/`bad-request`/`unprocessable`) do código interno de log — o 5xx já faz isso; estender ao 4xx. Ou remover o `message` redundante que repete o code EN (idioma: mensagem ao humano deve ser PT-BR).

**N2 (🔵 / débito futuro):** documentar no contrato de `findByDocument` que retorna lista vazia (não erro) p/ doc inexistente e manter o `findDocumentById` do handler como invariante de autz/existência. Isolamento multi-tenant (`organization_id` em `fin_documents` + predicado em toda leitura) → **issue de rastreamento** para a fase multi-tenant (ADR-0040), não desta fatia.

**Dimensões sem achado:** SQL injection, optimistic lock como controle, RBAC/permissões órfãs, bounds de DoS (`pageSize .max(100)`, `version`/`rateBps`/`cents` bounded), vazamento de secret/PII em log, Prototype Poisoning, CSPRNG (`randomUUID`), exposição de dado sensível em `/timeline`.

---

## Plano de ação para fechar a W2

**Bloqueante (obrigatório antes da W3):**

1. Issue 1 / M1 — `type` → `z.enum` em `listDocumentsQuerySchema`.
2. Issue 2 — tie-breaker `asc(id)` no Drizzle + paridade de ordenação no in-memory + caso de contract-suite com empate.
3. Issue 3 — exhaustividade real do enum de event types (ou corrigir o comentário enganoso).

**Recomendado no mesmo round:** Issues 4, 5, 8 (baratas, melhoram clareza). N1 a critério do time.

**Débito futuro (issue-report / ADR-0040):** N2 isolamento multi-tenant; Issues 6, 7, 9 se não tratadas agora.

---

## Round 2 — Re-revisão (2026-06-16) — ✅ APPROVED

Os 3 bloqueantes do round 1 foram corrigidos, cada camada pelo agente especialista, e re-validados.

| # | Issue (round 1) | Fix aplicado | Agente | Status |
| :- | :- | :- | :- | :- |
| 1 | 🔴 M1 — `type` arbitrário na listagem | `type: documentTypeSchema.optional()` (reutiliza o enum dos 7 tipos) + `list-documents.http.test.ts` CT-009 (`?type=FOO` → 400) | `fastify-server-expert` | ✅ |
| 2 | 🟡 paginação instável + paridade | Drizzle `.orderBy(asc(dueDate), asc(id))` + in-memory ordena dueDate ASC (NULLs primeiro, Refman §11.4.2) com tie-breaker `id` + 2 casos novos na `document-repository.suite.ts` (empate de dueDate; Drafts antes) | `drizzle-orm-expert` | ✅ |
| 3 | 🟡 `satisfies` sem exhaustividade | helper `exhaustiveStringUnion` (`src/shared/primitives/exhaustive.ts`) força **no-extra AND no-missing**; fonte única `DOCUMENT_EVENT_TYPES` em `domain/document/events.ts` consumida por `schemas.ts` (z.enum) e `timeline.mapper.ts`. Provado: 6º membro fictício quebra `typecheck` (revertido) | `typescript-language-expert` | ✅ |

**Validação cruzada da borda:** `zod-expert` → **APPROVED** (0 Blocker/Major). Confirmou que `z.enum([...DOCUMENT_EVENT_TYPES])` preserva a union literal exata (const context do Zod v4) e que `documentTypeSchema.optional()` é coerente com `exactOptionalPropertyTypes`. Registrou 2 Minors **pré-existentes** e puramente documentais (OpenAPI) em response schema, não-bloqueantes:
- `changes.field` (`schemas.ts:248`) sem `.max(60)` (banco é `varchar(60)`).
- `changes.before`/`after` (`schemas.ts:249-250`) sem bound (banco é `text`).

**Re-revisão dos diffs (code-reviewer):** `exhaustive.ts` é type-helper puro fundamentado no handbook; sort in-memory espelha fielmente o Drizzle; `DOCUMENT_EVENT_TYPES` no domínio com import de shared-kernel (permitido). Sem regressão de regra/ADR.

**Gate (3 fixes juntos):** `typecheck` ✅ · `format:check` ✅ · `lint` ✅ · `pnpm test` ✅ **2494 pass · 0 fail · 18 skipped** (integração opt-in).

**Pendências não-bloqueantes (débito futuro / `issue-report` ADR-0040):** N1 (erro interno em 4xx), N2 (multi-tenant), 2 Minors documentais do zod, nits 🔵 6/7/9.

## Próximo passo

- **APPROVED → W3** (gate final `ts-quality-checker`): inclui `pnpm run test:integration:financial` (MySQL real) — onde o tie-breaker do Fix 2 é provado contra o `ORDER BY` real do MySQL.
