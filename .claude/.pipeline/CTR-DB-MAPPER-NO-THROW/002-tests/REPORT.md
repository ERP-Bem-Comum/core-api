# W0 — Baseline RED / Caracterização

> Wave de caracterização. Ticket é trivial (4 linhas) e os testes existentes já exercitam o round-trip dos 4 discriminantes de `Amendment` (`Addition`, `Suppression`, `TermChange`, `Misc`) e os 2 discriminantes de `Period` (`Fixed`, `Indefinite`) — portanto a paridade comportamental pós-patch é validada pela suíte atual. Não é necessário escrever novo teste RED — o "RED" deste ticket é o **grep `throw new Error`** retornando 4 hits (violação observável do Anti-padrão #7 do `CLAUDE.md`).

---

## 1. Estado violando — grep

```bash
$ grep -rn "throw new Error" src/modules/contracts/adapters/persistence/mappers/
src/modules/contracts/adapters/persistence/mappers/period.mapper.ts:23:      throw new Error(`unreachable: ${JSON.stringify(_exhaustive)}`);
src/modules/contracts/adapters/persistence/mappers/period.mapper.ts:40:      throw new Error(`unreachable: ${JSON.stringify(_exhaustive)}`);
src/modules/contracts/adapters/persistence/mappers/amendment.mapper.ts:53:      throw new Error(`unreachable: ${JSON.stringify(_exhaustive)}`);
src/modules/contracts/adapters/persistence/mappers/amendment.mapper.ts:113:      throw new Error(`unreachable: ${JSON.stringify(_exhaustive)}`);
```

**4 hits. Esperado pós-W1: 0.**

---

## 2. Cobertura comportamental existente

A correção é tipográfica/estilística — não há mudança de runtime. A linha do `throw` é **inalcançável por construção** (`_exhaustive: never` é compilável apenas se TS provou que todos os discriminantes do union foram cobertos). Portanto a suíte existente cobre o round-trip:

- `tests/modules/contracts/adapters/persistence/inmemory.test.ts` — não toca mappers (in-memory não serializa), mas valida agregação.
- `tests/modules/contracts/adapters/persistence/drizzle-mysql.test.ts` — exerce mappers em ambiente MySQL real (rodado em `pnpm test:integration`; em `pnpm test` é skip por causa do guard `MYSQL_INTEGRATION`).
- `tests/modules/contracts/domain/amendment/amendment.test.ts` — gera os 4 kinds, garantindo que todos passam pelos mappers em testes downstream.
- `tests/modules/contracts/domain/shared/period.test.ts` — gera os 2 kinds (`Fixed`, `Indefinite`).

Resumindo: a paridade dos discriminantes está coberta tanto na construção (domínio) quanto no round-trip (drizzle-mysql.test).

---

## 3. Baseline `pnpm test` (sem MySQL)

```
ℹ tests 444
ℹ suites 142
ℹ pass 433
ℹ fail 0
ℹ cancelled 0
ℹ skipped 11
ℹ todo 0
ℹ duration_ms 51656.69
```

Skipped = suítes guardadas por `MYSQL_INTEGRATION=1` (requerem `pnpm test:integration` com container Docker). Esta wave roda em `pnpm test` puro, sem container — apto a executar W3 sem dependência externa.

---

## 4. Critério de saída do RED

- [x] grep mostra exatamente as 4 violações esperadas.
- [x] `pnpm test` baseline verde (sem regressão a herdar).
- [x] Localização dos 4 trechos confirmada nos arquivos do escopo.

**Pronto para W1.**
