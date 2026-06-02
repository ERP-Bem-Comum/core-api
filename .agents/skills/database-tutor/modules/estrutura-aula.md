# Estrutura de uma Aula

Use este template para CADA módulo. Não pule etapas — a citação vem ANTES da explicação.

---

## 1. Ideia central (1 frase)

Diga em uma frase o que o aluno vai entender ao fim da aula. Exemplo:

> "Hoje você vai entender por que normalizar até 3NF resolve anomalias de atualização."

## 2. Citação literal (≥4 linhas)

Antes de explicar com suas palavras, mostre o que o livro fala. Use:

```bash
bun run shared-tools/buscar.ts ../../shared-references/database/<arquivo>.md "<termo>" --top 5
bun run shared-tools/citar.ts  ../../shared-references/database/<arquivo>.md --linha N --contexto 6
```

Cole o trecho no formato:

> "Trecho literal de pelo menos 4 linhas, sem paráfrase, sem corte."
> — *(Linha NNNN, p. PP, Ramakrishnan & Gehrke, *Sistemas de Gerenciamento de Banco de Dados*)*

## 3. Explicação com suas palavras

Reformule a citação em linguagem do aluno. Não use jargão sem definir antes. Conecte ao que o aluno já sabe (geralmente: planilha, arquivo CSV, código procedural).

## 4. Exemplo na prática (MySQL)

Sempre que possível, mostre o comportamento real no MySQL:

```sql
-- DDL/DML mínimo que ilustra o conceito
CREATE TABLE pedido (...);
INSERT INTO pedido VALUES (...);
SELECT ... ;
```

Cite o refman quando o comportamento for específico do MySQL (ex: `AUTO_INCREMENT`, `ON DUPLICATE KEY UPDATE`):

```bash
grep -rln "<feature>" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 3
```

## 5. Exercício verificador

Pergunta de cabeça (sem rodar nada) que confirme entendimento. Exemplos:

- "Se eu remover a chave estrangeira deste schema, o que pode dar errado?"
- "Por que esse índice em (status, created_at) é melhor que (created_at, status) para esta consulta?"
- "Essa transação está em READ COMMITTED. Pode dar phantom read? Por quê?"

Espere a resposta antes de seguir. Se errar, volte ao passo 3.

## 6. Próximo passo

Conecte ao módulo seguinte da trilha. Exemplo:

> "Agora que você entendeu chave estrangeira, o próximo passo é normalização — porque uma das causas de quebra de FK é redundância de dado mal-modelado."

---

## Regras de ouro

- **Uma aula por resposta.** Não atravesse 2 módulos.
- **Citação antes da explicação.** Sempre.
- **Exemplo concreto.** Não fique no abstrato — escreva DDL/DML mesmo que pequeno.
- **Verifica entendimento.** Sem exercício, não houve aula.
