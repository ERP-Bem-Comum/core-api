---
name: mysql-notnull-check-two-statements
description: drizzle-kit emite ADD COLUMN NOT NULL e ADD CONSTRAINT CHECK como statements separados, sem DEFAULT e sem aviso — em tabela com linhas o 2º falha e a migration fica pela metade
metadata:
  type: reference
---

`.notNull()` + `check()` numa coluna nova faz `drizzle-kit generate` emitir DOIS statements
separados por `--> statement-breakpoint`:

```sql
ALTER TABLE `prg_programs` ADD `visibility` varchar(16) NOT NULL;--> statement-breakpoint
ALTER TABLE `prg_programs` ADD CONSTRAINT `prg_programs_visibility_chk` CHECK (... IN ('PUBLICO','INTERNO'));
```

**Sem `DEFAULT`, sem backfill, sem aviso algum.** O gerador não pergunta se a tabela tem linhas.

Por que isso quebra em tabela populada: o 1º statement preenche as linhas existentes com o
implicit default — string vazia para tipo texto. O precedente do repositório já mediu isso e
registrou em `contracts/.../migrations/mysql/0020_busy_doctor_spectrum.sql`: *"`consumer_id NOT NULL`
sem DEFAULT preencheria linhas existentes com string vazia (medido: nem STRICT_ALL_TABLES impede)"*.
O 2º statement então encontra `''`, que não está no `IN (...)`, e falha com 3819 — deixando a
migration **pela metade**, com a coluna criada e a constraint ausente.

O caminho seguro está na `contracts/.../0013_yielding_adam_warlock.sql`: declarar
`.default('CT')` junto do `.notNull()`, o que emite `ADD ... DEFAULT 'CT' NOT NULL` e faz o backfill
implícito satisfazer o CHECK.

Não existe migration de rollback neste repositório: 124 arquivos `.sql`, todos forward-only. O
único `DROP COLUMN` (`budget-plans/0008`) é uma migration de avanço, não um down.

Precedente relacionado: a mesma `0020` documenta que o gerador emitiu `ADD PRIMARY KEY` ANTES do
`ADD COLUMN` que a PK referencia — ordem inaplicável, corrigida à mão. O SQL emitido não é
presumível como aplicável.

Ver [[schema-change-cost-measured]] para o lado do TypeScript.
