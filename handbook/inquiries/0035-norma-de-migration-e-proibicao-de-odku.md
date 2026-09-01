---
inquiry: 0035
title: 'Duas normas que a medição contradiz — migration "sempre gerada" e a proibição global de ODKU'
state: open
opened: 2026-09-01
last_reviewed: 2026-09-01
open_outputs: 4 # migrar para issue — ver README §Saídas
---

# Inquiry-0035: Duas normas que a medição contradiz — migration "sempre gerada" e a proibição global de ODKU

- **Opened by:** Claude Code, na sessão de debate do ambiente de dados (branch `docs/debate-ambiente-de-dados`)
- **Asked to:** dono do repo — as duas saídas mexem em norma escrita, não em código
- **Impact:** `CLAUDE.md` §"Anti-padrões" nº 4 · [ADR-0020](../architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) §"Padrão de upsert"

---

## 1. Contexto

Duas medições independentes, na mesma sessão de 01/09/2026, produziram o mesmo tipo de achado sobre
coisas diferentes: **uma norma escrita que a prática contradiz — e contradiz por razão técnica
legítima, não por indisciplina.**

Nenhuma das duas é defeito de código. Ambas são **registro que envelheceu**, e o
[`CLAUDE.md`](../../CLAUDE.md) §"Fonte de verdade" manda tratar divergência como defeito a registrar,
nunca resolvê-la escolhendo o texto mais bonito.

**(a) "Escrever migration à mão" é anti-padrão nº 4 — e acontece em 37,4 % dos casos.** A norma diz
_"sempre `pnpm run db:generate`"_. Medido: **46 das 123 migrations foram editadas à mão**, e as razões
são limitações reais do gerador.

**(b) `ON DUPLICATE KEY UPDATE` é proibido na camada de agregado — por um risco que não existe neste
schema.** A proibição está em `document-repository.drizzle.ts:8-12` e no ADR-0020. Medido: **0 dos 47
call sites de ODKU reúnem a condição que o manual descreve.**

---

## 2. Pergunta(s) feita(s)

1. A norma nº 4 deve ser reescrita para "gerar sempre, editar quando necessário, e **declarar** a
   edição"? Se sim, o que conta como declaração, e o que a cobra?
2. A proibição de ODKU na camada de agregado se sustenta, dado que a condição do manual não ocorre em
   nenhum call site? Se não se sustenta, qual a norma correta — e ela exige ADR que `supersede` a
   §"Padrão de upsert" do ADR-0020?
3. As duas têm a mesma causa — norma escrita como se a ferramenta bastasse — ou é coincidência?
4. O que mais no repositório está escrito como norma absoluta e é, na prática, condicional?

---

## 3. Respostas / Investigação

### 2026-09-01 — (a) as 46 migrations editadas à mão

Medido pelo agente `drizzle-orm-expert` em worktree descartável, com método **mecânico**: o
`drizzle-kit export --dialect=mysql --sql` serve de **oráculo** do que o gerador emite; a diferença
contra o disco é a marca da mão humana.

| Marca de edição manual | n | Por que prova edição |
| --- | ---: | --- |
| Comentário `--` | 39 | o gerador nunca emite comentário (só `--> statement-breakpoint`) |
| `ENGINE=InnoDB` | 33 | ausente em 100 % das 1.236 linhas do export |
| DML (`INSERT`/`UPDATE`/`TRUNCATE`) | 5 | `generate` não emite DML |
| `ALTER` com cláusulas fundidas | 3 | o gerador emite 1 statement por operação |
| `DROP TABLE IF EXISTS` | 1 | o gerador emite `DROP TABLE \`x\`` |
| Nome fora do dicionário do gerador | 1 | 383 adjetivos × 920 heróis extraídos do `bin.cjs` |
| **≥ 1 marca** | **46 / 123 — 37,4 %** | |
| **Zero marca (100 % gerada)** | **77 / 123 — 62,6 %** | |

Por módulo: `financial` 16/55 · `partners` 11/20 · `contracts` 7/24 · `budget-plans` 5/10 ·
`auth` 4/10 · `notifications` 2/2 · `programs` 1/2.

**As quatro razões medidas — nenhuma é preguiça:**

1. **Ordem por dependência.** `contracts/0020_busy_doctor_spectrum.sql:3-5` registra que o gerador
   emitiu `ADD PRIMARY KEY(consumer_id, event_id)` **antes** de `ADD consumer_id` — _"o gerador ordena
   por tipo de operação, não por dependência entre elas"_. Sem correção manual, não aplica.
2. **`ENGINE`/`CHARSET` de tabela.** O Drizzle 0.45 não expõe. As 33 ocorrências existem porque alguém
   digitou — e as **11 migrations que criam 12 tabelas sem o sufixo** são o outro lado disso, hoje
   comentado na [#808](https://github.com/ERP-Bem-Comum/core-api/issues/808).
3. **Fusão de cláusulas** para obter `INPLACE, LOCK=NONE` numa passada — medido em MySQL 8.4.11.
4. **Backfill** que precisa rodar entre dois DDLs.

**O padrão a promover já existe.** A `0020` declara a edição em 15 linhas de comentário, citando a
medição que a justifica. É o oposto de edição silenciosa.

> Detalhe que reforça a maturidade: os 6 `ALGORITHM=` do repositório estão **todos em comentário,
> zero em statement** — o projeto aprendeu com o erro 1845 e registrou a lição no lugar certo.

### 2026-09-01 — (b) a proibição de ODKU

Medido pelo agente `mysql-database-expert`, sobre o Refman 8.4 versionado em
`handbook/reference/mysql/` (fonte primária, não artefato que cita outro).

**A condição que o manual descreve** (`15-sql-statements.part02.md:2838`):

> "In general, you should try to avoid using an ON DUPLICATE KEY UPDATE clause on tables with
> **multiple unique indexes**."

**O universo medido:**

| | n |
| --- | ---: |
| Tabelas `mysqlTable` | 67 |
| Com ≥ 1 UNIQUE além da PK | 27 (40 %) |
| Só PK | 40 |
| **Call sites de ODKU sobre tabela só-PK** | **44 / 47 — 94 %** |
| Call sites sobre tabela com UNIQUE extra | 3 |
| **Call sites que reúnem a condição do manual** | **0 / 47** |

Os 3 expostos, um a um: `fin_rejected_suggestions` e `fin_cedente_accounts` têm PK UUID v4 **nova a
cada chamada** — não colide, logo só uma unique é colidível. `bgp_budget_results` é o único com duas
uniques além da PK, **mas `legacy_id` nunca é escrito no caminho do ODKU** (`budget-result.mapper.ts:18-25`
não o inclui → NULL, e múltiplos NULL convivem numa UNIQUE do InnoDB); o outro escritor é a ETL, que
usa SELECT-then-UPDATE com `for('update')`.

**E a citação que sustenta a proibição está com a numeração da 8.0.**
`document-repository.drizzle.ts:8-12` cita "§13.2.6.2" e "§15.7"; na 8.4 são **§15.2.7.2** e
**§17.7**. Pior: `:20` cita "§15.7.2.4", que **na 8.4 é "SET RESOURCE GROUP Statement"** — Locking
Reads é §17.7.2.4.

⚠️ **O texto invocado sobrevive; a paráfrase é que omite a condição.** O manual diz _"avoid **on
tables with multiple unique indexes**"_. O docblock leu como "evitar sempre".

### O que a medição NÃO diz

- **Não diz que ODKU deve ser liberado em toda parte.** Diz que a proibição, como está escrita, é mais
  larga que o risco que a motiva.
- **Não avalia o custo do substituto.** SELECT-FOR-UPDATE-então-UPDATE-ou-INSERT adiciona round-trip e
  next-key lock por escrita; o repositório tem 42 call sites de `for('update')` e **apenas 2** de
  `withDeadlockRetry`, ambos no `financial`. Medir esse custo é trabalho não feito.

---

## 4. Análise interna

**As duas têm a mesma forma, e vale nomeá-la:** uma norma foi escrita no momento em que alguém
resolveu um problema real, generalizando a solução para "sempre". Depois, a realidade apresentou os
casos que a generalização não cobria — e o repositório fez a coisa certa **na prática** (editou a
migration, declarou no comentário; usou ODKU onde é seguro) enquanto o texto continuou dizendo
"sempre". A prática ficou mais madura que a norma.

Isso é diferente de drift por descuido. É **norma que não previu a exceção legítima** — e o custo não
é o desvio, é que quem chega novo lê o absoluto, não encontra a exceção escrita, e ou obedece contra a
técnica ou desvia sem declarar.

**A saída (a) é barata e mecânica:** o que distingue edição deliberada de descuido é a **declaração**,
e ela é verificável — 39 das 46 já têm comentário. Um gate que exija comentário em migration com marca
de edição torna a norma nº 4 verdadeira pela primeira vez.

**A saída (b) é mais delicada, e por duas razões.** Primeiro, a lista normativa de features SQL vive no
[ADR-0020](../architecture/adr/0020-mysql-only-supersedes-dual-dialect.md), que está `Accepted` — e
ADR aceito não se edita, abre-se um novo que `supersede`. Segundo, **a proibição pode continuar certa
por outra razão que a medição não testou**: uniformidade de padrão de escrita entre adapters tem valor
próprio, independente do risco do manual. Se for esse o motivo, ele precisa ser o motivo **escrito** —
hoje o que está escrito é a citação, e a citação não sustenta o absoluto.

**Nenhuma das duas é urgente.** Nenhuma produz defeito hoje. O custo de deixá-las é o de toda norma
ficcional: ela treina quem lê a desconfiar do resto do documento.

---

## 5. Decisão / Encaminhamento

Nenhuma decisão tomada — as duas saídas mexem em norma, e a norma é do dono do repositório.

**O que falta decidir:**

- [ ] **(a1)** Reescrever o anti-padrão nº 4 do `CLAUDE.md` como "gerar sempre, editar quando
      necessário, e **declarar** a edição"?
- [ ] **(a2)** Se sim: o gate que cobra a declaração (marca de edição ⇒ comentário) entra em
      `tests/cleanup/`, e com allowlist que nasce cheia e esvazia por fatia?
- [ ] **(b1)** A proibição de ODKU se sustenta por uniformidade, mesmo sem o risco do manual? Se sim,
      corrigir o **motivo escrito** em `document-repository.drizzle.ts:8-12` e a numeração do Refman.
- [ ] **(b2)** Se não se sustenta: ADR novo que `supersede` a §"Padrão de upsert" do ADR-0020,
      declarando a condição real (tabela com ≥ 2 uniques colidíveis no mesmo caminho de escrita).

**O que NÃO se decide aqui:** o custo do substituto de ODKU em contenção — não foi medido, e medi-lo
exige banco com dado, que a sessão não teve. O único banco alcançável tinha 26 das 67 tabelas e zero
dado de negócio; a lacuna está declarada no laudo da sessão (branch `docs/debate-ambiente-de-dados`,
`_workspace/debate-ambiente-de-dados/03-medicoes-internas.md` — rascunho **não versionado**, por isso
citado por caminho e não por link).

---

## 6. Referências

- `CLAUDE.md` §"Anti-padrões que exigem julgamento", item 4
- [ADR-0020](../architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) §"Padrão de upsert" e §"Lista normativa atualizada"
- `handbook/reference/mysql/mysql-refman-8.4--oracle/15-sql-statements.part02.md:2838` — a condição literal do ODKU
- `src/modules/contracts/adapters/persistence/migrations/mysql/0020_busy_doctor_spectrum.sql:3-15` — o padrão de edição declarada a promover
- [#808](https://github.com/ERP-Bem-Comum/core-api/issues/808) · [#926](https://github.com/ERP-Bem-Comum/core-api/issues/926) · [#927](https://github.com/ERP-Bem-Comum/core-api/issues/927) — os três defeitos de migration achados na mesma sessão
- [Inquiry-0026](./0026-async-human-in-the-loop-and-drizzle-1-0.md) — precedente de medição que refinou gatilho em vez de decidir por argumento
