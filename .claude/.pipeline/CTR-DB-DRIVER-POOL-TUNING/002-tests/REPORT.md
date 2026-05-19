# W0 — RED (Fail-First)

## Skill aplicada

`database-engineer` (W0 modo teste — sem produzir lógica de domínio).

---

## Arquivos criados

- `tests/modules/contracts/adapters/persistence/mysql-driver-tuning.test.ts` (140 linhas).

## CAs (Acceptance Criteria) do W0

| CA | Camada | Status RED | Justificativa |
| :-- | :-- | :-- | :-- |
| **CA-9.1** | estrutural | RED — `buildPoolOptions` não exportada | `assert.equal(buildPoolOptions({...}).timezone, 'Z')` (audit §M2) |
| **CA-9.2** | estrutural | RED — idem | `assert.equal(buildPoolOptions({...}).idleTimeout, 270_000)` (audit §H3) |
| **CA-9.3** | estrutural | RED — idem | preserva `enableKeepAlive`, `keepAliveInitialDelay`, `waitForConnections`, `queueLimit` |
| **CA-10.1** | estrutural | RED — idem | `idleTimeoutMs: 60_000` override do default |
| **CA-10.2** | estrutural | RED — idem | omitido → default `270_000` |
| **CA-11** | integration (opt-in) | RED runtime | `SELECT @@session.time_zone === '+00:00'` (M2) |
| **CA-12** | integration (opt-in) | RED runtime | default `applyMigrations === false` (M5) — `SELECT FROM ctr_contracts` ⇒ ER 1146 em DB resetado |

## Verificação do RED

```
$ pnpm run typecheck
> tsc --noEmit

tests/modules/contracts/adapters/persistence/mysql-driver-tuning.test.ts(25,3):
  error TS2305: Module '"#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts"'
  has no exported member 'buildPoolOptions'.

ELIFECYCLE  Command failed with exit code 2.
```

**Sinal de RED correto:** o teste falha por inexistência da API pretendida (`buildPoolOptions`), não por bug de implementação. Convergência perfeita com a regra fail-first do `CLAUDE.md` ("o erro deve ser 'módulo não existe' ou 'função não encontrada'").

---

## Cobertura comportamental esperada pós-W1

- **CA-9 / CA-10** rodam em `pnpm test` puro (sem Docker) — validam a função pura `buildPoolOptions`.
- **CA-11 / CA-12** ficam guardados por `MYSQL_INTEGRATION=1` (idêntico ao padrão CA-5..CA-8 do `mysql-driver.test.ts` original). Em `pnpm test` puro são skip; em `pnpm test:integration` rodam contra o container Docker.

---

## Critério de saída do RED

- [x] Arquivo de teste criado.
- [x] `pnpm run typecheck` falha com `TS2305` em `buildPoolOptions`.
- [x] Falha por inexistência da API (não por bug de impl).
- [x] CAs cobrem os 3 sub-itens do escopo (H3, M2, M5).

**Pronto para W1.**
