# Code Review — Ticket FIN-RECON-STATEMENT-PERSIST-HTTP (#120) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-18T15:15Z
**Escopo revisado:**

- `application/use-cases/import-bank-statement.ts`
- `application/ports/bank-statement-repository.ts`
- `application/ports/outbox.ts`
- `adapters/persistence/repos/bank-statement-repository.{in-memory,drizzle}.ts`
- `adapters/persistence/mappers/statement.mapper.ts`
- `adapters/persistence/schemas/mysql.ts` (tabelas novas + tipos)
- `adapters/persistence/migrations/mysql/0005_silky_scorpion.sql`
- `adapters/outbox/outbox.in-memory.ts`
- `adapters/http/{plugin,composition,schemas,dto,error-mapping}.ts`
- `public-api/{events,permissions}.ts`
- testes (use-case, mapper, http, integração)

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma. Sem `throw`/`class`/`any`/`new Date()` na camada errada; sem violação de ADR; sem bug
funcional confirmado (CA1–CA7 verdes, incl. integração).

### 🟡 Importante (não-bloqueia, registrar)

#### Issue 1 — `entryType` aberto vs. CA5 ("normalizado p/ union EN") — `domain/statement/types.ts:19` + `mappers/statement.mapper.ts`

**Categoria:** G/spec.
**Problema:** O 000-request (CA5 + handoff do W2 do #119) pede `entryType` normalizado para **union EN
(ou `Other`)** com CHECK no `entry_type`. O domínio #118 **já mergeado** tipa `entryType: string` (aberto);
o W1 respeitou o domínio — schema sem CHECK restritivo, mapper faz round-trip da string.
**Avaliação:** A decisão é **correta** pela hierarquia de fontes (domínio mergeado vence o texto do
request) e está documentada em `003-impl/REPORT.md`. Os parsers (#119) já entregam normalização prática
(uppercase + fallback `'Other'`). **Não bloqueia.**
**Recomendação:** reconciliar a spec — ou aceitar `entryType` como string aberta (ajustar o texto do CA5),
ou, se o produto realmente quer um union fechado, abrir **follow-up via `issue-report`** que altere o
domínio #118 (fora do escopo de #120). Não consertar aqui (evitar scope-creep — anti-padrão #15).

### 🔵 Sugestão (estilo / clareza / futuro)

- **`fin_statement_transactions.debit_account_ref` sem FK para `fin_cedente_accounts`** — coerente com o
  escopo (guard de conta encerrada FR-015 é #123/Phase 4b). Quando o guard entrar, avaliar a FK. Sem ação agora.
- **Bounds de `entry_type varchar(32)` / `payee_name varchar(255)` / `memo varchar(500)`** — valores do
  parser acima do limite fariam o INSERT falhar (→ `bank-statement-repository-failure`). Risco baixo
  (TRNTYPE/tipo são curtos), mas vale truncar/validar no mapper num ticket futuro se aparecer extrato real largo.
- **`clock: Pick<Clock,'now'>`** no use-case diverge dos demais use-cases (que recebem `Clock` completo).
  É narrowing intencional e bom design (depende da interface mínima); mantido. Apenas registrar a divergência.
- **`coluna `date`** (palavra reservada) — backtickada na DDL gerada, sem problema funcional; nome casa com
  o campo de domínio `date`. OK.

---

## O que está bom

- **Sequência canônica** do use-case impecável: `parser.parse` → resolve FITID → `repo.knownFitids` →
  `importStatement` (dedup no domínio) → `repo.save` → `outbox.append` **só após save ok**
  (`import-bank-statement.ts:79–121`). Zero regra de negócio na application (descarte é do domínio).
- **`resolveFitid`** robusto: nativo via `fromNative`, fallback sintético determinístico para `null`/inválido
  — não aborta a importação por uma linha sem chave nativa, preservando o dedup.
- **Defesa de dedup em duas camadas**: `knownFitids` (aplicação) + **índice ÚNICO `(debit_account_ref, fitid)`**
  no DB (R5), provado pelo CA7 na integração real (o 2º insert duplicado falha e vira `err`).
- **Schema ADR-0020-clean**: varchar+CHECK para enums, `bigint` cents, `datetime(fsp:3)`, UUID varchar(36)
  sem AUTO_INCREMENT, FK CASCADE no boundary, sem JSON/ENUM nativo.
- **Migration 0005** com CHARSET/COLLATE manual no padrão das 0000–0004; acerto fino em pôr **`fitid` em
  `utf8mb4_bin`** (chave de dedup → comparação binária exata, evita colapso por collation).
- **Mapper** revalida todo estado vindo do banco (IDs, FITID, movement, reconciliationStatus, file_format)
  retornando `Result` — domínio rejeita estado inválido (`.claude/rules/adapters.md`).
- **Borda HTTP** segue o padrão do módulo (Zod contract-first, `sendDomainError`/`sendResult`, slugs internos
  não vazam — OWASP API8), permissões em SSoT (`reconciliation:import`/`:read`).
- **Idioma** correto: código EN, slugs EN kebab-case, mensagens PT em `error-mapping.ts` (dicionário humano).
- **Testes** com fakes injetáveis, UUIDs reais (mapper/http/integração) e asserções de regra (não só "não lança").
- **Honestidade de processo**: o teste W0 "held" foi ativado e os ajustes de lint (interface/async) feitos
  sem alterar asserções; tudo documentado no REPORT do W1.

---

## Follow-ups registrados (ADR-0040 — achados fora do escopo viram GitHub Issue)

Via skill `issue-report` (dedup ok; label `agent-found,needs-triage,debito-tecnico`):

- **#159** — `[financial]` decidir política de `entryType` (union EN fechado vs string aberta) — corresponde à Issue 1 🟡.
- **#160** — `[financial]` FK `debit_account_ref → fin_cedente_accounts` (depende do guard FR-015 / #123) — 🔵.
- **#161** — `[financial]` validar/truncar bounds varchar no `statement.mapper` — 🔵.

A divergência `clock: Pick<Clock,'now'>` **não** virou issue (escolha intencional aprovada, sem ação desejada).

## Próximo passo

- **APPROVED** → avançar para **W3** (`ts-quality-checker`): gate `typecheck` + `format:check` + `lint` +
  `test`, e `test:integration:financial` (Docker) antes do merge.
- As issues #159–#161 são follow-ups, **não** condição de approval.
