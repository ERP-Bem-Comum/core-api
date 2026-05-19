# W2 — Code Review read-only

> **Reviewer:** orquestrador `pipeline-maestro` aplicando protocolo `code-reviewer`.
> **Round:** 1.
> **Veredito:** **APPROVED.**

---

## 1. Conformidade com `CLAUDE.md` raiz + ADRs

| # | Regra | Verificação | Status |
| :-- | :-- | :-- | :-- |
| 1 | §Hierarquia: ADR vence audit | ADR-0014 `utf8mb4_unicode_ci` aplicado em vez do `utf8mb4_0900_ai_ci` do audit | ✅ |
| 2 | §Adapter: ports tipados implementados | `ContractRepository` e `AmendmentRepository` continuam tipados | ✅ |
| 3 | §Domínio puro: sem `class`, `this`, `throw` no domínio | refactor é todo no adapter; nada cruza para domain | ✅ |
| 4 | §Sintaxe: `import type`, extensões `.ts` | preservados | ✅ |
| 5 | §Pipeline W0→W3 | estrutura completa em `.claude/.pipeline/CTR-DB-SCHEMA-HARDENING/` | ✅ |
| 6 | ADR-0020 §SQL permitido | `ENGINE=InnoDB`, `CHARSET=utf8mb4`, `COLLATE=*`, `FOREIGN KEY`, `CHECK`, `INDEX`, `varchar/bigint/datetime` — todos no allow-list. `.for('update')` gera `SELECT ... FOR UPDATE` (Refman §15.7) — primitiva InnoDB padrão. | ✅ |
| 7 | ADR-0020 §SQL proibido | zero JSON nativo, zero ENUM, zero stored proc/trigger, zero AUTO_INCREMENT, zero isolation level explícito | ✅ |

---

## 2. Inspeção sub-item por sub-item

### 2.1 M1 — charset/collate por tabela

#### `0000_*.sql`

```sql
CREATE TABLE `ctr_amendments` (
  `id` varchar(36) NOT NULL COLLATE utf8mb4_bin,
  `contract_id` varchar(36) NOT NULL COLLATE utf8mb4_bin,
  ...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- **Sintaxe MySQL 8.4**: `ENGINE=InnoDB DEFAULT CHARSET=... COLLATE=...` na cláusula de table options é canônico (Refman §13.1.20.1 *CREATE TABLE Options*). ✓
- **Coluna `COLLATE utf8mb4_bin`** após `NOT NULL`: ordem aceita pelo parser (`column_definition` allows `COLLATE` em qualquer posição entre tipo e constraint). ✓
- **Consistência FK**: ambos lados (`ctr_contracts.id` e `ctr_amendments.contract_id`) declarados em `utf8mb4_bin`. ADD CONSTRAINT na linha 57 não vai rejeitar com erro 3780/3784. ✓
- **Junction**: `contract_id` e `amendment_id` também em `utf8mb4_bin`, casando os referenciados. ✓

#### `schemas/mysql.ts`

- Header reescrito documenta exaustivamente:
  - **Por quê**: drizzle-orm 0.45.x não expõe `charset`/`collate` table-level.
  - **Como**: SQL manual na migration 0000.
  - **Responsabilidade**: dev futuro precisa replicar em migrations novas.
  - Mensagem clara o suficiente para CR de PR futuro pegar.

- **Inquiry implícita**: anotar em `handbook/inquiries/` "quando drizzle-orm suportar charset/collate por tabela, migrar a definição do SQL manual para o schema TS" — não é bloqueante.

#### Risco: regeneração de migration via `drizzle-kit generate`

Se alguém rodar `pnpm run db:generate` com o schema TS atual + um campo novo, vai emitir uma `0001_*.sql` SEM `ENGINE=...COLLATE=...`. O comentário no header do `mysql.ts` alerta. Os testes CA-15/CA-16 cobrem `0000_*.sql` especificamente; **um teste para `0001+` precisa ser adicionado quando ele existir**. Anotado em "Sugestões".

### 2.2 M3 — `.for('update')` em SELECT pré-upsert

#### `contract-repository.drizzle.ts` (linha 66-72)

```ts
const existing = await tx
  .select({ id: schema.contracts.id })
  .from(schema.contracts)
  .where(eq(schema.contracts.id, row.id))
  .for('update');
```

- **Drizzle API**: `.for('update'|'share', config?)` confirmada em `node_modules/.pnpm/drizzle-orm@0.45.2/.../mysql-core/query-builders/select.d.ts:64,67`. ✓
- **Gera SQL**: `SELECT ... FOR UPDATE`. Refman §15.7.2.4 *Locking Reads* — adquire **next-key lock** se a row existe, **gap lock** se ausente.
- **Dentro de `db.transaction`**: ✓ — `FOR UPDATE` fora de transação é no-op em MySQL (auto-commit anula).
- **Comentário inline cita audit §M3 + Refman**: ✓.

#### `amendment-repository.drizzle.ts` (linha 60-64)

- Idêntica estrutura. ✓
- Comentário menciona "gap/next-key lock" e "Refman §15.7". ✓

#### Análise de risco

| Cenário | Comportamento |
| :-- | :-- |
| 1 tx, row existe | `FOR UPDATE` no-op em isolation REPEATABLE READ (default); UPDATE prossegue. |
| 1 tx, row ausente | Gap lock no PK; INSERT prossegue. |
| 2 tx concorrentes, mesmo ID, row ausente | Tx A pega gap lock; Tx B aguarda. Tx A INSERT + commit; Tx B re-SELECT (vê row); cai no UPDATE branch. **Sem ER_DUP_ENTRY falso.** ✅ Audit §M3 endereçado. |
| 2 tx, IDs distintos, mas mesmo `sequential_number` (contract) | Tx A INSERT/UPDATE com sequential_number; Tx B tenta INSERT — bate em UNIQUE secundária → ER_DUP_ENTRY real. `safe()` traduz para `*-repo-unavailable`. Sinal correto (corrida real). ✅ |
| Deadlock cíclico | MySQL detecta + mata uma; `safe()` traduz. Sinal correto. ✅ |

### 2.3 M6 — comentário SQLite

`money.mapper.ts` ANTES:
```ts
// SQLite: `integer` 8-byte (até 2^63-1, mais que suficiente para `MAX_SAFE_INTEGER`).
// MySQL: `bigint`. Em ambos os casos o valor cabe em `number` no JS desde que
// `Money.fromCents` honre `<= MAX_SAFE_INTEGER` (validado no smart constructor).
```

DEPOIS:
```ts
// MySQL: `bigint` (8-byte). `Money.fromCents` honra `<= MAX_SAFE_INTEGER` no
// smart constructor — valor cabe em `number` no JS sem perda de precisão.
```

- Conteúdo essencial preservado (`bigint`, `MAX_SAFE_INTEGER`, `Money.fromCents`).
- Linguagem alinhada a ADR-0020 (MySQL único). ✓

### 2.4 L2 — rename FK

- **`0000_*.sql:57`**: `ALTER TABLE ctr_amendments ADD CONSTRAINT ctr_amend_contract_fk FOREIGN KEY (contract_id) REFERENCES ctr_contracts(id) ON DELETE no action ON UPDATE no action;` — sintaxe MySQL idiomática. ✓
- **`0000_snapshot.json`**: 2 hits substituídos (key + name field). Verificado: snapshot tem apenas 2 referências; ambas trocadas.
- **`schemas/mysql.ts`**: `.references()` removido do campo `contractId`; `foreignKey({ name: 'ctr_amend_contract_fk', columns: [t.contractId], foreignColumns: [contracts.id] })` no extraConfig. Mesma convenção da junction `contractHomologatedAmendments`. ✓
- **Comprimento**: `ctr_amend_contract_fk` = 21 chars. Bem abaixo do limite de 64 do MySQL. ✓
- **Convenção do projeto**: `ctr_*_fk` (Junction usa `ctr_chom_amends_*_fk`). `ctr_amend_contract_fk` segue a convenção, sem colidir. ✓

---

## 3. Análise de integridade end-to-end

| Checkpoint | Verificação |
| :-- | :-- |
| Schema TS ↔ Snapshot | Snapshot reflete o nome curto da FK; schema TS declara o mesmo nome — sem drift |
| Schema TS ↔ Migration SQL | Snapshot + migration ambos com `ctr_amend_contract_fk`; charset/collate só no SQL (anotado no comentário do schema) |
| Migration ↔ runtime MySQL | `CREATE TABLE` aplica charset/collate no schema fresh do CI; FK linka colunas em `utf8mb4_bin` casadas — sem ER 3780 |
| Repos ↔ Schema | `contractId` em `amendments` continua sendo `varchar('contract_id', { length: 36 })` na TS; runtime continuará comportando-se idêntico |
| Mappers ↔ Schema | nenhuma mudança em mappers (mappers só leem `row.<field>`) |
| Suíte contratual | passa: 451 tests verdes (era 441 — +10 dos CAs novos, zero regressão) |

---

## 4. Issues encontradas

Nenhuma.

---

## 5. Sugestões para tickets/inquiries futuros

- **`handbook/inquiries/charset-drizzle-roadmap.md`** (inquiry, não-bloqueante): registrar que charset/collate é hoje SQL manual; reabrir quando drizzle-orm suportar na API. Owner: o próximo dev que tocar em schema.
- **`tests/.../schema-hardening.test.ts` extensão**: quando `0001_*.sql` aparecer, adicionar guard `CA-15+1`/`CA-16+1` cobrindo qualquer nova CREATE TABLE. Sem urgência hoje.
- **`docker/mysql/initdb.d/01-databases-and-users.sh`** + `compose.yaml` health check + `mysql-compose.test.ts CA-8`: já usam `utf8mb4_unicode_ci` server-side. Alinhamento entre tabela e server-default verificável manualmente via `SHOW CREATE TABLE` durante integration test. Anotar como "verificação manual no primeiro deploy real".
- **NIT** §202 do audit (`as unknown as string` para branded IDs): centralizar em helper `idAsString` — ticket XS separado.
- **L4** (junction sem índice em `amendment_id`): só relevante quando query "amendments → contracts homologados" aparecer. Anotar como inquiry.

---

## 6. Verificação contra audit `0002` §3

| Sub-item do ticket | Endereçado? | Como |
| :-- | :-- | :-- |
| **M1** charset/collate por tabela | ✅ | `ENGINE+CHARSET+COLLATE` em 3 tabelas + UUIDs em `utf8mb4_bin` |
| **M3** SELECT FOR UPDATE | ✅ | `.for('update')` em 2 repos |
| **M6** comentário SQLite | ✅ | reescrito sem citar SQLite |
| **L2** FK longa | ✅ | `ctr_amend_contract_fk` em SQL + snapshot + schema TS |

**Audit `0002` totalmente endereçado** após este ticket (4 tickets concluídos, todos HIGH/MEDIUM/L2 fechados).

---

## 7. Veredito

**APPROVED.** Todos os DoDs do `000-request.md` atendidos; ADR-0014 honrado (vence audit); zero regressão funcional; 10 CAs novos verdes + suíte contratual verde; quality gates verdes.

**Avançar para W3.**
