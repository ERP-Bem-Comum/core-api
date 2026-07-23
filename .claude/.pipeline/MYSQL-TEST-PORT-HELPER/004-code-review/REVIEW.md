# Code Review — Ticket MYSQL-TEST-PORT-HELPER (Parte B da #500) — Round 1

**Veredito:** ✅ **APPROVED** (sem ressalvas bloqueantes; 2 observações Minor não-bloqueantes)

**Reviewer:** code-reviewer (W2)
**Data:** 2026-07-23
**Base auditada:** DIFF da working tree (Parte B, não-commitada) — não os REPORTs. Motivo declarado no 000/003: o subagente do W1 morreu sem produzir; o orquestrador principal fez a migração por script determinístico, então REPORT e código têm o mesmo autor. **Auditei o diff, não confiei nos REPORTs.**

**Escopo lido:**
- `tests/support/mysql-conn.ts` (helper, novo)
- `tests/support/mysql-conn.test.ts` (W0 comportamental)
- `tests/cleanup/mysql-test-port-single-source.test.ts` (W0 estrutural)
- `package.json` (subpath `#tests/*`)
- `scripts/ci/test-integration.ts` (runner)
- Amostragem adversarial de arquivos migrados (ver §2) + varredura completa das credenciais no diff.

---

## Método (auditoria do bulk mecânico)

Em vez de abrir os 68 um a um, extraí **todas** as linhas `+`/`-` relevantes do diff e pareei mudança-a-mudança por contagem e por valor literal. Depois abri ~10 arquivos inteiros variados para confirmar o pareamento no contexto.

### Contabilidade do diff (fecha exata)
- **Literais `root:rootpw...:3306` removidos:** 64.
- **`mysqlTestConnectionString()` no-arg adicionados:** 62.
- **`mysqlTestUrl()` adicionados:** 2 (os que faziam `MYSQL_TEST_URL ?? '<literal root>'`).
- **64 = 62 + 2.** Bate. Nenhum literal root perdido nem duplicado.

- **Literais não-root removidos:** 7. **Chamadas com credencial custom adicionadas:** 7. Bate.

### Credenciais — 1:1 com o original (nenhuma divergência achada)
| Removido (literal) | Adicionado (helper) | OK |
| :-- | :-- | :-- |
| `mysql://core:pw@...:3306/core` (×2) | `mysqlTestConnectionString({ user: 'core', password: 'pw' })` (×2) | ✅ |
| `mysql://user:pw@...:3306/core` | `mysqlTestConnectionString({ user: 'user', password: 'pw' })` | ✅ |
| `mysql://core_app:pw@...:3306/core` (×2: `CONN` + `URL_A`) | `mysqlTestConnectionString({ user: 'core_app', password: 'pw' })` (×2) | ✅ |
| `mysql://core_app:apppw-migration-test-only@...:3306/core` | `mysqlTestConnectionString({ user: 'core_app', password: 'apppw-migration-test-only' })` | ✅ |
| `mysql://invalid:invalid@...:3306/inexistente` | `mysqlTestConnectionString({ user: 'invalid', password: 'invalid', database: 'inexistente' })` | ✅ |
| `MYSQL_TEST_URL ?? 'mysql://root...:3306/core'` (×2) | `mysqlTestUrl()` (×2) | ✅ |

**Procurei ativamente** por: user/password/database trocado, database ≠ `/core` migrado para no-arg (perderia o banco), credencial custom virando no-arg (viraria root). **Nenhuma ocorrência.** Todos os literais root removidos tinham `/core` (grep de database ≠ `/core` entre os root: vazio) → no-arg correto.

---

## Verificação por CA

| CA | Verificação | Resultado |
| :-- | :-- | :-- |
| **CA1** | `grep -rl 127.0.0.1:3306 tests/ --include=*.ts` (excl. `reports/`) | **4 arquivos, todos na allowlist** (`mysql-conn.ts`, `mysql-conn.test.ts`, `mysql-test-port-single-source.test.ts`, `sync-permissions.drizzle-mysql.test.ts`). 0 offenders ✅ |
| **CA2** | String congelada `mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core` | Helper produz exatamente isso com `env:{}`. Pinada no teste. ✅ |
| **CA3/CA4** | `MYSQL_PORT=3310` → `:3310`, nunca contém `3306`; guarda porta vazia/branca (`''`/`'   '`→3306, não `:/core`) | `resolvePort` faz `.trim()` e cai no default se vazio — **não** usa `?? '3306'` sozinho. ✅ |
| **CA5** | Precedência `MYSQL_TEST_URL` | `mysqlTestUrl` = `env['MYSQL_TEST_URL'] ?? connectionString`. Preservada verbatim. Grep confirma 0 `MYSQL_TEST_URL ?? '<literal>'` remanescente. ✅ |
| **CA6** | Caso protegido `sync-permissions.drizzle-mysql.test.ts` | **Não modificado** (não aparece em `git diff --name-only`). Segue `?? ''` sem default; **não** importa `mysql-conn`. ✅ |
| **CA7** | Runner consome o helper | `import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts'`; removidos `ETL_TEST_MYSQL_PORT` + `MYSQL_PORT ?? '3306'` inline + conn interpolada. ✅ |
| **CA8** | Regressão zero | `pnpm test`: **4358 tests / 4339 pass / 0 fail / 19 skipped**, EXIT 0. ✅ |

**Nota sobre `sync-permissions-config.test.ts`:** é arquivo **distinto** do protegido (`.drizzle-mysql.test.ts`). É um teste de leitura de config, usa `user:pw`, migrado corretamente. Não há confusão entre os dois — o protegido continua intocado.

---

## Helper `tests/support/mysql-conn.ts` — inspeção

- **Guarda de porta vazia/branca:** `(env['MYSQL_PORT'] ?? '').trim(); raw === '' ? '3306' : raw` — cobre `undefined`, `''` e `'   '`. Confere com o endurecimento do W0. ✅
- **Precedência:** `mysqlTestUrl` respeita `MYSQL_TEST_URL` antes da derivação. ✅
- **Host não parametrizável:** `MYSQL_TEST_HOST` é const, nenhum caminho lê env para host. Confere com o escopo (host fora de escopo). ✅
- **Tipos:** `TestEnv`/`MysqlTestConnOptions` são `Readonly<>`; `env` injetável para determinismo. Sem `any`, sem `class`, sem `throw`. Aderente às regras transversais (é código de teste-support, mas segue o padrão). ✅

---

## Gates (rodados nesta review — read-only)

```
pnpm run typecheck  → tsc --noEmit — 0 erros
pnpm run lint       → eslint . — 0 erros
pnpm test           → tests 4358 · pass 4339 · fail 0 · skipped 19 · EXIT 0
```

---

## 🔵 Observações Minor (não bloqueiam)

### Obs 1 — Import cross-dir `scripts/ → tests/` (`scripts/ci/test-integration.ts:15`)
O runner importa `#tests/support/mysql-conn.ts`. Direção incomum (`scripts/` dependendo de `tests/`). **Avaliação: aceitável.** O runner **é** infraestrutura de teste (orquestra as suites de integração) e o helper é test-support legítimo e compartilhado; ter uma **fonte única** de porta (objetivo do ticket, CA7) supera o desconforto da direção. O subpath `#tests/*` foi adicionado ao `package.json` e **resolve** em tsc (NodeNext, typecheck limpo) e runtime (suíte verde, CA7 estrutural passa). Não é blocker nem Major. Se no futuro `tests/` importar de `scripts/` também, aí vira ciclo a vigiar — hoje não há.

### Obs 2 — Edição do teste W0 em W1 (`mysql-conn.test.ts`)
`String(MYSQL_TEST_DEFAULT_PORT)` → `MYSQL_TEST_DEFAULT_PORT` na asserção. **Legítimo:** a constante é tipada `string` (`'3306'`), então `String()` é redundante (`no-unnecessary-type-conversion`). A asserção `assert.equal(MYSQL_TEST_DEFAULT_PORT, '3306')` é semanticamente **idêntica e mais forte** (compara o valor tipado direto). É manutenção de lint declarada no REPORT, **não** afrouxamento de teste.

---

## O que está bom

- **Migração fiel.** Zero divergência de credencial em 71 arquivos tocados — a contabilidade `-`/`+` fecha exata e a amostragem adversarial não achou um único literal trocado.
- **Guarda de porta vazia** implementada de verdade (`.trim()` + default), não o `?? '3306'` ingênuo que produziria `:/core`. Exatamente o risco que o W0 apontou.
- **Caso protegido respeitado à risca:** `sync-permissions.drizzle-mysql.test.ts` fora do diff, sem default, sem import do helper — nenhum caminho novo alcança banco com dados (CA6).
- **Precedência `MYSQL_TEST_URL` preservada** e centralizada, sem regressão nos 2 arquivos que a usam.
- **Fonte única real:** runner deixou de manter sua própria derivação de porta; agora há um único ponto de verdade.
- **REPORTs honestos** sobre a morte do subagente e a autoria única — o que motivou (corretamente) auditar o diff.

---

## Próximo passo

**APPROVED** → pipeline-maestro avança para **W3 (ts-quality-checker)**. Os gates já rodaram verdes aqui, mas W3 é o gate canônico. As 2 observações Minor são registro, não exigem retorno a W1.

> Fora de escopo desta review (conforme instrução): a prova de integração real (`MYSQL_PORT=3310 pnpm run test:integration:*`) é W3/manual; a Parte C (workflow de CI) não foi tratada como achado.
