# Code Review — Ticket PAR-COLLAB-FOODCAT-LENGTH — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (W2, read-only)
**Data:** 2026-06-30
**Issue:** #274 · Módulo `partners` · Size **S** · Branch `fix/274-collaborator-food-category-length`

**Escopo revisado (diff da working tree — W1 não commitado):**

- `src/modules/partners/adapters/persistence/schemas/mysql.ts:184-185` (`food_category` varchar(20)→varchar(30))
- `src/modules/partners/adapters/persistence/migrations/mysql/0017_perpetual_iceman.sql` (ALTER + comentário)
- `src/modules/partners/adapters/persistence/migrations/mysql/meta/_journal.json` (entrada idx 17)
- `src/modules/partners/adapters/persistence/migrations/mysql/meta/0017_snapshot.json` (gerado)
- `tests/modules/partners/adapters/persistence/collaborator-food-category-length.drizzle-mysql.test.ts` (W0)

Referência cruzada lida: `food-category.ts` (domínio), schema irmãs `gender_identity/race/education`,
sibling `outbox-repository.drizzle-mysql.test.ts`, ADR-0018/0020 (via `.claude/rules/adapters.md`).

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

#### Issue 1 — `tests/modules/partners/adapters/persistence/collaborator-food-category-length.drizzle-mysql.test.ts:18-21`

**Categoria:** H (tests) — documentação desatualizada, sem efeito no comportamento.
**Problema:** o docblock do teste (escrito na W0) ainda anuncia o fix como
`ALTER TABLE par_collaborators MODIFY food_category varchar(30) ALGORITHM=INPLACE, LOCK=NONE;`
citando "MySQL Refman 8.4 p.3141 — widening ≤255 bytes é in-place/online/prod-safe".
Essa premissa foi **empiricamente refutada na VM (MySQL 8.4.9)** durante a W1: `ALGORITHM=INPLACE`
e `ALGORITHM=INSTANT` retornam `ERROR 1845`; a migration entregue é **sem hint** (`0017_perpetual_iceman.sql:14`).
O comentário do teste passou a contradizer tanto a migration quanto a própria lição registrada no
`003-impl/REPORT.md`. Não altera o teste (o corpo só valida o round-trip), mas propaga uma afirmação
incorreta.
**Esperado:** alinhar o docblock à realidade hint-less.
**Fix sugerido (W1, fora deste round — read-only):**

```ts
 * O teste passará após W1:
 *   ALTER TABLE par_collaborators MODIFY food_category varchar(30);  // sem hint de ALGORITHM
 *   (MySQL 8.4.9 real recusa INPLACE/INSTANT → ERROR 1845; o servidor usa COPY. Tabela pequena.)
```

---

## Conformidade (5 itens do checklist)

### 1. Schema / ADR-0018 / ADR-0020 — ✅ Conforme

- `food_category` agora `varchar(30)` (`schemas/mysql.ts:185`), comporta o maior literal de
  `FoodCategory` — `PREFIRO_NAO_RESPONDER` = **21 chars** (`food-category.ts:12`; demais valores
  `PESCETARIANO`=12, `VEGETARIANO`=11, `ONIVORO`=7, `OUTRO`=5) — com folga de 9 chars.
- Alinhado às irmãs enum-like `gender_identity`/`race`/`education`, todas `varchar(30)`
  (`schemas/mysql.ts:181-183`).
- **Sem `ENUM` nativo** e **sem `CHECK`** — coerente com ADR-0020 (ENUM proibido) e com a decisão
  explícita do módulo: o comentário do schema (`mysql.ts:158-163`) diz que estes campos são
  "varchar livre, sem CHECK de enum, igual service_category". Adicionar CHECK aqui seria
  inconsistente (anti-padrão YAGNI). Correto **não** introduzir.
- ADR-0018: enum legado persistido como `varchar` literal — mapeamento canônico respeitado.

### 2. Migration — ✅ Conforme

- `0017_perpetual_iceman.sql:14`: único statement `ALTER TABLE par_collaborators MODIFY COLUMN food_category varchar(30);`,
  **sem hint de ALGORITHM** — decisão correta e prod-safe dado o achado empírico (8.4.9 recusa
  INSTANT/INPLACE → 1845; sem hint o servidor escolhe COPY e funciona). Validado na VM com dump de
  prod (`003-impl/REPORT.md`: quarentena 5→0).
- Comentário (`:5-13`) documenta o achado e **recomenda pt-osc/gh-ost para tabelas grandes** — ótimo
  registro operacional. A nota de bytes ("20→30 = 80→120 bytes utf8mb4, ≤255 → mesmo length-byte") é
  tecnicamente correta (prefixo de comprimento de 1 byte em ambos; widening não trunca).
- **Gerada por `db:generate`** (não SQL à mão): `_journal.json` ganhou só a entrada idx 17
  (`0017_perpetual_iceman`) e `0017_snapshot.json` tem como **único delta** de coluna
  `food_category` `varchar(20)`→`varchar(30)` (mais id/prevId) — `diff 0016↔0017` limpo.
- `MODIFY` preserva nullability (coluna segue nullable, sem `NOT NULL`/`DEFAULT` espúrios) —
  fiel ao `$inferSelect`. Único ALTER, só a coluna certa.
- Migration com bloco de comentário `--` segue o padrão estabelecido do módulo (cf. `0008`, `0016`);
  statement único → sem `--> statement-breakpoint` necessário.

### 3. Teste — ✅ Conforme

- **CA1** coberto: `save` + `findById` round-trip com `foodCategory='PREFIRO_NAO_RESPONDER'`, assertando
  `isOk` e que o valor sobrevive sem truncamento + `registrationStatus==='Complete'` (`:127-159`).
  CA2 (capacidade do literal de 21) fica implícito no CA1.
- **CA3** coberto: guarda de regressão com valor curto `'VEGETARIANO'` permanecendo íntegro (`:168-194`).
- **Gating** por `MYSQL_INTEGRATION=1` (`:42,96`) — espelha fielmente o sibling
  `outbox-repository.drizzle-mysql.test.ts` (mesmo `VALID_CONN`, `integrationEnabled()`,
  `before/after/beforeEach`, `applyMigrations: true`).
- Higiene TS moderna: **sem `any`**; `import type`/inline `type PartnersMysqlHandle` (`:37`);
  todos os imports com extensão `.ts` + subpath `#src/*`; UUID real via `CollaboratorId.generate()`
  (não `'fake-id'`); estrutura AAA (fixtures `buildBase`/`completeWithFoodCategory` = Arrange,
  `repo.save` = Act, asserts = Assert). Fakes injetáveis (`ClockFixed`).
- CA4 (re-rodar ETL) é E2E na VM — corretamente fora do escopo do teste de integração e validado no
  REPORT.

### 4. Escopo / YAGNI — ✅ Conforme

- A working tree confirma: **apenas** `food_category` alterada (uma linha em `schemas/mysql.ts` +
  entrada no journal + nova migration/snapshot/teste). Nenhuma outra coluna, CHECK, índice ou regra
  tocada. Fix proporcional a um ticket **S**.

### 5. Anti-padrões do AGENTS.md — ✅ Nenhum presente

- #3 (pular waves): há W0 RED, W1 GREEN, este é W2 — fail-first respeitado.
- #4 (misturar módulos): só `par_*` tocado; sem `ctr_*`/`fin_*`.
- #6 (código não-trivial sem ticket): ticket `PAR-COLLAB-FOODCAT-LENGTH` existe com `000-request.md`.
- #8/#9 (import sem `.ts` / tipo sem `type`): não ocorrem.
- #10 (`npm`): ausente.

---

## O que está bom

- **Disciplina de migração validada empiricamente**: a equipe não confiou só na Table 17.17 do Refman;
  validou o ALTER no MySQL 8.4.9 real, descobriu o `ERROR 1845` e ajustou para a migration sem hint —
  exatamente a postura "validar o ALTER no banco real" que o ticket exigia. O comentário da migration
  deixa o achado e a recomendação pt-osc/gh-ost rastreáveis.
- **Consistência de schema**: alinhar com as três colunas irmãs (`varchar(30)`) em vez de escolher um
  número arbitrário (ex.: `varchar(21)`) torna o modelo uniforme e à prova de novos literais.
- **Geração correta dos artefatos Drizzle**: snapshot/journal coerentes com a mudança, sem ruído.
- **Teste enxuto e fiel ao padrão do módulo**, cobrindo o caso de borda (21 chars) e a regressão (valor curto).

---

## Próximo passo

- **APPROVED** → pipeline-maestro avança para **W3** (`typecheck` + `format:check` + `lint` + `test`;
  + `test:integration:partners` cobrindo CA1/CA3; validação E2E na VM já registrada no W1 REPORT).
- Issue 1 (🔵) é opcional e **não bloqueia**: se a W1 for reaberta por outro motivo, alinhar o docblock
  do teste (`:18-21`) à migration hint-less. Caso contrário, pode seguir como nota.
