# Code Review W2 — CTR-DB-MIGRATION-MYSQL — Round 1

**Veredito:** APPROVED
**Reviewer:** maestro:code-reviewer (output entregue como mensagem ao parent; persistido neste arquivo a partir do retorno textual do agent)
**Data:** 2026-05-15
**Escopo (8 arquivos avaliados):**
1. `drizzle.mysql.config.ts`
2. `package.json`
3. `tsconfig.json`
4. `src/modules/contracts/adapters/persistence/migrations/mysql/0000_lyrical_machine_man.sql`
5. `src/modules/contracts/adapters/persistence/schemas/mysql.ts`
6. `tests/modules/contracts/adapters/persistence/migrations/mysql.test.ts`
7. `.claude/.pipeline/CTR-DB-MIGRATION-MYSQL/000-request.md`
8. `.claude/.pipeline/CTR-DB-MIGRATION-MYSQL/003-impl/REPORT.md`

---

## Checagens críticas do foco do review

| # | Checagem | Veredito | Ancoragem |
| :-- | :-- | :-: | :-- |
| 1a | F-L1 bicondicional preservado no SQL? | PASS | `0000_lyrical_machine_man.sql:54` ↔ `schemas/mysql.ts:75-78` |
| 1b | F-L2 implicação preservada no SQL? | PASS | `0000_lyrical_machine_man.sql:17-24` ↔ `schemas/mysql.ts:116-126` |
| 1c | Semântica MySQL 8.4 de `=` entre booleans = bicondicional? | PASS | MySQL Refman §12.4.2: `=` é binary comparison; ambos lados retornam INT(0\|1), nunca NULL aqui (`IS NOT NULL` e `IN (...)` sobre coluna NOT NULL produzem 0/1) |
| 2a | `ON DELETE no action ON UPDATE no action` válido em MySQL 8.4? | PASS | MySQL Refman §13.1.20.5: parser MySQL é case-insensitive para reserved actions; `no action` ≡ `NO ACTION` |
| 2b | `NO ACTION` ≡ `RESTRICT` em InnoDB? | PASS | MySQL Refman §13.1.20.5 explícito: "NO ACTION: A keyword from standard SQL. In MySQL, equivalent to RESTRICT." |
| 2c | Risco de cascade ou orphan acidental? | PASS | Não. Default conservador rejeita DELETE de pai com filho; aceitável dado que o domínio não expõe DELETE em status terminal |
| 3 | PK composta via `CONSTRAINT pk PRIMARY KEY(...)` ≡ inline? | PASS | InnoDB: PK clustering idêntica; rowid hidden idêntica. Só o nome da constraint muda (visível em INFORMATION_SCHEMA) |
| 4 | UNIQUE como `CONSTRAINT ... UNIQUE(...)` separada ≡ modifier inline? | PASS | InnoDB cria mesmo unique secondary index com B-tree; difere só pelo nome (`ctr_contracts_sequential_number_unique` vs default `sequential_number`) |
| 5a | Está claro qual config invocar? | PASS | Header de `drizzle.mysql.config.ts:3-20` é explícito; `db:generate:sqlite` e `db:generate:mysql` segregados em `package.json:22-23` |
| 5b | Comentário do config menciona que o wiring runtime fica pro #4? | PASS | `drizzle.mysql.config.ts:15-18` é explícito |
| 5c | CA-10..14 reservados pro W3 são aceitáveis em W2? | PASS (com nota em Suggestions) | Validação estrutural via regex é defensável neste ticket; a funcional é parte explícita do W3 conforme `000-request.md` Plano de Waves |
| 5d | Suggestion #1 do W2 do #2 absorvida? | PASS | Coberta por CA-13 (F-L1 reject) e CA-14 (F-L2 reject) — testa runtime, não só declaração |

---

## Issues encontradas

### 🔴 Critical

Nenhuma.

Trace completa:

- **F-L1 (`(ended_at IS NOT NULL) = (status IN ('Expired','Terminated'))`)**: `status` é `NOT NULL` → `status IN (...)` nunca produz UNKNOWN/NULL, sempre 0 ou 1. Lado esquerdo `IS NOT NULL` também é estritamente boolean 0/1. Comparação `=` entre dois ints 0/1 é exatamente `XNOR` = bicondicional. Tabela verdade:
  - `status='Active', endedAt=NULL` → `(0)=(0)` → 1 ✔
  - `status='Active', endedAt=NOW` → `(1)=(0)` → 0 — rejeitado ✔
  - `status='Expired', endedAt=NOW` → `(1)=(1)` → 1 ✔
  - `status='Expired', endedAt=NULL` → `(0)=(1)` → 0 — rejeitado ✔
  Bate com `contract.ts:78-95` (`expire` popula `endedAt`) e `contract.ts:108-117` (`terminate` popula `endedAt`).
- **F-L2 (`status <> 'Homologated' OR (homologated_at IS NOT NULL AND ...)`)**: forma `(NOT P) OR Q` ≡ `P → Q`. Como `status` é NOT NULL, o operando esquerdo nunca é NULL; o operando direito é conjunção de `IS NOT NULL` (sempre 0/1). Trivalent-logic-safe.
- **Parênteses no SQL emitido**: drizzle empacotou os literais TS no SQL sem reordenar. Newlines internas em F-L2 são whitespace dentro do CHECK, semanticamente irrelevantes.

### 🟡 Important

Nenhuma.

### 🔵 Suggestions

- **S-1.** `assert.fail('docker compose não disponível')` em CA-10..14 (`mysql.test.ts:257, 262, 282, 307, 327`) vai falhar o suite em qualquer máquina sem Docker daemon. O W3 do ticket precisa: (a) trocar para `t.skip()` (recomendado para tornar o test resiliente), ou (b) confiar que o W3 sempre roda com `docker compose up`. **Não-blocker** porque o request §"Plano de Waves" reserva CA-10..14 ao W3 explicitamente.
- **S-2.** `tsconfig.json:33` adiciona `drizzle.mysql.config.ts` apenas para satisfazer `typescript-eslint` project-service. Alternativa mais limpa seria `tsconfig.eslint.json` separado, mas é cosmético — refactor não justifica o ruído.
- **S-3.** Nome aleatório do arquivo de migration (`0000_lyrical_machine_man.sql`) é heurística do drizzle-kit; `meta/_journal.json:9` referencia esse `tag` literal. Renomear quebraria o journal. **Manter.**
- **S-4.** `meta/0000_snapshot.json` e `meta/_journal.json` foram commitados — comportamento **esperado** pelo drizzle-kit; baseline para diff na próxima migration. Confirmado correto.
- **S-5.** Forma `(A) = (B)` em F-L1 requer leitura cuidadosa para reviewer humano sem contexto de trivalent-logic. `schemas/mysql.ts:70-74` já documenta o trade-off. **Sem ação.**
- **S-6.** Helper `dockerExecRoot` constrói SQL via shell interpolation (`mysql -e "${escapedSql}"`). Escapeação `replace(/"/g, '\\"')` cobre happy case mas é frágil para `$`, backticks, semicolons em `bash -c`. Risco baixo aqui (SQLs literais controlados, sem input externo), mas se for reutilizado fora do arquivo vira gotcha. Documentar no helper ou usar heredoc seria mais defensivo.

---

## O que está bom

- **Bicondicional F-L1 preservada literalmente** do TS para o SQL — drizzle não reordenou nem reduziu a expressão; o `sql\`...\`` template é repassado byte-a-byte.
- **Naming hierárquico `ctr_*_*_chk`** consistente em todas as 7 constraints — visível em CA-12 (INFORMATION_SCHEMA.CHECK_CONSTRAINTS) sem ambiguidade.
- **CA-13 e CA-14** absorveram corretamente a Suggestion #1 do W2 do ticket #2 — agora há prova **runtime** de que o MySQL rejeita rows que violam F-L1 e F-L2.
- **Convivência SQLite/MySQL impecavelmente isolada**: dois configs separados, dois scripts separados, dois diretórios de migration separados.
- **Header de `drizzle.mysql.config.ts:1-20`** é exemplar — explicita o ticket, o ADR, o ticket sucessor (#4) que vai wirar o runtime, e o (#5) que vai unificar.
- **`drizzle-kit` versão pinada** (`^0.31.10`) garante reprodutibilidade da geração.
- **Fallback path em `findMigrationFile`** (`mysql.test.ts:60-67`) — usa glob por `0000_*.sql`, não hardcoda o nome aleatório. Robusto a re-geração.

---

## Próximo passo

**APPROVED → seguir para W3 (`ts-quality-checker`).**

W3 deve:
1. Rodar `pnpm run typecheck` + `pnpm run format:check` + `pnpm run lint` + `pnpm test` (gates do `CLAUDE.md` §Comandos).
2. **Exercitar CA-10..14** com Docker daemon up — primeira oportunidade real do pipeline de validar os CHECKs em runtime contra MySQL 8.4.
3. Se algum CA-10..14 falhar, retornar para `database-engineer` (não para o code-reviewer) — seria evidência de drift entre o SQL declarado e o MySQL real, não issue de review.

Nenhum file:line precisa ser modificado antes do W3.

---

## Tickets/follow-ups gerados

Nenhum bloqueante. Possíveis follow-ups (não-acionáveis neste ticket):

- **S-1** (skip vs fail em CA-10..14 sem Docker): considerar em `CTR-DB-DRIVER-MYSQL` (#4) ou em ticket dedicado de "test infra harness".
- **Cascade explícito em FKs**: `ON DELETE no action` é equivalente a `RESTRICT` por padrão; revisão fica para `CTR-DB-DOMAIN-INVARIANTS` se vier necessidade.
- **S-6** (escape do helper `dockerExecRoot`): se o helper for promovido a util compartilhado, hardear via heredoc.
