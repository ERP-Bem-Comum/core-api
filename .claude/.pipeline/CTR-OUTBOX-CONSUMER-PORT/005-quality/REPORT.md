# Quality Check — Ticket CTR-OUTBOX-CONSUMER-PORT

**Skill:** ts-quality-checker
**Data:** 2026-05-26T18:06Z
**Veredito final:** ✅ GREEN no escopo do ticket — gate verde para todo o código tocado.
A única falha (`tests/infra/mysql-compose.test.ts` CA-5) é **infra/ambiente fora do escopo**,
deferida para o ticket `CTR-INFRA-READONLY-BI-AUTH`. Decisão do humano (2026-05-26):
fechar este ticket `closed-green`.

| #     | Check                          | Status        | Detalhes                                                                       |
| :---- | :----------------------------- | :------------ | :----------------------------------------------------------------------------- |
| 1     | Type check (`tsc --noEmit`)    | ✅ GREEN       | zero erros                                                                     |
| 2     | Format check (`prettier`)      | ✅ GREEN       | `All matched files use Prettier code style!`                                   |
| 2-bis | Lint (`eslint .`)              | ✅ GREEN       | zero erros/warnings                                                            |
| 3     | Testes (`node --test`)         | ❌ 1 fail      | `# pass 1187 · # fail 1 · # skipped 16` — a única falha é infra, não do ticket |
| 4     | Build                          | ⏭️ SKIPPED    | Fase 1 roda via `--experimental-strip-types`                                   |

---

## Análise — a falha NÃO é do ticket

O ticket `CTR-OUTBOX-CONSUMER-PORT` tocou exclusivamente arquivos do módulo outbox:

```
src/modules/contracts/adapters/outbox/outbox.in-memory.ts
src/modules/contracts/adapters/persistence/mappers/outbox.mapper.ts
src/modules/contracts/adapters/persistence/repos/outbox-repository.drizzle.ts
src/modules/contracts/application/ports/outbox.ts
src/modules/contracts/cli/context.ts
src/modules/contracts/worker/outbox-worker.ts
tests/modules/contracts/worker/outbox-consumer-port.boundary.test.ts
```

A única falha de `pnpm test` está em `tests/infra/mysql-compose.test.ts:205` (CA-5), suíte
`CTR-DB-COMPOSE-MYSQL`, **intocada por este ticket** — última alteração foi `c0eb7a1`
(`test(infra): skip-guard de daemon Docker`), anterior à abertura do ticket.

O teste de fronteira do próprio ticket passa isolado: **7/7 GREEN** (INV-1..INV-5).

### Causa raiz provável (a investigar em ticket próprio)

```
✖ CA-5: readonly_bi consegue SELECT
  ERROR 1045 (28000): Access denied for user 'readonly_bi'@'localhost' (using password: YES)
```

- CA-3 (container healthy) e CA-4 (`core_app` conecta em `core`) passam → container sobe e o
  seed roda.
- `core_app` é criado pelo **entrypoint oficial** (`MYSQL_USER` + `MYSQL_PASSWORD_FILE`);
  `readonly_bi` existe **só** pelo script `docker/mysql/initdb.d/01-databases-and-users.sh`,
  que lê `READONLY_PASSWORD="$(cat /run/secrets/mysql_readonly_password)"`.
- O sintoma (`using password: YES` + access denied) é consistente com `readonly_bi` criado com
  senha vazia/divergente neste ambiente — ex.: o secret `mysql_readonly_password` não sendo
  lido pelo initdb (bind-mount do source inexistente vira diretório vazio, ou `cat` retornando
  vazio). `core_app` não exibe o problema porque é provisionado pelo entrypoint, não pelo seed.
- **CA-6 é falso-positivo:** afirma apenas `code != 0` + `/denied|access/`, satisfeito já no
  login negado — não chega a exercitar o `CREATE TABLE`.

Investigação de ambiente (subir o compose à mão, inspecionar `mysql.user` e `secrets/`) foi
bloqueada por permissão nesta sessão. Recomendação abaixo.

---

## Saída integral

### Check 1 — `pnpm run typecheck` (`tsc --noEmit`)

```
> core-api@0.1.0 typecheck /home/gabrieladeraldo/dev/bem_comum/core-api
> tsc --noEmit

(zero erros)
```

### Check 2 — `pnpm run format:check` (`prettier --check .`)

```
> core-api@0.1.0 format:check /home/gabrieladeraldo/dev/bem_comum/core-api
> prettier --check .

Checking formatting...
All matched files use Prettier code style!
```

### Check 2-bis — `pnpm run lint` (`eslint .`)

```
> core-api@0.1.0 lint /home/gabrieladeraldo/dev/bem_comum/core-api
> eslint .

(zero erros/warnings)
```

### Check 3 — `pnpm test` (`node --test`)

Sumário:

```
ℹ tests 1204
ℹ suites 407
ℹ pass 1187
ℹ fail 1
ℹ skipped 16
ℹ todo 0
ℹ duration_ms 61675.734391
```

Única falha:

```
test at tests/infra/mysql-compose.test.ts:205:3
✖ CA-5: readonly_bi consegue SELECT (241.366322ms)
  AssertionError [ERR_ASSERTION]: SELECT falhou: mysql: [Warning] Using a password on the command line interface can be insecure.
  ERROR 1045 (28000): Access denied for user 'readonly_bi'@'localhost' (using password: YES)

  1 !== 0

      at TestContext.<anonymous> (file:///home/gabrieladeraldo/dev/bem_comum/core-api/tests/infra/mysql-compose.test.ts:207:12)
    code: 'ERR_ASSERTION',
    actual: 1,
    expected: 0,
    operator: 'strictEqual',
```

Teste de fronteira do ticket (isolado) — GREEN:

```
ℹ tests 7
ℹ pass 7
ℹ fail 0
(INV-1..INV-5)
```

### Check 4 — Build

```
SKIPPED na Fase 1 — projeto roda via --experimental-strip-types sem build.
```

---

## Próximo passo (decisão do humano)

A correção **não** pertence a W1 deste ticket — `CTR-OUTBOX-CONSUMER-PORT` não tocou nenhum
arquivo de infra MySQL. Opções:

1. **Abrir ticket de infra** (ex.: `CTR-INFRA-READONLY-BI-AUTH`) para diagnosticar o seed
   `readonly_bi` / leitura do secret `mysql_readonly_password`, e fechar este ticket como
   GREEN no escopo dele (typecheck + format + lint + testes do ticket todos verdes).
2. Tratar `tests/infra/mysql-compose.test.ts` como suíte de integração (movê-la para o glob
   `test:integration`, fora de `pnpm test`), já que exige Docker daemon vivo — alinhado ao
   espírito do skip-guard FIN-TEST-INFRA-SKIP-GUARD.

Não fecho o ticket unilateralmente: o gate `pnpm test` está vermelho em termos absolutos.
