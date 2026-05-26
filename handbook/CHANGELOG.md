# 📜 Changelog do Handbook

Mudanças relevantes na documentação do projeto. Formato baseado em [Keep a Changelog](https://keepachangelog.com/).

---

## 2026-05-26 — ADR-0022: Read-models via projeção (decide inquiries 0017 + 0018)

### Decisão

[Inquiry-0017](./inquiries/0017-timeline-read-model-vs-adr-0020.md) (Timeline) e [Inquiry-0018](./inquiries/0018-auditlog-transversal-todos-bcs.md) (AuditLog) decididas em conjunto → **[ADR-0022](./architecture/adr/0022-read-models-via-projection-over-event-stream.md)**.

Achado decisivo: o `ctr_outbox` **retém** entradas após entrega (`markProcessed`, não delete) — já é o **log append-only** de eventos. Logo:

- Outbox = log canônico; **sem event-store novo** (rejeitado por redundância).
- **Derive-on-read do outbox rejeitado** (acopla leitura à entrega; payload VARCHAR serializado).
- **Read-models via projeção** sobre o stream (alimentados pelo event-delivery existente), colunas decompostas (ADR-0020).
- **Timeline:** implementar agora (`ctr_timeline_*`; UC-02/UC-08). Desbloqueia `CTR-TIMELINE-READ-MODEL`.
- **AuditLog:** mesmo padrão (transversal), **diferido** até identidade/RBAC (o "Quem" não é confiável sem ator autenticado).

---

## 2026-05-25 — Acabamento de Contracts (UC-07 + R4) + 2 inquiries arquiteturais

### Contexto

Sessão de fechamento de gaps do módulo Contracts a partir do `RELATORIO-COBERTURA-DOMINIO-2026-05-25.md`. Executados os 2 gaps prontos (domínio existente) via pipeline W0→W3; os arquiteturais viraram inquiry antes de qualquer código (regra do orquestrador).

### Adicionado (código — tickets fechados closed-green)

- **`CTR-USECASE-END-CONTRACT`** — UC-07 Encerramento de contrato (`03-gestao-contratos-context.md:70-74`). Use case `endContract` (Expire/Terminate) orquestrando `Contract.expire`/`terminate` + comando CLI `encerrar-contrato`. Publica `ContractEnded` via outbox.
- **`CTR-AMENDMENT-CHRONOLOGY-R4`** — R4 cronologia do aditivo (`04-aditivos-context.md:86`). Guard em `homologateAmendment`: rejeita `amendment.createdAt < contract.signedAt` (âncora = `signedAt`, decisão do P.O.).

### Aberto (inquiries — pendentes, sem código)

- **[Inquiry-0017](./inquiries/0017-timeline-read-model-vs-adr-0020.md)** — Timeline (UC-02/UC-08) vs. ADR-0020 (proíbe coluna JSON). Fork: projeção dedicada vs. event-store append-only. Bloqueia `CTR-TIMELINE-READ-MODEL`.
- **[Inquiry-0018](./inquiries/0018-auditlog-transversal-todos-bcs.md)** — `AuditLogGenerated` transversal (`06-event-line-context.md:24`). Depende de identidade/RBAC (Fase 2+); sinergia de event-store com a 0017.
- **[Inquiry-0019](./inquiries/0019-hard-delete-tripwire-sem-superficie.md)** — `TentativaDeExclusaoDetectada` (gap 5). Achado: não há superfície de deleção física no sistema (port só `findById`/`list`/`save`); melhor prevenir por privilégio MySQL que detectar por evento de domínio. Não-código.

### Backlog rastreado (não iniciado)

- `CTR-IMPORT-LEGACY` (gap 3 / UC-11 — feature grande), `FIN-ACL-CONTRACT-EVENTS` (gap 7 — módulo Financial, ADR-0014).

---

## 2026-05-19 — Entrevista 0001 (DDD Funcional) ENCERRADA

### Contexto

A entrevista [`0001-functional-ddd-domain-refresh`](./interviews/0001-functional-ddd-domain-refresh.md) começou em 2026-05-18 como reformulação radical do domínio do módulo Contracts à luz de modelagem funcional moderna. Pacto: senior do projeto entrevista um PhD em DDD funcional via Q&A externa, com host responsável por destilar regras e corrigir contradições. 12 blocos temáticos abertos (A-L). Após 4 dias e ~50 turnos de conversa, **10 dos 12 blocos fechados**. Os 2 remanescentes (E1/E2 sobre `{ entity, event }` e F1/F2 sobre schema evolution de eventos) ficam pra **entrevista 0002** quando o outbox MySQL voltar à mesa.

### Adicionado

- **Pasta `handbook/interviews/`** (nova convenção) — formato auditável de entrevistas técnicas longas em `.md` versionado. README + 25 arquivos da entrevista 0001 (master + 9 perguntas semânticas unificadas + 14 perguntas individuais com banners superseded + 1 meta de diagramas + followups).
- **Tabela canônica L3** em [`Pergunta_J_K_L`](./interviews/0001/Pergunta_J_K_L_tec_lider_using_skill_ts-domain-modeler.md) — **105 entradas classificadas** em DO (40) + CONSIDER (16) + AVOID (5) + DON'T (44). PhD sub-entregou 16 entradas; host expandiu para cobrir os 7 blocos fechados + 20 diretrizes do projeto + J/K. Vira fonte canônica do `SKILL.md §3.L`.
- **3 diagramas Mermaid/ASCII canônicos** ([`Pergunta_diagramas_meta`](./interviews/0001/Pergunta_diagramas_meta_tec_lider_using_skill_ts-domain-modeler.md)):
  1. State Machine do `Amendment` — `PendingWithoutDocument → PendingWithDocument → Homologated` com aninhamento status × kind.
  2. Sequence diagram do fluxo de homologação cross-agregado.
  3. Árvore ASCII anotada do layout canônico de pastas.

### Decisões cravadas (resumo, ver tabela L3 completa para detalhes)

- **Padrão D (module-as-namespace)** — free functions + `import * as Module from './module.ts'`. Nunca `export const X = { … }`.
- **Result homemade** (`shared/result.ts`, ~50 LOC) com `ok`, `err`, `mapErr`, `combine`. Zero deps. Sem `andThen`/`pipe`/Effect/fp-ts/neverthrow.
- **Tagged errors via free functions** em `errors.ts` por agregado (Padrão D coerente).
- **State machine in types** — agregados como union refinada (`Amendment = PendingWithoutDocument | PendingWithDocument | Homologated`). Transições tipadas (`parseActive`, `attachSignedDocument`, `homologate`).
- **Aninhamento (status × kind)** — não cross-product. `Amendment` carrega 3 estados × 4 kinds aninhados.
- **Brand via `unique symbol` global** em `shared/brand.ts`. Wrapper para grandezas/unidades; primitivo para IDs opacos.
- **`shared/immutable.ts`** facade — esconde `Object.freeze` por trás de vocabulário do domínio.
- **`Instant = Brand<number, 'Instant'>`** — sem `Date` cru no domínio.
- **Dupla taxonomia** Amendment ≠ ContractAdjustment, ponte via `toAdjustments(homologated): readonly ContractAdjustment[]` (array — evolução assimétrica permite 1:N e 0:1).
- **Domínio 100% sync** — Application Layer (Imperative Shell) lida com `Promise`.
- **Exhaustive switch sem `throw`** — omitir `default` ou `return _exhaustiveCheck`. `assertNever` banido.
- **Layout canônico:** `src/shared/kernel/` (Evans cross-BC); `src/modules/<bc>/domain/shared/` (específico do BC); ports genéricos em `application/ports/`; Repository em `domain/<aggregate>/repository.ts`; `adapters/` (nunca `infra/`); módulo no plural (`contracts/`); `cli/` como pasta de primeira classe; `public-api/` por módulo (ADR-0006).
- **Mappers retornam `Result<Aggregate, RehydrationError>`** via smart constructors de VOs internos.
- **Imports — Opção C:** relativos intra-BC + subpath cross-BC (`#kernel/*`, `#shared/*`).
- **`import type`** sempre quando puro tipo (razão: `verbatimModuleSyntax: true`).
- **`satisfies`** antes do cast brand: `{ … } satisfies RawShape as BrandedVO`.

### Tickets que isto habilita (21 coordenados — ordem por leverage do PhD)

**Top-3 (maior leverage):**
1. `CTR-DOMAIN-STATE-MACHINE-CONTRACT` + `CTR-DOMAIN-STATE-MACHINE-AMENDMENT`.
2. `CTR-SHARED-VO-CANONICAL` + `CTR-SHARED-BRAND-UNIQUE-SYMBOL` + `CTR-SHARED-IMMUTABLE`.
3. `CTR-SHARED-RESULT-COMBINATORS` + `CTR-DOMAIN-COMPOSE-REFACTOR`.

**Demais:** `CTR-DOMAIN-DEBRAND-AGG`, `CTR-DOMAIN-MAPPER-RESULT`, `CTR-DOMAIN-TAGGED-ERRORS`, `CTR-DOMAIN-INVARIANT-CONTEXTUAL`, `CTR-DOMAIN-EXHAUSTIVE-SWITCH-FIX`, `CTR-DOMAIN-IMPORT-CODEMOD`, `CTR-DOMAIN-IMPORTS-STRATEGY`, `CTR-DOMAIN-IMPORT-TYPE-UNIFORM`, `CTR-DOMAIN-RESTRUCTURE`, `CTR-DOMAIN-K-OPTIONAL`.

**Refresh da SKILL (última fase, após refactors):** `CTR-SKILL-REFRESH-{A,B,C,D,G,H,I,L}` — refresh integral das seções da `SKILL.md` ts-domain-modeler.

### Observações metodológicas registradas

- **PhD sub-entrega em síntese (5 ocorrências):** Bloco B precisou followup com 5 tensões; Bloco C teve contradição direta com Bloco B (`throw` no exhaustive); Bloco D teve declaration merging contra Bloco B; Diagramas tiveram 6 erros factuais; Tabela L3 entregue com 16/105 entradas. Padrão: sempre pedir lista exaustiva com contagem-alvo no enunciado.
- **Lembrete de diretrizes no topo de pergunta funciona pra prose**, mas **não pra geração de artefato concreto** (snippet ou diagrama). Sempre revisar artefatos contra decisões cravadas.
- **Decisão TS handbook §695 como autoridade** ("looks no different than the JavaScript we would've written otherwise") + Wlaschin ("código de domínio não usa jargão de programador") são as duas referências mais citadas da entrevista.

### Próxima entrevista (sugerida — `0002`)

Outbox MySQL + Event sourcing puro vs `{ entity, event }` (E1 reaberto) + Observability tagged + Property-based testing com `fast-check`. Abre quando o módulo de comunicação cross-módulo for materializar.

---

## 2026-05-15 — ADR-0020: MySQL como Único Dialeto (supersedes ADR-0018)

### Contexto

O [ADR-0019](./architecture/adr/0019-document-storage-s3-with-minio-dev.md) (emitido nesta mesma data, mais cedo) materializou Docker Compose como infraestrutura local oficial do projeto, com `compose.yaml` na raiz do `core-api` provisionando MinIO (ADR-0019) e MySQL 8.4 (opt-in via profile `db`). A premissa central do [ADR-0018](./architecture/adr/0018-persistence-dual-dialect-drizzle.md) — *"rodar Docker MySQL localmente cria fricção para devs"* — deixou de ser verdade. Com isso, manter SQLite como dialeto paralelo deixou de ter benefício e passou a ser ônus líquido (manter 2 schemas, mappers ramificados, lista normativa de paridade, toolchain C++ no Docker build, suite de testes duplicada).

### Adicionado

- **[ADR-0020](./architecture/adr/0020-mysql-only-supersedes-dual-dialect.md)** — `Status: Accepted` (aprovado pelos deciders em 2026-05-15). MySQL 8.4 vira único dialeto em todo o ciclo de vida (dev local, CI, staging, prod). Adapter `InMemory` preservado (para testes de domínio/use case e demo da P.O. via CLI driver `memory`). Convenção de tabelas adota prefixo `ctr_*` dentro do database `core` (alinhamento com ADR-0014). Lista normativa de features SQL atualizada: 4 features que estavam proibidas só por paridade voltam a ser permitidas (`ON DUPLICATE KEY UPDATE`, `FULLTEXT`, window functions, CTEs recursivas); 6 continuam proibidas por razão própria (JSON nativo, stored procs, `ENUM` nativo, tipos espaciais, `AUTO_INCREMENT` em PK de domínio, isolation level explícito).

### Atualizado

- **[ADR-0018](./architecture/adr/0018-persistence-dual-dialect-drizzle.md)** — Status `Accepted` → `Superseded by ADR-0020`. Banner de aviso adicionado no topo explicando a mudança de premissa. Conteúdo do ADR permanece intocado como evidência histórica.
- [`architecture/adr/README.md`](./architecture/adr/README.md) — Índice atualizado (0018 superseded, 0020 accepted).

### Tickets que isto habilita (em ordem)

1. `CTR-DB-COMPOSE-MYSQL` — `compose.yaml` com my.cnf custom + init scripts + healthcheck robusto.
2. `CTR-DB-SCHEMA-MYSQL-CTR-PREFIX` — `schemas/mysql.ts` com prefixo `ctr_*`, charset, índices F-H2/F-M2, CHECKs F-L1/F-L2.
3. `CTR-DB-MIGRATION-MYSQL` — `drizzle.config.ts` MySQL + primeira migration.
4. `CTR-DB-DRIVER-MYSQL` — Wire `mysql2`, resolver F-C1 (transaction async) e F-C2 (FK error union).
5. `CTR-CLEANUP-SQLITE` — Remover schema/driver/migration SQLite, dep `better-sqlite3`, testes específicos.
6. `CTR-DOCKERFILE-MYSQL` — Dockerfile sem toolchain C++.
7. `CTR-CLI-MYSQL-SMOKE` — `--driver mysql` + suite E2E rodando contra MySQL real.
8. `CTR-DOCS-UPDATE-FOR-ADR-0020` — atualizar `CLAUDE.md` raiz + 8 SKILL.md que ainda referenciam ADR-0018.

### Backward compat / breaking

- **Breaking** em `package.json`: `better-sqlite3` e `@types/better-sqlite3` removidos; script `db:generate:sqlite` substituído por `db:generate:mysql`.
- **Breaking** em CLI: flag `--driver sqlite` deixa de existir; aceita apenas `--driver memory|mysql`.
- **Breaking** no `Dockerfile`: estágio `deps` perde `python3 + make + g++` (~150MB de imagem economizados).
- **Preservado**: domain, application, ports, adapter `InMemory`, driver CLI `memory`, suite de contrato compartilhada (`*.contract.ts`/`*.suite.ts`).

---

## 2026-05-14 — CLI ganha `--driver memory|sqlite|mysql` (ticket CTR-CLI-DRIVER-FLAG fechado)

### Contexto

O ticket `CTR-ADAPTER-DRIZZLE-DUAL` entregou o adapter Drizzle/SQLite mas só era exercitado por testes — a CLI continuava 100% InMemory + state file JSON. O `CTR-CLI-DRIVER-FLAG` (4 waves, 310/310 verdes) wirea o adapter na CLI para que a P.O. e devs validem o motor de cálculo contra **persistência real** antes do MySQL chegar.

### Adicionado

- Nova seção [§4.1 "CLI e escolha de driver"](./architecture/06-persistence-strategy.md#41-cli-e-escolha-de-driver) em `06-persistence-strategy.md` documentando: tabela de uso por driver, regras de validação de flags, exit codes (sysexits.h: 0/1/64/70/74), shutdown garantido via `try/finally`, e diretriz "quando escolher cada driver".

### Entregas correspondentes em `ERP-CONTRACTS/`

- **Refatoração `CliContext`**: agora expõe **ports** (`contractRepo`, `amendmentRepo`, `eventBus`) — handles InMemory ficam confinados a `cli/drivers/memory.ts`. Boundary realmente contido.
- **3 drivers**: `cli/drivers/{memory,sqlite,mysql}.ts`. Memory preserva backward compat (default + state file JSON); SQLite usa `openSqlite()` com `shutdown` fechando a conexão; MySQL é stub que retorna `cli-mysql-driver-not-wired` com exit 70.
- **Parser de flags**: `cli/parse-driver-flags.ts` separa extração sintática (`extractFlags`) de validação semântica (`buildXxxDriver`) — 17 unit tests cobrindo defaults, conflitos cruzados e missing-value.
- **Suite E2E paralela**: `tests/cli/contracts.cli.sqlite.test.ts` roda os mesmos cenários BDD com `--driver sqlite --db <tempfile>`. Paridade real entre InMemory e Drizzle/SQLite forçada pela igualdade de output.
- **7 erros PT-BR** novos no `formatters/error.ts` (cli-driver-*, sqlite-driver-*, cli-mysql-driver-not-wired).
- **6 comandos refatorados** (mecânica `ctx.xxxHandle.repo` → `ctx.xxx`; `ctx.persist()` virou `await`).

### Backward compat

Toda script existente que invoca a CLI sem `--driver` continua funcionando idêntico ao pré-W1: padrão é `--driver memory --state ./cli-state.json`. Suite original `tests/cli/contracts.cli.test.ts` (16 testes) passa sem modificação.

---

## 2026-05-14 — Persistence Strategy doc + ADR-0018 Accepted + ticket CTR-ADAPTER-DRIZZLE-DUAL fechado

### Contexto

A implementação que materializa o ADR-0018 (4 waves do ticket CTR-ADAPTER-DRIZZLE-DUAL) foi entregue: 283 testes verdes, adapter Drizzle/SQLite funcional, schema MySQL stubado, mappers canônicos, migrations versionadas via `drizzle-kit`.

### Adicionado

- [`architecture/06-persistence-strategy.md`](./architecture/06-persistence-strategy.md) — **Guia operacional** da estratégia dual-dialect: mapeamentos canônicos por tipo (`Money`, `Date`, `Period`, IDs, arrays), topologia de execução, build do binário nativo `better-sqlite3` (macOS + Docker), boundary `error → Result`, critérios para re-avaliar.

### Atualizado

- [ADR-0018](./architecture/adr/0018-persistence-dual-dialect-drizzle.md) — Status **Proposed → Accepted**. Clarificação na lista normativa: `drizzle.insert(...).onConflictDoUpdate(...)` é aceito porque o Drizzle traduz para a sintaxe nativa de cada dialeto; o que está proibido é **escrever** `ON DUPLICATE KEY UPDATE` ou `INSERT OR REPLACE` à mão (resolve a NOTE 3 do review W2).
- [`architecture/adr/README.md`](./architecture/adr/README.md) — Status do ADR-0018 atualizado para Accepted.
- [`architecture/README.md`](./architecture/README.md) — Índice ganhou linha 06.

### Notas técnicas (entregas correspondentes em `ERP-CONTRACTS/`)

- `src/modules/contracts/adapters/persistence/` — driver SQLite + 2 schemas espelhados + mappers + repos Drizzle.
- `tests/modules/contracts/adapters/persistence/` — suite de contrato reutilizável (20 cenários) rodando contra InMemory **e** Drizzle/SQLite.
- `drizzle.config.ts` + `pnpm db:generate:sqlite` — migrations versionadas geradas em `src/modules/contracts/adapters/persistence/migrations/sqlite/`.
- `Dockerfile` — estágio `deps` com `python3 + make + g++` para compilar binário nativo `better-sqlite3`.

---

## 2026-05-14 — ADR-0018: Persistência Dual-Dialect (Drizzle MySQL + SQLite)

### Contexto

O módulo `contracts` está pronto no domínio (243 testes verdes) e na CLI MVP, mas ainda usa repositórios InMemory + state file JSON. A infra MySQL prometida pela Codebit ([ADR-0013](./architecture/adr/0013-mysql-database-engine.md)) ainda não foi provisionada, e bloquear a entrega no fornecedor externo seria caro.

A pergunta arquitetural: **como adicionar persistência real sem violar o ADR-0013 (MySQL é a produção) e sem esperar a infra?**

### Adicionado

- [`architecture/adr/0018-persistence-dual-dialect-drizzle.md`](./architecture/adr/0018-persistence-dual-dialect-drizzle.md) — **ADR Proposed** estabelecendo estratégia dual-dialect via Drizzle: MySQL continua sendo produção; SQLite entra **exclusivamente como ambiente de dev/CI** com paridade controlada por disciplina explícita. Princípio condutor: **1 port, 1 repositório, 2 schemas espelhados, 2 mappers, 1 lista canônica de features permitidas.**

### Lista normativa de features SQL (resumo)

| ✅ Permitidas | ❌ Proibidas |
| :--- | :--- |
| DML básico, WHERE/ORDER/LIMIT, INNER/LEFT JOIN, COUNT/SUM/MAX, UNIQUE/INDEX, FKs, transações, CHECK simples | Colunas JSON nativas, `ON DUPLICATE KEY UPDATE`, FULLTEXT, stored procedures, triggers, window functions, CTEs recursivas, ENUM nativo, tipos espaciais, AUTO_INCREMENT, isolation level explícito |

### Mapeamentos canônicos por dialeto

| Tipo de domínio | SQLite | MySQL |
| :--- | :--- | :--- |
| `Money` (cents) | `integer` | `bigint` |
| `Date` (timestamp) | `integer` unix-ms | `datetime(3)` |
| `Period` (Fixed \| Indefinite) | 3 colunas: `period_kind` + `period_start` + `period_end` | Mesma decomposição com `varchar(16)` + `datetime(3)` |
| `AmendmentKind` / `AmendmentStatus` | `text` + CHECK | `varchar(16)` + CHECK |
| `homologatedAmendmentIds` (array) | Tabela de junção | Mesma |

### Atualizado

- [`architecture/adr/README.md`](./architecture/adr/README.md) — Índice de ADRs incrementado com 0018 (Proposed).

### Relação com decisões anteriores

| ADR | Relação |
| :--- | :--- |
| [ADR-0013](./architecture/adr/0013-mysql-database-engine.md) | **Preservado.** MySQL continua sendo o engine de produção. ADR-0018 apenas adiciona SQLite como ambiente paralelo para dev/CI. |
| [ADR-0006](./architecture/adr/0006-modular-monolith-core-api.md) | **Honrado.** A estratégia dual-dialect só é viável porque ports & adapters já isolam domínio do mecanismo de persistência. |
| [ADR-0015](./architecture/adr/0015-mysql-outbox-pattern.md) | **Não afetado.** Outbox vive em MySQL quando a infra subir; SQLite não exercita outbox no dev. |

### Quando re-avaliar

A decisão será revisitada se MySQL gerenciado for provisionado e estabilizado por 3+ meses **e** o esforço de manter SQLite ultrapassar o ganho em velocidade de testes — ou se um requisito de domínio exigir feature da lista proibida.

### Ticket relacionado

- [`ERP-CONTRACTS/.claude/.pipeline/CTR-ADAPTER-DRIZZLE-DUAL/`](../ERP-CONTRACTS/.claude/.pipeline/CTR-ADAPTER-DRIZZLE-DUAL/) — implementação que materializa este ADR (W0 RED a iniciar após aprovação).

---

## 2026-05-14 — Descoberta do schema legado real (Inquiry-0014 + mapeamento de 32 tabelas)

### Contexto

A pasta `DUMP PROD` (compartilhada por Nicole Ruivo / going2 em 2026-04-30) foi colocada localmente em `database/.dump/`. Para atender LGPD (dados pessoais, valores fiscais), foi extraído apenas o schema (`schema-only.sql`, 49KB), descartando os 23 INSERTs do dump original (1.3MB). `.gitignore` criado bloqueando `database/.dump/` por completo. **Nenhum dado pessoal versionado em momento algum.**

A análise sistemática das **32 tabelas** revelou discrepâncias estruturais entre o legado real e o modelo alvo do handbook — registradas como [Inquiry-0014](./inquiries/0014-schema-legado-vs-modelo-alvo.md).

### Adicionado

- [`domain/10-mapeamento-legado-schema.md`](./domain/10-mapeamento-legado-schema.md) — **Documento mestre da descoberta:** inventário das 32 tabelas agrupadas em 7 BCs implícitos do legado (Identity, Financial Core, Chart of Accounts, Budgeting, Contracts, Workflow, Geography), mapeamento legado → módulos alvo, gaps estruturais, achados positivos, recomendações imediatas.
- [Inquiry-0014](./inquiries/0014-schema-legado-vs-modelo-alvo.md) — **Schema legado real vs. modelo alvo:** 4 perguntas para a banca (Q1 chave de correlação, Q2 BC novo de Planejamento Orçamentário, Q3 migração de `contracts`, Q4 primeiro vertical slice), com hipóteses de trabalho do autor para cada.
- [Inquiry-0011 Apêndice D](./inquiries/0011-auditoria-fiscal-cross-periodo.md) — **Achado empírico que muda a base da §7.3:** legado não tem campos NFe (chave 44 dígitos, número documento, série, modelo, CFOP). O conceito de Fato Gerador é adição do modelo alvo, não migração. Hipótese D refinada: tripla simbólica `(id_legado + tipo_origem + createdAt_legado)` + legado preservado read-only.
- `database/.dump/schema-only.sql` — Schema bruto (não versionado, fora do repo).
- `.gitignore` na raiz do projeto bloqueando `database/.dump/`, `node_modules/`, `dist/`, `.env*`.

### Atualizado

- [`architecture/03-data-architecture.md`](./architecture/03-data-architecture.md) §1 e §2 — Nome real do database legado registrado (`abc-erp-financeiro-prod` em Cloud SQL MySQL 8.4.7-google). Collation real confirmada como `utf8mb4_0900_ai_ci` (padrão MySQL 8) — documento já aceitava ambas, agora documenta a realidade.
- [`domain/02-context-map.md`](./domain/02-context-map.md) — Aviso no topo apontando para o gap descoberto (BC de Planejamento Orçamentário ausente).
- [`inquiries/INDEX.md`](./inquiries/INDEX.md) — Total sobe para 14, `Open` sobe para 3 (com 0014).
- [`inquiries/PERGUNTAS-EM-ABERTO.md`](./inquiries/PERGUNTAS-EM-ABERTO.md) — Bloco da Inquiry-0014 adicionado (7 perguntas). Confirmação no bloco da Inquiry-0012 de que `app.setGlobalPrefix('api/v1')` é literalmente uma linha (TypeORM 0.3 + NestJS confirmados via assinatura do schema).
- [`inquiries/0011-auditoria-fiscal-cross-periodo.md`](./inquiries/0011-auditoria-fiscal-cross-periodo.md) — Aviso no topo direcionando o leitor para o Apêndice D antes de deliberar; campo "Last updated: 2026-05-14".

### Confirmações empíricas

| # | Premissa anterior | Realidade no dump |
| :-- | :--- | :--- |
| C1 | Engine real = MySQL 8 ([Inquiry-0010](./inquiries/0010-mysql-engine-correction.md)) | ✅ MySQL **8.4.7-google** (Cloud SQL) — confirma legado em GCP |
| C2 | Charset `utf8mb4` + `utf8mb4_unicode_ci` ou `utf8mb4_0900_ai_ci` | ✅ Real: **`utf8mb4_0900_ai_ci`** |
| C3 | Backend NestJS 10 + TypeORM 0.3 + `mysql2` ([Inquiry-0010](./inquiries/0010-mysql-engine-correction.md)) | ✅ Confirmado via assinatura no schema (FK_hash, tabelas `migrations`, `query-result-cache`) |
| C4 | "Uma linha no main.ts para Hipótese A" ([Inquiry-0012 §6.1](./inquiries/0012-bff-managed-api-gateway-vs-fastify.md)) | ✅ Literal — `app.setGlobalPrefix('api/v1')` no NestJS resolve |

### Achados que mudam o handbook

1. **Não existe documento fiscal modelado no legado.** Sem chave NF-e, sem número de documento original, sem série, sem CFOP. O Fato Gerador do handbook é **nascimento, não migração**. Muda a base do ADR-0017 e da Hipótese D da Inquiry-0011.
2. **Há um BC oculto no legado: Planejamento Orçamentário.** `cost_centers*` + `budget_*` + `programs` + `categorization` (hub com 10 FKs) modelam comportamento sem equivalente em [`domain/02-context-map.md`](./domain/02-context-map.md). Gap de modelagem do handbook.
3. **Cardinalidade modesta.** `accounts.AUTO_INCREMENT ≈ 6`, dump total 1.3MB. Confirma a Hipótese D (Vernon p. 166 + Evans p. 228): construir Reporting DB hoje sem demanda real é prematuro.
4. **Integridade referencial forte.** Todas as FKs presentes e nomeadas pelo TypeORM. Grafo de dependências confiável; ordem de migração derivável diretamente.

### Em aberto

- 🟢 [Inquiry-0014](./inquiries/0014-schema-legado-vs-modelo-alvo.md) permanece com status `Open` — banca interna ainda não deliberou Q1–Q4.
- 🟢 [Inquiry-0011](./inquiries/0011-auditoria-fiscal-cross-periodo.md) tem nova pergunta Q7.7 no Apêndice D (refinamento da Hipótese D na ausência de campos fiscais).
- 🟡 [ADR-0017](./architecture/adr/0017-correlation-keys-cross-period-audit.md) permanece `Proposed`, mas com base empírica revisada — provável revisão/supersede após Q1.
- ⬜ Próximo BC a documentar: `domain/11-planejamento-orcamentario-context.md` (depende de Q2).
- ⬜ Reverse engineering das regras de rateio em `categorization` (depende de acesso ao código fonte do legado pelo `codebit-br` — pendente em [Inquiry-0003 §E18](./inquiries/PERGUNTAS-EM-ABERTO.md)).

### Lição metodológica

A análise de schema **antes** de iniciar a implementação permitiu detectar:
- Confirmações silenciosas de premissas (engine, charset, ORM) — economia de retrabalho.
- Gaps de modelagem do handbook (BC Planejamento Orçamentário) — visíveis só no schema, não nas conversas com P.O.
- Premissas empíricas frágeis em deliberação em curso (Inquiry-0011 §7.3) — corrigidas antes de virar ADR aceito.

Princípio: **ler o schema antes de modelar o agregado**. O domínio fala primeiro, o handbook segue.

---

## 2026-05-07 — Inquiry-0011 fundamentada + ADR-0017 rascunho (auditoria fiscal cross-período)

### Contexto

A revisão `handbook/reviews/0001-revisao-refatoracao-migracao-segura.md` (achado **F1.4 — Lacuna 1**) identificou que o handbook não tratava o cenário de **auditoria fiscal cross-período** — consultas cuja janela atravessa a fronteira temporal entre o legado (CRUD, "título avulso") e o core (Agregado, "Documento Fiscal" como Fato Gerador). A janela de oportunidade para preservar reconciliabilidade futura se fecha quando o desenho de `core.fin_documentos` começar (entrada de M3).

### Adicionado

- [Inquiry-0011](./inquiries/0011-auditoria-fiscal-cross-periodo.md) — **Apêndice C: Fundamentação canônica** com 8 citações literais extraídas em 4 ondas de busca via MCP `acdg-skills`:
  - Fowler/Sadalage, _Refactoring_ p. 68 — Parallel Change / Expand-Contract
  - Newman, _Building Microservices_ p. 115 — Reporting Database + tooling de schema migration
  - Vernon, _IDDD_ p. 712 — Read Model Projections + replay; p. 166 — disciplina arquitetural
  - Evans, _DDD_ p. 228 — Anticorruption Layer + "A Cautionary Tale"
  - **Valente, _Fundamentos de Manutenção de Software_ §8.3.2 (Strangler Fig PT-BR) e §8.4.5 (Particionamento do banco PT-BR)**
- [Inquiry-0011](./inquiries/0011-auditoria-fiscal-cross-periodo.md) — **Apêndice A: Decisão registrada (rascunho do autor)** propondo Hipótese D, com campos da banca em branco até deliberação.
- [ADR-0017](./architecture/adr/0017-correlation-keys-cross-period-audit.md) — **Status `Proposed`** — Chaves de correlação cross-período entre `legacy` e `core`. Decide adicionar 3 colunas (`numero_documento_original_legado`, `id_legado`, `cnpj_emitente`) ao schema de `core.fin_documentos` desde o nascimento, adiando construção de Reporting DB / Read Model CQRS até gatilho explícito.

### Atualizado

- [`architecture/adr/README.md`](./architecture/adr/README.md) — índice de ADRs com entrada do ADR-0017 (Proposed). Note: ADR-0016 segue reservado para "estratégia de implementação dos 2 módulos no `core-api`" conforme pendência registrada no changelog de 2026-04-28; ADR-0017 pulou esse número intencionalmente.

### Justificativa central

A Hipótese D ("adiar com gatilho explícito + chave de correlação preservada hoje") **não é decisão lean fora do corpus** — é aplicação direta de três patterns canônicos:

1. **Mecanismo técnico** — Parallel Change / Expand-Contract (Sadalage citado por Fowler) para adicionar colunas hoje sem reader. Variante "expand-and-preserve" porque retenção fiscal de 5+ anos impede a fase contract.
2. **Disciplina de adiar** — Vernon p. 166: "use them only where applicable, where they mitigate a specific risk that would otherwise increase the potential for project or system failure".
3. **Argumento de fechamento** — Evans p. 228: "integration is always expensive — we should be sure it is really needed".

Valente §8.4.5 (PT-BR) endossa explicitamente combinar estratégias de particionamento; a Hipótese D é uma combinação seletiva de **Banco de Dados Dedicado** (já vigente em ADR-0014) com **replicação seletiva de chaves estáveis** (estratégia 4 de Valente, aplicada a colunas e não a tabelas).

### Em aberto

- 🟢 [Inquiry-0011](./inquiries/0011-auditoria-fiscal-cross-periodo.md) permanece com status `Open` — banca interna de arquitetura ainda não deliberou.
- 🟢 [ADR-0017](./architecture/adr/0017-correlation-keys-cross-period-audit.md) permanece `Proposed` até deliberação da banca.
- ⏳ Validação fiscal direta (Q3 e Q5 do Inquiry-0011) com contabilidade — campos exatos de correlação (chave NF-e 44 dígitos, série, modelo, regime tributário) e latência aceitável para reporting fiscal — fora do escopo do corpus técnico, conforme decisão metodológica registrada na inquiry e na memória do projeto.

### Lição metodológica

Esta inquiry consolidou um padrão de trabalho separando explicitamente:
- **Decisões técnicas/arquiteturais** — buscadas no corpus canônico via MCP `acdg-skills` com regra de citação literal de ≥4 linhas.
- **Decisões fiscais/de negócio** — validadas fora do corpus, diretamente com contabilidade ou especialistas em ERPs de mercado.

Não confundir os dois escopos no mesmo bloco de fundamentação.

---

## 2026-04-28 — Adição do Módulo Contratos ao handbook

### Contexto

Após reorganização da pasta `domain_questions/` por módulo + Bounded Context, ficou explícito que o ERP comporta um **segundo módulo de negócio** ainda não refletido no handbook: **Contratos**. O domínio já estava descoberto e validado com a P.O. (artefatos em [`domain_questions/contratos/`](./domain_questions/contratos/)), mas faltava a propagação para o handbook formal e para os artefatos de arquitetura.

### Adicionado

- **Pasta [`domain/contratos/`](./domain/contratos/)** — módulo Contratos completo no estilo do handbook formal:
  - `README.md` — índice executivo
  - `01-introduction.md` — visão de produto, atores, MVP, KPIs
  - `02-context-map.md` — 4 BCs (Gestão de Contratos, Aditivos, Timeline, Integração Financeira)
  - `03-gestao-contratos-context.md` — BC Core ⭐ (Contrato Mãe + Estado Vigente)
  - `04-aditivos-context.md` — BC Core ⭐ (Acréscimo, Supressão, Prazo, Variado + homologação)
  - `05-timeline-context.md` — BC Supporting (append-only + repositório documental)
  - `06-event-line-context.md` — matriz de eventos interna do módulo
  - `07-external-context.md` — fronteira com Financeiro (ACL), Storage e RBAC
  - `DOCUMENTO_MESTRE.md` — especificação consolidada
- **Reorganização de [`domain_questions/`](./domain_questions/)** — separado por módulo (`contratos/` e `financeiro/`), com BCs em sub-pasta `bounded-contexts/`. Limpeza de rascunhos duplicados (v1 superada por v2, dumps de chat).

### Atualizado

- [`README.md`](./README.md) — visão estratégica passa a apresentar os 2 módulos lado a lado; estado do projeto inclui módulo Contratos; princípios imutáveis separados em "compartilhados", "Financeiro" e "Contratos".
- [`domain/README.md`](./domain/README.md) — vira índice de módulos do ERP, listando Financeiro (raiz, por motivo histórico) e Contratos (sub-pasta).
- [`architecture/02-system-topology.md`](./architecture/02-system-topology.md) — diagrama do `core-api` mostra os 2 módulos hospedados; seção 2.3 explica responsabilidades de cada módulo + princípio "sem cross-write entre módulos".
- [`architecture/03-data-architecture.md`](./architecture/03-data-architecture.md) — nova seção 1.1 "Organização interna do `core` por módulo" com prefixos `fin_*` e `ctr_*`; mesma regra de ouro vale em nível de módulo.
- [`architecture/04-integration-events.md`](./architecture/04-integration-events.md) — catálogo §6 dividido em "cross-serviço (legacy↔core)" e "cross-módulo (Contratos↔Financeiro)"; lista eventos `EstadoContratualAtualizado`, `ContratoEncerrado` etc.

### Justificativa central

- **Por que Modular Monolith e não serviço próprio?** Alinhado com [ADR-0006](./architecture/adr/0006-modular-monolith-core-api.md): tamanho do time, ausência de SRE dedicado e auditoria cross-módulo (Time Travel) tornam a separação física custosa sem benefício proporcional. Caminho de extração futuro preservado pela disciplina do outbox + prefixos de tabela.
- **Por que outbox mesmo intra-processo?** Atomicidade transacional, auditoria gratuita, e o módulo já nasce com o "passaporte" pronto caso vire serviço próprio depois.
- **Por que `domain/` ficou assimétrico (Financeiro flat + Contratos em sub-pasta)?** Mover Financeiro para `domain/financeiro/` exigiria atualizar links em ADRs aceitos (imutáveis) — ADRs 0001, 0006, 0008. Uniformização futura cabe em ADR próprio.

### Pendência

- ⏳ ADR formal sobre estratégia de implementação dos 2 módulos no `core-api` (prefixos `fin_*` / `ctr_*`, comunicação via outbox in-process) — bom candidato a **ADR-0016**.
- ⏳ Inquiry sobre ordem de ataque entre módulos (Bradesco/Financeiro primeiro vs primeiro BC do Contratos em paralelo) — após retomada com a P.O.

---

## 2026-04-28 — CORREÇÃO CRÍTICA: Engine de banco é MySQL, não PostgreSQL

### Contexto

Em revisão crítica iniciada por questionamento direto, descobriu-se que toda a fase de modelagem inicial (ADRs 0001-0012) partiu da assunção incorreta de que o engine de banco era PostgreSQL. O engine real é **MySQL 8**, conforme `legacy_project/package.json` e `legacy_project/CLAUDE.md`.

A decisão consciente foi **manter MySQL** em ambos legado e core-api novo (não migrar para PostgreSQL), respeitando ADR-0001 (Strangler Fig — uma briga de cada vez).

### Adicionado

- [ADR-0013](./architecture/adr/0013-mysql-database-engine.md): Engine de Banco de Dados — MySQL 8 (correção de assunção).
- [ADR-0014](./architecture/adr/0014-mysql-database-isolation.md): Isolamento por Database em MySQL — supersedes ADR-0003.
- [ADR-0015](./architecture/adr/0015-mysql-outbox-pattern.md): MySQL Outbox Pattern — supersedes ADR-0004.
- [Inquiry-0010](./inquiries/0010-mysql-engine-correction.md): Documentação completa da correção (incluindo lição aprendida).

### Atualizado / Superseded

- [ADR-0003](./architecture/adr/0003-shared-db-isolated-schemas.md): status `Accepted` → `Superseded by ADR-0014`. Conteúdo mantido como evidência histórica.
- [ADR-0004](./architecture/adr/0004-postgres-outbox-pattern.md): status `Accepted` → `Superseded by ADR-0015`. Conteúdo mantido como evidência histórica.
- [ADR-0008](./architecture/adr/0008-bradesco-integration-architecture.md): mantido (conteúdo arquitetural válido); referência ao driver `pg` deve ser lida como `mysql2`.
- [Inquiry-0008](./inquiries/0008-postgres-driver-pg-vs-postgres.md): marcada como **OBSOLETA** (driver real é `mysql2`).
- `architecture/02-system-topology.md`: diagrama atualizado para MySQL com databases isolados.
- `architecture/03-data-architecture.md`: reescrito para sintaxe MySQL (DDL, charset utf8mb4, tipos).
- `architecture/04-integration-events.md`: outbox em MySQL (CHAR(36), JSON, índice composto, sem LISTEN/NOTIFY).
- `infrastructure/01-infra-handoff.md`: provisionamento MySQL com utf8mb4; carga via `mysqldump`.
- `infrastructure/03-secrets-catalog.md`: formato `DATABASE_URL` para MySQL.
- `infrastructure/04-observability-baseline.md`: auditoria via plugin MySQL em vez de pgaudit.
- ADR README: índice atualizado com novos ADRs e supersede status.

### Justificativa central

Manter MySQL é a decisão certa porque:
1. **ADR-0001 (Strangler Fig)** alerta contra batalhas simultâneas. Trocar engine no meio da migração é exatamente esse tipo de risco.
2. Não há requisito de domínio que MySQL 8 não atenda.
3. Conversão MySQL → PostgreSQL adiciona projeto à parte com risco de bugs sutis em queries financeiras.
4. Time + Codebit já operam MySQL.
5. Drizzle ORM funciona com `drizzle-orm/mysql2`.

### Lição aprendida

Validar premissas técnicas fundamentais com o **código real** logo no início da modelagem. `package.json` do legado deveria ter sido lido antes do primeiro ADR sobre persistência. Custo da correção foi baixo porque foi pega cedo (antes de implementação real).

### Pendência

- ⏳ Atualizar versão do ticket da Codebit (preparada anteriormente) antes de enviar — trocar PostgreSQL por MySQL 8 e remover seção sobre conversão MySQL → PostgreSQL.

---

## 2026-04-28 — Documentação completa do plano + sistema de Inquiries

### Adicionado

#### Pasta `inquiries/` — log de chamadas, dúvidas e decisões
- README explicando uso da nova pasta como trilha de auditoria do raciocínio.
- `_template.md` para padronizar registro.
- `INDEX.md` com status de todas as inquiries (filtros por status e tema).
- 9 inquiries históricas documentando o raciocínio de cada decisão arquitetural relevante:
  - [Inquiry-0001](./inquiries/0001-modular-monolith-vs-microservices.md): Modular Monolith vs Microservices.
  - [Inquiry-0002](./inquiries/0002-bradesco-van-architecture.md): Arquitetura Bradesco (VAN + REST).
  - [Inquiry-0003](./inquiries/0003-multi-cloud-strategy.md): Multi-cloud (Pending Response — bloqueado pela Codebit).
  - [Inquiry-0004](./inquiries/0004-node-version-and-typescript-future.md): Node 24 + TypeScript 7.0.
  - [Inquiry-0005](./inquiries/0005-supply-chain-axios-and-dependency-hardening.md): Supply chain Axios + hardening.
  - [Inquiry-0006](./inquiries/0006-package-manager-pnpm-vs-bun.md): pnpm vs Bun.
  - [Inquiry-0007](./inquiries/0007-http-framework-fastify-vs-express.md): Fastify vs Express.
  - [Inquiry-0008](./inquiries/0008-postgres-driver-pg-vs-postgres.md): Driver Postgres `pg` vs `postgres`.
  - [Inquiry-0009](./inquiries/0009-email-strategy-nodemailer-with-adapter.md): Email — Nodemailer + Adapter.

#### 6 ADRs novos
- [ADR-0007](./architecture/adr/0007-multi-cloud-aws-gcp.md): Topologia multi-cloud AWS + GCP (status **Proposed**, aguarda Codebit).
- [ADR-0008](./architecture/adr/0008-bradesco-integration-architecture.md): Arquitetura da integração Bradesco (REST + VAN/STCPCLT).
- [ADR-0009](./architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md): Node 24 LTS + TypeScript 6 com plano para 7.0 (`supersedes` parcial do ADR-0002).
- [ADR-0010](./architecture/adr/0010-email-port-adapter-pattern.md): Email — Port & Adapter Pattern com Nodemailer.
- [ADR-0011](./architecture/adr/0011-supply-chain-hardening.md): Política de Supply Chain Hardening.
- [ADR-0012](./architecture/adr/0012-pnpm-package-manager.md): pnpm como package manager único.

### Justificativas centrais agregadas

- **Modular Monolith** alinhado a invariantes cross-BC do handbook (R3 Sincronia, R3 Reabertura, R8 Integridade, Auditoria Shared Kernel, Time Travel cross-BC).
- **Bradesco com 2 caminhos físicos** (REST API mTLS + VAN/SSH/STCPCLT) confirmado em e-mail com Cadu (Going2) — implicação operacional para infra (Windows VM).
- **Multi-cloud AWS + GCP** inferido de duas fontes independentes (e-mail Cadu + ticket SGM #95026 Codebit) — pendente confirmação formal.
- **Node 24 LTS** substitui Node 20 EOL este mês; TypeScript 7.0 Beta lançado em 21/abril/2026 com compilador em Go.
- **Axios proibido** após incidente de supply chain de 31/março/2026 (CISA alerta de 20/abril/2026).
- **pnpm** mantido como única escolha; Bun rejeitado por gaps de segurança (sem audit, sem assinatura, lockfile binário).
- **Nodemailer** mantido pelo custo zero, encapsulado em port pra futura troca trivial.

### Em aberto

- 🟡 [Inquiry-0003](./inquiries/0003-multi-cloud-strategy.md): aguardando respostas da Codebit (bloqueia provisionamento de infra).
- 🟡 [ADR-0007](./architecture/adr/0007-multi-cloud-aws-gcp.md): em status `Proposed` até confirmação.

---

## 2026-04-27 — Atualização

### Adicionado
- [ADR-0006](./architecture/adr/0006-modular-monolith-core-api.md): Modular Monolith para o `core-api` (granularidade de serviço). Decisão tomada após análise convergente entre revisão própria do handbook e validação cruzada com fonte externa de literatura arquitetural. Os 4 BCs do handbook (Documentos, Títulos, Bradesco, OCR) ficam como módulos internos em um único deployable (`apps/core-api/src/contexts/`), com fronteiras lógicas garantidas via ESLint + ports/adapters + eventos in-process.

### Justificativa central
- Invariantes cross-BC do handbook (R3 Sincronia, R3 Reabertura, R8 Integridade de Imposto, Auditoria Shared Kernel, Time Travel cross-BC) tornam a separação física entre BCs operacionalmente cara sem benefício proporcional.
- Tamanho do time, volume de dados e ausência de SRE dedicado não justificam a complexidade de microservices.
- Caminho de extração futuro preservado: se sinais aparecerem (event loop starvation no OCR, escala assimétrica, time crescer para 10+ devs com squads dedicadas), extrair `bank-ocr-api` é movimento de dias, não meses.

---

## 2026-04-27 — Estrutura inicial

### Adicionado
- Estrutura inicial do handbook em pastas: `domain/`, `architecture/`, `architecture/adr/`, `infrastructure/`, `operations/`.
- README mestre na raiz como ponto de entrada único de toda a documentação.
- Seção `architecture/` com 5 documentos descrevendo **como** o sistema é construído.
- Seção `architecture/adr/` com 5 ADRs documentando as decisões fundamentais da migração.
- Seção `infrastructure/` com handoff completo para o time de plataforma e baseline de observabilidade.
- Seção `operations/` (placeholder) para receber runbooks e post-mortems futuros.
- Este `CHANGELOG.md`.

### Movido
- Documentos de domínio (`01-introduction.md` a `09-status-maquina-estados.md`, `DOCUMENTO_MESTRE.md`) movidos da raiz do handbook para `domain/`.
- `00-README.md` antigo renomeado para `domain/README.md` (índice da seção de domínio).

### ADRs registrados
- [ADR-0001](./architecture/adr/0001-strangler-fig-over-rewrite.md): Estratégia Strangler Fig sobre rewrite ou refactor in-place.
- [ADR-0002](./architecture/adr/0002-keep-nodejs-runtime.md): Manutenção do runtime Node.js nesta fase de migração.
- [ADR-0003](./architecture/adr/0003-shared-db-isolated-schemas.md): Banco compartilhado com schemas isolados.
- [ADR-0004](./architecture/adr/0004-postgres-outbox-pattern.md): Postgres Outbox como mecanismo inicial de eventos.
- [ADR-0005](./architecture/adr/0005-thin-bff-gateway.md): BFF Gateway burro (apenas roteamento).

---

> Toda mudança relevante no handbook deve gerar uma entrada nova aqui, com a data no topo.
