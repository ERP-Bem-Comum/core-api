# W2 — Code Review read-only

> **Reviewer:** orquestrador `pipeline-maestro` aplicando protocolo `code-reviewer`.
> **Round:** 1.
> **Veredito:** **APPROVED.**

---

## 1. Conformidade com `CLAUDE.md` raiz

| # | Regra | Verificação | Status |
| :-- | :-- | :-- | :-- |
| 1 | §Adapter: "`try/catch` permitido, mas converter para `Result` na borda" | `safe(...)` wrapper preservado; refactor todo dentro do `op()` interno | ✅ |
| 2 | §Sintaxe: `import type { X }` ou `import { type X }` | `import { eq, inArray } from 'drizzle-orm'` (não-type) e `import type { ... }` para tipos | ✅ |
| 3 | §Sintaxe: extensões `.ts` em imports relativos | preservado | ✅ |
| 4 | §Adapter: implementar ports tipados | `ContractRepository` continua tipada via `application/ports/contract-repository.ts` | ✅ |
| 5 | §"Sem `any`, sem `as` injustificado" | Único `as unknown as string` em `loadContract` é pré-existente (não tocado); refactor não introduz nada novo | ✅ |
| 6 | §Anti-padrão #7 | `throw new Error(r.error)` dentro de `safe()` é o padrão **autorizado** do adapter — é capturado pelo try do `safe`. Nada novo. | ✅ |
| 7 | §"Pipeline W0→W3" | Estrutura completa em `.claude/.pipeline/CTR-DB-REPO-LIST-N1/` | ✅ |

---

## 2. Inspeção de cada mudança

### 2.1 Import `inArray` (linha 1)

Pequena adição, alinhada ao padrão de import já existente. ✓

### 2.2 `list()` — refactor 1+N → 1+1 (linhas 141-179)

#### Análise de correção

- **Curto-circuito** `rows.length === 0` (linha 151): retorna `[] as readonly Contract[]`.
  - **Razão**: Drizzle/`inArray` com lista vazia gera `WHERE col IN ()` — sintaxe inválida em alguns dialetos; mysql2 erra. Curto-circuito é defesa correta.
  - **Cobertura**: suite contratual `list em repo vazio retorna ok([])` (linha 68 da suite) valida. ✓
- **`contractIds`** materializado em array (linha 153): necessário pois `inArray` exige `readonly`/array, não iterator.
- **Drizzle `inArray`**: gera SQL `WHERE contract_id IN (?, ?, ...)`. Refman §13.3.4 *Comparison Operators*. ADR-0020 §SQL permitido cobre.
- **`Map<string, string[]>`**: `string` é o tipo da PK (varchar(36) UUID — confirmar com `schema.contractHomologatedAmendments.contractId`). Não há nullability — junction tem NOT NULL nas duas colunas. ✓
- **`byContract.get(row.id) ?? []`**: contrato sem aditivos homologados retorna `[]`. Match com `loadContract` (linha 102: `if (row === undefined) return ok(null)`). ✓
- **`for (const row of rows)`** (linha 170): este loop é puro O(M), sem await de I/O dentro. **Não viola §H1** — guard CA-13.2 olha só por `await db.select` dentro do for, e essa regex falha (não há `.from(schema.contractHomologatedAmendments)` dentro).
- **`buildContract`** chamado idêntico ao código anterior. Preserva semântica do mapper.

#### Análise de risco

| Cenário | Comportamento | Observação |
| :-- | :-- | :-- |
| Repo vazio | retorna `[]` sem 2ª query | ✓ |
| 1 contrato sem aditivos | 1+1 queries (a segunda retorna `[]`) | ✓ — performance idêntica ao antigo no caso de 1 contrato |
| 1.000 contratos × 5 aditivos | 1+1 queries (5.000 rows na junction) | ✓ — bugfix de pool saturation |
| Erro de mapper em 1 row | `throw new Error(r.error)` (linha 175) → capturado por `safe()` → `Err('contract-repo-unavailable')` | igual ao código antigo ✓ |
| Concorrência: row deletada entre 1ª e 2ª query | Junction não tem orphan (FK), então o link da row deletada não aparece. `buildContract` recebe `[]` ou subset. Sem inconsistência observável (a row deletada também sumiu de `rows`). | ✓ |

#### Análise de complexidade

| Métrica | Antes | Depois |
| :-- | :-- | :-- |
| Round-trips (M contratos, ~N links totais) | 1+M | **1+1** |
| Memória (links em memória) | ~5 ids por iteração (1 contrato) | O(N) — N total de links |
| Tempo CPU | O(M×log N do índice) | O(M+N) — Map + scan único |
| Pool usage | satura quickly com M grande | constante |

A nota do audit §H1 *"+1 query constante em vez de N. Memória é O(total_links), insignificante (IDs de 36 bytes)"* permanece válida.

### 2.3 `persistContract` junction batch (linhas 86-93)

#### Análise de correção

- **Skip se `homologatedAmendmentIds.length === 0`**: necessário — `tx.insert(...).values([])` lança no mysql2 (e em SQL puro `INSERT INTO ... VALUES;` é sintaticamente errado).
- **`values([...row])`**: Drizzle aceita; gera `INSERT INTO ctr_contract_homologated_amendments (contract_id, amendment_id) VALUES (?,?), (?,?), ...`. ADR-0020 §SQL permitido cobre.
- **Transação preservada**: tudo continua dentro de `db.transaction(async (tx) => { ... })`. RN do upsert atômico mantido.
- **Idempotência preservada**: `DELETE FROM junction WHERE contract_id = ?` continua, depois INSERT batch. Mesma semântica de antes (delete-then-insert atômico).
- **Possível overflow do max_allowed_packet?**: cada row tem ~80 bytes (2 UUIDs de 36 bytes + overhead). `max_allowed_packet` default no MySQL 8.4 é 64 MB — comporta ~800k rows. Improvável atingir em prática (1 contrato com 800k aditivos homologados). Aceitável.

#### Análise de risco

| Cenário | Comportamento | Observação |
| :-- | :-- | :-- |
| 0 aditivos | DELETE only (skip do INSERT) | ✓ — antes era DELETE + 0 loops (também só DELETE) |
| 1 aditivo | DELETE + INSERT 1 row | ✓ |
| 50 aditivos | DELETE + INSERT 50 rows num só round-trip | **bugfix de M4** |
| Mesma `amendmentId` listada 2× no array (bug de chamador) | INSERT viola UNIQUE (PK composta `contract_id, amendment_id`) → ER_DUP_ENTRY → transação rollbacka → `safe()` traduz para `'contract-repo-unavailable'` | igual ao antigo ✓ |

---

## 3. Conformidade com audit `0002`

| Item | Proposta | Aplicado? |
| :-- | :-- | :-- |
| **§H1** — `inArray(contract_id, ids)` + Map | conforme exemplo literal | ✅ |
| **§M4** — `values([...])` batch | conforme exemplo literal | ✅ |
| **§L4** — índice em `amendment_id` na junction | NÃO neste ticket | Fora do escopo (L4 é nota — só relevante se aparecer query reversa). Anotar para futuro. |

---

## 4. Inspeção do `contract-repository.shape.test.ts`

- **Estrutura**: `describe`/`it` do `node:test`. ✓
- **`extractBlock`**: heurística com contagem de chaves; aceita pequenos falsos positivos em comentários multilinha — para regression-guard determinístico sobre código que **JÁ COMPILA**, é suficiente. Documentado no header.
- **CA-13.1** (count ≤ 1): documenta a invariante meta; passa hoje (1 SELECT) e continua passando após W1 (1 SELECT também).
- **CA-13.2**: regex `for (const X of rows) { ... .from(...) }`. Diretiva.
- **CA-14**: regex `for (...) { ... .insert(...).values({` (object literal). Diretiva — falha se reintroduzir loop com `values({...})`. Aceita `values([...])` (array literal — caso correto).
- **`fileURLToPath` + `resolve`**: usa o mesmo padrão já presente em outros testes do projeto (`mysql-driver.test.ts`). ✓

---

## 5. Análise de regressão funcional

A suíte contratual `runContractRepositoryContract` cobre:

- `list em repo vazio retorna ok([])` — ✅ passou.
- `list retorna todos os contratos persistidos` — ✅ passou (3 contratos via save → list).
- `save com mesmo ID é idempotente (upsert)` — ✅ passou (testa junction reset+reinsert).
- `valor de 1 cent` — ✅ passou (round-trip).
- `findById / findBySequentialNumber` — ✅ passou (não tocados).

Zero regressão funcional. ✓

---

## 6. Issues encontradas

Nenhuma.

---

## 7. Sugestões para tickets futuros (não bloqueiam)

- **`loadContract` / `loadBySequentialNumber`** (linhas 97-124): cada um faz 2 queries. Não é N+1 (chamado para 1 contrato), mas **poderia** ser 1 query com JOIN se houver pressão de RTT em prod. Tamanho XS. Fora deste ticket.
- **`amendment-repository.drizzle.ts`** — auditado por consistência, não tem N+1 (cada operação é 1 query por aggregate).
- **`AsyncIterable` para `list()` de tabelas gigantes**: hoje carrega tudo em memória. Para 100k contratos vira problema. Streaming/cursor é ticket M+; fora deste.
- **Refactor de `as unknown as string`** no `loadContract:129` — NIT do audit §202. Centralizar em helper `idAsString` no `domain/shared/ids.ts`. Ticket separado.

---

## 8. Veredito

**APPROVED.** Todos os DoDs do `000-request.md` atendidos; audit §H1 e §M4 endereçados conforme proposta literal; rede de segurança funcional (suite contratual) verde; regression guards estruturais (CA-13/CA-14) verdes; quality gates verdes.

**Avançar para W3.**
