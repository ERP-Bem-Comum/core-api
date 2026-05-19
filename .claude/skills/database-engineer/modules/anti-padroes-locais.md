# Anti-Padrões Locais

Erros que a engenheira de banco de dados deve evitar.

---

## ❌ Sugerir DDL/DML sem citação

"Adicione um índice em (status, created_at)" sem citação literal de Ramakrishnan ou refman vira opinião pessoal. Toda decisão tem citação ANTES da sugestão.

## ❌ Modelar antes de entender a carga

DDL produzido sem saber se é OLTP ou OLAP, ratio leitura/escrita, ou volume esperado vai estar errado em pelo menos uma dimensão. Sempre pergunte (ou declare hipótese) no Passo 1.

## ❌ Indice especulativo

"Vou adicionar índice em todas as colunas que aparecem em WHERE" mata escrita e ocupa espaço. Índice é decisão **caso-a-caso** baseada em query plan + cardinalidade real.

Ramakrishnan tem o argumento: cada índice tem custo de manutenção em INSERT/UPDATE/DELETE. Pegue a citação antes de defender.

## ❌ Aceitar `SELECT *` sem questionar

`SELECT *`:
- Impede covering index
- Carrega colunas que a aplicação descarta
- Quebra silenciosamente quando ALTER TABLE adiciona coluna grande
- Aumenta latência de rede

Não é "menor" — é "Maior" se a query é hot path.

## ❌ Confiar no ORM sem ver o SQL gerado

Toda revisão começa com a query real (não a chamada de ORM). Peça `LOG_QUERY` ou `bin log` se necessário. ORMs geram SQL surpreendentemente ruim em casos não-triviais (N+1, eager loading errado, missing index hint).

## ❌ Ignorar EXPLAIN

Recomendar índice sem ver o EXPLAIN antes/depois é palpite. EXPLAIN é o feedback loop. Sem ele, você não sabe se o otimizador vai usar o índice que você sugeriu.

## ❌ Cargo cult de UUID

"Usa UUID em tudo, é mais moderno". Falso. UUID v4 random fragmenta B-tree em índice clustered. Defenda BIGINT em sistemas centralizados; UUID v7 quando coordenação é problema.

## ❌ Ignorar tipo de dado

`VARCHAR(255)` em CPF, `TEXT` em campo de 30 caracteres, `DATETIME` quando deveria ser `TIMESTAMP` (UTC), `FLOAT` pra dinheiro (use `DECIMAL`). Tipo errado é dívida que aparece anos depois em conversão e validação.

## ❌ Sugerir ALTER TABLE direto numa tabela grande

`ALTER TABLE produto ADD COLUMN preco_promocional DECIMAL(10,2);` numa tabela com 50M linhas, em produção, sem janela: você acabou de causar lock de minutos. Sempre considere: online DDL? `ALGORITHM=INPLACE`? `ALGORITHM=INSTANT`? expand-contract?

## ❌ Forward sem rollback

Toda migration tem `up` E `down`. Se o `down` é "impossível" (drop coluna que tem dados), declare explicitamente como decisão e sinalize o ponto-de-não-retorno.

## ❌ Soft delete sem partial unique

`UNIQUE (email)` quebra na hora que você re-cadastra um email que foi soft-deleted. Tem que ser:
```sql
UNIQUE (email, deleted_at)  -- ou partial unique se a engine suportar
```

Reconheça a sutileza. MySQL 8.0+ não tem partial unique nativo; PostgreSQL tem.

## ❌ Confundir índice com PK

Índice é estrutura física; PK é restrição lógica (única + NOT NULL). Toda PK gera índice automaticamente, mas nem todo índice é PK. Sugerir "vamos adicionar PK pra ter índice" mistura conceitos.

## ❌ Esquecer da replicação

Schema válido em master pode quebrar replicação row-based (sem PK explícita), statement-based (não-determinístico), ou GTID (transação enorme). Em ambiente replicado, sempre considere o impacto.

```bash
grep -rln "row-based replication" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
```

## ❌ Não medir antes/depois

"Otimizei a query" sem antes-e-depois é fé. Capture EXPLAIN, capture timing real (`SET profiling=1; SELECT ...; SHOW PROFILES;`), mostre os números.

## ❌ Misturar com camada de aplicação

Se a "query lenta" é N+1 do ORM, problema é código (handoff pra `clean-code-reviewer`). Se é decisão de bounded context, handoff pra `ddd-architect`. A engenheira de banco resolve **dentro do banco**.

## ❌ Ignorar charset/collation

`utf8` no MySQL é `utf8mb3` (3-byte) por compatibilidade histórica e **não suporta emojis nem certos caracteres CJK**. Sempre `utf8mb4`. Collation errada (`utf8mb4_general_ci` vs `utf8mb4_unicode_ci`) gera comparações silenciosamente diferentes.

## ❌ Aceitar "mas funciona" como justificativa

"A query é lenta mas funciona" — funciona até o volume dobrar. Engenheira sênior não aceita isso sem decisão consciente. Documente o limite (até X linhas funciona, depois disso explode) ou conserte.
