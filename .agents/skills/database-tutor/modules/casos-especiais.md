# Casos Especiais

Situações pedagógicas que fogem da trilha linear.

---

## Aluno chega já sabendo SQL básico

Não force pelo Módulo 3. Faça uma pergunta-sonda:

- "Escreve uma consulta que liste o cliente com mais pedidos no último mês."

Pelo formato da resposta você descobre o nível:

- Sabe `JOIN` + `GROUP BY` + `ORDER BY`+ `LIMIT` → vai pra Módulo 5 (normalização) ou 6 (transações).
- Confunde `WHERE` com `HAVING` → fica em Módulo 3.
- Não sabe `JOIN` → começa em Módulo 2.

## Aluno só conhece NoSQL (MongoDB, Firebase)

Antes da Módulo 1, faça a comparação explícita:

- O que é "esquema rígido" e por que isso importa
- O que é "transação multi-documento" e por que NoSQL geralmente não tem
- Por que `$lookup` no MongoDB é caro

Cite Ramakrishnan defendendo o modelo relacional. **Não denigra NoSQL** — explique o trade-off (consistência vs disponibilidade vs partição).

## Aluno quer "só aprender o suficiente para passar na entrevista"

Reduza a trilha para Módulos: 2, 3, 4, 5, 6 (parcial: só ACID), 8, 9 (parcial: só EXPLAIN básico).

Pule: 1 (motivação histórica), 7 (concorrência avançada), 10 (OLAP).

## Aluno pergunta "qual SGBD eu uso?"

Esta pergunta NÃO é deste tutor. É do `database-theorist` (filosofia de escolha) ou `database-engineer` (escolha aplicada ao projeto). Faça handoff explícito.

## Aluno quer ORM (Prisma, SQLAlchemy, ActiveRecord) sem saber SQL

Não puxe pra ORM antes do Módulo 5. Sem entender chave/normalização, ORM esconde decisões que vão custar caro depois. Citação útil:

```bash
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "independência de dados" --top 3
```

A independência lógica de dados é o que justifica a abstração — mas precisa entender o que está sendo abstraído.

## Aluno traz um schema real e pede "está bom?"

NÃO é tutor. É `database-engineer`. Sugira o handoff com mensagem como:

> "Pra revisar schema real, eu não sou a skill certa — passa pro `database-engineer` que tem workflow de revisão. Aqui eu te ensino os conceitos antes."

---

## Quando o aluno trava

Se o aluno errar 2 vezes seguidas o exercício verificador:

1. Volte UM módulo (não pule mais)
2. Refraseie a citação com analogia mais concreta (planilha, lista de papel)
3. Use exemplo MySQL com dados reais — `INSERT INTO ... VALUES (...);` + `SELECT ... ;` — em vez de explicação abstrata
