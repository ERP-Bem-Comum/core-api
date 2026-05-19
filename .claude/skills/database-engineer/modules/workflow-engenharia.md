# Workflow de Engenharia de Banco de Dados

Aplica-se quando o usuário traz schema, query, migration ou problema operacional pra resolver.

---

## Passo 1 — Entender o domínio e a carga

Antes de qualquer DDL/DML, faça as perguntas de contexto:

- **Domínio:** que entidades? que relações? que invariantes?
- **Carga:** OLTP (escrita pesada, transações curtas) ou OLAP (varredura, agregação)? Ratio leitura/escrita aproximado?
- **Volume:** quantas linhas em N meses? que percentual de hot data?
- **Restrições:** SLA de latência? consistência forte ou eventual aceita?
- **Engine:** MySQL/InnoDB? PostgreSQL? versão?

Sem essas respostas, **não comece**. Ou pergunte explicitamente, ou trabalhe com hipótese declarada ("vou assumir OLTP MySQL 8.4 InnoDB; me corrija se for outro caso").

## Passo 2 — Mapear os achados

Para cada problema potencial:
- **Qual princípio** está sendo violado? (normalização, integridade referencial, isolamento, índice ausente, full scan)
- **Em qual livro** esse princípio está descrito? (Ramakrishnan teórico, refman operacional)
- **Em qual linha do .md** posso achar a defesa?

## Passo 3 — Buscar a citação ANTES de escrever a decisão

Use `bun run shared-tools/buscar.ts` com palavras-chave do princípio. **Não escreva a decisão antes de ter a citação em mãos.**

```bash
bun run shared-tools/buscar.ts ../../shared-references/database/sgbd--ramakrishnan-gehrke.md "<termo>" --top 5
bun run shared-tools/citar.ts  ../../shared-references/database/sgbd--ramakrishnan-gehrke.md --linha N --contexto 6
```

Para detalhe operacional (sintaxe MySQL, comportamento InnoDB, EXPLAIN):

```bash
grep -rln "<feature>" handbook/reference/mysql/mysql-refman-8.4--oracle/ | head -n 5
```

## Passo 4 — Estruturar o output

Sempre nesta ordem:

```
## Achado N — [Severidade] Título do problema

**Onde:** linha X-Y do schema/query revisado (ou tabela `nome_da_tabela`, coluna `nome_da_coluna`)
**Princípio violado:** [normalização 3NF | integridade referencial | índice ausente | full table scan | etc.]

**Defesa do princípio (do livro):**

> "Citação literal de ≥4 linhas, sem paráfrase, sem corte."
> — *(Linha NNNN, p. PP, Ramakrishnan & Gehrke, *Sistemas de Gerenciamento de Banco de Dados*)*

**Análise:**
[Sua explicação aplicando ao schema/query revisado]

**Sugestão (DDL/DML):**
```sql
-- DDL ou query corrigida
ALTER TABLE pedido ADD INDEX idx_pedido_status_created (status, created_at);
-- Antes: full table scan + filesort
-- Depois: index range scan, EXPLAIN type=ref
```

**Validação:**
```sql
EXPLAIN SELECT ... ;     -- mostra plan novo
SHOW INDEX FROM pedido;   -- confirma índice
```
```

## Passo 5 — Resumo final

Tabela consolidada:

```
| # | Severidade | Achado | Onde | Risco |
|---|---|---|---|---|
| 1 | Crítico | Sem chave primária | tabela `evento` | replicação row-based quebra |
| 2 | Crítico | FK ausente em `pedido.cliente_id` | linha 47 | dado órfão silencioso |
| 3 | Maior | Índice em (created_at, status) errado pra query | tabela `pedido` | full scan + filesort |
| 4 | Maior | Tipo VARCHAR(255) em CPF | tabela `cliente` | espaço + risco de dado inválido |
| 5 | Menor | Naming inconsistente: `id_cliente` vs `customerId` | múltiplas tabelas | manutenção |
```

---

## Severidades

- **Crítico** — perda de dado em potencial, deadlock garantido, race condition em transação financeira, schema impede replicação ou point-in-time recovery, query inviável em produção.
- **Maior** — degradação significativa de performance em produção, schema não-normalizado pra dado mutável que vai gerar anomalia, índice ausente em coluna de WHERE/JOIN frequente.
- **Menor** — convenção de nomenclatura, tipo subdimensionado/sobredimensionado, comentário ausente em decisão não-óbvia.
- **Sugestão** — opcional, oportunidade de melhora (índice marginal, refactor de query mais legível com mesma performance).

---

## Entregável

Uma revisão objetiva, com 3-15 achados, cada um justificado por citação literal de Ramakrishnan ou refman MySQL, terminando com quadro consolidado de severidades e — se aplicável — DDL de migration sugerido (forward + rollback).

## Quando o problema cruza camadas

- Schema reflete bounded context confuso → handoff pra `ddd-architect`
- Decisão de sharding / múltiplos serviços / comunicação assíncrona → handoff pra `software-architect`
- Índice ou query "mexe em código de aplicação" → siga; mas se o problema for de organização do código (ex: God-repository), handoff pra `clean-code-reviewer`
