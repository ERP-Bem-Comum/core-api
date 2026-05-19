# Inquiry-0008: Driver Postgres — `pg` vs `postgres` (porsager)

- **Status:** ⚠️ **OBSOLETA** — decisão revisada após correção de assunção de engine
- **Opened:** 2026-04-28
- **Closed/Decided:** 2026-04-28
- **Obsoleted:** 2026-04-28 (mesmo dia, em revisão posterior)
- **Opened by:** Gabriel Aderaldo
- **Asked to:** Pesquisa em GitHub dos dois projetos + benchmarks de set/2025 + documentação Drizzle
- **Impact:** Decisão técnica do core-api

> ## ⚠️ AVISO IMPORTANTE
>
> Esta inquiry partiu da **assunção incorreta** de que o engine de banco era PostgreSQL.
> O engine real é **MySQL 8**, conforme confirmado em [Inquiry-0010](./0010-mysql-engine-correction.md) e [ADR-0013](../architecture/adr/0013-mysql-database-engine.md).
>
> A análise comparativa abaixo entre `pg` e `postgres` (porsager) **não se aplica** ao projeto, pois nenhum dos dois drivers é usado.
>
> **Driver real adotado: `mysql2`** (já presente no legado, suportado por Drizzle ORM).
>
> O conteúdo abaixo permanece como evidência histórica do raciocínio que precisava de correção.

---

## 1. Contexto

Drizzle ORM já decidido. Drizzle suporta dois drivers Postgres oficialmente: `pg` (node-postgres) e `postgres` (porsager). Decisão pendente entre os dois.

---

## 2. Pergunta(s) feita(s)

> "pg ou postgres (porsager)? Qual usar?"

---

## 3. Respostas / Investigação

### 2026-04-28 — Comparação

| Critério | `pg` (node-postgres) | `postgres` (porsager) |
| :--- | :--- | :--- |
| Versão atual (abr/2026) | 8.x | 3.4.9 (5/abril/2026) |
| Idade | ~15 anos (desde 2010) | ~8 anos (desde 2018) |
| Mantenedor | brianc + comunidade | porsager (solo) |
| Total releases | 525 tags | 46 releases |
| Issues abertas | 456 | 219 + 37 PRs |
| TypeScript | via `@types/pg` | Built-in |
| Dependências de prod | algumas (pg-pool) | **zero** |
| Prepared statements | opt-in | **ON por padrão** ⚠️ |
| Pipelining | não nativo | nativo |
| Multi-runtime | Node | Node + Deno + Bun + CF Workers |
| Suporte Drizzle | ✅ | ✅ |

### 2026-04-28 — Benchmark de set/2025

```
pg-native > pg > postgres (porsager)
- pg-native é 1.13× mais rápido que pg
- pg é 1.25× mais rápido que postgres (porsager)
```

A narrativa antiga "postgres é mais rápido" envelheceu. `pg` melhorou e supera `postgres` em benchmarks atuais.

### 2026-04-28 — Nota da própria documentação Drizzle

> "postgres.js uses prepared statements by default, which **could be a potential issue in AWS environments**."

Bate diretamente no nosso cenário multi-cloud (AWS legado + GCP novo, [Inquiry-0003](./0003-multi-cloud-strategy.md)). Em ambientes com pooler externo (PgBouncer, RDS Proxy, Cloud SQL connector), prepared statements default-ON quebra ou degrada.

---

## 4. Análise interna

### Vantagens absolutas de cada

| Vence em | `pg` | `postgres` |
| :--- | :---: | :---: |
| Bus factor | ✅ | ❌ |
| Performance hoje | ✅ | ❌ |
| Compat AWS/poolers | ✅ | ❌ |
| Maturidade prod financeira | ✅ | 🟡 |
| TS-first DX | 🟡 | ✅ |
| Zero dependências (supply chain) | 🟡 | ✅ |
| Multi-runtime | ❌ | ✅ |
| API moderna (template literals) | ❌ | ✅ |

### Decisivo no nosso caso

- Drizzle abstrai a API do driver (escrevo `db.select().from(table)`, não SQL cru). API moderna do porsager perde relevância.
- Bus factor de mantenedor solo é dealbreaker pra sistema financeiro 5+ anos.
- Multi-cloud com AWS no caminho — alerta de prepared statements é red flag real.
- Performance hoje favorece `pg` — argumento histórico pró-postgres caiu.

---

## 5. Decisão final

**`pg` (node-postgres).** Sem `pg-native` no início (adicionar só se aparecer gargalo medido — ganho de +10% via libpq não justifica complexidade de build C++ sem necessidade).

---

## 6. Saídas

- [x] Decisão registrada.
- [ ] `package.json` do `core-api` (quando criar): `"pg": "<versão pinada>"` + `"@types/pg": "<versão>"`.
- [ ] Atualizar `architecture/05-runtime-decisions.md` com seção de persistência.

---

## 7. Referências

- [node-postgres GitHub](https://github.com/brianc/node-postgres)
- [Postgres.js (porsager) GitHub](https://github.com/porsager/postgres)
- [Drizzle ORM PostgreSQL — Get Started](https://orm.drizzle.team/docs/get-started-postgresql)
- [Benchmarking PostgreSQL Drivers in Node.js — DEV Community](https://dev.to/nigrosimone/benchmarking-postgresql-drivers-in-nodejs-node-postgres-vs-postgresjs-17kl)
- [Performance comparison Issue #3391 — node-postgres](https://github.com/brianc/node-postgres/issues/3391)
