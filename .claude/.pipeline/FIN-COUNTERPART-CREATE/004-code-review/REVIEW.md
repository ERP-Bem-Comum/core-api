# Code Review — Ticket FIN-COUNTERPART-CREATE — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-07-13
**Escopo revisado:**

- `src/modules/financial/domain/expected-counterpart/{expected-counterpart-id,types,events,expected-counterpart}.ts`
- `src/modules/financial/application/ports/expected-counterpart-store.ts`
- `src/modules/financial/application/ports/outbox.ts`
- `src/modules/financial/application/use-cases/record-manual-entry.ts`
- `src/modules/financial/adapters/persistence/repos/expected-counterpart-store.{in-memory,drizzle}.ts`
- `src/modules/financial/adapters/persistence/repos/fin-outbox-helpers.ts`
- `src/modules/financial/adapters/persistence/mappers/expected-counterpart.mapper.ts`
- `src/modules/financial/adapters/persistence/schemas/mysql.ts` (+ migration `0034_numerous_rhodey.sql`)
- `src/modules/financial/adapters/http/composition.ts`

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, mas registrar)

#### Issue 1 — `src/modules/financial/application/use-cases/record-manual-entry.ts` (bloco `type === 'Transfer'`)

**Categoria:** D (Ports & Adapters — unit-of-work) / consistência.
**Problema:** A contrapartida é criada e salva (`expectedCounterpartStore.save`) numa transação **separada** da conciliação da perna de origem (`reconciliationRepo.confirmManualEntry`), que já foi commitada acima. Se o `save` da contrapartida falhar (I/O), a perna de origem fica conciliada **sem** a contrapartida esperada em B — o `plan.md` previa "mesma unit-of-work".
**Análise:** São dois **agregados distintos** (Reconciliation × ExpectedCounterpart). Escrever um agregado por transação é o padrão DDD correto (Vernon, "Modify One Aggregate Per Transaction") — a divergência real vs. o plano é a criação ser **síncrona sequencial** em vez de via consistência eventual (handler do evento de conciliação). O risco (falha de I/O entre os dois saves) é raro e, no MVP, tolerável.
**Recomendação (follow-up, não bloqueia US1):** ou (a) a contrapartida nasce de um handler do evento de conciliação da transferência (outbox → consistência eventual), ou (b) compensação explícita se o segundo save falhar. US3 (undo) e a raridade da falha mitigam no curto prazo. Registrar via `issue-report` se a P.O. considerar o risco operacional relevante.

### 🔵 Sugestão (estilo / robustez)

#### Sugestão 1 — `expected-counterpart-store.drizzle.ts` (`toRow(counterpart, new Date())`)

`created_at`/`updated_at` usam `new Date()` no adapter. É metadado de linha (não regra de negócio), consistente com `appendFinOutboxInTx` (que também usa `new Date()` default). Para testabilidade determinística de timestamps de auditoria, considerar um `Clock` injetado no futuro. Não-bloqueante.

#### Sugestão 2 — `events.ts` (`valueCents: number`)

O evento carrega `valueCents` como `number` enquanto o agregado usa `bigint`. É **intencional** (payload serializável — `JSON.stringify` não serializa `bigint`; convenção do módulo é cents `bigint(mode:'number')` → `number`). Documentado no cabeçalho de `events.ts`. Coerente com `ReconciliationEvent`/DocumentEvent. Sem ação.

#### Sugestão 3 — Cobertura de CA4 (outbox) no driver in-memory

CA4 (evento publicado no outbox) é garantido **estruturalmente** pelo adapter Drizzle (`appendFinOutboxInTx` na tx do `save`). O teste in-memory não injeta um outbox no `expectedCounterpartStore` para assertar a publicação. O in-memory já suporta injeção de outbox (paridade com `reconciliation-repository.in-memory`); um teste que injeta e inspeciona `all()` fecharia a asserção de CA4 no `FIN-COUNTERPART-MATCH`/W3. Não-bloqueante (o W0 fixou o conjunto de testes).

---

## O que está bom

- **Boundary de agregado correto:** contrapartida modelada como **agregado próprio** (não `StatementTransaction` marcada), com id branded, smart constructor puro e `Result` — fiel ao `research.md`/data-model (Vernon IDDD p.450).
- **Domínio purista:** zero `throw`/`class`/`this`/`any`/`extends Error`; `Readonly<>` em tudo; `movement` derivado por função pura; erros string-literal EN kebab.
- **Atomicidade produtor:** `save` do Drizzle grava row + outbox na MESMA tx (`appendFinOutboxInTx`) — ADR-0015 respeitado. Branch `counterpartId` adicionado ao `extractAggregateInfo` (senão o aggregate cairia no fallback `periodId`) — atenção fina ao helper.
- **Guard de não-regressão explícito:** `type === 'Transfer' && destinationAccountId !== null` — Investment/FeePenaltyInterest/sem-destino não criam contrapartida (CA2 coberto nos dois sentidos).
- **Schema fiel ao ADR-0020:** varchar+CHECK para type/movement/status (sem ENUM), bigint cents, índices justificados `(destination_account_ref,status)` e `(origin_reconciliation_ref)`. Migration segue o padrão recente (sem CHARSET manual).
- **Regressão zero comprovada:** os 4 testes pré-existentes de `recordManualEntry` foram ajustados ao novo dep obrigatório; suíte completa 3944 pass.

---

## Próximo passo

- **APPROVED** → pipeline avança para **W3** (`ts-quality-checker`): gate já verde na worktree (typecheck+lint+format+test); **falta validar a migration `0034` no x99** (MySQL 8.4). Issue 1 (🟡) fica como follow-up recomendado, não bloqueia o fechamento do ticket.
