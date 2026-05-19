# Trilha Pedagógica (10 Módulos)

Não é obrigatório seguir nesta ordem — adapte ao que o aluno trouxer. Cada módulo = 1 sessão (~30-60 min). Não atravesse 2 módulos numa resposta.

### Módulo 1 — Por que banco de dados existem?

- Vantagens sobre arquivos planos: independência de dados, controle de concorrência, recuperação, segurança
- O que um SGBD entrega que um filesystem não entrega
- **Citação:** `bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "vantagens de um SGBD" --top 5`

### Módulo 2 — O modelo relacional

- Tabela = relação; linha = tupla; coluna = atributo
- Por que esse modelo venceu (1970, Codd)
- **Citação:** `bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "modelo relacional" --top 5`

### Módulo 3 — SQL básico

- DDL (CREATE/ALTER/DROP), DML (SELECT/INSERT/UPDATE/DELETE)
- Operações de conjunto: UNION, INTERSECT, EXCEPT
- **Citação:** `bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "consulta SQL" --top 5`
- **Prática MySQL:** `grep -rln "SELECT statement" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5`

### Módulo 4 — Chaves: primárias, estrangeiras, UNIQUE

- Por que toda tabela precisa de chave primária
- Integridade referencial via chave estrangeira (CASCADE, RESTRICT, SET NULL)
- **Citação:** `bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "chave estrangeira" --top 5`

### Módulo 5 — Normalização (1NF, 2NF, 3NF, BCNF)

- O que é dependência funcional
- Por que existe forma normal: evitar anomalia de inserção/atualização/exclusão
- **Citação:** `bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "forma normal" --top 5`
- **Citação:** `bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "dependência funcional" --top 5`

### Módulo 6 — Transações e ACID

- O que é uma transação; ACID (Atomicidade, Consistência, Isolamento, Durabilidade)
- COMMIT, ROLLBACK, SAVEPOINT
- **Citação:** `bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "ACID" --top 5`
- **Prática MySQL/InnoDB:** `grep -rln "InnoDB ACID Model" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5`

### Módulo 7 — Concorrência: locks e isolamento

- Read uncommitted, read committed, repeatable read, serializable
- Lost update, dirty read, non-repeatable read, phantom
- **Citação:** `bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "controle de concorrência" --top 5`
- **Prática MySQL:** `grep -rln "isolation level" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5`

### Módulo 8 — Índices

- Estrutura: B-tree e hash; quando cada uma serve
- Custo de manutenção vs ganho em leitura
- **Citação:** `bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "índice árvore" --top 5`

### Módulo 9 — Otimização de consultas

- Plano de execução (EXPLAIN), seleção de índice, ordem de junção
- Estatísticas e o otimizador baseado em custo
- **Citação:** `bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "otimização de consulta" --top 5`
- **Prática MySQL:** `grep -rln "EXPLAIN" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5`

### Módulo 10 — OLTP vs OLAP, NoSQL como alternativa

- Cargas transacionais (curtas, escrita pesada) vs analíticas (varredura, agregação)
- Quando o relacional NÃO é a resposta
- **Citação:** `bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "data warehouse" --top 5`
