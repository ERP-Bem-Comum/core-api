# Queries Recomendadas por Tópico

Atalhos de busca para os temas filosóficos mais frequentes. Use `--hibrido` quando precisar de resultados semânticos (paráfrases, sinônimos PT/EN).

---

## Modelo relacional e fundamentos

```bash
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "modelo relacional" --top 5
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "álgebra relacional" --top 5
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "independência de dados" --top 5
```

## Normalização e dependências

```bash
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "dependência funcional" --top 5
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "forma normal" --top 5
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "decomposição" --top 5
```

## ACID, transações, isolamento

```bash
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "ACID" --top 5
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "serializável" --top 5
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "controle de concorrência" --top 5

grep -rln "InnoDB ACID Model" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
grep -rln "transaction isolation level" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
grep -rln "consistent read" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
```

## MVCC e versionamento

```bash
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "controle de versão" --top 5
grep -rln "multi-version" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
```

## Recuperação e durabilidade

```bash
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "recuperação de falha" --top 5
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "log de transação" --top 5
grep -rln "redo log" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
```

## Otimização e plano de execução

```bash
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "otimização de consulta" --top 5
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "plano de execução" --top 5
grep -rln "EXPLAIN" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
grep -rln "optimizer" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
```

## Índices: B-tree, hash, full-text

```bash
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "árvore B" --top 5
grep -rln "B-Tree index" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
grep -rln "hash index" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
```

## Data warehouse, OLTP vs OLAP

```bash
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "data warehouse" --top 5
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "OLAP" --top 5
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "estrela" --top 5
```

## Distribuído, replicação, particionamento

```bash
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "banco distribuído" --top 5
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "replicação" --top 5
grep -rln "replication" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
grep -rln "Group Replication" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
```

## Cross-ref: conceitos discutidos em mais de um livro

```bash
bun run shared-tools/cross-ref-conceito.ts "transação"
bun run shared-tools/cross-ref-conceito.ts "consistência"
bun run shared-tools/cross-ref-conceito.ts "índice"
```

> Conceitos de single-token muito frequente (ex: "ACID" sozinho) podem não retornar — use frases. Para temas que não retornam aresta, busque com `--todos`:
>
> ```bash
> bun run shared-tools/buscar.ts --todos "BASE consistency" --hibrido
> ```
