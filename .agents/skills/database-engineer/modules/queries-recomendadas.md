# Queries Recomendadas por Tópico

Atalhos de busca para os problemas de engenharia mais frequentes. Use `--hibrido` quando precisar de resultados semânticos.

---

## Modelagem ER e schema design

```bash
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "modelo entidade-relacionamento" --top 5
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "design conceitual" --top 5
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "design lógico" --top 5
```

## Chaves primárias, surrogate vs natural

```bash
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "chave primária" --top 5
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "chave candidata" --top 5
grep -rln "AUTO_INCREMENT" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 3
grep -rln "UUID" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 3
```

## Integridade referencial e FK

```bash
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "integridade referencial" --top 5
grep -rln "FOREIGN KEY" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
grep -rln "ON DELETE CASCADE" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 3
```

## Normalização aplicada

```bash
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "decomposição sem perda" --top 5
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "anomalia de atualização" --top 5
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "BCNF" --top 5
```

## Índices: escolha, ordem de colunas, composto

```bash
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "índice composto" --top 5
grep -rln "Multiple-Column Indexes" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
grep -rln "Covering Index" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
grep -rln "Index Hints" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 3
```

## EXPLAIN, plano de execução, otimizador

```bash
grep -rln "EXPLAIN Output Format" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
grep -rln "EXPLAIN Extra Information" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
grep -rln "Cost-Based Optimizer" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 3
```

## Transações, isolamento, deadlock

```bash
grep -rln "Transaction Isolation Level" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
grep -rln "InnoDB Locking" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
grep -rln "Deadlocks" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
grep -rln "Gap Lock" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 3
```

## Online DDL, migrations, ALTER seguro

```bash
grep -rln "Online DDL" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
grep -rln "ALGORITHM=INPLACE" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 3
grep -rln "instant ADD COLUMN" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 3
```

## Replicação, alta disponibilidade

```bash
grep -rln "Replication Configuration" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
grep -rln "Group Replication" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
grep -rln "GTID" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 3
grep -rln "binary log format" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 3
```

## Particionamento e sharding

```bash
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "particionamento horizontal" --top 5
grep -rln "Partitioning" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
```

## Recuperação, backup, point-in-time

```bash
grep -rln "InnoDB Recovery" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
grep -rln "Point-in-Time Recovery" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 3
grep -rln "mysqldump" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 3
```

## Tipos de dados: escolha pragmática

```bash
grep -rln "Data Type Storage Requirements" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
grep -rln "DECIMAL" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 3
grep -rln "TIMESTAMP" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 3
grep -rln "JSON Data Type" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
```
