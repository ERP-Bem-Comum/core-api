# Quality Check — Ticket CTR-CONTRACT-REGISTRATION-METADATA

**Skill:** ts-quality-checker
**Data:** 2026-06-02
**Veredito final:** ✅ ALL GREEN

| # | Check | Status | Detalhes |
| :- | :--- | :--- | :--- |
| 1 | Type check (`pnpm run typecheck` → `tsc --noEmit`) | ✅ | 0 erros |
| 2 | Format check (`pnpm run format:check` → `prettier --check .`) | ✅ | "All matched files use Prettier code style!" |
| 3 | Lint (`pnpm run lint` → `eslint .`) | ✅ | exit 0, zero erros |
| 4 | Testes (`pnpm test`) | ✅ | 2027 tests · **2010 pass · 0 fail** · 17 skipped (integração gated) |
| 5 | Integração CA8 (`pnpm run test:integration`, `MYSQL_INTEGRATION=1`, Docker) | ✅ | 87 tests · **87 pass · 0 fail** — round-trip real das colunas de metadata |

---

## Saída integral

### Check 1 — `tsc --noEmit`
```
$ tsc --noEmit
(sem saída — 0 erros)
```

### Check 2 — `prettier --check .`
```
Checking formatting...
All matched files use Prettier code style!
```

### Check 3 — `eslint .`
```
$ eslint .
exit 0 (verde)
```

### Check 4 — `pnpm test`
```
ℹ tests 2027
ℹ pass 2010
ℹ fail 0
ℹ skipped 17
ℹ todo 0
```

### Check 5 — Integração CA8 (`pnpm run test:integration`)
```
MYSQL_INTEGRATION=1 node --test --test-concurrency=1 ... \
  migrations/*.test.ts mysql-driver.test.ts drizzle-mysql.test.ts \
  contract-repository-paged.integration.test.ts outbox-schema.test.ts \
  repos/outbox-repository.drizzle.test.ts outbox-worker.integration.test.ts \
  contracts.cli.mysql.test.ts

ℹ tests 87
ℹ pass 87
ℹ fail 0
ℹ skipped 0
```
INSERT real exercido com as 22 colunas de `ctr_contracts`, incluindo `classification`,
`contract_model`, `category`, `cost_center`, `observations` — migration `0008` (com
backfill) aplicada num MySQL real e round-trip confirmado. Os logs `Error:` no output são
testes de cenário negativo (credencial inválida etc.) que passam por design.

**Nota de ambiente:** a porta 3306 estava ocupada pelo stack de deploy local do dono
(`bemcomum-mysql`). Com autorização, o serviço foi parado por ~2 min para a janela de
integração e religado em seguida — sem perda de dados, stack restaurado.

---

## Cobertura final dos CAs

| CA | Status |
| :-- | :-- |
| CA1 (campos no agregado, compile-time) | ✅ |
| CA2 (VOs `parse → Result`) | ✅ |
| CA3 (R1 `ContractServiceOrderExceedsCap`) | ✅ |
| CA4 (round-trip + rejeição de enum do banco) | ✅ (unit + integração) |
| CA5 (POST aceita / GET retorna; 422 no domínio) | ✅ (HTTP) |
| CA6 (CLI flags) | ⏭️ descopado → flags `--classificacao`/`--modelo` entregues como mitigação do gap R1 (Round 1.1) |
| CA7 (migration limpa + backfill) | ✅ (aplicada em MySQL real) |
| CA8 (integração `MYSQL_INTEGRATION=1`) | ✅ (87/87) |

---

## Próximo passo

**ALL GREEN** → ticket fecha (`pipeline:state close`). Fatia F1 do `EPIC-CONTRACTS-V2-PARITY-GAP`
entregue. Follow-ups registrados no REVIEW (Round 1.1) e na spec-mãe: F2 (PATCH metadados),
F3 (download de documento), UX rica de `category`/`costCenter`/`observations` na CLI/import.
