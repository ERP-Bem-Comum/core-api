# W3 — GREEN (mecânico) — FIN-DOC-SOURCE-FILE-REF

Gate final (skill `ts-quality-checker`). 4 gates no **projeto inteiro** (regressão zero), após W2 APPROVED round 2.

## Gates (saída literal)

```
1/4 pnpm run typecheck    → exit 0
2/4 pnpm run format:check → All matched files use Prettier code style!
3/4 pnpm run lint         → 0 errors, 0 warnings
4/4 pnpm test             → tests 3630 · pass 3612 · fail 0 · skipped 18 (integração MySQL gateada)
```

Nota format: os 3 `meta/*.json` do drizzle-kit (gerados, fora do hook prettier) foram formatados com `prettier --write`.

Delta vs base: **+11 testes** (source-file-ref: VO + saveDraft + mapper round-trip + regressão de corrupção parcial + length-cap).

## ✅ CA4 concluído — MySQL 8.4.10 real (x99, 2026-07-09)

Ambiente: `docker run` avulso `mysql:8.4` no host do x99 (efêmero, `--mysql-native-password=ON`) + túnel `ssh -L 3306`; teste rodado do Mac contra o engine real (`@@version` = **8.4.10**, `@@hostname` = container id do x99). Método comprovado — ver memória `mac-dev-x99-docker-runner-tunnel`.

**1. Migrations aplicam (`applyMigrations: true`).** `document-repository.drizzle-mysql.test.ts` → `openMysqlFinancial({ applyMigrations: true })` roda o migrator completo (0031 + 0032 incluídos) no `before()`; qualquer erro de DDL abortaria a suíte.
```
tests 16 · pass 16 · fail 0 · skipped 0   (round-trip do Document já com sourceFileRef)
```

**2. Schema aplicado (`INFORMATION_SCHEMA`).** 5 colunas `source_file_*` presentes e **nullable**: `bucket varchar(63)`, `key varchar(1024)`, `hash_sha256 varchar(64)`, `size_bytes bigint`, `mime varchar(127)`. Os 2 CHECK presentes com a cláusula esperada (`all_or_none` = todas-null OR todas-not-null; `size_bytes` = null OR > 0).

**3. Comportamento dos CHECK no engine (INSERT em tx + ROLLBACK):**

| Caso | Esperado | Observado |
| :-- | :-- | :-- |
| `source_file_*` all-null | aceita | ✅ inserido |
| all-present + `size_bytes=12345` | aceita | ✅ inserido |
| parcial (só `bucket`) | rejeita | ✅ `ERROR 3819 … fin_documents_source_file_all_or_none_chk` |
| all-present + `size_bytes=0` | rejeita | ✅ `ERROR 3819 … fin_documents_source_file_size_bytes_chk` |

ROLLBACK → 0 rows remanescentes. Ambiente x99 destruído após a prova.

## Próximo passo
`pnpm run pipeline:state close FIN-DOC-SOURCE-FILE-REF`. Fatia 2 (ingest completo) então **completa** (#1 + #2 + #3). Depois: review/merge do PR #376.
