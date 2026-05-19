# W3 — QUALITY Report — CTR-DB-COMPOSE-MYSQL

**Skill:** `nodejs-fs-scripter` (script TS) + `pnpm test` (suite) + bash measurement
**Data:** 2026-05-15
**Veredito final:** ✅ **ALL GREEN**

---

## Gates de qualidade

| # | Gate | Comando | Resultado |
| :- | :--- | :--- | :--- |
| 1 | Type check | `pnpm run typecheck` (= `tsc --noEmit`) | ✅ zero erros |
| 2 | Format check | `pnpm run format:check` (= `prettier --check .`) | ✅ "All matched files use Prettier code style!" |
| 3 | Lint | `pnpm run lint` (= `eslint .`) | ✅ zero erros |
| 4 | Tests | `pnpm test` (= `node --test ... 'tests/**/*.test.ts'`) | ✅ **406/406 pass** (zero fail, zero skipped) |

---

## Suite completa — saída

```
ℹ tests 406         (385 prévios + 20 CAs + 1 describe bracket)
ℹ pass  406
ℹ fail  0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 47011  (suite antiga ~12s; suite infra ~35s incluindo 3-4 docker up/down)
```

### Detalhe dos 20 CAs novos (todos verdes)

| CA | Resultado |
| :--- | :---: |
| CA-1a `compose.yaml config` exit 0 | ✔ |
| CA-1b `compose.yaml + compose.ci.yaml config` exit 0 | ✔ |
| CA-1c CI override remove `ports:` | ✔ |
| CA-2 falha sem secrets | ✔ |
| CA-3 healthy em ≤90s (medido: **11s** real) | ✔ |
| CA-4 `core_app` conecta em `core` | ✔ |
| CA-5 `readonly_bi` SELECT funciona | ✔ |
| CA-6 `readonly_bi` CREATE TABLE negado | ✔ |
| CA-7..14 configuração canônica (charset/collation/sql_mode/time_zone/innodb/binlog/gtid/ACID) | ✔✔✔✔✔✔✔✔ |
| CA-15 `America/Sao_Paulo` carregada | ✔ |
| CA-16 secret montado com permissões restritas | ✔ |
| CA-17 secrets NÃO em `Config.Env` | ✔ |
| CA-18 down (sem -v) preserva users | ✔ |
| CA-19 down -v força init scripts | ✔ |

---

## Medições operacionais

| Métrica | Valor |
| :--- | :--- |
| **Tempo até `healthy`** (cold start, volume vazio) | **11s** (limite no healthcheck: 90s — folga de 8×) |
| **Memória idle do container** | 435.5 MiB / 3.83 GiB host (11.11%) |
| **CPU idle** | 0.77% |
| **Tamanho do volume após bootstrap** | 221.3 MB (MySQL 8.4.9 + DB `core` vazio + time zone tables + binlog inicial) |
| **Versão do MySQL ativo** | `mysql 8.4.9 for Linux on aarch64` (image `mysql:8.4` pinada via digest do index multi-arch) |

---

## Fechamento dos findings do W2 review

| # | Finding W2 | Status W3 |
| :--- | :--- | :--- |
| 🟡 **I-1** Digest pin ausente em `compose.yaml` | ✅ **Resolvido** — `mysql:8.4@sha256:c36050afdca850f23cef85703f84c7531a5ae155a11b5ee1c60acb09937c4084` + `minio/minio:latest@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e`. Comentários inline com comando de regeneração. |
| 🟡 **I-2** MinIO ainda usa env var com default | 🔄 **Adiado** — fica para ticket `CTR-COMPOSE-POLISH` (não bloqueia W3 nem o uso do MinIO em dev) |
| 🟡 **I-3** `setup-secrets` trava em CI sem TTY | ✅ **Resolvido na conversão** — script reescrito em TS detecta `stdin.isTTY` e cai automaticamente para `--random` com aviso em stderr (`scripts/setup-secrets.ts:166-172`) |
| 🔵 S-1 (heredoc + aspa simples) | 🔄 Adiado |
| 🔵 S-2 (nota Compose ≥ 2.24) | 🔄 Adiado |
| 🔵 S-3 (magic numbers em test) | 🔄 Adiado |
| 🔵 S-4 (slow log misturado com datadir) | 🔄 Adiado |

**Critical do W2:** 0 → fechado.
**Important:** 3 → 1 resolvido + 1 conversão bônus resolveu + 1 adiado para ticket de polish.

---

## Bônus entregue (além do escopo original)

Durante o W3, em paralelo ao gate, **5 melhorias adicionais** foram aplicadas:

1. **Digest pin** de ambas as imagens Docker (`mysql:8.4` + `minio/minio:latest`) com comentário inline mostrando como atualizar.
2. **Conversão `setup-secrets.sh` → `setup-secrets.ts`** via skill `nodejs-fs-scripter`:
   - Mais legível (TS tipado vs POSIX sh com `stty`)
   - Padrão `writeAtomic` (tmp + rename) — escrita atômica com `chmod 0600`
   - TTY-aware automático (resolve I-3)
   - Prompt silencioso via `setRawMode` + listener (sem hack `_writeToOutput`)
   - Exit codes sysexits.h (0/64/74)
   - Zero dep nova; **zero `any`; zero `throw` fora do `main()`**
3. **`tsconfig.json`** ganhou `scripts/**/*` no `include` (estava faltando).
4. **`package.json`** ganhou script `secrets:setup` (`pnpm secrets:setup [--random] [--force] [--help]`).
5. **Design documento** salvo em `scripts/setup-secrets.design.txt` (pseudocódigo + edge cases + conformidade), preservado como evidência do raciocínio.

---

## Estrutura final entregue

```
ERP-CONTRACTS/
├── compose.yaml                              (atualizado — digest pin, secrets:, bind mounts)
├── compose.ci.yaml                           (novo — override CI sem port mapping)
├── .gitignore                                (atualizado — /secrets/*.txt, *.db, cli-state.json)
├── tsconfig.json                             (atualizado — include 'scripts/**/*')
├── package.json                              (atualizado — script 'secrets:setup')
├── docker/
│   └── mysql/
│       ├── conf.d/server.cnf                 (novo — 8 decisões D1-D8 ancoradas)
│       └── initdb.d/
│           ├── 01-databases-and-users.sh     (novo — wrapper bash com heredoc + secrets)
│           └── 02-load-timezones.sh          (novo — mysql_tzinfo_to_sql)
├── secrets/
│   ├── .gitkeep                              (novo)
│   └── (mysql_*.txt criados em runtime; gitignored)
├── scripts/
│   ├── setup-secrets.ts                      (novo — Node 24 + TS, substitui o .sh)
│   └── setup-secrets.design.txt              (novo — pseudocódigo do design)
└── tests/
    └── infra/
        └── mysql-compose.test.ts             (novo — 20 testes via node:test)
```

**Total:** 11 arquivos (8 novos + 3 atualizados). **Zero dep nova** no `package.json`.

---

## Próximo passo

Pipeline avança para os tickets sucessores do ADR-0020:

1. ← **CTR-DB-COMPOSE-MYSQL** ✅ fechado
2. `CTR-DB-SCHEMA-MYSQL-CTR-PREFIX` — `schemas/mysql.ts` com prefixo `ctr_*`, índices, CHECKs
3. `CTR-DB-MIGRATION-MYSQL` — `drizzle.config.ts` MySQL + primeira migration
4. `CTR-DB-DRIVER-MYSQL` — Wire `mysql2`, resolver F-C1 + F-C2
5. `CTR-CLEANUP-SQLITE` — Remover schema/driver/migrations/dep `better-sqlite3`
6. `CTR-DOCKERFILE-MYSQL` — Dockerfile sem toolchain C++
7. `CTR-CLI-MYSQL-SMOKE` — `--driver mysql` + E2E real
8. `CTR-DOCS-UPDATE-FOR-ADR-0020` — `CLAUDE.md` + 8 SKILL.md (atualizar refs a ADR-0018)
9. `CTR-COMPOSE-POLISH` (novo, derivado do W2) — I-2 (MinIO secrets parity) + S-1..S-4
