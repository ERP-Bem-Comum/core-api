# Casos Especiais

Cenários frequentes com playbook resumido. Cada playbook tem citação ANTES da decisão.

---

## 1. Schema novo do zero

**Sequência:**
1. Mapeie entidades + relações em ER conceitual (não pule esta fase mesmo que pareça óbvia).
2. Cite Ramakrishnan no capítulo de design conceitual:
   ```bash
   bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "design conceitual" --top 5
   ```
3. Traduza ER → tabelas (chave primária, FKs, restrições).
4. Aplique normalização: identifique dependências funcionais, decomponha até 3NF salvo justificativa explícita.
5. Decida tipos pragmaticamente (`DECIMAL` pra dinheiro, `TIMESTAMP` em UTC, `VARBINARY(16)` pra UUID se for o caso).
6. Adicione índices SOMENTE depois de mapear queries reais (não índice especulativo).
7. Entregue DDL completo + comentário sobre decisões não-óbvias.

## 2. Review de SQL existente

**Checklist:**
- [ ] EXPLAIN está rodando? `type=ALL` é red flag.
- [ ] Query usa `SELECT *`? Pergunte se é intencional (impede covering index).
- [ ] WHERE em coluna sem índice + tabela > 100k linhas? full scan iminente.
- [ ] JOIN sem índice no lado direito? nested loop com tabela grande.
- [ ] `ORDER BY` em coluna sem índice + `LIMIT` pequeno? filesort.
- [ ] Subquery correlacionada que pode virar JOIN?
- [ ] Função em coluna do WHERE (`WHERE YEAR(created_at) = 2026`)? Mata uso de índice.
- [ ] `LIKE '%foo%'`? Não usa índice — sugerir full-text se aplicável.

Cite refman MySQL no `EXPLAIN Output Format` antes de defender qualquer reescrita.

## 3. Query lenta em produção

**Sequência:**
1. Capture a query exata + EXPLAIN + cardinalidades reais (`SHOW INDEX`, `SHOW TABLE STATUS`).
2. Identifique gargalo: full scan? bad join order? missing index? wrong index? estatísticas obsoletas?
3. Cite refman no capítulo do otimizador apropriado.
4. Sugira **um** fix por vez:
   - Faltou índice → DDL com índice mínimo necessário
   - Índice ruim → reorder colunas (igualdade primeiro, range depois, ORDER BY por último)
   - Estatísticas → `ANALYZE TABLE`
   - Plano errado → reescrever query OU `STRAIGHT_JOIN`/hint (último recurso, com comentário)
5. Mostre o EXPLAIN antes/depois.

## 4. Migration sem downtime

**Princípios:**
- Adicionar coluna nullable + default → seguro com online DDL (`ALGORITHM=INSTANT` no MySQL 8.0+).
- Adicionar coluna NOT NULL sem default → backfill em batches, depois adicionar constraint.
- Renomear coluna → `ALTER TABLE ... RENAME COLUMN` (online no 8.0.3+) ou expand-contract (criar nova, copiar, alternar leitura, alternar escrita, dropar antiga) em versões antigas.
- Mudar tipo → expand-contract sempre que houver dúvida.
- Adicionar índice → `ALGORITHM=INPLACE` em InnoDB, mas avalie impacto em escrita concorrente.
- Dropar coluna → 2 deploys (1: parar de escrever; 2: drop após rollback window).

Cite refman:
```bash
grep -rln "Online DDL" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
```

Sempre entregue **forward + rollback**:

```sql
-- forward
ALTER TABLE pedido ADD COLUMN status_v2 VARCHAR(32) NULL;

-- rollback
ALTER TABLE pedido DROP COLUMN status_v2;
```

## 5. Deadlock recorrente

**Investigação:**
1. `SHOW ENGINE INNODB STATUS\G` — pegar a "LATEST DETECTED DEADLOCK".
2. Identificar as 2+ transações e a ordem de aquisição de locks.
3. Cite refman:
   ```bash
   grep -rln "Deadlocks" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
   grep -rln "InnoDB Locking" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
   ```
4. Causas frequentes:
   - Ordem de UPDATE diferente entre transações (sempre ordene por PK)
   - Gap lock em `SELECT ... FOR UPDATE` com index secundário
   - Falta de índice em coluna usada em WHERE de UPDATE (lock escalation)
5. Fix: padronizar ordem de acquire, adicionar índice, ou trocar `READ COMMITTED` se gap locks são o problema (com cuidado com phantom).

## 6. Soft delete vs hard delete

**Trade-offs:**
- Soft delete (`deleted_at TIMESTAMP NULL`):
  - **Pró:** auditoria, recuperação, FK preservada
  - **Contra:** todas as queries precisam filtrar `WHERE deleted_at IS NULL`, índices precisam considerar isso, UNIQUE pode quebrar (precisa partial unique se a engine suportar)
- Hard delete:
  - **Pró:** simples, queries limpas, FK CASCADE funciona
  - **Contra:** perde histórico, `ON DELETE CASCADE` pode apagar muito mais do que esperado

Cite Ramakrishnan no capítulo de integridade referencial. Decisão depende de regulamentação (LGPD permite hard delete com pedido do titular; soft delete preserva auditoria pra fraude).

## 7. Particionamento horizontal vs sharding

- **Particionamento (RANGE/HASH):** uma tabela física, várias partições no mesmo servidor. Acelera DELETE de range temporal, isola hot/cold data. Ramakrishnan capítulo de DW.
- **Sharding:** mesma tabela espalhada em múltiplos servidores. Solução pra escala horizontal. **Não trivial** — afeta JOIN, transação cross-shard, FK. NewSQL (Vitess, TiDB, Spanner) abstrai isso.

Pra MySQL nativo, particionamento. Pra sharding real, considere mover pra solução distribuída (handoff `software-architect`).

## 8. UUID vs BIGINT como PK

- **BIGINT AUTO_INCREMENT:** índice ordenado, INSERTs sequenciais (bom pra B-tree), 8 bytes.
- **UUID v4 random:** distribuído, sem coordenação, MAS quebra localidade no B-tree (insert random) → page splits, índice fragmentado.
- **UUID v7 (timestamp-prefixed):** mantém ordenação temporal, recomendado quando UUID é necessário.
- **MySQL específico:** `BINARY(16)` pra UUID (não `CHAR(36)` que ocupa o dobro). Veja `UUID_TO_BIN()`.

Cite refman:
```bash
grep -rln "UUID" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
```

## 9. ENUM vs lookup table

- **ENUM:** simples, ocupa 1-2 bytes, fast. Mas alterar valores exige `ALTER TABLE` (tabela grande = problema).
- **Lookup table (FK pra tabela de domínio):** flexível, query consegue trazer descrição/metadados, FK garante integridade. Custa um JOIN.

Regra: **valores estáveis e poucos** (status de pedido tipo {pendente, pago, enviado, entregue, cancelado}) → ENUM ok. **Valores que mudam ou têm metadados associados** → lookup table.

## 10. Quando o problema NÃO é do banco

- "Query lenta" mas é N+1 vindo do ORM → handoff pra `clean-code-reviewer` (problema de código).
- "Schema confuso" mas é bounded context misturado → handoff pra `ddd-architect`.
- "Banco caiu" e é problema de infra (memória, disco, rede) → handoff pra `infra-architect`.
- "ACID vale a pena?" → handoff pra `database-theorist`.
- "O que é FK?" → handoff pra `database-tutor`.
