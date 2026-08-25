---
name: rr-snapshot-only-first-consistent-read
description: Sob REPEATABLE READ, só a primeira consistent read (SELECT sem FOR UPDATE/SHARE) fixa o snapshot da tx; locking reads sempre leem o dado mais recente — Refman avisa que misturar os dois é frágil
metadata:
  type: project
---

Validado em PR #814 (`fix/remittance-hold-toctou`, `remittance-repository.drizzle.ts` `save()`): a
sequência é `FOR UPDATE` em `fin_remittances` → `FOR UPDATE` em `fin_payables` (①, reserva por PK) →
`SELECT` **sem** lock em `fin_remittance_payables JOIN fin_remittances` (②, releitura do hold).

**Fato de Refman confirmado** (`handbook/reference/mysql/mysql-refman-8.4--oracle/
17-innodb-storage-engine.part01.md`):

- `:3270,3444` — sob RR, todas as consistent reads da MESMA transação leem o snapshot fixado pela
  **primeira** consistent read. "Consistent read" é definida (`:3448`) como NÃO-locking.
- `:3564` — `SELECT ... FOR UPDATE` lê "the latest available data" — locking read NÃO fixa nem
  consome o snapshot de consistent read; opera sempre sobre o estado mais recente.
- **Consequência prática:** se NENHUMA consistent read (SELECT puro) precede um `SELECT` sem lock
  numa transação — só locking reads antes dele — esse `SELECT` é a PRIMEIRA consistent read e fixa
  seu snapshot NAQUELE momento, não no início da transação. Isso é o que faz ② do #814 enxergar o
  commit de quem ganhou a corrida em ①: ① é `FOR UPDATE` (não fixa snapshot) e bloqueia até o
  vencedor commitar, então ② roda DEPOIS do commit e pega snapshot fresco ali.
- `:3276` — o PRÓPRIO Refman avisa: misturar locking statements com `SELECT` não-locking na mesma
  transação RR **"is not recommended... difficult to parse"**. O padrão funciona aqui, mas depende
  inteiramente de NENHUMA consistent read aparecer antes de ② — invariante não protegida por teste
  nem tipo, só pela ordem atual do código. Um `SELECT` de diagnóstico inserido antes de ② no futuro
  quebraria isso em silêncio, sem teste vermelho, só sob concorrência real.

**Achado complementar, sobre PK composta:** numa tabela com PK composta onde o campo que MUDA por
transação (aqui `remittance_id`, um UUID novo por emissão) faz parte da chave, o lock por PK (①)
NUNCA gera colisão de UNIQUE entre duas transações concorrentes — cada uma insere uma linha
"diferente" pela PK, mesmo competindo pelo MESMO recurso de negócio (`payable_id`). Isso significa
que o lock sozinho SERIALIZA mas não REJEITA — quem rejeita é a releitura pós-lock (②). Ver
[[gap-lock-not-a-mutex-heuristic]] para o heurístico irmão (quando NÃO usar lock nessa releitura).

**How to apply:** antes de aprovar qualquer padrão "trava por PK, depois relê sem lock pra decidir",
checar (a) se algum SELECT sem lock roda ANTES da trava na mesma tx (quebra a premissa) e (b) se a
PK da tabela que a releitura consulta tem um campo que MUDA por tentativa (torna o lock puramente
serializador, não um mutex de rejeição — a releitura vira obrigatória, não decorativa).
